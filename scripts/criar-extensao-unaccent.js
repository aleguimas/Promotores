// Este script cria a extensão unaccent no PostgreSQL se ela não existir
const { PrismaClient } = require("@prisma/client")

async function criarExtensaoUnaccent() {
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  })

  try {
    console.log("Verificando se a extensão unaccent está disponível...")

    // Verificar se a extensão já está instalada
    const extensaoExistente = await prisma.$queryRaw`
      SELECT 1 FROM pg_extension WHERE extname = 'unaccent'
    `

    if (extensaoExistente && extensaoExistente.length > 0) {
      console.log("A extensão unaccent já está instalada.")
      return
    }

    // Criar a extensão
    console.log("Instalando a extensão unaccent...")
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS unaccent`

    console.log("Extensão unaccent instalada com sucesso!")

    // Testar a função
    const teste = await prisma.$queryRaw`SELECT unaccent('São Paulo') as resultado`
    console.log("Teste de remoção de acentos:", teste[0].resultado)
  } catch (error) {
    console.error("Erro ao criar extensão unaccent:", error)
    console.log("A extensão unaccent pode não estar disponível no seu servidor PostgreSQL.")
    console.log("Você pode precisar de privilégios de superusuário para instalá-la.")
  } finally {
    await prisma.$disconnect()
  }
}

criarExtensaoUnaccent()
