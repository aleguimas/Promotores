"use client"

import { useState, useEffect } from "react"
import { LocationSearchForm } from "@/components/location-search-form"
import { CandidateList } from "@/components/candidate-list"
import { Loader2, Database, RefreshCw } from "lucide-react"
import { checkDatabaseConnection, seedDatabaseIfEmpty, testDatabaseConnection } from "@/lib/server-actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [testingConnection, setTestingConnection] = useState(false)
  const [dbStatus, setDbStatus] = useState<{
    success: boolean
    message: string
    error?: string
    dbUrl?: string
    result?: any
  } | null>(null)
  const [locationInfo, setLocationInfo] = useState<{
    uf?: string
    cidade?: string
    bandeira?: string
    loja?: string
  }>({})

  // Verificar conexão com o banco de dados ao inicializar
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        // Verificar conexão com o banco de dados
        const connectionStatus = await checkDatabaseConnection()
        setDbStatus(connectionStatus)

        if (connectionStatus.success) {
          // Se a conexão for bem-sucedida, tentar popular o banco se estiver vazio
          const seedResult = await seedDatabaseIfEmpty()
          console.log("Resultado do seed:", seedResult)
        }
      } catch (error) {
        console.error("Erro ao inicializar banco de dados:", error)
        setDbStatus({
          success: false,
          message: "Erro ao inicializar banco de dados",
          error: error instanceof Error ? error.message : "Erro desconhecido",
        })
      } finally {
        setInitializing(false)
      }
    }

    initializeDatabase()
  }, [])

  // Função para testar a conexão com o banco de dados
  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const result = await testDatabaseConnection()
      setDbStatus(result)
    } catch (error) {
      console.error("Erro ao testar conexão:", error)
      setDbStatus({
        success: false,
        message: "Erro ao testar conexão",
        error: error instanceof Error ? error.message : "Erro desconhecido",
      })
    } finally {
      setTestingConnection(false)
    }
  }

  // Função para lidar com os resultados da pesquisa
  const handleSearchResults = (results: any[]) => {
    setSearchResults(results)
  }

  // Atualizar a função handleLocationInfo para aceitar apenas UF e cidade
  const handleLocationInfo = (info: { uf: string; cidade: string }) => {
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
      <h1 className="text-3xl font-bold">Marketplace de Promotores</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          <span className="font-medium">Status do Banco de Dados</span>
        </div>
        <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testingConnection}>
          {testingConnection ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Testando...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Testar Conexão
            </>
          )}
        </Button>
      </div>

      {dbStatus && (
        <Alert variant={dbStatus.success ? "default" : "destructive"}>
          {dbStatus.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{dbStatus.success ? "Conexão estabelecida" : "Erro de conexão"}</AlertTitle>
          <AlertDescription>
            <div>{dbStatus.message}</div>

            {dbStatus.dbUrl && (
              <div className="mt-1 text-xs">
                <strong>URL do banco:</strong> {dbStatus.dbUrl}
              </div>
            )}

            {dbStatus.result && (
              <div className="mt-1 text-xs">
                <strong>Resultado:</strong> {JSON.stringify(dbStatus.result)}
              </div>
            )}

            {dbStatus.error && (
              <div className="mt-2 text-xs">
                <details>
                  <summary>Detalhes do erro</summary>
                  <p className="mt-1">{dbStatus.error}</p>
                </details>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

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
