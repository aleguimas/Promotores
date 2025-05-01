import { type NextRequest, NextResponse } from "next/server"
import { registerUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const { nome, email, telefone, senha } = await request.json()

    // Validar os dados
    if (!nome || !email || !senha) {
      return NextResponse.json({ success: false, message: "Nome, email e senha são obrigatórios" }, { status: 400 })
    }

    // Registrar o usuário
    const result = await registerUser(nome, email, telefone || "", senha)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
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
      message: "Usuário registrado com sucesso",
      user: result.user,
    })
  } catch (error: any) {
    console.error("Erro ao registrar usuário:", error)
    return NextResponse.json({ success: false, message: error.message || "Erro ao registrar usuário" }, { status: 500 })
  }
}
