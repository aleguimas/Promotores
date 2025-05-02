const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

console.log("Iniciando regeneração do cliente Prisma...")

try {
  // Verificar se o arquivo schema.prisma existe
  const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma")
  if (!fs.existsSync(schemaPath)) {
    console.error("Arquivo schema.prisma não encontrado!")
    process.exit(1)
  }

  console.log("Gerando cliente Prisma...")
  execSync("npx prisma generate", { stdio: "inherit" })

  console.log("Cliente Prisma regenerado com sucesso!")
} catch (error) {
  console.error("Erro ao regenerar cliente Prisma:", error)
  process.exit(1)
}
