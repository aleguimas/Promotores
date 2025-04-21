import { PrismaClient } from "@prisma/client"

// PrismaClient é anexado ao objeto `global` em desenvolvimento para evitar
// esgotar seu limite de conexão com o banco de dados.
// Saiba mais: https://pris.ly/d/help/next-js-best-practices

// Verificar se a variável de ambiente DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida. Verifique seu arquivo .env")
}

// Log da URL do banco de dados (com senha ocultada para segurança)
const dbUrlForLogging = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@")
  : "não definida"

console.log(`Conectando ao banco de dados: ${dbUrlForLogging}`)

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query", "error", "warn"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
