import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ success: false, message: "Usuário não autenticado" }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error: any) {
    console.error("Erro ao obter usuário atual:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Erro ao obter usuário atual" },
      { status: 500 },
    )
  }
}
