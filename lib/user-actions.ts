"use server"
import { compare, hash } from "bcryptjs"
import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Interface para os dados do usuário
interface UserData {
  nome: string
  email: string
  telefone?: string | null
}

// Função para obter os dados do usuário
export async function getUserData(userId: number) {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.id !== userId) {
      return {
        success: false,
        message: "Usuário não autorizado",
      }
    }

    // Buscar os dados do usuário usando SQL bruto para evitar problemas de tipagem
    const users = (await prisma.$queryRaw`
      SELECT id, nome, email, telefone FROM promotores.clientes WHERE id = ${userId} LIMIT 1
    `) as any[]

    if (!users || users.length === 0) {
      return {
        success: false,
        message: "Usuário não encontrado",
      }
    }

    const user = users[0]

    return {
      success: true,
      user,
    }
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error)
    return {
      success: false,
      message: "Erro ao buscar dados do usuário",
    }
  }
}

// Função para atualizar os dados do usuário
export async function updateUserProfile(userId: number, data: UserData) {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.id !== userId) {
      return {
        success: false,
        message: "Usuário não autorizado",
      }
    }

    // Verificar se o email já está em uso por outro usuário
    const existingUsers = (await prisma.$queryRaw`
      SELECT id FROM promotores.clientes WHERE email = ${data.email} AND id != ${userId} LIMIT 1
    `) as any[]

    if (existingUsers && existingUsers.length > 0) {
      return {
        success: false,
        message: "Este email já está em uso por outro usuário",
      }
    }

    // Atualizar os dados do usuário
    await prisma.$executeRaw`
      UPDATE promotores.clientes 
      SET nome = ${data.nome}, email = ${data.email}, telefone = ${data.telefone || null}
      WHERE id = ${userId}
    `

    return {
      success: true,
      message: "Perfil atualizado com sucesso",
    }
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return {
      success: false,
      message: "Erro ao atualizar perfil",
    }
  }
}

// Função para atualizar a senha do usuário
export async function updateUserPassword(userId: number, senhaAtual: string, novaSenha: string) {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.id !== userId) {
      return {
        success: false,
        message: "Usuário não autorizado",
      }
    }

    // Buscar a senha atual do usuário
    const userWithPassword = (await prisma.$queryRaw`
      SELECT senha FROM promotores.clientes WHERE id = ${userId} LIMIT 1
    `) as any[]

    if (!userWithPassword || userWithPassword.length === 0 || !userWithPassword[0].senha) {
      return {
        success: false,
        message: "Não foi possível verificar sua senha atual",
      }
    }

    // Verificar se a senha atual está correta
    const isPasswordValid = await compare(senhaAtual, userWithPassword[0].senha)

    if (!isPasswordValid) {
      return {
        success: false,
        message: "Senha atual incorreta",
      }
    }

    // Criptografar a nova senha
    const hashedPassword = await hash(novaSenha, 10)

    // Atualizar a senha do usuário
    await prisma.$executeRaw`
      UPDATE promotores.clientes SET senha = ${hashedPassword} WHERE id = ${userId}
    `

    return {
      success: true,
      message: "Senha alterada com sucesso",
    }
  } catch (error) {
    console.error("Erro ao alterar senha:", error)
    return {
      success: false,
      message: "Erro ao alterar senha",
    }
  }
}
