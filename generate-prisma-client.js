// Este script executa o comando para gerar o cliente Prisma
const { execSync } = require("child_process")

console.log("Gerando cliente Prisma...")
try {
  execSync("npx prisma generate", { stdio: "inherit" })
  console.log("Cliente Prisma gerado com sucesso!")
} catch (error) {
  console.error("Erro ao gerar cliente Prisma:", error)
}
