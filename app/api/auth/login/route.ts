import { type NextRequest, NextResponse } from "next/server"
import { loginUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json()

    // Validar os dados
    if (!email || !senha) {
      return NextResponse.json({ success: false, message: "Email e senha são obrigatórios" }, { status: 400 })
    }

    // Autenticar o usuário
    const result = await loginUser(email, senha)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 401 })
    }

    // Definir o cookie de autenticação
    cookies().set({
      name: "auth_token",
      value: result.token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: "strict",
    })

    // Retornar os dados do usuário (sem a senha)
    return NextResponse.json({
      success: true,
      message: "Login realizado com sucesso",
      user: result.user,
    })
  } catch (error: any) {
    console.error("Erro ao autenticar usuário:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Erro ao autenticar usuário" },
      { status: 500 },
    )
  }
}
