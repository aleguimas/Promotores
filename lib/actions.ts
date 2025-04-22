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
  valor_hora: number
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

// Função auxiliar para converter Decimal para Number
function convertDecimalToNumber(value: any): any {
  if (value === null || value === undefined) {
    return value
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

export async function searchCandidatesByLocation({
  uf,
  cidade,
  bandeira = "Todas",
  loja = "Todas",
}: { uf: string; cidade: string; bandeira?: string; loja?: string }) {
  try {
    console.log(`Buscando promotores em ${cidade}/${uf}`)

    // Usar SQL direto para evitar problemas de tipo com o Prisma
    const promotoresRaw = await prisma.$queryRaw`
      SELECT 
        p.id, p.nome, p.cpf, p.endereco, p.bairro, p.cidade, p.uf, p.cep, 
        p.familia, p.horasistema, p.cargo_campo, p.status, 
        p.latitude::float as latitude, p.longitude::float as longitude
      FROM 
        promotores p
      WHERE 
        p.cidade = ${cidade} AND p.uf = ${uf}
    `

    // Se não há promotores, retornar array vazio
    if (!promotoresRaw || (promotoresRaw as any[]).length === 0) {
      console.log("Nenhum promotor encontrado")
      return []
    }

    const promotores = promotoresRaw as any[]
    console.log(`Encontrados ${promotores.length} promotores`)

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

    // Filtrar por bandeira e loja se necessário
    let filteredPromotores = [...promotores]

    if (bandeira !== "Todas") {
      filteredPromotores = filteredPromotores.filter((promotor) => {
        const lojas = promotorLojasMap.get(promotor.id) || []
        return lojas.some((l) => l.bandeira_nome === bandeira)
      })
    }

    if (loja !== "Todas") {
      filteredPromotores = filteredPromotores.filter((promotor) => {
        const lojas = promotorLojasMap.get(promotor.id) || []
        return lojas.some((l) => l.loja_nome === loja)
      })
    }

    // Mapear para o formato esperado pelo frontend
    const result = filteredPromotores.map((promotor) => {
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

    // Converter quaisquer objetos Decimal para números simples
    return convertDecimalToNumber(result)
  } catch (error: any) {
    console.error("Erro ao buscar promotores por localização:", error)
    throw new Error(error.message || "Erro ao buscar promotores por localização")
  }
}

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

export async function getLojasPorBandeira(bandeiraId: number) {
  try {
    const lojas = await prisma.loja.findMany({
      where: {
        bandeira_id: bandeiraId,
      },
      orderBy: {
        nome: "asc",
      },
    })

    return lojas.map((loja) => ({
      id: loja.id,
      nome: loja.nome,
    }))
  } catch (error) {
    console.error("Erro ao buscar lojas por bandeira:", error)
    return []
  }
}

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

    // Combinar e remover duplicatas
    const todasCidades = new Set([
      ...cidadesPromotores.map((p) => p.cidade).filter(Boolean),
      ...cidadesLojas.map((l) => l.cidade).filter(Boolean),
    ] as string[])

    // Converter para o formato esperado
    const cidadesArray = Array.from(todasCidades).map((cidade, index) => ({
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

    // Usar SQL direto para evitar problemas com o Prisma
    const valores = await prisma.$queryRaw<ValorHoraResult[]>`
      SELECT valor_hora
      FROM valores_promotor_periodo
      WHERE promotor_id = ${promotorId}
      AND periodo_id = ${periodoId}
      AND (data_fim IS NULL OR data_fim > NOW())
      ORDER BY data_inicio DESC
      LIMIT 1
    `

    if (!valores || valores.length === 0) {
      console.log(`Nenhum valor encontrado, usando valor padrão`)
      return 40 // Valor padrão caso não encontre
    }

    console.log(`Valor encontrado: R$ ${valores[0].valor_hora}`)
    return valores[0].valor_hora
  } catch (error) {
    console.error(`Erro ao buscar valor da hora:`, error)
    return 40 // Valor padrão em caso de erro
  }
}
