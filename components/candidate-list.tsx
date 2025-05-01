"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useCart, type DiaDaSemana, diasDaSemana } from "../contexts/cart-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getPeriodosByTipoDia, getLojasPorBandeira, getBandeiras } from "../lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getValorHoraPromotorPeriodo } from "../lib/actions"

// Função auxiliar para serializar BigInt
function replaceBigInt(key: string, value: any) {
  return typeof value === "bigint" ? value.toString() : value
}

// Primeiro, vamos atualizar a interface Candidate para incluir bandeira_id
interface Candidate {
  id: number
  nome: string
  promotor: string
  familia: string
  horasistema: string
  cidade: string
  uf: string
  bandeira: string
  bandeira_id?: number // Adicionando bandeira_id como opcional
  loja: string
  loja_id?: number // Adicionando loja_id também para consistência
  cargo_campo: string
  status_usuario: string
  disponibilidade?: Disponibilidade
  disponibilidades?: Disponibilidade[]
}

interface Disponibilidade {
  promotor_id: number
  segunda: number
  terca: number
  quarta: number
  quinta: number
  sexta: number
  sabado: number
  domingo: number
}

// Interface para armazenar a seleção de horas e período por dia
interface DaySelection {
  selected: boolean
  hours: number | ""
  period: string
}

// Atualizar a interface Periodo para aceitar tanto Date quanto string
interface Periodo {
  id: number
  tipo_dia: string
  inicio: Date | string
  fim: Date | string
  descricao: string
  inicioFormatado?: string
  fimFormatado?: string
}

// Interface para bandeiras
interface Bandeira {
  id: number
  nome: string
}

// Interface para lojas
interface Loja {
  id: number
  nome: string
}

// Dias úteis (segunda a sexta)
const DIAS_UTEIS: DiaDaSemana[] = ["segunda", "terca", "quarta", "quinta", "sexta"]

interface CandidateListProps {
  title: string
  description: string
  candidates: Candidate[]
}

// Interface for the DaySelectionForm props
interface DaySelectionFormProps {
  candidate: Candidate
  isFormOpen: boolean
  isSelected: boolean
  candidateSelections: Record<number, Record<DiaDaSemana, DaySelection>>
  handleDaySelectionChange: (candidateId: number, day: DiaDaSemana, field: keyof DaySelection, value: any) => void
  toggleSelectionForm: (candidateId: number) => void
  toggleCandidateSelection: (candidate: Candidate) => void
}

