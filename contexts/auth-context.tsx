"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useToast } from "@/hooks/use-toast"

// Interface para o usuário
export interface User {
  id: number
  nome: string
  email: string
  telefone?: string | null
}

// Interface para o contexto de autenticação
interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (nome: string, email: string, telefone: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
}

// Criar o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Hook para usar o contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Provider do contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me")
        const data = await response.json()

        if (data.success && data.user) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Função para fazer login
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, senha: password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        toast({
          title: "Login realizado com sucesso",
          description: `Bem-vindo(a), ${data.user.nome}!`,
        })
        return true
      } else {
        toast({
          title: "Erro ao fazer login",
          description: data.message || "Verifique suas credenciais e tente novamente",
          variant: "destructive",
        })
        return false
      }
    } catch (error: any) {
      console.error("Erro ao fazer login:", error)
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Ocorreu um erro ao tentar fazer login",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Função para registrar um novo usuário
  const register = async (nome: string, email: string, telefone: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nome, email, telefone, senha: password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        toast({
          title: "Cadastro realizado com sucesso",
          description: `Bem-vindo(a), ${data.user.nome}!`,
        })
        return true
      } else {
        toast({
          title: "Erro ao criar conta",
          description: data.message || "Verifique os dados informados e tente novamente",
          variant: "destructive",
        })
        return false
      }
    } catch (error: any) {
      console.error("Erro ao registrar usuário:", error)
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro ao tentar criar sua conta",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Função para fazer logout
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setUser(null)
        toast({
          title: "Logout realizado com sucesso",
          description: "Você saiu da sua conta",
        })
      } else {
        toast({
          title: "Erro ao fazer logout",
          description: data.message || "Ocorreu um erro ao tentar sair da sua conta",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Erro ao fazer logout:", error)
      toast({
        title: "Erro ao fazer logout",
        description: error.message || "Ocorreu um erro ao tentar sair da sua conta",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Valor do contexto
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
