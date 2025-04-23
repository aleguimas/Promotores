"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

// Define interfaces for our raw query results
interface PeriodoResult {
  id: number
  tipo_dia: string
  inicio: string
  fim: string
  descricao: string
}

interface ValorHoraResult {
  valor_hora: number | string | any // Modificado para aceitar diferentes tipos
}

// Define interfaces for our data models
interface Promotor {
  id: number
  nome: string
  cpf?: string | null
  endereco?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
  cep?: string | null
  familia?: string | null
  horasistema?: string | null
  cargo_campo?: string | null
  status?: string | null
  latitude?: number | null
  longitude?: number | null
  disponibilidades?: Disponibilidade[]
}

interface Disponibilidade {
  id: number
  promotor_id: number
  segunda: string
  terca: string
  quarta: string
  quinta: string
  sexta: string
  sabado: string
  domingo: string
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
  bandeira?: Bandeira
}

interface PromotorLoja {
  id: number
  promotor_id: number
  loja_id: number
  loja?: Loja
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

// Modifique a função searchCandidatesByLocation para garantir que os dados estejam sendo processados corretamente
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

    // Primeiro, vamos buscar todos os promotores da UF, sem filtrar por cidade ainda
    const promotoresRaw = await prisma.$queryRaw`
      SELECT 
        p.id, p.nome, p.cpf, p.endereco, p.bairro, p.cidade, p.uf, p.cep, 
        p.familia, p.horasistema, p.cargo_campo, p.status_usuario, 
        p.latitude::float as latitude, p.longitude::float as longitude
      FROM 
        promotores p
      WHERE 
        p.uf = ${uf}
    `

    // Log para debug
    console.log(`Encontrados ${(promotoresRaw as any[]).length} promotores na UF ${uf}`)

    // Verificar se há promotores com status_usuario nulo
    const promotoresSemStatus = (promotoresRaw as any[]).filter((p) => p.status_usuario === null)
    console.log(`Promotores sem status: ${promotoresSemStatus.length}`)

    // Agora vamos filtrar por cidade manualmente para ter mais controle
    let promotores = (promotoresRaw as any[]).filter((p) => {
      if (!p.cidade) return false

      // Normalizar a cidade do promotor para comparação
      const cidadePromotorNormalizada = normalizarTexto(p.cidade)

      // Verificar se as cidades correspondem (ignorando case e acentos)
      return cidadePromotorNormalizada === cidadeNormalizada
    })

    console.log(`Após filtro de cidade: ${promotores.length} promotores em ${cidade}/${uf}`)

    // Se não encontrou nenhum promotor, vamos tentar uma busca mais flexível
    if (promotores.length === 0) {
      console.log("Tentando busca flexível por cidade")
      promotores = (promotoresRaw as any[]).filter((p) => {
        if (!p.cidade) return false

        // Normalizar a cidade do promotor para comparação
        const cidadePromotorNormalizada = normalizarTexto(p.cidade)

        // Verificar se uma cidade contém a outra (busca mais flexível)
        return (
          cidadePromotorNormalizada.includes(cidadeNormalizada) || cidadeNormalizada.includes(cidadePromotorNormalizada)
        )
      })

      console.log(`Busca flexível encontrou: ${promotores.length} promotores`)
    }

    // Se ainda não encontrou nenhum promotor, vamos usar a cidade original sem normalização
    if (promotores.length === 0) {
      console.log("Tentando busca direta sem normalização")
      promotores = (promotoresRaw as any[]).filter((p) => p.cidade === cidade)
      console.log(`Busca direta encontrou: ${promotores.length} promotores`)
    }

    // Se ainda não encontrou nenhum promotor, retornar array vazio
    if (promotores.length === 0) {
      console.log("Nenhum promotor encontrado para esta cidade/UF")
      return []
    }

    // Buscar disponibilidades separadamente
    const disponibilidades = await Promise.all(
      promotores.map(async (promotor) => {
        try {
          const disp = await prisma.$queryRaw`
            SELECT 
              id, promotor_id, 
              segunda::text as segunda, 
              terca::text as terca, 
              quarta::text as quarta, 
              quinta::text as quinta, 
              sexta::text as sexta, 
              sabado::text as sabado, 
              domingo::text as domingo
            FROM 
              disponibilidades
            WHERE 
              promotor_id = ${promotor.id}
          `
          return disp as any[]
        } catch (err) {
          console.error(`Erro ao buscar disponibilidade para promotor ${promotor.id}:`, err)
          return []
        }
      }),
    )

