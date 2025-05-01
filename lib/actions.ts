"use server"

import prisma from "@/lib/prisma"
import { format } from "date-fns"

// Define interfaces for our raw query results
interface PeriodoResult {
  id: number
  tipo_dia: string
  inicio: Date
  fim: Date
  descricao: string
}

interface ValorHoraResult {
  valor_hora: number | string | any
}

// Define interfaces for our data models
interface Promotor {
  id: number
  nome: string
  cpf?: string | null
  familia?: string | null
  horasistema?: string | null
  cargo_campo?: string | null
  status_usuario?: string | null
  disponibilidades?: Disponibilidade[]
}

interface Disponibilidade {
  id: number
  promotor_id: number
  segunda: number
  terca: number
  quarta: number
  quinta: number
  sexta: number
  sabado: number
  domingo: number
}

interface Bandeira {
  id: number
  nome: string
  descricao?: string | null
}

interface Loja {
  id: number
  bandeira_id: number
  nome: string
  cidade: string
  uf: string
  cep?: string | null
  bairro?: string | null
  endereco?: string | null
  bandeira?: Bandeira
}

interface PromotorLoja {
  id: number
  promotor_id: number
  loja_id: number
  loja?: Loja
}

// Função auxiliar para formatar DateTime
function formatDateTime(date: Date): string {
  return format(date, "HH:mm")
}

export async function registrarPedido(clienteId: number, formaPagamento: string, pedidoItens: any) {
  try {
    // Criar o pedido
    const pedido = await prisma.pedido.create({
      data: {
        cliente_id: clienteId,
        forma_pagamento: formaPagamento,
        status: "pendente", // Defina o status inicial
      },
    })

    // Criar as seleções de promotores para o pedido
    for (const item of pedidoItens) {
      const { promotorId, diasSelecionados } = item

      for (const dia in diasSelecionados) {
        if (diasSelecionados.hasOwnProperty(dia)) {
          const diaSelecionado = diasSelecionados[dia]

          if (diaSelecionado.selected && diaSelecionado.hours && diaSelecionado.period) {
            // Buscar o período pelo nome
            const periodo = await prisma.periodo.findFirst({
              where: {
                id: Number.parseInt(diaSelecionado.period),
              },
            })

            if (!periodo) {
              throw new Error(`Período não encontrado: ${diaSelecionado.period}`)
            }

            // Buscar o valor da hora para este promotor e período
            const valorHora = await getValorHoraPromotorPeriodo(promotorId, periodo.id)

            // Calcular o valor total
            const horas = Number(diaSelecionado.hours)
            const valor_total = horas * valorHora

            await prisma.selecaoPromotor.create({
              data: {
                pedido_id: pedido.id,
                promotor_id: promotorId,
                dia_semana: dia,
                periodo_id: periodo.id,
                horas: horas,
                valor_hora: valorHora,
                valor_total: valor_total,
              },
            })
          }
        }
      }
    }

    return { success: true, message: "Pedido registrado com sucesso!" }
  } catch (error: any) {
    console.error("Erro ao registrar pedido:", error)
    return { success: false, message: error.message || "Erro ao registrar pedido" }
  }
}

// Modifique apenas a função convertDecimalToNumber para lidar com BigInt
function convertDecimalToNumber(value: any): any {
  if (value === null || value === undefined) {
    return value
  }

  // Se for um BigInt, converter para string
  if (typeof value === "bigint") {
    return value.toString()
  }

  // Se for um objeto Decimal (tem método toNumber)
  if (typeof value === "object" && value !== null && typeof value.toNumber === "function") {
    return value.toNumber()
  }

  // Se for um array, converter cada elemento
  if (Array.isArray(value)) {
    return value.map(convertDecimalToNumber)
  }

  // Se for um objeto, converter cada propriedade
  if (typeof value === "object" && value !== null) {
    const result: Record<string, any> = {}
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        result[key] = convertDecimalToNumber(value[key])
      }
    }
    return result
  }

  return value
}

