"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { searchCandidatesByLocation, getCidadesPorUF, getUFs } from "@/lib/actions"
import { Loader2 } from "lucide-react"

interface LocationSearchFormProps {
  onResults: (results: any[]) => void
  setLoading: (loading: boolean) => void
  setLocationInfo: (info: { uf: string; cidade: string }) => void
}

interface Cidade {
  id: number
  nome: string
}

// Função auxiliar para serializar BigInt
function replaceBigInt(key: string, value: any) {
  return typeof value === "bigint" ? value.toString() : value
}

export function LocationSearchForm({ onResults, setLoading, setLocationInfo }: LocationSearchFormProps) {
  const [selectedUF, setSelectedUF] = useState("")
  const [selectedCidade, setSelectedCidade] = useState("")
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [ufs, setUfs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingUFs, setLoadingUFs] = useState(true)
  const [loadingCidades, setLoadingCidades] = useState(false)

  // Carregar UFs ao inicializar
  useEffect(() => {
    const loadUFs = async () => {
      try {
        setLoadingUFs(true)
        console.log("Carregando UFs...")
        const data = await getUFs()
        console.log("UFs carregadas:", data)
        // As UFs já vêm ordenadas da função getUFs()
        setUfs(data)
        setError(null)
      } catch (error) {
        console.error("Erro ao carregar UFs:", error)
        setError("Não foi possível carregar a lista de estados. Verifique a conexão com o banco de dados.")
        // Usar uma lista padrão em caso de erro (já ordenada)
        setUfs(["BA", "DF", "ES", "GO", "MG", "PR", "RJ", "RS", "SC", "SP"])
      } finally {
        setLoadingUFs(false)
      }
    }

    loadUFs()
  }, [])

  const handleUFChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedUF(value)
    setError(null)

    if (value) {
      try {
        setLoadingCidades(true)
        // Carregar cidades para o UF selecionado
        const cidadesData = await getCidadesPorUF(value)
        // As cidades já vêm ordenadas da função getCidadesPorUF()
        setCidades(cidadesData)
      } catch (error) {
        console.error("Erro ao carregar cidades:", error)
        setError("Não foi possível carregar a lista de cidades")
        setCidades([])
      } finally {
        setLoadingCidades(false)
      }

      // Resetar cidade
      setSelectedCidade("")
    } else {
      setCidades([])
      setSelectedCidade("")
    }
  }

  // Modifique a função handleSubmit para garantir que os resultados sejam serializáveis
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUF || !selectedCidade) {
      setError("Por favor, selecione o Estado e a Cidade para continuar")
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log(`Iniciando busca de promotores em ${selectedCidade}/${selectedUF}`)

      const results = await searchCandidatesByLocation({
        uf: selectedUF,
        cidade: selectedCidade,
        bandeira: "Todas",
        loja: "Todas",
      })

      console.log(`Busca concluída: ${results.length} promotores encontrados`)

      // Verificar se os resultados têm a estrutura esperada
      if (results.length > 0) {
        // Use a função replaceBigInt para serializar BigInt
        console.log("Exemplo do primeiro resultado:", JSON.stringify(results[0], replaceBigInt))
      }

      setLocationInfo({
        uf: selectedUF,
        cidade: selectedCidade,
      })

      // Garantir que os resultados sejam passados para o componente pai
      onResults(results)

      if (results.length === 0) {
        setError(`Não encontramos promotores disponíveis em ${selectedCidade}/${selectedUF}`)
      }
    } catch (error: any) {
      console.error("Erro na busca:", error)
      setError(error.message || "Não foi possível encontrar promotores com os filtros selecionados")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seleção de UF */}
            <div className="space-y-2">
              <label htmlFor="uf" className="block text-sm font-medium">
                Estado (UF) *
              </label>
              <div className="relative">
                <select
                  id="uf"
                  value={selectedUF}
                  onChange={handleUFChange}
                  disabled={loadingUFs}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione o Estado</option>
                  {ufs.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
                {loadingUFs && (
                  <div className="absolute right-2 top-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Seleção de Cidade */}
            <div className="space-y-2">
              <label htmlFor="cidade" className="block text-sm font-medium">
                Cidade *
              </label>
              <div className="relative">
                <select
                  id="cidade"
                  value={selectedCidade}
                  onChange={(e) => setSelectedCidade(e.target.value)}
                  disabled={cidades.length === 0 || loadingCidades}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">
                    {loadingCidades
                      ? "Carregando cidades..."
                      : cidades.length === 0
                        ? "Selecione o Estado primeiro"
                        : "Selecione a Cidade"}
                  </option>
                  {cidades.map((cidade) => (
                    <option key={cidade.id} value={cidade.nome}>
                      {cidade.nome}
                    </option>
                  ))}
                </select>
                {loadingCidades && (
                  <div className="absolute right-2 top-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">{error}</div>}

          <div className="flex justify-end">
            <Button type="submit" disabled={!selectedUF || !selectedCidade}>
              Buscar Promotores
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
