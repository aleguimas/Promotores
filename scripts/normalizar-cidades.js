// Este script normaliza os nomes das cidades no banco de dados
const { PrismaClient } = require("@prisma/client")

async function normalizarCidades() {
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  })

  try {
    console.log("Iniciando normalização de cidades...")

    // Função para normalizar texto (remover acentos e converter para maiúsculas)
    function normalizarTexto(texto) {
      if (!texto) return ""

      return texto
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .toUpperCase()
    }

    // 1. Buscar todas as cidades distintas dos promotores
    console.log("Buscando cidades dos promotores...")
    const cidadesPromotores = await prisma.$queryRaw`
      SELECT DISTINCT cidade FROM promotores WHERE cidade IS NOT NULL
    `

    // 2. Buscar todas as cidades distintas das lojas
    console.log("Buscando cidades das lojas...")
    const cidadesLojas = await prisma.$queryRaw`
      SELECT DISTINCT cidade FROM lojas WHERE cidade IS NOT NULL
    `

    // 3. Criar um mapa de normalização (cidade original -> cidade normalizada)
    const mapaNormalizacao = new Map()

    // Processar cidades dos promotores
    cidadesPromotores.forEach((item) => {
      if (item.cidade) {
        const cidadeNormalizada = normalizarTexto(item.cidade)
        mapaNormalizacao.set(item.cidade, cidadeNormalizada)
      }
    })

    // Processar cidades das lojas
    cidadesLojas.forEach((item) => {
      if (item.cidade) {
        const cidadeNormalizada = normalizarTexto(item.cidade)
        mapaNormalizacao.set(item.cidade, cidadeNormalizada)
      }
    })

    console.log(`Total de ${mapaNormalizacao.size} cidades para normalizar`)

    // 4. Atualizar as cidades dos promotores
    console.log("Atualizando cidades dos promotores...")
    let contadorPromotores = 0

    for (const [cidadeOriginal, cidadeNormalizada] of mapaNormalizacao.entries()) {
      if (cidadeOriginal !== cidadeNormalizada) {
        const resultado = await prisma.$executeRaw`
          UPDATE promotores SET cidade = ${cidadeNormalizada} WHERE cidade = ${cidadeOriginal}
        `
        contadorPromotores += resultado
      }
    }

    console.log(`${contadorPromotores} registros de promotores atualizados`)

    // 5. Atualizar as cidades das lojas
    console.log("Atualizando cidades das lojas...")
    let contadorLojas = 0

    for (const [cidadeOriginal, cidadeNormalizada] of mapaNormalizacao.entries()) {
      if (cidadeOriginal !== cidadeNormalizada) {
        const resultado = await prisma.$executeRaw`
          UPDATE lojas SET cidade = ${cidadeNormalizada} WHERE cidade = ${cidadeOriginal}
        `
        contadorLojas += resultado
      }
    }

    console.log(`${contadorLojas} registros de lojas atualizados`)

    // 6. Verificar se há cidades duplicadas após a normalização
    console.log("Verificando cidades duplicadas após normalização...")

    const cidadesNormalizadas = await prisma.$queryRaw`
      SELECT cidade, COUNT(*) as total FROM (
        SELECT DISTINCT cidade FROM promotores WHERE cidade IS NOT NULL
        UNION
        SELECT DISTINCT cidade FROM lojas WHERE cidade IS NOT NULL
      ) as cidades
      GROUP BY cidade
      HAVING COUNT(*) > 1
    `

    if (cidadesNormalizadas.length > 0) {
      console.log("Ainda existem cidades duplicadas após normalização:")
      console.log(cidadesNormalizadas)
    } else {
      console.log("Não há mais cidades duplicadas após normalização!")
    }

    console.log("Normalização de cidades concluída com sucesso!")
  } catch (error) {
    console.error("Erro ao normalizar cidades:", error)
  } finally {
    await prisma.$disconnect()
  }
}

normalizarCidades()
