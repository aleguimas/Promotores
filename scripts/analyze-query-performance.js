// Este script analisa o desempenho das principais consultas do portal
const { PrismaClient } = require("@prisma/client")

async function analyzeQueryPerformance() {
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  })

  try {
    console.log("Analisando desempenho das principais consultas do portal...")

    // Habilitar estatísticas de consulta
    await prisma.$executeRaw`SET track_io_timing = on`

    // 1. Analisar busca de promotores por localização
    console.log("\n1. Analisando busca de promotores por localização...")
    const cidade = "SAO PAULO"
    const uf = "SP"

    const localizacaoExplain = await prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT p.id, p.nome, l.cidade, l.uf, b.nome as bandeira, l.nome as loja
      FROM promotores.promotores p
      JOIN promotores.promotor_loja pl ON p.id = pl.promotor_id
      JOIN promotores.lojas l ON pl.loja_id = l.id
      JOIN promotores.bandeiras b ON l.bandeira_id = b.id
      WHERE l.cidade = ${cidade} AND l.uf = ${uf}
      LIMIT 10
    `
    console.log(localizacaoExplain)

    // 2. Analisar filtro por bandeira
    console.log("\n2. Analisando filtro por bandeira...")
    const bandeiraExplain = await prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT p.id, p.nome, l.cidade, l.uf, b.nome as bandeira, l.nome as loja
      FROM promotores.promotores p
      JOIN promotores.promotor_loja pl ON p.id = pl.promotor_id
      JOIN promotores.lojas l ON pl.loja_id = l.id
      JOIN promotores.bandeiras b ON l.bandeira_id = b.id
      WHERE b.nome = 'Supermercado A'
      LIMIT 10
    `
    console.log(bandeiraExplain)

    // 3. Analisar busca de períodos por tipo de dia
    console.log("\n3. Analisando busca de períodos por tipo de dia...")
    const periodosExplain = await prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT * FROM promotores.periodos
      WHERE tipo_dia = 'segunda_sexta'
    `
    console.log(periodosExplain)

    // 4. Analisar busca de valores por promotor e período
    console.log("\n4. Analisando busca de valores por promotor e período...")
    const valoresExplain = await prisma.$queryRaw`
      EXPLAIN ANALYZE
      SELECT * FROM promotores.valores_promotor_periodo
      WHERE promotor_id = 1 AND periodo_id = 1
      ORDER BY data_inicio DESC
      LIMIT 1
    `
    console.log(valoresExplain)

    console.log("\n✅ Análise de desempenho concluída!")
    console.log("Verifique os resultados acima para identificar possíveis gargalos.")
  } catch (error) {
    console.error("❌ Erro ao analisar desempenho:", error)
  } finally {
    await prisma.$disconnect()
  }
}

analyzeQueryPerformance()