// Modifique a função searchCandidatesByLocation para trabalhar com a nova estrutura de tabelas
export async function searchCandidatesByLocation({
  uf,
  cidade,
  bandeira = "Todas",
  loja = "Todas",
}: { uf: string; cidade: string; bandeira?: string; loja?: string }) {
  try {
    console.log(`Buscando promotores em ${cidade}/${uf}`)

    // Normalizar a cidade para a busca (converter para maiúsculas e remover acentos)
    const cidadeNormalizada = normalizarTexto(cidade)
    console.log(`Cidade normalizada: ${cidadeNormalizada}`)

    // Primeiro, vamos buscar todas as lojas na cidade/UF especificada
    const lojas = await prisma.loja.findMany({
      where: {
        uf: uf,
        cidade: {
          contains: cidade,
          mode: "insensitive",
        },
      },
      include: {
        bandeira: true,
      },
    })

    console.log(`Encontradas ${lojas.length} lojas em ${cidade}/${uf}`)

    if (lojas.length === 0) {
      console.log("Nenhuma loja encontrada para esta cidade/UF")
      return []
    }

    // Extrair IDs das lojas encontradas
    const lojaIds = lojas.map((loja) => loja.id)

    // Buscar todos os promotores vinculados a essas lojas
    const promotorLojas = await prisma.promotorLoja.findMany({
      where: {
        loja_id: {
          in: lojaIds,
        },
      },
      include: {
        promotor: {
          include: {
            disponibilidades: true,
          },
        },
        loja: {
          include: {
            bandeira: true,
          },
        },
      },
    })

    console.log(`Encontrados ${promotorLojas.length} vínculos promotor-loja`)

    // Filtrar promotores ativos
    const promotorLojasAtivos = promotorLojas.filter((pl) => {
      const isActive = !pl.promotor.status_usuario || pl.promotor.status_usuario.toLowerCase().includes("ativo")
      if (!isActive) {
        console.log(
          `Promotor ${pl.promotor.id} (${pl.promotor.nome}) filtrado por status: ${pl.promotor.status_usuario}`,
        )
      }
      return isActive
    })

    console.log(`Após filtro de status: ${promotorLojasAtivos.length} promotores ativos`)

    // Aplicar filtros de bandeira e loja se necessário
    let filteredPromotores = promotorLojasAtivos

    if (bandeira !== "Todas") {
      filteredPromotores = filteredPromotores.filter((pl) => pl.loja.bandeira.nome === bandeira)
      console.log(`Após filtro de bandeira: ${filteredPromotores.length} promotores`)
    }

    if (loja !== "Todas") {
      filteredPromotores = filteredPromotores.filter((pl) => pl.loja.nome === loja)
      console.log(`Após filtro de loja: ${filteredPromotores.length} promotores`)
    }

    // Mapear para o formato esperado pelo frontend
    const result = filteredPromotores.map((pl) => {
      return {
        id: pl.promotor.id,
        nome: pl.promotor.nome,
        promotor: pl.promotor.nome,
        cpf: pl.promotor.cpf,
        familia: pl.promotor.familia,
        horasistema: pl.promotor.horasistema,
        cargo_campo: pl.promotor.cargo_campo,
        status_usuario: pl.promotor.status_usuario,
        cidade: pl.loja.cidade,
        uf: pl.loja.uf,
        bandeira: pl.loja.bandeira.nome,
        bandeira_id: pl.loja.bandeira.id,
        loja: pl.loja.nome,
        loja_id: pl.loja.id,
        disponibilidades: pl.promotor.disponibilidades,
      }
    })

    console.log(`Retornando ${result.length} promotores após todos os filtros`)

    // Converter quaisquer objetos Decimal para números simples
    const processedResult = convertDecimalToNumber(result)

    // Garantir que todos os objetos sejam serializáveis
    const serializableResult = JSON.parse(JSON.stringify(processedResult))

    return serializableResult
  } catch (error: any) {
    console.error("Erro ao buscar promotores por localização:", error)
    throw new Error(error.message || "Erro ao buscar promotores por localização")
  }
}

// Adicionar a função getBandeiras que será usada para buscar as bandeiras e seus IDs
export async function getBandeiras() {
  try {
    const bandeiras = await prisma.bandeira.findMany({
      orderBy: {
        nome: "asc",
      },
    })

    return bandeiras.map((bandeira) => ({
      id: bandeira.id,
      nome: bandeira.nome,
    }))
  } catch (error) {
    console.error("Erro ao buscar bandeiras:", error)
    return []
  }
}

