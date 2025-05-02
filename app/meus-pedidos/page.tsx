import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PedidosUsuario } from "@/components/pedidos-usuario"

export default async function MeusPedidosPage() {
  const user = await getCurrentUser()

  // Redirecionar para login se não estiver autenticado
  if (!user) {
    redirect("/")
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Meus Pedidos</h1>
      <PedidosUsuario userId={user.id} />
    </div>
  )
}
