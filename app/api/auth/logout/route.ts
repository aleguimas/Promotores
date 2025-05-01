import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    // Remover o cookie de autenticação
    cookies().delete("auth_token")

    return NextResponse.json({
      success: true,
      message: "Logout realizado com sucesso",
    })
  } catch (error: any) {
    console.error("Erro ao fazer logout:", error)
    return NextResponse.json({ success: false, message: error.message || "Erro ao fazer logout" }, { status: 500 })
  }
}
