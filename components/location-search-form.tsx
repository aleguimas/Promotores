"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { searchCandidatesByLocation, getCidadesPorUF, getUFs } from "@/lib/actions"

interface LocationSearchFormProps {
  onResults: (results: any[]) => void
  setLoading: (loading: boolean) => void
  setLocationInfo: (info: { uf: string; cidade: string; bandeira: string; loja: string }) => void
}

interface Bandeira {
  id: number
  nome: string
}

interface Loja {
  id: number
  nome: string
}

interface Cidade {
  id: number
  nome: string
}

export function LocationSearchForm({ onResults, setLoading, setLocationInfo }: LocationSearchFormProps) {
  const [selectedUF, setSelectedUF] = useState("")
  const [selectedCidade, setSelectedCidade] = useState("")
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [ufs, setUfs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Carregar UFs ao inicializar
  useEffect(() => {
    const loadUFs = async () => {
      try {
        setLoading(true)
        const data = await getUFs()
        setUfs(data)
      } catch (error) {
        console.error("Erro ao carregar UFs:", error)
        setError("Não foi possível carregar a lista de estados")
      } finally {
        setLoading(false)
      }
    }

    loadUFs()
  }, [setLoading])

  const handleUFChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedUF(value)
    setError(null)

    if (value) {
      try {
        setLoading(true)
        // Carregar cidades para o UF selecionado
        const cidadesData = await getCidadesPorUF(value)
        setCidades(cidadesData)
      } catch (error) {
        console.error("Erro ao carregar cidades:", error)
        setError("Não foi possível carregar a lista de cidades")
        setCidades([])
      } finally {
        setLoading(false)
      }

      // Resetar cidade
      setSelectedCidade("")
    } else {
      setCidades([])
      setSelectedCidade("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUF || !selectedCidade) {
      setError("Por favor, selecione o Estado e a Cidade para continuar")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const results = await searchCandidatesByLocation({
        uf: selectedUF,
        cidade: selectedCidade,
        bandeira: "Todas", // Valor padrão
        loja: "Todas", // Valor padrão
      })

      setLocationInfo({
        uf: selectedUF,
        cidade: selectedCidade,
        bandeira: "Todas",
        loja: "Todas",
      })

      onResults(results)

      if (results.length === 0) {
        setError("Não encontramos promotores disponíveis com os filtros selecionados")
      }
    } catch (error: any) {
      console.error("Search error:", error)
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
              <select
                id="uf"
                value={selectedUF}
                onChange={handleUFChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione o Estado</option>
                {ufs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleção de Cidade */}
            <div className="space-y-2">
              <label htmlFor="cidade" className="block text-sm font-medium">
                Cidade *
              </label>
              <select
                id="cidade"
                value={selectedCidade}
                onChange={(e) => setSelectedCidade(e.target.value)}
                disabled={cidades.length === 0}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{cidades.length === 0 ? "Selecione o Estado primeiro" : "Selecione a Cidade"}</option>
                {cidades.map((cidade) => (
                  <option key={cidade.id} value={cidade.nome}>
                    {cidade.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <div className="flex justify-end">
            <Button type="submit">Buscar Promotores</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
