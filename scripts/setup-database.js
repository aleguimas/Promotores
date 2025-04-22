// Este script configura o banco de dados com as tabelas e dados necessários
const { PrismaClient } = require("@prisma/client")

async function setupDatabase() {
  const prisma = new PrismaClient()

  try {
    console.log("Iniciando configuração do banco de dados...")

    // 1. Criar períodos
    console.log("Criando períodos...")

    // Verificar se já existem períodos
    const periodosExistentes = await prisma.$queryRaw`SELECT COUNT(*) as count FROM periodos`

    if (periodosExistentes[0].count === 0) {
      await prisma.$executeRaw`
        INSERT INTO periodos (tipo_dia, inicio, fim, descricao)
        VALUES 
          ('segunda_sexta', '08:00', '12:00', 'Manhã (8h-12h)'),
          ('segunda_sexta', '13:00', '17:00', 'Tarde (13h-17h)'),
          ('segunda_sexta', '08:00', '17:00', 'Integral (8h-17h)'),
          ('sabado', '08:00', '12:00', 'Manhã (8h-12h)'),
          ('sabado', '13:00', '16:00', 'Tarde (13h-16h)'),
          ('domingo', '09:00', '13:00', 'Manhã (9h-13h)')
      `
      console.log("Períodos criados com sucesso!")
    } else {
      console.log("Períodos já existem, pulando criação.")
    }

    // 2. Verificar se a tabela valores_promotor_periodo existe
    try {
      const tabelaExiste = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'valores_promotor_periodo'
        ) as exists
      `

      if (!tabelaExiste[0].exists) {
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
      } else {
        console.log("Tabela valores_promotor_periodo já existe.")
      }
    } catch (error) {
      console.error("Erro ao verificar/criar tabela valores_promotor_periodo:", error)
    }

    // 3. Inserir valores padrão para promotores existentes
    console.log("Inserindo valores padrão para promotores...")

    // Obter todos os promotores
    const promotores = await prisma.promotor.findMany({
      select: { id: true },
    })

    // Obter todos os períodos
    const periodos = await prisma.$queryRaw`SELECT id FROM periodos`

    // Para cada promotor e período, inserir um valor padrão se não existir
    for (const promotor of promotores) {
      for (const periodo of periodos) {
        // Definir valor base com base no tipo de dia
        let valorBase = 40 // Valor padrão para dias úteis

        // Verificar o tipo de dia do período
        const tipoDia = await prisma.$queryRaw`
          SELECT tipo_dia FROM periodos WHERE id = ${periodo.id}
        `

        if (tipoDia[0].tipo_dia === "sabado") {
          valorBase = 48 // Acréscimo de 20% para sábado
        } else if (tipoDia[0].tipo_dia === "domingo") {
          valorBase = 60 // Acréscimo de 50% para domingo
        }

        // Verificar se já existe um valor para este promotor e período
        const valorExistente = await prisma.$queryRaw`
          SELECT COUNT(*) as count 
          FROM valores_promotor_periodo 
          WHERE promotor_id = ${promotor.id} 
          AND periodo_id = ${periodo.id}
        `

        if (valorExistente[0].count === 0) {
          await prisma.$executeRaw`
            INSERT INTO valores_promotor_periodo (promotor_id, periodo_id, valor_hora, data_inicio)
            VALUES (${promotor.id}, ${periodo.id}, ${valorBase}, CURRENT_TIMESTAMP)
          `
        }
      }
    }

    console.log("Valores padrão inseridos com sucesso!")
    console.log("Configuração do banco de dados concluída!")
  } catch (error) {
    console.error("Erro durante a configuração do banco de dados:", error)
  } finally {
    await prisma.$disconnect()
  }
}

setupDatabase()
