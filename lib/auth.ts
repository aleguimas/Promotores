import { compare, hash } from "bcryptjs"
import { sign, verify } from "jsonwebtoken"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"

// Definir a interface do usuário
export interface User {
  id: number
  nome: string
  email: string
  telefone?: string | null
}

// Função para gerar um token JWT
export async function generateToken(user: User): Promise<string> {
  const secret = process.env.JWT_SECRET || "sua_chave_secreta_aqui"
  return sign({ id: user.id, nome: user.nome, email: user.email, telefone: user.telefone }, secret, { expiresIn: "7d" })
}

// Função para verificar um token JWT
export async function verifyToken(token: string): Promise<User | null> {
  try {
    const secret = process.env.JWT_SECRET || "sua_chave_secreta_aqui"
    const decoded = verify(token, secret) as User
    return decoded
  } catch (error) {
    console.error("Erro ao verificar token:", error)
    return null
  }
}

// Função para registrar um novo usuário
export async function registerUser(nome: string, email: string, telefone: string, senha: string) {
  try {
    // Verificar se o email já está em uso
    const existingUser = await prisma.cliente.findUnique({
      where: { email },
    })

    if (existingUser) {
      return { success: false, message: "Este email já está em uso" }
    }

    // Criptografar a senha
    const hashedPassword = await hash(senha, 10)

    // Usar SQL bruto para inserir o usuário com senha
    await prisma.$executeRaw`
      INSERT INTO promotores.clientes (nome, email, telefone, senha)
      VALUES (${nome}, ${email}, ${telefone}, ${hashedPassword})
    `

    // Buscar o usuário recém-criado
    const newUser = await prisma.cliente.findUnique({
      where: { email },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
      },
    })

    if (!newUser) {
      throw new Error("Erro ao criar usuário")
    }

    // Gerar token JWT
    const token = await generateToken(newUser)

    return {
      success: true,
      message: "Usuário registrado com sucesso",
      user: newUser,
      token,
    }
  } catch (error: any) {
    console.error("Erro ao registrar usuário:", error)
    return {
      success: false,
      message: error.message || "Erro ao registrar usuário",
    }
  }
}

// Função para autenticar um usuário
export async function loginUser(email: string, senha: string) {
  try {
    // Buscar o usuário pelo email usando SQL bruto para obter a senha
    const users = (await prisma.$queryRaw`
      SELECT id, nome, email, telefone, senha
      FROM promotores.clientes
      WHERE email = ${email}
      LIMIT 1
    `) as any[]

    if (!users || users.length === 0) {
      return { success: false, message: "Email ou senha incorretos" }
    }

    const user = users[0]

    // Verificar se o usuário tem uma senha
    if (!user.senha) {
      return { success: false, message: "Conta sem senha definida. Por favor, use a opção 'Esqueci minha senha'" }
    }

    // Verificar a senha
    const passwordMatch = await compare(senha, user.senha)

    if (!passwordMatch) {
      return { success: false, message: "Email ou senha incorretos" }
    }

    // Criar objeto de usuário sem a senha
    const userWithoutPassword = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
    }

    // Gerar token JWT
    const token = await generateToken(userWithoutPassword)

    return {
      success: true,
      message: "Login realizado com sucesso",
      user: userWithoutPassword,
      token,
    }
  } catch (error: any) {
    console.error("Erro ao autenticar usuário:", error)
    return {
      success: false,
      message: error.message || "Erro ao autenticar usuário",
    }
  }
}

// Função para obter o usuário atual a partir do cookie
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return null
    }

    return await verifyToken(token)
  } catch (error) {
    console.error("Erro ao obter usuário atual:", error)
    return null
  }
}
