// Este script regenera o cliente Prisma
const { execSync } = require("child_process")

console.log("Regenerando o cliente Prisma...")
try {
  execSync("npx prisma generate", { stdio: "inherit" })
  console.log("Cliente Prisma regenerado com sucesso!")
} catch (error) {
  console.error("Erro ao regenerar cliente Prisma:", error)
}
