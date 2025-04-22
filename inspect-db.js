// Este script inspeciona a estrutura do banco de dados
const { PrismaClient } = require("@prisma/client")

async function inspectDatabase() {
  const prisma = new PrismaClient()

  try {
    // Listar todas as tabelas disponíveis
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `

    console.log("Tabelas disponíveis:", tables)

    // Para cada tabela, listar suas colunas
    for (const table of tables) {
      const tableName = table.table_name

      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      `

      console.log(`\nColunas da tabela ${tableName}:`, columns)
    }
  } catch (error) {
    console.error("Erro ao inspecionar banco de dados:", error)
  } finally {
    await prisma.$disconnect()
  }
}

inspectDatabase()
