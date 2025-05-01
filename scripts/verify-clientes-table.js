// Este script verifica se a tabela clientes tem o campo senha
const { PrismaClient } = require("@prisma/client")

async function verifyClientesTable() {
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  })

  try {
    console.log("Verificando a tabela clientes...")

    // Verificar se a tabela clientes existe no esquema promotores
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'promotores' 
        AND table_name = 'clientes'
      ) as exists
    `

    if (!tableExists[0].exists) {
      console.log("Tabela 'clientes' não existe no esquema 'promotores'. Criando...")
      await prisma.$executeRaw`
        CREATE TABLE promotores.clientes (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          telefone VARCHAR(20),
          senha VARCHAR(255)
        )
      `
      console.log("Tabela 'clientes' criada com sucesso!")
    } else {
      console.log("Tabela 'clientes' existe no esquema 'promotores'.")
    }

    // Verificar se o campo senha existe
    const senhaExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'promotores' 
        AND table_name = 'clientes' 
        AND column_name = 'senha'
      ) as exists
    `

    if (!senhaExists[0].exists) {
      console.log("Campo 'senha' não existe na tabela 'clientes'. Adicionando...")
      await prisma.$executeRaw`
        ALTER TABLE promotores.clientes 
        ADD COLUMN senha VARCHAR(255)
      `
      console.log("Campo 'senha' adicionado com sucesso!")
    } else {
      console.log("Campo 'senha' existe na tabela 'clientes'.")
    }

    // Verificar se há registros na tabela
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM promotores.clientes
    `
    console.log(`A tabela 'clientes' tem ${count[0].count} registros.`)

    console.log("Verificação concluída com sucesso!")
  } catch (error) {
    console.error("Erro ao verificar a tabela clientes:", error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyClientesTable()
