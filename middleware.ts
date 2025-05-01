import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

// Rotas que não precisam de autenticação
const publicRoutes = ["/", "/api/auth/login", "/api/auth/register"]

// Rotas de API que não precisam de autenticação
const publicApiRoutes = ["/api/auth/login", "/api/auth/register"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Verificar se é uma rota pública
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Verificar se é uma rota de API pública
  if (pathname.startsWith("/api/") && publicApiRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Obter o token do cookie ou do cabeçalho Authorization
  const token = request.cookies.get("auth_token")?.value || request.headers.get("Authorization")?.split(" ")[1]

  // Se não houver token e for uma rota de API, retornar erro 401
  if (!token && pathname.startsWith("/api/")) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
  }

  // Se não houver token e não for uma rota de API, redirecionar para a página inicial
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  try {
    // Verificar o token
    const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "sua_chave_secreta_aqui")

    await jwtVerify(token, JWT_SECRET)

    // Token válido, continuar
    return NextResponse.next()
  } catch (error) {
    // Token inválido

    // Se for uma rota de API, retornar erro 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 })
    }

    // Se não for uma rota de API, redirecionar para a página inicial
    return NextResponse.redirect(new URL("/", request.url))
  }
}

// Configurar em quais caminhos o middleware será executado
export const config = {
  matcher: [
    // Rotas protegidas
    "/meus-pedidos/:path*",
    "/minha-conta/:path*",
    "/checkout/:path*",
    // APIs protegidas
    "/api/pedidos/:path*",
    "/api/clientes/:path*",
    "/api/auth/me",
  ],
}
