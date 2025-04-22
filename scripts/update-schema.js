// Este script atualiza o esquema do banco de dados para a nova estrutura
const { PrismaClient } = require("@prisma/client")

async function updateSchema() {
  const prisma = new PrismaClient()

  try {
    console.log("Iniciando atualização do esquema do banco de dados...")

    // Verificar se as tabelas existem
    const tabelas = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `

    const tabelasExistentes = tabelas.map((t) => t.table_name)
    console.log("Tabelas existentes:", tabelasExistentes)

    // Criar tabela bandeiras se não existir
    if (!tabelasExistentes.includes("bandeiras")) {
      console.log("Criando tabela bandeiras...")
      await prisma.$executeRaw`
        CREATE TABLE bandeiras (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL,
          descricao TEXT
        )
      `
      console.log("Tabela bandeiras criada com sucesso!")
    }

    // Criar tabela lojas se não existir
    if (!tabelasExistentes.includes("lojas")) {
      console.log("Criando tabela lojas...")
      await prisma.$executeRaw`
        CREATE TABLE lojas (
          id SERIAL PRIMARY KEY,
          bandeira_id INTEGER NOT NULL,
          nome VARCHAR(255) NOT NULL,
          cidade VARCHAR(255) NOT NULL,
          uf VARCHAR(2) NOT NULL,
          CONSTRAINT fk_bandeira FOREIGN KEY (bandeira_id) REFERENCES bandeiras(id)
        )
      `
      console.log("Tabela lojas criada com sucesso!")
    }

    // Criar tabela promotor_loja se não existir
    if (!tabelasExistentes.includes("promotor_loja")) {
      console.log("Criando tabela promotor_loja...")
      await prisma.$executeRaw`
        CREATE TABLE promotor_loja (
          id SERIAL PRIMARY KEY,
          promotor_id INTEGER NOT NULL,
          loja_id INTEGER NOT NULL,
          CONSTRAINT fk_promotor FOREIGN KEY (promotor_id) REFERENCES promotores(id),
          CONSTRAINT fk_loja FOREIGN KEY (loja_id) REFERENCES lojas(id)
        )
      `
      console.log("Tabela promotor_loja criada com sucesso!")
    }

    // Verificar se a tabela valores_promotor_periodo existe
    if (!tabelasExistentes.includes("valores_promotor_periodo")) {
      console.log("Criando tabela valores_promotor_periodo...")
      await prisma.$executeRaw`
        CREATE TABLE valores_promotor_periodo (
          id SERIAL PRIMARY KEY,
          promotor_id INTEGER NOT NULL,
          periodo_id INTEGER NOT NULL,
          valor_hora DECIMAL(10,2) NOT NULL,
          data_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          data_fim TIMESTAMP
        )
      `
      console.log("Tabela valores_promotor_periodo criada com sucesso!")
    }

    // Atualizar a tabela promotores se necessário
    const colunas = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'promotores'
    `

    const colunasExistentes = colunas.map((c) => c.column_name)
    console.log("Colunas existentes na tabela promotores:", colunasExistentes)

    // Adicionar novas colunas à tabela promotores
    const colunasParaAdicionar = [
      { nome: "cpf", tipo: "VARCHAR(14)" },
      { nome: "endereco", tipo: "VARCHAR(255)" },
      { nome: "bairro", tipo: "VARCHAR(100)" },
      { nome: "cep", tipo: "VARCHAR(10)" },
      { nome: "latitude", tipo: "FLOAT" },
      { nome: "longitude", tipo: "FLOAT" },
    ]

    for (const coluna of colunasParaAdicionar) {
      if (!colunasExistentes.includes(coluna.nome)) {
        console.log(`Adicionando coluna ${coluna.nome} à tabela promotores...`)
        await prisma.$executeRaw`
          ALTER TABLE promotores ADD COLUMN ${prisma.raw(coluna.nome)} ${prisma.raw(coluna.tipo)}
        `
        console.log(`Coluna ${coluna.nome} adicionada com sucesso!`)
      }
    }

    // Renomear a coluna status para status_usuario se necessário
    if (colunasExistentes.includes("status") && !colunasExistentes.includes("status_usuario")) {
      console.log("Renomeando coluna status para status_usuario...")
      await prisma.$executeRaw`
        ALTER TABLE promotores RENAME COLUMN status TO status_usuario
      `
      console.log("Coluna renomeada com sucesso!")
    }

    console.log("Atualização do esquema concluída com sucesso!")
  } catch (error) {
    console.error("Erro ao atualizar esquema:", error)
  } finally {
    await prisma.$disconnect()
  }
}

updateSchema()
