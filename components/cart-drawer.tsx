"use client"

import { useCart, formatDaySelection } from "../contexts/cart-context"
import { useAuth } from "../contexts/auth-context"
import { Button } from "@/components/ui/button"
import { ShoppingCart, X, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { registrarPedido } from "../lib/actions"
import { LoginDialog } from "./login-dialog"
import { RegisterDialog } from "./register-dialog"

// Interface para garantir compatibilidade com a função registrarPedido
interface PedidoItem {
  promotorId: number
  diasSelecionados: Record<
    string,
    {
      selected: boolean
      hours: number
      period: string
    }
  >
}

export function CartDrawer() {
  const { items, removeItem, totalItems, totalValue, isOpen, setIsOpen, clearCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [paymentMethod, setPaymentMethod] = useState("")
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const { toast } = useToast()

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione promotores ao carrinho antes de finalizar o pedido",
        variant: "destructive",
      })
      return
    }

    // Verificar se o usuário está autenticado
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para finalizar o pedido",
        variant: "destructive",
      })
      setLoginOpen(true)
      return
    }

    setCheckoutModalOpen(true)
  }

  const handleLoginClick = () => {
    setLoginOpen(true)
  }

  const handleRegisterClick = () => {
    setRegisterOpen(true)
  }

  const handleConfirmOrder = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para finalizar o pedido",
        variant: "destructive",
      })
      setLoginOpen(true)
      return
    }

    if (!paymentMethod) {
      toast({
        title: "Selecione uma forma de pagamento",
        description: "É necessário selecionar uma forma de pagamento para continuar",
        variant: "destructive",
      })
      return
    }

    try {
      setIsProcessing(true)

      // Preparar os itens para o pedido, garantindo que hours seja sempre um número
      const pedidoItens: PedidoItem[] = items.map((item) => {
        // Criar um novo objeto com a estrutura correta
        const diasSelecionados: Record<string, { selected: boolean; hours: number; period: string }> = {}

        // Converter cada dia selecionado, garantindo que hours seja um número
        Object.entries(item.selectedDays).forEach(([day, selection]) => {
          diasSelecionados[day] = {
            selected: selection.selected,
            // Converter "" para 0 ou manter o número
            hours: selection.hours === "" ? 0 : Number(selection.hours),
            period: selection.period,
          }
        })

        return {
          promotorId: item.id,
          diasSelecionados,
        }
      })

      // Registrar o pedido no banco de dados usando o ID do cliente logado
      const clienteId = user?.id || 0
      const resultado = await registrarPedido(clienteId, paymentMethod, pedidoItens)

      if (resultado.success) {
        toast({
          title: "Pedido confirmado!",
          description: `Seu pedido no valor de R$ ${totalValue.toFixed(2)} foi confirmado.`,
          variant: "default",
        })

        // Fechar modais e limpar carrinho
        setCheckoutModalOpen(false)
        setIsOpen(false)
        clearCart()
        setPaymentMethod("")
      } else {
        throw new Error(resultado.message || "Falha ao registrar o pedido")
      }
    } catch (error: any) {
      console.error("Erro ao confirmar pedido:", error)
      toast({
        title: "Erro ao confirmar pedido",
        description: error.message || "Ocorreu um erro ao processar seu pedido. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Ícone do carrinho no cabeçalho */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Abrir carrinho"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 gm-gradient-bg text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Drawer do carrinho */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Carrinho de Promotores
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({totalItems} {totalItems === 1 ? "item" : "itens"})
              </span>
            </DialogTitle>
          </DialogHeader>

          {items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsOpen(false)}>
                Continuar Comprando
              </Button>
            </div>
          ) : (
            <>
              {/* Aviso de login necessário */}
              {!isAuthenticated && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Login necessário</p>
                    <p className="text-amber-700 mt-1">
                      Você precisa estar logado para finalizar o pedido.{" "}
                      <button onClick={handleLoginClick} className="text-primary underline font-medium">
                        Entrar
                      </button>{" "}
                      ou{" "}
                      <button onClick={handleRegisterClick} className="text-primary underline font-medium">
                        Criar conta
                      </button>
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col border rounded-md p-3">
                    <div className="flex justify-between">
                      <div className="font-medium">{item.promotor}</div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-gray-500 hover:text-red-500"
                        aria-label="Remover item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.cidade}/{item.uf} - {item.bandeira} - {item.loja}
                    </div>
                    <div className="text-sm mt-1">
                      <div className="text-xs text-muted-foreground">Dias selecionados:</div>
                      <div className="text-xs">{formatDaySelection(item.selectedDays)}</div>
                    </div>
                    <div className="text-sm font-medium mt-1">
                      Total: {item.totalHours}h - R$ {item.totalValue.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>Total:</span>
                  <span>R$ {totalValue.toFixed(2)}</span>
                </div>

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
                    Continuar Comprando
                  </Button>
                  <Button onClick={handleCheckout} className="flex-1 gm-gradient-bg">
                    Finalizar Pedido
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de checkout */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Finalizar Pedido</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Informações do cliente */}
            {isAuthenticated && user && (
              <div className="space-y-2">
                <h3 className="font-medium">Informações do Cliente</h3>
                <div className="text-sm">
                  <p>
                    <strong>Nome:</strong> {user.nome}
                  </p>
                  <p>
                    <strong>E-mail:</strong> {user.email}
                  </p>
                  {user.telefone && (
                    <p>
                      <strong>Telefone:</strong> {user.telefone}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h3 className="font-medium">Resumo do Pedido</h3>
              <div className="text-sm text-muted-foreground">
                {totalItems} {totalItems === 1 ? "promotor" : "promotores"} selecionados
              </div>
              <div className="font-bold">Total: R$ {totalValue.toFixed(2)}</div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Forma de Pagamento</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="payment"
                    value="PIX"
                    checked={paymentMethod === "PIX"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={isProcessing}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>PIX</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="payment"
                    value="Boleto"
                    checked={paymentMethod === "Boleto"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={isProcessing}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Boleto</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="payment"
                    value="Cartão de Crédito"
                    checked={paymentMethod === "Cartão de Crédito"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={isProcessing}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Cartão de Crédito</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutModalOpen(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmOrder} disabled={!paymentMethod || isProcessing} className="gm-gradient-bg">
              {isProcessing ? "Processando..." : "Confirmar Pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogos de login e cadastro */}
      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onRegisterClick={() => {
          setLoginOpen(false)
          setRegisterOpen(true)
        }}
      />

      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onLoginClick={() => {
          setRegisterOpen(false)
          setLoginOpen(true)
        }}
      />
    </>
  )
}
