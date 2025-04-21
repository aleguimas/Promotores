"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useCart, type DiaDaSemana, diasDaSemana, type CartItem } from "../contexts/cart-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getPeriodosByDay, calcularValorHora, type PeriodoPreco } from "../types/pricing"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"

interface Disponibilidade {
  promotor_id: number
  segunda: string
  terca: string
  quarta: string
  quinta: string
  sexta: string
  sabado: string
  domingo: string
}

interface Candidate {
  id: number
  promotor: string
  familia: string
  horasistema: string
  cidade: string
  uf: string
  bandeira: string
  loja: string
  cargo_campo: string
  status_usuario: string
  disponibilidade?: Disponibilidade
}

// Interface para armazenar a seleção de horas e período por dia
interface DaySelection {
  selected: boolean
  hours: number | ""
  period: string
}

// Dias úteis (segunda a sexta)
const DIAS_UTEIS: DiaDaSemana[] = ["segunda", "terca", "quarta", "quinta", "sexta"]

interface CandidateListProps {
  title: string
  description: string
  candidates: Candidate[]
}

export function CandidateList({ title, description, candidates }: CandidateListProps) {
  const { toast } = useToast()
  const { items, addItem, removeItem } = useCart()

  // Filtra apenas candidatos ativos
  const activeCandidates = candidates.filter(
    (candidate) => candidate.status_usuario && candidate.status_usuario.toLowerCase() === "ativo",
  )

  // Estados para os filtros
  const [selectedBandeira, setSelectedBandeira] = useState<string>("Todas")
  const [selectedLoja, setSelectedLoja] = useState<string>("Todas")

  // Extrair todas as bandeiras únicas disponíveis
  const bandeiras = Array.from(new Set(activeCandidates.map((candidate) => candidate.bandeira)))
    .filter(Boolean)
    .sort() // Ordenar bandeiras alfabeticamente

  // Filtrar candidatos por bandeira primeiro
  const candidatosFiltradosPorBandeira = activeCandidates.filter(
    (candidate) => selectedBandeira === "Todas" || candidate.bandeira === selectedBandeira,
  )

  // Extrair lojas disponíveis com base na bandeira selecionada
  const lojas = Array.from(new Set(candidatosFiltradosPorBandeira.map((candidate) => candidate.loja)))
    .filter(Boolean)
    .sort() // Ordenar lojas alfabeticamente

  // Resetar a loja selecionada quando a bandeira mudar
  useEffect(() => {
    setSelectedLoja("Todas")
  }, [selectedBandeira])

  // Aplicar todos os filtros para obter a lista final de candidatos
  const filteredCandidates = activeCandidates.filter((candidate) => {
    // Verificar se o candidato corresponde ao filtro de bandeira
    const matchesBandeira = selectedBandeira === "Todas" || candidate.bandeira === selectedBandeira

    // Verificar se o candidato corresponde ao filtro de loja
    const matchesLoja = selectedLoja === "Todas" || candidate.loja === selectedLoja

    // O candidato só deve ser incluído se corresponder a AMBOS os filtros
    return matchesBandeira && matchesLoja
  })

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

  // Estado para armazenar os períodos por dia
  const [periodosPorDia, setPeriodosPorDia] = useState<Record<string, PeriodoPreco[]>>({
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
    sabado: [],
    domingo: [],
  })

  // Calcula o valor total do carrinho
  useEffect(() => {
    const total = items.reduce((acc, item) => acc + item.totalValue, 0)
    setTotalValue(total)
  }, [items])

  // Inicializa as seleções para um candidato se ainda não existirem
  const initializeSelections = (candidateId: number, disponibilidade?: Disponibilidade) => {
    if (!candidateSelections[candidateId]) {
      // Verificar se o candidato já está no carrinho
      const existingItem = items.find((item) => item.id === candidateId)

      if (existingItem) {
        // Se já estiver no carrinho, usar as seleções existentes
        setCandidateSelections((prev) => ({
          ...prev,
          [candidateId]: existingItem.selectedDays,
        }))
        return existingItem.selectedDays
      }

      // Caso contrário, inicializar com valores vazios
      const initialSelections: Record<DiaDaSemana, DaySelection> = {
        segunda: { selected: false, hours: "", period: "" },
        terca: { selected: false, hours: "", period: "" },
        quarta: { selected: false, hours: "", period: "" },
        quinta: { selected: false, hours: "", period: "" },
        sexta: { selected: false, hours: "", period: "" },
        sabado: { selected: false, hours: "", period: "" },
        domingo: { selected: false, hours: "", period: "" },
      }

      setCandidateSelections((prev) => ({
        ...prev,
        [candidateId]: initialSelections,
      }))

      return initialSelections
    }

    return candidateSelections[candidateId]
  }

  // Atualiza a seleção de um dia específico para um candidato
  const handleDaySelectionChange = (candidateId: number, day: DiaDaSemana, field: keyof DaySelection, value: any) => {
    setCandidateSelections((prev) => {
      const candidateSelection = prev[candidateId] || initializeSelections(candidateId)

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
    const selection = candidateSelections[candidateId] || initializeSelections(candidateId, disponibilidade)

    // Verifica se pelo menos um dia foi selecionado
    const hasSelectedDay = Object.values(selection).some((day) => day.selected)

    if (!hasSelectedDay) {
      return false
    }

    // Verifica se todos os dias selecionados têm horas e período definidos
    const allSelectedDaysComplete = Object.entries(selection).every(([day, daySelection]) => {
      if (!daySelection.selected) return true // Ignorar dias não selecionados
      return daySelection.hours !== "" && Number(daySelection.hours) > 0 && daySelection.period !== ""
    })

    return allSelectedDaysComplete
  }

  // Adiciona ou remove um candidato do carrinho
  const toggleCandidateSelection = async (candidate: Candidate) => {
    // Verifica se já está no carrinho
    const isAlreadySelected = items.some((c) => c.id === candidate.id)

    if (isAlreadySelected) {
      // Remove do carrinho
      removeItem(candidate.id)
    } else {
      // Verifica se as seleções estão completas
      if (canAddCandidate(candidate.id, candidate.disponibilidade)) {
        const selection = candidateSelections[candidate.id]

        try {
          // Calcula o total de horas e valor
          let totalHours = 0
          let totalValue = 0

          // Usar Promise.all para processar todas as seleções em paralelo
          const valorPromises = Object.entries(selection).map(async ([day, daySelection]) => {
            if (daySelection.selected && daySelection.hours !== "") {
              const hours = Number(daySelection.hours)

              // Calcular o valor com base no dia, período e promotor
              const valorHora = await calcularValorHora(candidate.id, day, daySelection.period)
              return { day, hours, valorHora }
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

          const cartItem: CartItem = {
            ...candidate,
            selectedDays: selection,
            totalHours,
            totalValue,
          }

          addItem(cartItem)

          // Fechar o formulário após adicionar ao carrinho
          setOpenSelectionForms((prev) => ({
            ...prev,
            [candidate.id]: false,
          }))

          toast({
            title: "Promotor adicionado",
            description: `${candidate.promotor} foi adicionado ao carrinho`,
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
      } else {
        toast({
          title: "Seleção incompleta",
          description: "Por favor, selecione pelo menos um dia e defina as horas e período para cada dia selecionado.",
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

  // Função para renderizar o formulário de seleção de dias
  const renderDaySelectionForm = (candidate: Candidate) => {
    if (!candidate.disponibilidade) return null

    const isFormOpen = openSelectionForms[candidate.id] || false

    // Antes de renderizar o formulário, buscar os períodos
    const [periodos, setPeriodos] = useState<PeriodoPreco[]>([])

    // Usar useCallback para criar uma função memoized para buscar os períodos
    const fetchPeriodos = useCallback(async () => {
      try {
        const segundaFeiraPeriodos = await getPeriodosByDay("segunda")
        const sabadoPeriodos = await getPeriodosByDay("sabado")
        const domingoPeriodos = await getPeriodosByDay("domingo")

        // Armazenar os períodos no estado
        setPeriodosPorDia({
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
          description: "Não foi possível carregar os períodos disponíveis. Usando valores padrão.",
          variant: "destructive",
        })
      }
    }, [toast])

    useEffect(() => {
      if (isFormOpen) {
        fetchPeriodos()
      }
    }, [isFormOpen, fetchPeriodos])

    const isSelected = items.some((c) => c.id === candidate.id)

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

    const selection = candidateSelections[candidate.id] || initializeSelections(candidate.id, candidate.disponibilidade)
    const disponibilidade = candidate.disponibilidade

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
            const dispHoras = Number.parseInt(disponibilidade[day] || "0")
            const dayName = diasDaSemana[day]
            const daySelection = selection[day]

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
                        {periodosPorDia[day].map((periodo, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={periodo.periodo} id={`${candidate.id}-${day}-period-${index}`} />
                            <Label htmlFor={`${candidate.id}-${day}-period-${index}`} className="text-sm">
                              {periodo.periodo}
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
          {disponibilidade.sabado !== "0" && (
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
                      max={Number.parseInt(disponibilidade.sabado)}
                      value={selection.sabado.hours}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : ""
                        if (
                          value === "" ||
                          (typeof value === "number" && value <= Number.parseInt(disponibilidade.sabado))
                        ) {
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
                      {periodosPorDia["sabado"].map((periodo, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={periodo.periodo} id={`${candidate.id}-sabado-period-${index}`} />
                          <Label htmlFor={`${candidate.id}-sabado-period-${index}`} className="text-sm">
                            {periodo.periodo}
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
          {disponibilidade.domingo !== "0" && (
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
                      max={Number.parseInt(disponibilidade.domingo)}
                      value={selection.domingo.hours}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : ""
                        if (
                          value === "" ||
                          (typeof value === "number" && value <= Number.parseInt(disponibilidade.domingo))
                        ) {
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
                      {periodosPorDia["domingo"].map((periodo, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={periodo.periodo} id={`${candidate.id}-domingo-period-${index}`} />
                          <Label htmlFor={`${candidate.id}-domingo-period-${index}`} className="text-sm">
                            {periodo.periodo}
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

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              {/* Filtro por Bandeira */}
              <div>
                <label htmlFor="bandeira-filter" className="block text-sm font-medium text-muted-foreground">
                  Filtrar por Bandeira:
                </label>
                <select
                  id="bandeira-filter"
                  value={selectedBandeira}
                  onChange={(e) => setSelectedBandeira(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Todas">Todas</option>
                  {bandeiras.map((bandeira) => (
                    <option key={bandeira} value={bandeira}>
                      {bandeira}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Loja */}
              <div>
                <label htmlFor="loja-filter" className="block text-sm font-medium text-muted-foreground">
                  Filtrar por Loja:
                </label>
                <select
                  id="loja-filter"
                  value={selectedLoja}
                  onChange={(e) => setSelectedLoja(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={lojas.length === 0}
                >
                  <option value="Todas">Todas</option>
                  {lojas.map((loja) => (
                    <option key={loja} value={loja}>
                      {loja}
                    </option>
                  ))}
                </select>
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
              {visibleCandidates.map((candidate) => (
                <div key={candidate.id} className="flex flex-col border rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">
                      {candidate.promotor} | {candidate.familia}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <p>
                      {candidate.cidade}/{candidate.uf} - {candidate.bandeira} - {candidate.loja}
                    </p>
                    <p>Cargo: {candidate.cargo_campo}</p>
                  </div>

                  {/* Disponibilidade por dia da semana */}
                  {renderDisponibilidade(candidate.disponibilidade)}

                  {/* Formulário de seleção de dias */}
                  {renderDaySelectionForm(candidate)}
                </div>
              ))}

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
                              {diasDaSemana[day as DiaDaSemana]}: {daySelection.hours}h - {daySelection.period}
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
