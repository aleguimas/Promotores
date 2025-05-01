// Este script limpa o cache do Next.js
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

function clearNextCache() {
  console.log("Iniciando limpeza do cache do Next.js...")

  // Caminho para o diretório .next
  const nextDir = path.join(__dirname, "..", ".next")

  // Verificar se o diretório .next existe
  if (fs.existsSync(nextDir)) {
    try {
      console.log("Removendo diretório .next...")
      fs.rmSync(nextDir, { recursive: true, force: true })
      console.log("Diretório .next removido com sucesso!")
    } catch (error) {
      console.error("Erro ao remover diretório .next:", error)
    }
  } else {
    console.log("Diretório .next não existe. Nada a limpar.")
  }

  // Limpar o cache do npm
  try {
    console.log("Limpando cache do npm...")
    execSync("npm cache clean --force", { stdio: "inherit" })
    console.log("Cache do npm limpo com sucesso!")
  } catch (error) {
    console.error("Erro ao limpar cache do npm:", error)
  }

  console.log("\nLimpeza concluída!")
  console.log("Agora execute 'npm install' e depois 'npm run dev' para reiniciar o servidor.")
}

clearNextCache()
