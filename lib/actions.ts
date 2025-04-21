"use server"

import prisma from "@/lib/prisma"

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
                periodo: diaSelecionado.period,
              },
            })

            if (!periodo) {
              throw new Error(`Período não encontrado: ${diaSelecionado.period}`)
            }

            // Calcular o valor da hora (simulação)
            const valor_hora = 40 // Substitua pela lógica real de cálculo

            // Calcular o valor total
            const horas = Number(diaSelecionado.hours)
            const valor_total = horas * valor_hora

            await prisma.selecaoPromotor.create({
              data: {
                pedido_id: pedido.id,
                promotor_id: promotorId,
                dia_semana: dia,
                periodo_id: periodo.id,
                horas: horas,
                valor_hora: valor_hora,
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

export async function searchCandidatesByLocation({
  uf,
  cidade,
  bandeira = "Todas",
  loja = "Todas",
}: { uf: string; cidade: string; bandeira?: string; loja?: string }) {
  try {
    const whereClause: any = {
      uf: uf,
      cidade: cidade,
    }

    // Mantemos os filtros de bandeira e loja como opcionais
    if (bandeira !== "Todas") {
      whereClause.bandeira = bandeira
    }

    if (loja !== "Todas") {
      whereClause.loja = loja
    }

    const promotores = await prisma.promotor.findMany({
      where: whereClause,
      include: {
        disponibilidades: true,
      },
    })

    return promotores.map((promotor) => ({
      ...promotor,
      promotor: promotor.nome, // Mapear o campo 'nome' para 'promotor' para compatibilidade
      status_usuario: promotor.status,
      horasistema: promotor.horas_sistema,
    }))
  } catch (error: any) {
    console.error("Erro ao buscar promotores por localização:", error)
    throw new Error(error.message || "Erro ao buscar promotores por localização")
  }
}

export async function getBandeiras() {
  try {
    const bandeiras = await prisma.promotor.findMany({
      select: {
        bandeira: true,
      },
      distinct: ["bandeira"],
    })

    // Remove null or undefined bandeiras and create a unique set
    const uniqueBandeiras = new Set(bandeiras.map((b) => b.bandeira).filter(Boolean))

    // Convert the set to an array of objects with id and nome
    const bandeirasArray = Array.from(uniqueBandeiras).map((bandeira, index) => ({
      id: index + 1,
      nome: String(bandeira), // Ensure it's a string
    }))

    // Ordenar bandeiras alfabeticamente
    return bandeirasArray.sort((a, b) => a.nome.localeCompare(b.nome))
  } catch (error) {
    console.error("Erro ao buscar bandeiras:", error)
    return []
  }
}

export async function getLojasPorBandeira(bandeiraId: number) {
  try {
    // Simulação de busca de lojas por bandeira (substitua pela lógica real)
    const lojas = await prisma.promotor.findMany({
      where: {
        bandeira: {
          not: null,
        },
      },
      select: {
        loja: true,
      },
      distinct: ["loja"],
    })

    const uniqueLojas = new Set(lojas.map((l) => l.loja).filter(Boolean))

    const lojasArray = Array.from(uniqueLojas).map((loja, index) => ({
      id: index + 1,
      nome: String(loja),
    }))

    // Ordenar lojas alfabeticamente
    return lojasArray.sort((a, b) => a.nome.localeCompare(b.nome))
  } catch (error) {
    console.error("Erro ao buscar lojas por bandeira:", error)
    return []
  }
}

export async function getCidadesPorUF(uf: string) {
  try {
    const cidades = await prisma.promotor.findMany({
      where: {
        uf: uf,
      },
      select: {
        cidade: true,
      },
      distinct: ["cidade"],
    })

    const uniqueCidades = new Set(cidades.map((c) => c.cidade).filter(Boolean))

    const cidadesArray = Array.from(uniqueCidades).map((cidade, index) => ({
      id: index + 1,
      nome: String(cidade),
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

    // Buscar UFs
    const ufs = await prisma.promotor.findMany({
      select: {
        uf: true,
      },
      distinct: ["uf"],
    })

    console.log("UFs encontradas:", ufs)

    // Se não houver UFs no banco, retornar uma lista padrão
    if (!ufs.length) {
      console.log("Nenhuma UF encontrada no banco, retornando lista padrão")
      const defaultUFs = ["SP", "RJ", "MG", "RS", "PR", "SC", "BA", "ES", "GO", "DF"]
      return defaultUFs.sort() // Ordenar a lista padrão alfabeticamente
    }

    const filteredUfs = ufs.map((uf) => uf.uf).filter(Boolean) as string[]

    console.log("UFs filtradas:", filteredUfs)

    // Ordenar UFs alfabeticamente
    return filteredUfs.sort()
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

    // Buscar promotores que atendem a esse CEP (simulação)
    const promotores = await prisma.promotor.findMany({
      where: {
        cidade: {
          not: null,
        },
      },
      include: {
        disponibilidades: true,
      },
    })

    return promotores.map((promotor) => ({
      ...promotor,
      promotor: promotor.nome, // Mapear o campo 'nome' para 'promotor' para compatibilidade
      status_usuario: promotor.status,
      horasistema: promotor.horas_sistema,
    }))
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