    // Verificar se todas as disponibilidades foram encontradas
    const promotoresSemDisponibilidade = disponibilidades.filter((d) => d.length === 0).length
    console.log(`Promotores sem disponibilidade: ${promotoresSemDisponibilidade}`)

    // Associar disponibilidades aos promotores
    promotores.forEach((promotor, index) => {
      promotor.disponibilidades = disponibilidades[index]
    })

    // Criar uma lista de IDs de promotores para usar na consulta SQL
    const promotorIds = promotores.map((p) => p.id)

    // Buscar todas as relações promotor-loja
    let promotorLojas: any[] = []

    if (promotorIds.length > 0) {
      promotorLojas = await prisma.$queryRaw`
        SELECT pl.promotor_id, pl.loja_id, l.nome as loja_nome, b.nome as bandeira_nome, b.id as bandeira_id
        FROM promotor_loja pl
        JOIN lojas l ON pl.loja_id = l.id
        JOIN bandeiras b ON l.bandeira_id = b.id
        WHERE pl.promotor_id IN (${Prisma.join(promotorIds)})
      `
    }

    console.log(`Encontradas ${promotorLojas.length} relações promotor-loja`)

    // Criar um mapa de promotor_id para suas lojas e bandeiras
    const promotorLojasMap = new Map<
      number,
      Array<{ loja_id: number; loja_nome: string; bandeira_id: number; bandeira_nome: string }>
    >()

    promotorLojas.forEach((pl) => {
      if (!promotorLojasMap.has(pl.promotor_id)) {
        promotorLojasMap.set(pl.promotor_id, [])
      }
      promotorLojasMap.get(pl.promotor_id)?.push({
        loja_id: pl.loja_id,
        loja_nome: pl.loja_nome,
        bandeira_id: pl.bandeira_id,
        bandeira_nome: pl.bandeira_nome,
      })
    })

    // Verificar promotores sem lojas associadas
    const promotoresSemLojas = promotores.filter((p) => !promotorLojasMap.has(p.id)).length
    console.log(`Promotores sem lojas associadas: ${promotoresSemLojas}`)

    // Mapear para o formato esperado pelo frontend
    let result = promotores.map((promotor) => {
      // Pegar todas as lojas associadas ao promotor
      const promotorLojas = promotorLojasMap.get(promotor.id) || []

      // Se não houver lojas associadas, usar valores padrão
      if (promotorLojas.length === 0) {
        return {
          ...promotor,
          promotor: promotor.nome,
          bandeira: "",
          loja: "",
          bandeira_id: null,
          loja_id: null,
        }
      }

      // Se houver filtro de bandeira e loja, tentar encontrar a combinação específica
      if (bandeira !== "Todas" && loja !== "Todas") {
        const matchingLoja = promotorLojas.find((l) => l.bandeira_nome === bandeira && l.loja_nome === loja)

        if (matchingLoja) {
          return {
            ...promotor,
            promotor: promotor.nome,
            bandeira: matchingLoja.bandeira_nome,
            loja: matchingLoja.loja_nome,
            bandeira_id: matchingLoja.bandeira_id,
            loja_id: matchingLoja.loja_id,
          }
        }
      }

      // Se houver apenas filtro de bandeira, tentar encontrar uma loja dessa bandeira
      if (bandeira !== "Todas") {
        const matchingLoja = promotorLojas.find((l) => l.bandeira_nome === bandeira)

        if (matchingLoja) {
          return {
            ...promotor,
            promotor: promotor.nome,
            bandeira: matchingLoja.bandeira_nome,
            loja: matchingLoja.loja_nome,
            bandeira_id: matchingLoja.bandeira_id,
            loja_id: matchingLoja.loja_id,
          }
        }
      }

      // Se houver apenas filtro de loja, tentar encontrar essa loja específica
      if (loja !== "Todas") {
        const matchingLoja = promotorLojas.find((l) => l.loja_nome === loja)

        if (matchingLoja) {
          return {
            ...promotor,
            promotor: promotor.nome,
            bandeira: matchingLoja.bandeira_nome,
            loja: matchingLoja.loja_nome,
            bandeira_id: matchingLoja.bandeira_id,
            loja_id: matchingLoja.loja_id,
          }
        }
      }

      // Caso contrário, usar a primeira loja associada
      const firstLoja = promotorLojas[0]

      return {
        ...promotor,
        promotor: promotor.nome,
        bandeira: firstLoja.bandeira_nome,
        loja: firstLoja.loja_nome,
        bandeira_id: firstLoja.bandeira_id,
        loja_id: firstLoja.loja_id,
      }
    })

    // Aplicar filtros de bandeira e loja
    if (bandeira !== "Todas") {
      result = result.filter((p) => p.bandeira === bandeira)
    }

