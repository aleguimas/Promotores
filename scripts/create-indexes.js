// Este script cria índices para otimizar as buscas e filtros no esquema "promotores"
const { PrismaClient } = require("@prisma/client")

async function createIndexes() {
  const prisma = new PrismaClient({
    log: ["query", "info", "warn", "error"],
  })

  try {
    console.log("Iniciando criação de índices para otimização de buscas...")

    // 1. Índices para buscas por localização (cidade/UF)
    console.log("Criando índices para buscas por localização...")
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_lojas_cidade_uf ON promotores.lojas (cidade, uf)
    `
    console.log("✅ Índice para cidade/UF em lojas criado")

    // 2. Índice para filtros por bandeira
    console.log("Criando índice para filtros por bandeira...")
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_lojas_bandeira_id ON promotores.lojas (bandeira_id)
    `
    console.log("✅ Índice para bandeira_id em lojas criado")

    // 3. Índices para junções frequentes
    console.log("Criando índices para otimizar junções...")

    // Índice para junção promotor-disponibilidade
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_disponibilidades_promotor_id ON promotores.disponibilidades (promotor_id)
    `
    console.log("✅ Índice para promotor_id em disponibilidades criado")

    // Índice para junção promotor-loja
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_promotor_loja_promotor_id ON promotores.promotor_loja (promotor_id)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_promotor_loja_loja_id ON promotores.promotor_loja (loja_id)
    `
    console.log("✅ Índices para promotor_loja criados")

    // 4. Índice para busca de períodos por tipo de dia
    console.log("Criando índice para busca de períodos...")
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_periodos_tipo_dia ON promotores.periodos (tipo_dia)
    `
    console.log("✅ Índice para tipo_dia em periodos criado")

    // 5. Índices para valores de promotor por período
    console.log("Criando índices para valores de promotor por período...")
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_valores_promotor_periodo_promotor_id ON promotores.valores_promotor_periodo (promotor_id)
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_valores_promotor_periodo_periodo_id ON promotores.valores_promotor_periodo (periodo_id)
    `
    console.log("✅ Índices para valores_promotor_periodo criados")

    // 6. Índice para status de promotor (frequentemente usado em filtros)
    console.log("Criando índice para status de promotor...")
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS idx_promotores_status_usuario ON promotores.promotores (status_usuario)
    `
    console.log("✅ Índice para status_usuario em promotores criado")

    // 7. Índice para busca de texto em nomes (usando gin com pg_trgm para busca parcial)
    console.log("Verificando se a extensão pg_trgm está disponível...")
    try {
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm`

      console.log("Criando índices para busca de texto em nomes...")
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_promotores_nome_gin ON promotores.promotores USING gin (nome gin_trgm_ops)
      `
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_lojas_nome_gin ON promotores.lojas USING gin (nome gin_trgm_ops)
      `
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_bandeiras_nome_gin ON promotores.bandeiras USING gin (nome gin_trgm_ops)
      `
      console.log("✅ Índices GIN para busca de texto criados")
    } catch (error) {
      console.warn("⚠️ Não foi possível criar índices GIN para busca de texto:", error.message)
      console.warn("A extensão pg_trgm pode não estar disponível no seu servidor PostgreSQL.")
    }

    console.log("\n✅ Todos os índices foram criados com sucesso!")
    console.log("As consultas do portal agora devem ter um desempenho melhor.")
  } catch (error) {
    console.error("❌ Erro ao criar índices:", error)
  } finally {
    await prisma.$disconnect()
  }
}

createIndexes()
