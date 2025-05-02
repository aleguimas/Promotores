import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { PerfilUsuario } from "@/components/perfil-usuario"

export default async function MinhaContaPage() {
  // Verificar se o usuário está autenticado
  const user = await getCurrentUser()

  // Se não estiver autenticado, redirecionar para a página inicial
  if (!user) {
    redirect("/")
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Minha Conta</h1>
      <PerfilUsuario userId={user.id} />
    </div>
  )
}