    if (loja !== "Todas") {
      result = result.filter((p) => p.loja === loja)
    }

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
    // Primeiro, buscar todas as cidades dos promotores
    const cidadesPromotores = await prisma.promotor.findMany({
      where: {
        uf: uf,
        cidade: {
          not: null,
        },
      },
      select: {
        cidade: true,
      },
      distinct: ["cidade"],
    })

    // Depois, buscar todas as cidades das lojas
    const cidadesLojas = await prisma.loja.findMany({
      where: {
        uf: uf,
      },
      select: {
        cidade: true,
      },
      distinct: ["cidade"],
    })

    // Mapa para armazenar cidades normalizadas e suas versões originais
    // Usamos um Map para garantir que não haja duplicatas
    const cidadesMap = new Map<string, string>()

    // Processar cidades dos promotores
    cidadesPromotores.forEach((p) => {
      if (p.cidade) {
        const cidadeNormalizada = normalizarTexto(p.cidade)
        // Se a cidade já existe no mapa, mantemos a primeira versão encontrada
        if (!cidadesMap.has(cidadeNormalizada)) {
          cidadesMap.set(cidadeNormalizada, cidadeNormalizada)
        }
      }
    })

    // Processar cidades das lojas
    cidadesLojas.forEach((l) => {
      if (l.cidade) {
        const cidadeNormalizada = normalizarTexto(l.cidade)
        if (!cidadesMap.has(cidadeNormalizada)) {
          cidadesMap.set(cidadeNormalizada, cidadeNormalizada)
        }
      }
    })

