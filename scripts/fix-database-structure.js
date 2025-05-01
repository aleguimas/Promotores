// Este script verifica e corrige a estrutura do banco de dados
const { PrismaClient } = require("@prisma/client")
const { execSync } = require("child_process")

async function fixDatabaseStructure() {
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  })

  try {
    console.log("Iniciando verificação e correção da estrutura do banco de dados...")

    // 1. Verificar se o esquema promotores existe
    console.log("Verificando esquema 'promotores'...")
    const schemaExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata 
        WHERE schema_name = 'promotores'
      ) as exists
    `

    if (!schemaExists[0].exists) {
      console.log("Esquema 'promotores' não existe. Criando...")
      await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS promotores`
      console.log("Esquema 'promotores' criado com sucesso!")
    } else {
      console.log("Esquema 'promotores' já existe.")
    }

    // 2. Verificar e corrigir a tabela clientes
    console.log("\nVerificando tabela 'clientes'...")
    const clientesExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'promotores' 
        AND table_name = 'clientes'
      ) as exists
    `

    if (!clientesExists[0].exists) {
      console.log("Tabela 'clientes' não existe. Criando...")
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
      console.log("Tabela 'clientes' já existe.")

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
        console.log("Campo 'senha' já existe na tabela 'clientes'.")
      }
    }

    // 3. Verificar e corrigir a tabela pedidos
    console.log("\nVerificando tabela 'pedidos'...")
    const pedidosExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'promotores' 
        AND table_name = 'pedidos'
      ) as exists
    `

    if (!pedidosExists[0].exists) {
      console.log("Tabela 'pedidos' não existe. Criando...")
      await prisma.$executeRaw`
        CREATE TABLE promotores.pedidos (
          id SERIAL PRIMARY KEY,
          cliente_id INTEGER NOT NULL,
          data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          forma_pagamento VARCHAR(50) NOT NULL,
          status VARCHAR(50) NOT NULL,
          FOREIGN KEY (cliente_id) REFERENCES promotores.clientes(id)
        )
      `
      console.log("Tabela 'pedidos' criada com sucesso!")
    } else {
      console.log("Tabela 'pedidos' já existe.")
    }

    // 4. Regenerar o cliente Prisma
    console.log("\nRegenerando o cliente Prisma...")
    try {
      execSync("npx prisma generate", { stdio: "inherit" })
      console.log("Cliente Prisma regenerado com sucesso!")
    } catch (error) {
      console.error("Erro ao regenerar cliente Prisma:", error)
    }

    console.log("\nVerificação e correção da estrutura do banco de dados concluída!")
    console.log("Agora reinicie o servidor de desenvolvimento para aplicar as alterações.")
  } catch (error) {
    console.error("Erro durante a verificação e correção da estrutura do banco de dados:", error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabaseStructure()
