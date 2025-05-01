"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

interface LoginDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegisterClick: () => void
}

export function LoginDialog({ open, onOpenChange, onRegisterClick }: LoginDialogProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      return
    }

    setIsSubmitting(true)

    try {
      const success = await login(email, password)

      if (success) {
        onOpenChange(false)
        setEmail("")
        setPassword("")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Entrar</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Button type="button" variant="link" className="px-0 text-xs" onClick={() => {}}>
                Esqueci minha senha
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button type="submit" className="w-full gm-gradient-bg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </DialogFooter>
        </form>
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Não tem uma conta?</span>{" "}
          <Button variant="link" className="p-0" onClick={onRegisterClick}>
            Criar conta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