// Update the function signature to include the props type
function DaySelectionForm({
  candidate,
  isFormOpen,
  isSelected,
  candidateSelections,
  handleDaySelectionChange,
  toggleSelectionForm,
  toggleCandidateSelection,
}: DaySelectionFormProps) {
  const { toast } = useToast()
  const [localPeriodosPorDia, setLocalPeriodosPorDia] = useState<Record<string, Periodo[]>>({
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
    sabado: [],
    domingo: [],
  })

  // Função para carregar os períodos disponíveis para este candidato
  const fetchPeriodos = useCallback(async () => {
    try {
      // Carregar períodos para cada tipo de dia
      const [segundaFeiraPeriodos, sabadoPeriodos, domingoPeriodos] = await Promise.all([
        getPeriodosByTipoDia("segunda_sexta"),
        getPeriodosByTipoDia("sabado"),
        getPeriodosByTipoDia("domingo"),
      ])

      // Armazenar os períodos no estado local
      setLocalPeriodosPorDia({
        segunda: segundaFeiraPeriodos,
        terca: segundaFeiraPeriodos,
        quarta: segundaFeiraPeriodos,
        quinta: segundaFeiraPeriodos,
        sexta: segundaFeiraPeriodos,
        sabado: sabadoPeriodos,
        domingo: domingoPeriodos,
      })
    } catch (error) {
      console.error("Erro ao buscar períodos:", error)
      toast({
        title: "Erro ao carregar períodos",
        description: "Não foi possível carregar os períodos disponíveis.",
        variant: "destructive",
      })
    }
  }, [toast])

  // Carregar períodos quando o formulário for aberto
  useEffect(() => {
    if (isFormOpen) {
      fetchPeriodos()
    }
  }, [isFormOpen, fetchPeriodos])

  // Get disponibilidade from candidate
  const disponibilidade = candidate.disponibilidades?.[0] || candidate.disponibilidade

  if (!disponibilidade) return null

  // Inicializar seleções para este candidato
  const selection = candidateSelections[candidate.id] || {
    segunda: { selected: false, hours: "", period: "" },
    terca: { selected: false, hours: "", period: "" },
    quarta: { selected: false, hours: "", period: "" },
    quinta: { selected: false, hours: "", period: "" },
    sexta: { selected: false, hours: "", period: "" },
    sabado: { selected: false, hours: "", period: "" },
    domingo: { selected: false, hours: "", period: "" },
  }

  if (!isFormOpen) {
    return (
      <div className="mt-3 flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSelectionForm(candidate.id)}
          className="flex items-center"
        >
          Selecionar dias e horas
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>

        {isSelected && (
          <Button variant="destructive" size="sm" onClick={() => toggleCandidateSelection(candidate)}>
            Remover
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-3 border-t pt-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-sm">Selecione os dias e horas:</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleSelectionForm(candidate.id)}
          className="flex items-center"
        >
          Fechar
          <ChevronUp className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Dias úteis (segunda a sexta) */}
      <div className="space-y-4">
        {DIAS_UTEIS.map((day) => {
          const dispHoras = disponibilidade[day] || 0
          const dayName = diasDaSemana[day]
          const daySelection = selection[day]
          const periodos = localPeriodosPorDia[day] || []

          // Não mostrar dias sem disponibilidade
          if (dispHoras === 0) return null

          return (
            <div key={day} className="border-b pb-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${candidate.id}-${day}`}
                  checked={daySelection.selected}
                  onCheckedChange={(checked) => handleDaySelectionChange(candidate.id, day, "selected", checked)}
                />
                <Label htmlFor={`${candidate.id}-${day}`} className="text-sm font-medium">
                  {dayName}
                </Label>
              </div>

              {daySelection.selected && (
                <div className="ml-6 mt-2 space-y-3">
                  <div>
                    <Label htmlFor={`${candidate.id}-${day}-hours`} className="text-xs mb-1 block">
                      Horas:
                    </Label>
                    <input
                      id={`${candidate.id}-${day}-hours`}
                      type="number"
                      min="1"
                      max={dispHoras}
                      value={daySelection.hours}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : ""
                        // Validar que não excede a disponibilidade
                        if (value === "" || (typeof value === "number" && value <= dispHoras)) {
                          handleDaySelectionChange(candidate.id, day, "hours", value)
                        }
                      }}
                      className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">Período:</Label>
                    <RadioGroup
                      value={daySelection.period}
                      onValueChange={(value) => handleDaySelectionChange(candidate.id, day, "period", value)}
                      className="space-y-1"
                    >
                      {periodos.map((periodo) => (
                        <div key={periodo.id} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={String(periodo.id)}
                            id={`${candidate.id}-${day}-period-${periodo.id}`}
                          />
                          <Label htmlFor={`${candidate.id}-${day}-period-${periodo.id}`} className="text-sm">
                            {periodo.descricao} ({periodo.inicioFormatado} - {periodo.fimFormatado})
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Sábado */}
        {disponibilidade.sabado > 0 && (
          <div className="border-b pb-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${candidate.id}-sabado`}
                checked={selection.sabado.selected}
                onCheckedChange={(checked) => handleDaySelectionChange(candidate.id, "sabado", "selected", checked)}
              />
              <Label htmlFor={`${candidate.id}-sabado`} className="text-sm font-medium">
                Sábado
              </Label>
            </div>

            {selection.sabado.selected && (
              <div className="ml-6 mt-2 space-y-3">
                <div>
                  <Label htmlFor={`${candidate.id}-sabado-hours`} className="text-xs mb-1 block">
                    Horas:
                  </Label>
                  <input
                    id={`${candidate.id}-sabado-hours`}
                    type="number"
                    min="1"
                    max={disponibilidade.sabado}
                    value={selection.sabado.hours}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : ""
                      if (value === "" || (typeof value === "number" && value <= disponibilidade.sabado)) {
                        handleDaySelectionChange(candidate.id, "sabado", "hours", value)
                      }
                    }}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Período:</Label>
                  <RadioGroup
                    value={selection.sabado.period}
                    onValueChange={(value) => handleDaySelectionChange(candidate.id, "sabado", "period", value)}
                    className="space-y-1"
                  >
                    {localPeriodosPorDia["sabado"].map((periodo) => (
                      <div key={periodo.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={String(periodo.id)} id={`${candidate.id}-sabado-period-${periodo.id}`} />
                        <Label htmlFor={`${candidate.id}-sabado-period-${periodo.id}`} className="text-sm">
                          {periodo.descricao} ({periodo.inicioFormatado} - {periodo.fimFormatado})
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Domingo */}
        {disponibilidade.domingo > 0 && (
          <div className="border-b pb-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${candidate.id}-domingo`}
                checked={selection.domingo.selected}
                onCheckedChange={(checked) => handleDaySelectionChange(candidate.id, "domingo", "selected", checked)}
              />
              <Label htmlFor={`${candidate.id}-domingo`} className="text-sm font-medium">
                Domingo
              </Label>
            </div>

            {selection.domingo.selected && (
              <div className="ml-6 mt-2 space-y-3">
                <div>
                  <Label htmlFor={`${candidate.id}-domingo-hours`} className="text-xs mb-1 block">
                    Horas:
                  </Label>
                  <input
                    id={`${candidate.id}-domingo-hours`}
                    type="number"
                    min="1"
                    max={disponibilidade.domingo}
                    value={selection.domingo.hours}
                    onChange={(e) => {
                      const value = e.target.value ? Number(e.target.value) : ""
                      if (value === "" || (typeof value === "number" && value <= disponibilidade.domingo)) {
                        handleDaySelectionChange(candidate.id, "domingo", "hours", value)
                      }
                    }}
                    className="w-full rounded border-gray-300 shadow-sm focus:border-primary focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Período:</Label>
                  <RadioGroup
                    value={selection.domingo.period}
                    onValueChange={(value) => handleDaySelectionChange(candidate.id, "domingo", "period", value)}
                    className="space-y-1"
                  >
                    {localPeriodosPorDia["domingo"].map((periodo) => (
                      <div key={periodo.id} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={String(periodo.id)}
                          id={`${candidate.id}-domingo-period-${periodo.id}`}
                        />
                        <Label htmlFor={`${candidate.id}-domingo-period-${periodo.id}`} className="text-sm">
                          {periodo.descricao} ({periodo.inicioFormatado} - {periodo.fimFormatado})
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <Button
          onClick={() => toggleCandidateSelection(candidate)}
          variant={isSelected ? "destructive" : "default"}
          size="sm"
        >
          {isSelected ? "Remover" : "Adicionar"}
        </Button>
      </div>
    </div>
  )
}

// Adicione logs no início do componente para verificar os dados recebidos
export function CandidateList({ title, description, candidates }: CandidateListProps) {
  console.log(`CandidateList recebeu ${candidates.length} candidatos`)

  // Se houver candidatos, vamos verificar o primeiro para debug
  if (candidates.length > 0) {
    try {
      console.log("Primeiro candidato:", JSON.stringify(candidates[0], replaceBigInt))
      console.log("Status do primeiro candidato:", candidates[0].status_usuario)
    } catch (error) {
      console.error("Erro ao serializar candidato:", error)
      console.log("Primeiro candidato (sem serialização):", candidates[0])
    }
  }

  // Verificar quantos candidatos têm status_usuario definido
  const candidatosComStatus = candidates.filter(
    (c) => c.status_usuario !== undefined && c.status_usuario !== null,
  ).length
  console.log(`Candidatos com status_usuario definido: ${candidatosComStatus} de ${candidates.length}`)

  const { toast } = useToast()
  const { items, addItem, removeItem } = useCart()

  // Filtra apenas candidatos ativos e adiciona log para verificar
  const activeCandidates = candidates.filter((candidate) => {
    // Considerar como ativo se status_usuario for undefined, null, ou contiver a palavra "ativo" (case insensitive)
    const isActive = !candidate.status_usuario || candidate.status_usuario.toLowerCase().includes("ativo")

    if (!isActive) {
      console.log(`Candidato ${candidate.id} (${candidate.nome}) filtrado por status: ${candidate.status_usuario}`)
    }
    return isActive
  })

  console.log(`Após filtro de status: ${activeCandidates.length} candidatos ativos`)

  // Estados para os filtros
  const [selectedBandeira, setSelectedBandeira] = useState<string>("Todas")
  const [selectedLoja, setSelectedLoja] = useState<string>("Todas")
  const [loadingLojas, setLoadingLojas] = useState<boolean>(false)
  const [lojas, setLojas] = useState<Loja[]>([])

  // Extrair todas as bandeiras únicas disponíveis
  const bandeiras = Array.from(
    new Set(
      activeCandidates
        .map((candidate) => candidate.bandeira)
        .filter(Boolean), // Remover valores vazios
    ),
  ).sort() // Ordenar bandeiras alfabeticamente

  // Modificar o useEffect que cria o mapa de bandeiras para IDs
  useEffect(() => {
    // Não vamos mais tentar acessar bandeira_id diretamente dos candidatos
    // Em vez disso, vamos apenas armazenar os nomes das bandeiras
    const bandeiraNames = Array.from(
      new Set(activeCandidates.map((candidate) => candidate.bandeira).filter(Boolean)),
    ).sort()

    // Resetar a loja selecionada quando a lista de bandeiras mudar
    setSelectedLoja("Todas")
  }, [activeCandidates])

  // Carregar lojas quando a bandeira mudar
  useEffect(() => {
    // Modificar a função loadLojas para evitar atualizações desnecessárias
    async function loadLojas() {
      try {
        setLoadingLojas(true)

        if (selectedBandeira === "Todas") {
          // Se "Todas" for selecionado, mostrar todas as lojas dos candidatos ativos
          const todasLojas = Array.from(new Set(activeCandidates.map((candidate) => candidate.loja).filter(Boolean)))
            .sort()
            .map((nome, index) => ({ id: index + 1, nome }))

          setLojas(todasLojas)
          return
        }

        // Filtrar candidatos pela bandeira selecionada
        const candidatosDaBandeira = activeCandidates.filter((candidate) => candidate.bandeira === selectedBandeira)

        if (candidatosDaBandeira.length > 0) {
          // Extrair lojas únicas dos candidatos filtrados
          const lojasUnicas = Array.from(
            new Set(candidatosDaBandeira.map((candidate) => candidate.loja).filter(Boolean)),
          )
            .sort()
            .map((nome, index) => ({ id: index + 1, nome }))

          setLojas(lojasUnicas)
        } else {
          // Se não houver candidatos com esta bandeira, tentar buscar do banco de dados
          try {
            const bandeirasData = await getBandeiras()
            const bandeiraSelecionada = bandeirasData.find((b) => b.nome === selectedBandeira)

            if (bandeiraSelecionada) {
              const lojasData = await getLojasPorBandeira(bandeiraSelecionada.id)
              setLojas(lojasData)
            } else {
              console.error("Bandeira não encontrada:", selectedBandeira)
              setLojas([])
            }
          } catch (error) {
            console.error("Erro ao buscar bandeiras/lojas:", error)
            setLojas([])
          }
        }
      } catch (error) {
        console.error("Erro ao carregar lojas:", error)
        toast({
          title: "Erro ao carregar lojas",
          description: "Não foi possível carregar a lista de lojas para esta bandeira.",
          variant: "destructive",
        })
        setLojas([])
      } finally {
        setLoadingLojas(false)
      }
    }

    loadLojas()
    // Remover activeCandidates da lista de dependências para evitar loops
  }, [selectedBandeira, toast])

  // Resetar a loja selecionada quando a bandeira mudar
  useEffect(() => {
    setSelectedLoja("Todas")
  }, [selectedBandeira])

  // Aplicar todos os filtros para obter a lista final de candidatos
  const filteredCandidates = activeCandidates.filter((candidate) => {
    // Adicionar logs para debug
    console.log(`Verificando candidato ${candidate.id} (${candidate.nome}): status=${candidate.status_usuario}`)

    // Não filtrar por bandeira ou loja, apenas garantir que o candidato tenha os dados básicos
    return true // Mostrar todos os candidatos ativos
  })

  console.log(`Após remover filtros de bandeira/loja: ${filteredCandidates.length} candidatos`)

  // Ordena os candidatos por nome
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    return a.promotor.localeCompare(b.promotor)
  })

  // Estado para controlar a paginação
  const [visibleCount, setVisibleCount] = useState(10)
  const hasMoreToShow = sortedCandidates.length > visibleCount

  // Candidatos visíveis com base na paginação
  const visibleCandidates = sortedCandidates.slice(0, visibleCount)

  // Estado para controlar quais candidatos têm o formulário de seleção aberto
  const [openSelectionForms, setOpenSelectionForms] = useState<Record<number, boolean>>({})

  // Estado para armazenar, para cada candidato, as informações de horas e período por dia
  const [candidateSelections, setCandidateSelections] = useState<Record<number, Record<DiaDaSemana, DaySelection>>>({})

  // Estados para o checkout
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState("")
  const [totalValue, setTotalValue] = useState(0)

  // Calcula o valor total do carrinho
  useEffect(() => {
    const total = items.reduce((acc, item) => acc + item.totalValue, 0)
    setTotalValue(total)
  }, [items])

  // Inicializa as seleções para todos os candidatos visíveis
  useEffect(() => {
    const newSelections: Record<number, Record<DiaDaSemana, DaySelection>> = { ...candidateSelections }
    const hasChanges = false

    visibleCandidates.forEach((candidate) => {
      // Se já existe uma seleção para este candidato, não fazer nada
      if (newSelections[candidate.id]) return

      // Verificar se o candidato já está no carrinho
      const existingItem = items.find((item) => item.id === candidate.id)

      if (existingItem) {
        // Se já estiver no carrinho, usar as seleções existentes
        newSelections[candidate.id] = existingItem.selectedDays
      } else {
        // Caso contrário, inicializar com valores vazios
        newSelections[candidate.id] = {
          segunda: { selected: false, hours: "", period: "" },
          terca: { selected: false, hours: "", period: "" },
          quarta: { selected: false, hours: "", period: "" },
          quinta: { selected: false, hours: "", period: "" },
          sexta: { selected: false, hours: "", period: "" },
          sabado: { selected: false, hours: "", period: "" },
          domingo: { selected: false, hours: "", period: "" },
        }
      }
    })

    // Atualizar o estado apenas se houver mudanças
    if (Object.keys(newSelections).length !== Object.keys(candidateSelections).length) {
      setCandidateSelections(newSelections)
    }
  }, [visibleCandidates, items, candidateSelections])

  // Atualiza a seleção de um dia específico para um candidato
  const handleDaySelectionChange = (candidateId: number, day: DiaDaSemana, field: keyof DaySelection, value: any) => {
    setCandidateSelections((prev) => {
      const candidateSelection = prev[candidateId] || {
        segunda: { selected: false, hours: "", period: "" },
        terca: { selected: false, hours: "", period: "" },
        quarta: { selected: false, hours: "", period: "" },
        quinta: { selected: false, hours: "", period: "" },
        sexta: { selected: false, hours: "", period: "" },
        sabado: { selected: false, hours: "", period: "" },
        domingo: { selected: false, hours: "", period: "" },
      }

      // Se estamos desmarcando o dia, limpar as horas e período
      if (field === "selected" && value === false) {
        return {
          ...prev,
          [candidateId]: {
            ...candidateSelection,
            [day]: { selected: false, hours: "", period: "" },
          },
        }
      }

      return {
        ...prev,
        [candidateId]: {
          ...candidateSelection,
          [day]: {
            ...candidateSelection[day],
            [field]: value,
          },
        },
      }
    })
  }

  // Verifica se o candidato pode ser adicionado ao carrinho
  const canAddCandidate = (candidateId: number, disponibilidade?: Disponibilidade) => {
    const selection = candidateSelections[candidateId]
    if (!selection) return false

    // Verifica se pelo menos um dia foi selecionado
    const hasSelectedDay = Object.values(selection).some((day) => day.selected)

    if (!hasSelectedDay) {
      console.log("Nenhum dia selecionado para o candidato", candidateId)
      return false
    }

    // Verifica se todos os dias selecionados têm horas e período definidos
    let allSelectedDaysComplete = true

    // Adicionar logs para depuração
    Object.entries(selection).forEach(([day, daySelection]) => {
      if (daySelection.selected) {
        const hasHours = daySelection.hours !== "" && Number(daySelection.hours) > 0
        const hasPeriod = daySelection.period !== ""

        console.log(
          `Dia ${day}: selecionado=${daySelection.selected}, horas=${daySelection.hours}, período=${daySelection.period}`,
        )
        console.log(`Dia ${day} completo: ${hasHours && hasPeriod}`)

        if (!hasHours || !hasPeriod) {
          allSelectedDaysComplete = false
        }
      }
    })

    console.log("Todos os dias selecionados estão completos:", allSelectedDaysComplete)

    // Retornar true se pelo menos um dia foi selecionado e todos os dias selecionados estão completos
    return hasSelectedDay && allSelectedDaysComplete
  }

  // Adiciona ou remove um candidato do carrinho
  const toggleCandidateSelection = async (candidate: Candidate) => {
    // Verifica se já está no carrinho
    const isAlreadySelected = items.some((c) => c.id === candidate.id)

    if (isAlreadySelected) {
      // Remove do carrinho
      removeItem(candidate.id)
    } else {
      // Get disponibilidade from candidate
      const disponibilidade = candidate.disponibilidades?.[0] || candidate.disponibilidade

      if (!disponibilidade) {
        toast({
          title: "Erro ao adicionar promotor",
          description: "Não foi possível encontrar a disponibilidade do promotor.",
          variant: "destructive",
        })
        return
      }

      // Verifica se as seleções estão completas
      const selection = candidateSelections[candidate.id]

      // Adicionar logs para depuração
      console.log("Seleções do candidato:", selection)

      // Verificar se pelo menos um dia foi selecionado
      const hasSelectedDay = Object.values(selection).some((day) => day.selected)
      console.log("Tem pelo menos um dia selecionado:", hasSelectedDay)

      if (!hasSelectedDay) {
        toast({
          title: "Seleção incompleta",
          description: "Por favor, selecione pelo menos um dia.",
          variant: "destructive",
        })
        return
      }

      // Verificar se todos os dias selecionados têm horas e período
      let incompleteDay = null

      for (const [day, daySelection] of Object.entries(selection)) {
        if (daySelection.selected) {
          if (daySelection.hours === "" || Number(daySelection.hours) <= 0) {
            incompleteDay = `${diasDaSemana[day as DiaDaSemana]} (horas não definidas)`
            break
          }
          if (daySelection.period === "") {
            incompleteDay = `${diasDaSemana[day as DiaDaSemana]} (período não selecionado)`
            break
          }
        }
      }

      if (incompleteDay) {
        toast({
          title: "Seleção incompleta",
          description: `Por favor, complete a seleção para ${incompleteDay}.`,
          variant: "destructive",
        })
        return
      }

      try {
        // Calcula o total de horas e valor
        let totalHours = 0
        let totalValue = 0

        // Usar Promise.all para processar todas as seleções em paralelo
        const valorPromises = Object.entries(selection).map(async ([day, daySelection]) => {
          if (daySelection.selected && daySelection.hours !== "") {
            const hours = Number(daySelection.hours)
            const periodoId = Number(daySelection.period)

            try {
              // Calcular o valor com base no promotor e período
              const valorHora = await getValorHoraPromotorPeriodo(candidate.id, periodoId)
              console.log(`Valor hora para ${day}: ${valorHora} (tipo: ${typeof valorHora})`)
              return { day, hours, valorHora: Number(valorHora) }
            } catch (error) {
              console.error(`Erro ao obter valor da hora para ${day}:`, error)
              return { day, hours, valorHora: 40 } // Valor padrão em caso de erro
            }
          }
          return null
        })

        // Aguardar todos os cálculos de valor
        const valores = (await Promise.all(valorPromises)).filter((v) => v !== null)

        // Calcular totais
        valores.forEach((v) => {
          if (v) {
            totalHours += v.hours
            totalValue += v.hours * v.valorHora
          }
        })

        const cartItem = {
          id: candidate.id,
          promotor: candidate.promotor || candidate.nome,
          familia: candidate.familia || "",
          cidade: candidate.cidade || "",
          uf: candidate.uf || "",
          bandeira: candidate.bandeira || "",
          loja: candidate.loja || "",
          cargo_campo: candidate.cargo_campo || "",
          selectedDays: selection,
          totalHours,
          totalValue,
        }

        // Garantir que o cartItem seja serializável
        const serializableCartItem = JSON.parse(JSON.stringify(cartItem))

        addItem(serializableCartItem)

        // Fechar o formulário após adicionar ao carrinho
        setOpenSelectionForms((prev) => ({
          ...prev,
          [candidate.id]: false,
        }))

        toast({
          title: "Promotor adicionado",
          description: `${candidate.promotor || candidate.nome} foi adicionado ao carrinho`,
          variant: "default",
        })
      } catch (error) {
        console.error("Erro ao adicionar promotor:", error)
        toast({
          title: "Erro ao adicionar promotor",
          description: "Ocorreu um erro ao calcular os valores. Tente novamente.",
          variant: "destructive",
        })
      }
    }
  }

  // Toggle para abrir/fechar o formulário de seleção
  const toggleSelectionForm = (candidateId: number) => {
    setOpenSelectionForms((prev) => ({
      ...prev,
      [candidateId]: !prev[candidateId],
    }))
  }

  // Função para carregar mais candidatos
  const loadMoreCandidates = () => {
    setVisibleCount((prev) => Math.min(prev + 10, sortedCandidates.length))
  }

  // Função para renderizar a disponibilidade do promotor
  const renderDisponibilidade = (disponibilidade?: Disponibilidade) => {
    if (!disponibilidade) return null

    return (
      <div className="mt-2">
        <h4 className="font-medium text-sm mb-1">Horas Disponíveis:</h4>
        <div className="grid grid-cols-7 gap-1 text-xs">
          <div className="flex flex-col items-center">
            <span className="font-semibold">Seg</span>
            <span>{disponibilidade.segunda}h</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold">Ter</span>
            <span>{disponibilidade.terca}h</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold">Qua</span>
            <span>{disponibilidade.quarta}h</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold">Qui</span>
            <span>{disponibilidade.quinta}h</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold">Sex</span>
            <span>{disponibilidade.sexta}h</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold">Sáb</span>
            <span>{disponibilidade.sabado}h</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="font-semibold">Dom</span>
            <span>{disponibilidade.domingo}h</span>
          </div>
        </div>
      </div>
    )
  }

  // Função para lidar com a confirmação do pedido
  const handleConfirmOrder = () => {
    if (!paymentMethod) {
      toast({
        title: "Selecione uma forma de pagamento",
        description: "É necessário selecionar uma forma de pagamento para continuar",
        variant: "destructive",
      })
      return
    }

    console.log("Pedido confirmado:", {
      paymentMethod,
      totalValue,
      items,
    })

    toast({
      title: "Pedido confirmado!",
      description: `Seu pedido no valor de R$ ${totalValue.toFixed(2)} foi confirmado.`,
      variant: "default",
    })

    // Fechar modal e limpar carrinho
    setCheckoutModalOpen(false)
    setPaymentMethod("")
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <CardTitle>{title}</CardTitle>
              <div className="text-sm font-medium">{sortedCandidates.length} encontrados</div>
            </div>
            <CardDescription>{description}</CardDescription>

            {/* Filtros - Desabilitados temporariamente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">
                  Filtros desabilitados temporariamente
                </label>
                <p className="text-xs text-muted-foreground">
                  Os filtros de bandeira e loja foram desabilitados devido a problemas no banco de dados.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {visibleCandidates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhum candidato encontrado com os filtros selecionados
            </p>
          ) : (
            <div className="space-y-6">
              {visibleCandidates.map((candidate) => {
                // Get disponibilidade from candidate
                const disponibilidade = candidate.disponibilidades?.[0] || candidate.disponibilidade

                return (
                  <div key={candidate.id} className="flex flex-col border rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">
                        {candidate.promotor || candidate.nome} | {candidate.familia}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <p>
                        {candidate.cidade}/{candidate.uf} - {candidate.bandeira} - {candidate.loja}
                      </p>
                      <p>Cargo: {candidate.cargo_campo}</p>
                    </div>

                    {/* Disponibilidade por dia da semana */}
                    {renderDisponibilidade(disponibilidade)}

                    {/* Formulário de seleção de dias */}
                    <DaySelectionForm
                      candidate={candidate}
                      isFormOpen={openSelectionForms[candidate.id] || false}
                      isSelected={items.some((c) => c.id === candidate.id)}
                      candidateSelections={candidateSelections}
                      handleDaySelectionChange={handleDaySelectionChange}
                      toggleSelectionForm={toggleSelectionForm}
                      toggleCandidateSelection={toggleCandidateSelection}
                    />
                  </div>
                )
              })}

              {/* Botão "Ver mais" */}
              {hasMoreToShow && (
                <div className="flex justify-center mt-6">
                  <Button variant="outline" onClick={loadMoreCandidates} className="w-full md:w-auto">
                    Ver mais promotores ({Math.min(10, sortedCandidates.length - visibleCount)} restantes)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="mt-4">
          <Button onClick={() => setCheckoutModalOpen(true)}>Fechar Pedido</Button>
        </div>
      )}

      <Dialog open={isCheckoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Resumo do Pedido</DialogTitle>
            <DialogDescription>
              <div className="space-y-4">
                <div>
                  <strong>Total de promotores selecionados:</strong> {items.length}
                </div>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="text-sm">
                      <div>
                        <strong>{item.promotor}</strong> - {item.cidade}/{item.uf}
                      </div>
                      <div>
                        {item.bandeira} - {item.loja} - {item.cargo_campo}
                      </div>
                      <div>
                        {Object.entries(item.selectedDays)
                          .filter(([_, daySelection]) => daySelection.selected)
                          .map(([day, daySelection]) => (
                            <div key={day}>
                              {diasDaSemana[day as DiaDaSemana]}: {daySelection.hours}h - Período: {daySelection.period}
                            </div>
                          ))}
                      </div>
                      <div>Total: R$ {item.totalValue.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-sm font-bold">Total a Pagar: R$ {totalValue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium">Forma de Pagamento:</div>
                  <div className="flex flex-col space-y-1">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="PIX"
                        checked={paymentMethod === "PIX"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2">PIX</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="Boleto"
                        checked={paymentMethod === "Boleto"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2">Boleto</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="Cartão de Crédito"
                        checked={paymentMethod === "Cartão de Crédito"}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span className="ml-2">Cartão de Crédito</span>
                    </label>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCheckoutModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmOrder} disabled={!paymentMethod}>
              Confirmar Pedido
            </Button>
          </div>
          <DialogClose className="absolute top-4 right-4" />
        </DialogContent>
      </Dialog>
    </>
  )
}