    // Converter o mapa para array
    const cidadesArray = Array.from(cidadesMap.values()).map((cidade, index) => ({
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

    // Buscar UFs dos promotores
    const ufsPromotores = await prisma.promotor.findMany({
      select: {
        uf: true,
      },
      distinct: ["uf"],
    })

    // Buscar UFs das lojas
    const ufsLojas = await prisma.loja.findMany({
      select: {
        uf: true,
      },
      distinct: ["uf"],
    })

    // Combinar e remover duplicatas
    const todasUFs = new Set([
      ...ufsPromotores.map((p) => p.uf).filter(Boolean),
      ...ufsLojas.map((l) => l.uf).filter(Boolean),
    ] as string[])

    const ufsArray = Array.from(todasUFs)

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

export async function searchCandidatesByCEP(cep: string) {
  try {
    // Remover caracteres não numéricos do CEP
    const cepNumerico = cep.replace(/\D/g, "")

    // Usar SQL direto para evitar problemas de tipo com o Prisma
    const promotoresRaw = await prisma.$queryRaw`
      SELECT 
        p.id, p.nome, p.cpf, p.endereco, p.bairro, p.cidade, p.uf, p.cep, 
        p.familia, p.horasistema, p.cargo_campo, p.status, p.latitude, p.longitude
      FROM 
        promotores p
      WHERE 
        p.cep = ${cepNumerico}
    `

    // Se não há promotores, retornar array vazio
    if (!promotoresRaw || (promotoresRaw as any[]).length === 0) {
      return []
    }

    const promotores = promotoresRaw as any[]

    // Buscar disponibilidades separadamente
    const disponibilidades = await Promise.all(
      promotores.map(async (promotor) => {
        try {
          const disp = await prisma.$queryRaw`
            SELECT 
              id, promotor_id, 
              segunda::text as segunda, 
              terca::text as terca, 
              quarta::text as quarta, 
              quinta::text as quinta, 
              sexta::text as sexta, 
              sabado::text as sabado, 
              domingo::text as domingo
            FROM 
              disponibilidades
            WHERE 
              promotor_id = ${promotor.id}
          `
          return disp as any[]
        } catch (err) {
          console.error(`Erro ao buscar disponibilidade para promotor ${promotor.id}:`, err)
          return []
        }
      }),
    )

    // Associar disponibilidades aos promotores
    promotores.forEach((promotor, index) => {
      promotor.disponibilidades = disponibilidades[index]
    })

    // Criar uma lista de IDs de promotores para usar na consulta SQL
    const promotorIds = promotores.map((p) => p.id)

    // Buscar todas as relações promotor-loja usando IN ao invés de join
    const promotorLojas = await prisma.$queryRaw<
      Array<{ promotor_id: number; loja_id: number; loja_nome: string; bandeira_nome: string }>
    >`
      SELECT pl.promotor_id, pl.loja_id, l.nome as loja_nome, b.nome as bandeira_nome
      FROM promotor_loja pl
      JOIN lojas l ON pl.loja_id = l.id
      JOIN bandeiras b ON l.bandeira_id = b.id
      WHERE pl.promotor_id IN (${Prisma.join(promotorIds)})
    `

    // Criar um mapa de promotor_id para suas lojas e bandeiras
    const promotorLojasMap = new Map<number, Array<{ loja_nome: string; bandeira_nome: string }>>()

    promotorLojas.forEach((pl) => {
      if (!promotorLojasMap.has(pl.promotor_id)) {
        promotorLojasMap.set(pl.promotor_id, [])
      }
      promotorLojasMap.get(pl.promotor_id)?.push({
        loja_nome: pl.loja_nome,
        bandeira_nome: pl.bandeira_nome,
      })
    })

    // Mapear para o formato esperado pelo frontend
    return promotores.map((promotor) => {
      // Pegar a primeira loja associada ao promotor (ou valores padrão se não houver)
      const promotorLojas = promotorLojasMap.get(promotor.id) || []
      const firstLoja = promotorLojas[0] || { loja_nome: "", bandeira_nome: "" }

      return {
        ...promotor,
        promotor: promotor.nome,
        status_usuario: promotor.status,
        bandeira: firstLoja.bandeira_nome,
        loja: firstLoja.loja_nome,
      }
    })
  } catch (error: any) {
    console.error("Erro ao buscar promotores por CEP:", error)
    throw new Error(error.message || "Erro ao buscar promotores por CEP")
  }
}

export async function getLocationInfoFromCEP(cep: string): Promise<{ cidade: string; uf: string }> {
  try {
    // Remover caracteres não numéricos do CEP
    const cepNumerico = cep.replace(/\D/g, "")

    // Usar a API do ViaCEP para obter o endereço
    const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`)
    const viaCepData = await viaCepResponse.json()

    if (viaCepData.erro) {
      throw new Error("CEP não encontrado")
    }

    return {
      cidade: viaCepData.localidade,
      uf: viaCepData.uf,
    }
  } catch (error: any) {
    console.error("Erro ao obter informações do CEP:", error)
    throw new Error(error.message || "Erro ao obter informações do CEP")
  }
}

// Nova função para buscar períodos por tipo de dia usando SQL direto
export async function getPeriodosByTipoDia(tipoDia: string) {
  try {
    console.log(`Buscando períodos para tipo de dia: ${tipoDia}`)

    // Mapear os dias da semana para os tipos de dia no banco
    let tipoDiaBanco = tipoDia

    // Se for um dia de segunda a sexta, usar "segunda_sexta"
    if (["segunda", "terca", "quarta", "quinta", "sexta"].includes(tipoDia)) {
      tipoDiaBanco = "segunda_sexta"
    }

    // Usar SQL direto para evitar problemas com o Prisma
    const periodos = await prisma.$queryRaw<PeriodoResult[]>`
      SELECT id, tipo_dia, inicio, fim, descricao
      FROM periodos
      WHERE tipo_dia = ${tipoDiaBanco}
      ORDER BY id ASC
    `

    console.log(`Períodos encontrados: ${periodos.length}`)
    return periodos
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

    // Usar SQL direto com conversão explícita de tipos
    const valores = await prisma.$queryRaw<ValorHoraResult[]>`
      SELECT valor_hora::float as valor_hora
      FROM valores_promotor_periodo
      WHERE promotor_id = ${promotorIdNumber}::integer
      AND periodo_id = ${periodoIdNumber}::integer
      AND (data_fim IS NULL OR data_fim > NOW())
      ORDER BY data_inicio DESC
      LIMIT 1
    `

    if (!valores || valores.length === 0) {
      console.log(`Nenhum valor encontrado, usando valor padrão`)
      return 40 // Valor padrão caso não encontre
    }

    // Converter explicitamente para número JavaScript
    const valorHora = Number(valores[0].valor_hora)
    console.log(`Valor encontrado: R$ ${valorHora}`)

    // Verificar se a conversão foi bem-sucedida
    if (isNaN(valorHora)) {
      console.error(`Erro ao converter valor da hora para número: ${valores[0].valor_hora}`)
      return 40 // Valor padrão em caso de erro
    }

    return valorHora
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
    const ufs = await prisma.$queryRaw`SELECT DISTINCT uf FROM promotores WHERE uf IS NOT NULL`
    console.log(`UFs disponíveis: ${JSON.stringify(ufs)}`)

    // Verificar algumas cidades por UF
    for (const ufObj of ufs as any[]) {
      const uf = ufObj.uf
      const cidades = await prisma.$queryRaw`
        SELECT DISTINCT cidade FROM promotores 
        WHERE uf = ${uf} AND cidade IS NOT NULL 
        LIMIT 5
      `
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
