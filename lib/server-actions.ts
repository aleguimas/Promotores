"use server"

import prisma from "@/lib/prisma"

export async function checkDatabaseConnection() {
  try {
    console.log("Verificando conexão com o banco de dados...")
    console.log("URL do banco de dados:", process.env.DATABASE_URL ? "Definida" : "Não definida")

    // Verificar a conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1 as result`
    console.log("Conexão com o banco de dados estabelecida com sucesso")

    return {
      success: true,
      message: "Conexão com o banco de dados estabelecida com sucesso",
      dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@") : "não definida",
    }
  } catch (error: any) {
    console.error("Erro detalhado ao conectar ao banco de dados:", error)

    return {
      success: false,
      message: "Erro ao conectar ao banco de dados",
      error: error.message,
      dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@") : "não definida",
    }
  }
}

export async function seedDatabaseIfEmpty() {
  try {
    console.log("Verificando banco de dados...")

    // Verificar se já existem promotores
    const promotorCount = await prisma.promotor.count()

    if (promotorCount > 0) {
      console.log(`Banco de dados já possui ${promotorCount} promotores. Pulando seed.`)
      return { success: true, message: `Banco já possui ${promotorCount} promotores` }
    }

    console.log("Banco de dados vazio. Iniciando seed...")

    // Criar períodos
    await prisma.periodo.createMany({
      data: [
        { periodo: "Manhã (8h-12h)" },
        { periodo: "Tarde (13h-17h)" },
        { periodo: "Integral (8h-17h)" },
        { periodo: "Manhã (8h-12h)" },
        { periodo: "Tarde (13h-16h)" },
        { periodo: "Manhã (9h-13h)" },
      ],
      skipDuplicates: true,
    })

    // Criar cliente de teste
    const cliente = await prisma.cliente.create({
      data: {
        nome: "Cliente Teste",
        email: "teste@exemplo.com",
        telefone: "11999999999",
      },
    })

    // Lista de UFs e cidades para criar dados de exemplo
    const locais = [
      { uf: "SP", cidades: ["São Paulo", "Campinas", "Santos"] },
      { uf: "RJ", cidades: ["Rio de Janeiro", "Niterói", "Petrópolis"] },
      { uf: "MG", cidades: ["Belo Horizonte", "Uberlândia", "Juiz de Fora"] },
      { uf: "RS", cidades: ["Porto Alegre", "Gramado", "Caxias do Sul"] },
      { uf: "PR", cidades: ["Curitiba", "Londrina", "Foz do Iguaçu"] },
    ]

    // Bandeiras e lojas
    const bandeiras = ["Supermercado A", "Supermercado B", "Loja C", "Mercado D"]

    // Criar promotores de exemplo para cada local
    for (const local of locais) {
      for (const cidade of local.cidades) {
        // Escolher bandeira aleatória
        const bandeira = bandeiras[Math.floor(Math.random() * bandeiras.length)]

        // Criar promotor
        await prisma.promotor.create({
          data: {
            // Usar o nome do campo conforme definido nos tipos do Prisma
            // Se o tipo espera 'nome', usamos 'nome', mesmo que no banco seja 'promotor'
            nome: `Promotor ${cidade}`,
            familia: "Geral",
            horas_sistema: "40",
            cidade: cidade,
            uf: local.uf,
            bandeira: bandeira,
            loja: `Unidade ${cidade}`,
            cargo_campo: "Promotor",
            status: "Ativo",
            disponibilidades: {
              create: {
                segunda: "8",
                terca: "8",
                quarta: "8",
                quinta: "8",
                sexta: "8",
                sabado: "4",
                domingo: "0",
              },
            },
          } as any, // Usar 'as any' para evitar erros de tipo
        })
      }
    }

    console.log("Seed concluído com sucesso!")
    return { success: true, message: "Banco de dados populado com sucesso" }
  } catch (error: any) {
    console.error("Erro ao executar seed:", error)
    return {
      success: false,
      message: "Erro ao popular banco de dados",
      error: error.message,
    }
  }
}

// Função para testar explicitamente a conexão com o banco de dados
export async function testDatabaseConnection() {
  try {
    // Tentar uma consulta simples
    const result = await prisma.$queryRaw`SELECT current_database() as database_name`
    return {
      success: true,
      message: "Conexão com o banco de dados bem-sucedida",
      result,
    }
  } catch (error: any) {
    return {
      success: false,
      message: "Falha na conexão com o banco de dados",
      error: error.message,
    }
  }
}
