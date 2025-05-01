"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface RegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLoginClick: () => void
}

export function RegisterDialog({ open, onOpenChange, onLoginClick }: RegisterDialogProps) {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register } = useAuth()

  const validatePasswords = () => {
    if (password !== confirmPassword) {
      setPasswordError("As senhas não coincidem")
      return false
    }

    if (password.length < 6) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres")
      return false
    }

    setPasswordError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePasswords()) {
      return
    }

    setIsSubmitting(true)

    try {
      const success = await register(nome, email, telefone, password)

      if (success) {
        onOpenChange(false)
        // Limpar os campos
        setNome("")
        setEmail("")
        setTelefone("")
        setPassword("")
        setConfirmPassword("")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Conta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Senha</Label>
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" className="w-full gm-gradient-bg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar conta"
              )}
            </Button>
          </DialogFooter>
        </form>
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Já tem uma conta?</span>{" "}
          <Button variant="link" className="p-0" onClick={onLoginClick}>
            Entrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
