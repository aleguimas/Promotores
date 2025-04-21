"use client"

import { useState } from "react"
import { LocationSearchForm } from "@/components/location-search-form"
import { CandidateList } from "@/components/candidate-list"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [locationInfo, setLocationInfo] = useState<{
    uf?: string
    cidade?: string
    bandeira?: string
    loja?: string
  }>({})

  // Função para lidar com os resultados da pesquisa
  const handleSearchResults = (results: any[]) => {
    setSearchResults(results)
  }

  // Função para atualizar as informações de localização
  const handleLocationInfo = (info: any) => {
    setLocationInfo(info)
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

  return (
    <main className="space-y-6">
      <h1 className="text-3xl font-bold">Marketplace de Promotores</h1>

      <div className="space-y-4">
        <LocationSearchForm
          onResults={handleSearchResults}
          setLoading={setLoading}
          setLocationInfo={handleLocationInfo}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando...</span>
        </div>
      ) : searchResults.length > 0 ? (
        <CandidateList title={getTitle()} description={getDescription()} candidates={searchResults} />
      ) : null}
    </main>
  )
}
