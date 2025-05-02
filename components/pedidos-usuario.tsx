"use client"

import { useState, useEffect } from "react"
import { getPedidosUsuario } from "@/lib/server-actions"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"

// Interfaces para tipagem
interface PedidoItemDetalhe {
  id: number
  promotor_nome: string
  dia_semana: string
  periodo_descricao: string
  horas: number
  valor_hora: number
  valor_total: number
}

interface PedidoDetalhe {
  id: number
  data_criacao: string
  status: string
  forma_pagamento: string
  valor_total: number
  itens: PedidoItemDetalhe[]
}

interface PedidosUsuarioProps {
  userId: number
}

export function PedidosUsuario({ userId }: PedidosUsuarioProps) {
  const [pedidos, setPedidos] = useState<PedidoDetalhe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPedido, setExpandedPedido] = useState<number | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)

  useEffect(() => {
    async function carregarPedidos() {
      try {
        setLoading(true)
        const resultado = await getPedidosUsuario(userId)

        if (resultado.success) {
          setPedidos(resultado.pedidos || [])
        } else {
          setError(resultado.message || "Erro ao carregar pedidos")
        }
      } catch (err) {
        setError("Ocorreu um erro ao carregar seus pedidos")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    carregarPedidos()
  }, [userId])

  const toggleExpandPedido = (pedidoId: number) => {
    if (expandedPedido === pedidoId) {
      setExpandedPedido(null)
    } else {
      setExpandedPedido(pedidoId)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pendente: { label: "Pendente", className: "bg-yellow-500 hover:bg-yellow-600" },
      confirmado: { label: "Confirmado", className: "bg-green-500 hover:bg-green-600" },
      em_andamento: { label: "Em andamento", className: "bg-blue-500 hover:bg-blue-600" },
      concluido: { label: "Concluído", className: "bg-purple-500 hover:bg-purple-600" },
      cancelado: { label: "Cancelado", className: "bg-red-500 hover:bg-red-600" },
    }

    const statusInfo = statusMap[status.toLowerCase()] || { label: status, className: "bg-gray-500 hover:bg-gray-600" }

    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
  }

  const pedidosFiltrados = filtroStatus
    ? pedidos.filter((pedido) => pedido.status.toLowerCase() === filtroStatus.toLowerCase())
    : pedidos

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
        <p className="text-red-700">{error}</p>
      </div>
    )
  }

  if (pedidos.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-8 my-4 text-center">
        <h3 className="text-xl font-medium text-gray-700 mb-2">Nenhum pedido encontrado</h3>
        <p className="text-gray-500">Você ainda não realizou nenhum pedido.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant={filtroStatus === null ? "default" : "outline"} onClick={() => setFiltroStatus(null)}>
          Todos
        </Button>
        <Button
          variant={filtroStatus === "pendente" ? "default" : "outline"}
          onClick={() => setFiltroStatus("pendente")}
        >
          Pendentes
        </Button>
        <Button
          variant={filtroStatus === "confirmado" ? "default" : "outline"}
          onClick={() => setFiltroStatus("confirmado")}
        >
          Confirmados
        </Button>
        <Button
          variant={filtroStatus === "concluido" ? "default" : "outline"}
          onClick={() => setFiltroStatus("concluido")}
        >
          Concluídos
        </Button>
      </div>

      {pedidosFiltrados.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-6 my-4 text-center">
          <p className="text-gray-500">Nenhum pedido encontrado com o filtro selecionado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidosFiltrados.map((pedido) => (
            <div key={pedido.id} className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <div
                className="p-4 flex flex-wrap justify-between items-center cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpandPedido(pedido.id)}
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-medium">Pedido #{pedido.id}</h3>
                    {getStatusBadge(pedido.status)}
                  </div>
                  <p className="text-sm text-gray-500">{formatDate(pedido.data_criacao)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{formatCurrency(pedido.valor_total)}</p>
                  <p className="text-sm text-gray-500">{pedido.forma_pagamento}</p>
                </div>
              </div>

              {expandedPedido === pedido.id && (
                <div className="border-t p-4">
                  <h4 className="font-medium mb-3">Detalhes do Pedido</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Promotor</TableHead>
                        <TableHead>Dia</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead className="text-right">Valor/Hora</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedido.itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.promotor_nome}</TableCell>
                          <TableCell>{item.dia_semana}</TableCell>
                          <TableCell>{item.periodo_descricao}</TableCell>
                          <TableCell>{item.horas}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valor_hora)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valor_total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-bold">
                          Total
                        </TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(pedido.valor_total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