// Adicione esta função para buscar lojas por bandeira
export async function getLojasPorBandeira(bandeiraId: number) {
  try {
    console.log(`Buscando lojas para bandeira ID: ${bandeiraId}`)

    // Verificar se a bandeira existe
    const bandeira = await prisma.bandeira.findUnique({
      where: {
        id: bandeiraId,
      },
    })

    if (!bandeira) {
      console.error(`Bandeira com ID ${bandeiraId} não encontrada`)
      return []
    }

    // Buscar todas as lojas desta bandeira
    const lojas = await prisma.loja.findMany({
      where: {
        bandeira_id: bandeiraId,
      },
      orderBy: {
        nome: "asc",
      },
    })

    console.log(`Encontradas ${lojas.length} lojas para bandeira ${bandeira.nome} (ID: ${bandeiraId})`)

    return lojas.map((loja) => ({
      id: loja.id,
      nome: loja.nome,
    }))
  } catch (error) {
    console.error("Erro ao buscar lojas por bandeira:", error)
    return []
  }
}

// Adicione esta função auxiliar para normalizar strings (remover acentos e converter para maiúsculas)
function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return ""

  // Converter para string, remover acentos e converter para maiúsculas
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toUpperCase()
}

// Modifique a função getCidadesPorUF para usar a normalização
export async function getCidadesPorUF(uf: string) {
  try {
    // Buscar todas as cidades das lojas para o UF especificado
    const cidadesLojas = await prisma.loja.findMany({
      where: {
        uf: uf,
        cidade: {
          not: "",
        },
      },
      select: {
        cidade: true,
      },
      distinct: ["cidade"],
    })

    // Mapa para armazenar cidades normalizadas e suas versões originais
    // Usamos um Map para garantir que não haja duplicatas
    const cidadesMap = new Map<string, string>()

    // Processar cidades das lojas
    cidadesLojas.forEach((l) => {
      if (l.cidade) {
        const cidadeNormalizada = normalizarTexto(l.cidade)
        if (!cidadesMap.has(cidadeNormalizada)) {
          cidadesMap.set(cidadeNormalizada, l.cidade)
        }
      }
    })

    // Converter o mapa para array
    const cidadesArray = Array.from(cidadesMap.entries()).map(([key, cidade], index) => ({
      id: index + 1,
      nome: cidade,
    }))

    // Ordenar cidades alfabeticamente
    return cidadesArray.sort((a, b) => a.nome.localeCompare(b.nome))
  } catch (error) {
    console.error("Erro ao buscar cidades por UF:", error)
    return []
  }
}

export async function getUFs() {
  try {
    console.log("Iniciando busca de UFs...")

    // Verificar a conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1`
    console.log("Conexão com o banco de dados OK")

    // Buscar UFs das lojas
    const ufsLojas = await prisma.loja.findMany({
      select: {
        uf: true,
      },
      distinct: ["uf"],
    })

    const ufsArray = ufsLojas.map((l) => l.uf).filter(Boolean) as string[]

    console.log("UFs encontradas:", ufsArray)

    // Se não houver UFs no banco, retornar uma lista padrão
    if (ufsArray.length === 0) {
      console.log("Nenhuma UF encontrada no banco, retornando lista padrão")
      const defaultUFs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "ES", "GO", "DF"]
      return defaultUFs.sort() // Ordenar a lista padrão alfabeticamente
    }

    // Ordenar UFs alfabeticamente
    return ufsArray.sort()
  } catch (error) {
    console.error("Erro detalhado ao buscar UFs:", error)
    // Retornar uma lista padrão de UFs em caso de erro (já ordenada)
    return ["BA", "DF", "ES", "GO", "MG", "PR", "RJ", "RS", "SC", "SP"]
  }
}

