"use client"

import { useState, useEffect } from "react"
import { LocationSearchForm } from "@/components/location-search-form"
import { CandidateList } from "@/components/candidate-list"
import { Loader2 } from "lucide-react"
import { checkDatabaseConnection } from "@/lib/server-actions"

export default function Home() {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [locationInfo, setLocationInfo] = useState<{
    uf?: string
    cidade?: string
    bandeira?: string
    loja?: string
  }>({})

  // Verificar conexão com o banco de dados ao inicializar (silenciosamente)
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await checkDatabaseConnection()
      } catch (error) {
        console.error("Erro ao inicializar banco de dados:", error)
      } finally {
        setInitializing(false)
      }
    }

    initializeDatabase()
  }, [])

  // Função para lidar com a conclusão da pesquisa
  const handleSearchComplete = (results: any[], info: { uf: string; cidade: string }) => {
    setSearchResults(results)
    setLocationInfo({
      uf: info.uf,
      cidade: info.cidade,
      bandeira: "Todas",
      loja: "Todas",
    })
  }

  // Construir o título e descrição com base nas informações de localização
  const getTitle = () => {
    if (!locationInfo.cidade && !locationInfo.uf) {
      return "Promotores Disponíveis"
    }

    let title = `Promotores em ${locationInfo.cidade || ""}`
    if (locationInfo.uf) {
      title += locationInfo.cidade ? `/${locationInfo.uf}` : locationInfo.uf
    }
    return title
  }

  const getDescription = () => {
    return "Selecione os filtros desejados para refinar sua busca"
  }

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Inicializando o portal...</p>
      </div>
    )
  }

  return (
    <main className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold gm-gradient-text">Marketplace de Promotores</h1>
        <p className="text-muted-foreground mt-2">Encontre e contrate os melhores promotores para sua loja</p>
      </div>

      <div className="space-y-4">
        <LocationSearchForm onSearchComplete={handleSearchComplete} />
      </div>

      {searchResults.length > 0 ? (
        <CandidateList title={getTitle()} description={getDescription()} candidates={searchResults} />
      ) : null}
    </main>
  )
}
