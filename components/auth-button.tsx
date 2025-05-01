"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { User, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { LoginDialog } from "./login-dialog"
import { RegisterDialog } from "./register-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function AuthButton() {
  const { user, isAuthenticated, logout } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
  }

  if (isAuthenticated && user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <span className="font-medium">{user.nome}</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <span className="text-xs text-muted-foreground">{user.email}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/meus-pedidos">Meus Pedidos</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/minha-conta">Minha Conta</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setLoginOpen(true)}>Entrar</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRegisterOpen(true)}>Criar Conta</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LoginDialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onRegisterClick={() => {
          setLoginOpen(false)
          setRegisterOpen(true)
        }}
      />

      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onLoginClick={() => {
          setRegisterOpen(false)
          setLoginOpen(true)
        }}
      />
    </>
  )
}