// Modificar a função getPeriodosByTipoDia para formatar corretamente as datas
export async function getPeriodosByTipoDia(tipoDia: string) {
  try {
    console.log(`Buscando períodos para tipo de dia: ${tipoDia}`)

    // Mapear os dias da semana para os tipos de dia no banco
    let tipoDiaBanco = tipoDia

    // Se for um dia de segunda a sexta, usar "segunda_sexta"
    if (["segunda", "terca", "quarta", "quinta", "sexta"].includes(tipoDia)) {
      tipoDiaBanco = "segunda_sexta"
    }

    // Buscar períodos usando Prisma
    const periodos = await prisma.periodo.findMany({
      where: {
        tipo_dia: tipoDiaBanco,
      },
      orderBy: {
        id: "asc",
      },
    })

    // Formatar os horários para exibição
    const formattedPeriodos = periodos.map((periodo) => {
      // Verificar se inicio e fim são objetos Date válidos e converter se necessário
      let inicio: Date
      let fim: Date

      try {
        // Tentar converter para Date se não for já uma data válida
        inicio = new Date(periodo.inicio)
        fim = new Date(periodo.fim)

        // Verificar se as datas são válidas
        if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
          throw new Error("Data inválida")
        }
      } catch (error) {
        // Fallback para valores padrão em caso de erro
        console.error(`Erro ao processar datas do período ${periodo.id}:`, error)
        inicio = new Date()
        fim = new Date()
      }

      return {
        ...periodo,
        inicioFormatado: formatDateTime(inicio),
        fimFormatado: formatDateTime(fim),
      }
    })

    console.log(`Períodos encontrados: ${formattedPeriodos.length}`)
    return formattedPeriodos
  } catch (error) {
    console.error(`Erro ao buscar períodos para ${tipoDia}:`, error)
    return []
  }
}

// Nova função para buscar o valor da hora para um promotor e período específicos usando SQL direto
export async function getValorHoraPromotorPeriodo(promotorId: number, periodoId: number) {
  try {
    console.log(`Buscando valor da hora para promotor ${promotorId} e período ${periodoId}`)

    // Garantir que os IDs sejam números
    const promotorIdNumber = Number(promotorId)
    const periodoIdNumber = Number(periodoId)

    // Verificar se os IDs são números válidos
    if (isNaN(promotorIdNumber) || isNaN(periodoIdNumber)) {
      console.error(`IDs inválidos: promotorId=${promotorId}, periodoId=${periodoId}`)
      return 40 // Valor padrão em caso de erro
    }

    // Buscar valor da hora usando Prisma
    const valorPromotorPeriodo = await prisma.valorPromotorPeriodo.findFirst({
      where: {
        promotor_id: promotorIdNumber,
        periodo_id: periodoIdNumber,
        data_fim: null, // Apenas valores ativos (sem data de fim)
      },
      orderBy: {
        data_inicio: "desc",
      },
    })

    if (!valorPromotorPeriodo) {
      console.log(`Nenhum valor encontrado, usando valor padrão`)
      return 40 // Valor padrão caso não encontre
    }

    console.log(`Valor encontrado: R$ ${valorPromotorPeriodo.valor_hora}`)
    return valorPromotorPeriodo.valor_hora
  } catch (error: any) {
    console.error(`Erro ao buscar valor da hora:`, error)
    return 40 // Valor padrão em caso de erro
  }
}

// Adicione uma função para depurar o banco de dados
export async function debugDatabase() {
  try {
    console.log("Iniciando debug do banco de dados...")

    // Verificar total de promotores
    const totalPromotores = await prisma.promotor.count()
    console.log(`Total de promotores: ${totalPromotores}`)

    // Verificar UFs disponíveis
    const ufs = await prisma.loja.findMany({
      select: { uf: true },
      distinct: ["uf"],
    })
    console.log(`UFs disponíveis: ${JSON.stringify(ufs)}`)

    // Verificar algumas cidades por UF
    for (const ufObj of ufs) {
      const uf = ufObj.uf
      const cidades = await prisma.loja.findMany({
        where: {
          uf: uf,
        },
        select: {
          cidade: true,
        },
        distinct: ["cidade"],
        take: 5,
      })
      console.log(`Cidades em ${uf}: ${JSON.stringify(cidades)}`)
    }

    // Verificar bandeiras
    const bandeiras = await prisma.bandeira.findMany({
      select: { id: true, nome: true },
      take: 10,
    })
    console.log(`Bandeiras: ${JSON.stringify(bandeiras)}`)

    // Verificar lojas
    const lojas = await prisma.loja.findMany({
      select: { id: true, nome: true, bandeira_id: true, cidade: true, uf: true },
      take: 10,
    })
    console.log(`Lojas: ${JSON.stringify(lojas)}`)

    // Verificar relações promotor-loja
    const promotorLojas = await prisma.promotorLoja.count()
    console.log(`Total de relações promotor-loja: ${promotorLojas}`)

    return {
      success: true,
      totalPromotores,
      ufs: ufs,
      bandeiras,
      lojas: lojas.length,
      promotorLojas,
    }
  } catch (error) {
    console.error("Erro ao depurar banco de dados:", error)
    return {
      success: false,
      error: String(error),
    }
  }
}
