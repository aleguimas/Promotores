"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Tipos para os dias da semana
export type DiaDaSemana = "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo"

// Mapeamento de dias da semana para nomes em português
export const diasDaSemana: Record<DiaDaSemana, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
  sabado: "Sábado",
  domingo: "Domingo",
}

// Interface para a seleção de dias
export interface DaySelection {
  selected: boolean
  hours: number | ""
  period: string
}

// Interface para os itens do carrinho
export interface CartItem {
  id: number
  promotor: string
  familia: string
  cidade: string
  uf: string
  bandeira: string
  loja: string
  cargo_campo: string
  selectedDays: Record<DiaDaSemana, DaySelection>
  totalHours: number
  totalValue: number
}

// Interface para o contexto do carrinho
interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: number) => void
  clearCart: () => void
  totalItems: number
  totalValue: number
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

// Criação do contexto
const CartContext = createContext<CartContextType | undefined>(undefined)

// Hook para usar o contexto do carrinho
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

// Função para formatar a seleção de dias
export function formatDaySelection(selectedDays: Record<DiaDaSemana, DaySelection>): string {
  const selectedDaysArray = Object.entries(selectedDays)
    .filter(([_, daySelection]) => daySelection.selected)
    .map(([day, daySelection]) => {
      const dayName = diasDaSemana[day as DiaDaSemana]
      return `${dayName}: ${daySelection.hours}h (${daySelection.period})`
    })

  return selectedDaysArray.join(", ")
}

// Provider do carrinho
export function CartProvider({ children }: { children: ReactNode }) {
  // Estado para os itens do carrinho
  const [items, setItems] = useState<CartItem[]>([])
  // Estado para controlar se o drawer está aberto
  const [isOpen, setIsOpen] = useState(false)

  // Carregar itens do localStorage ao inicializar
  useEffect(() => {
    const savedItems = localStorage.getItem("cart")
    if (savedItems) {
      try {
        setItems(JSON.parse(savedItems))
      } catch (error) {
        console.error("Erro ao carregar carrinho:", error)
      }
    }
  }, [])

  // Salvar itens no localStorage quando mudam
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items])

  // Adicionar item ao carrinho
  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      // Verificar se o item já existe
      const existingItemIndex = prevItems.findIndex((i) => i.id === item.id)

      if (existingItemIndex >= 0) {
        // Atualizar item existente
        const updatedItems = [...prevItems]
        updatedItems[existingItemIndex] = item
        return updatedItems
      } else {
        // Adicionar novo item
        return [...prevItems, item]
      }
    })
  }

  // Remover item do carrinho
  const removeItem = (id: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }

  // Limpar carrinho
  const clearCart = () => {
    setItems([])
  }

  // Calcular total de itens
  const totalItems = items.length

  // Calcular valor total
  const totalValue = items.reduce((total, item) => total + item.totalValue, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCart,
        totalItems,
        totalValue,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}
