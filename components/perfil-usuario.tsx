"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { getUserData, updateUserProfile, updateUserPassword } from "@/lib/user-actions"

// Interface para os dados do usuário
interface UserData {
  id: number
  nome: string
  email: string
  telefone?: string | null
}

// Interface para os dados do formulário de perfil
interface ProfileFormData {
  nome: string
  email: string
  telefone: string
}

// Interface para os dados do formulário de senha
interface PasswordFormData {
  senhaAtual: string
  novaSenha: string
  confirmarSenha: string
}

interface PerfilUsuarioProps {
  userId: number
}

export function PerfilUsuario({ userId }: PerfilUsuarioProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState("perfil")

  // Estados para o formulário de perfil
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    nome: "",
    email: "",
    telefone: "",
  })
  const [profileErrors, setProfileErrors] = useState<Partial<ProfileFormData>>({})

  // Estados para o formulário de senha
  const [passwordForm, setPasswordForm] = useState<PasswordFormData>({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  })
  const [passwordErrors, setPasswordErrors] = useState<Partial<PasswordFormData>>({})

  // Carregar dados do usuário
  useEffect(() => {
    async function loadUserData() {
      setIsLoading(true)
      try {
        const result = await getUserData(userId)

        if (result.success && result.user) {
          setUserData(result.user)
          setProfileForm({
            nome: result.user.nome || "",
            email: result.user.email || "",
            telefone: result.user.telefone || "",
          })

          toast({
            title: "Dados carregados",
            description: "Seus dados foram carregados com sucesso",
          })
        } else {
          toast({
            title: "Erro ao carregar dados",
            description: result.message || "Não foi possível carregar seus dados",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Ocorreu um erro ao tentar carregar seus dados",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadUserData()
    }
  }, [userId, toast])

  // Validar formulário de perfil
  function validateProfileForm(data: ProfileFormData) {
    const errors: Partial<ProfileFormData> = {}

    if (!data.nome || data.nome.length < 3) {
      errors.nome = "Nome deve ter pelo menos 3 caracteres"
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Email inválido"
    }

    if (data.telefone && data.telefone.length < 10) {
      errors.telefone = "Telefone deve ter pelo menos 10 dígitos"
    }

    return errors
  }

  // Validar formulário de senha
  function validatePasswordForm(data: PasswordFormData) {
    const errors: Partial<PasswordFormData> = {}

    if (!data.senhaAtual || data.senhaAtual.length < 6) {
      errors.senhaAtual = "Senha atual deve ter pelo menos 6 caracteres"
    }

    if (!data.novaSenha || data.novaSenha.length < 6) {
      errors.novaSenha = "Nova senha deve ter pelo menos 6 caracteres"
    }

    if (!data.confirmarSenha || data.confirmarSenha.length < 6) {
      errors.confirmarSenha = "Confirmação de senha deve ter pelo menos 6 caracteres"
    } else if (data.novaSenha !== data.confirmarSenha) {
      errors.confirmarSenha = "As senhas não coincidem"
    }

    return errors
  }

  // Atualizar perfil
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors = validateProfileForm(profileForm)
    setProfileErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)
    try {
      const result = await updateUserProfile(userId, {
        nome: profileForm.nome,
        email: profileForm.email,
        telefone: profileForm.telefone,
      })

      if (result.success) {
        if (userData) {
          setUserData({
            ...userData,
            nome: profileForm.nome,
            email: profileForm.email,
            telefone: profileForm.telefone,
          })
        }

        toast({
          title: "Perfil atualizado",
          description: "Seus dados foram atualizados com sucesso",
        })
      } else {
        toast({
          title: "Erro ao atualizar perfil",
          description: result.message || "Não foi possível atualizar seus dados",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao tentar atualizar seus dados",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Alterar senha
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors = validatePasswordForm(passwordForm)
    setPasswordErrors(errors)

    if (Object.keys(errors).length > 0) {
      return
    }

    setIsLoading(true)
    try {
      const result = await updateUserPassword(userId, passwordForm.senhaAtual, passwordForm.novaSenha)

      if (result.success) {
        setPasswordForm({
          senhaAtual: "",
          novaSenha: "",
          confirmarSenha: "",
        })

        toast({
          title: "Senha alterada",
          description: "Sua senha foi alterada com sucesso",
        })

        setActiveTab("perfil")
      } else {
        toast({
          title: "Erro ao alterar senha",
          description: result.message || "Não foi possível alterar sua senha",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao alterar senha:", error)
      toast({
        title: "Erro ao alterar senha",
        description: "Ocorreu um erro ao tentar alterar sua senha",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Manipuladores de alteração de campo
  function handleProfileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-3xl mx-auto">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="perfil">Dados Pessoais</TabsTrigger>
        <TabsTrigger value="senha">Alterar Senha</TabsTrigger>
      </TabsList>

      <TabsContent value="perfil">
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>Visualize e atualize seus dados pessoais</CardDescription>
          </CardHeader>
          <form onSubmit={handleProfileSubmit}>
            <CardContent className="space-y-4">
              {isLoading && !userData ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      name="nome"
                      placeholder="Seu nome completo"
                      value={profileForm.nome}
                      onChange={handleProfileChange}
                    />
                    {profileErrors.nome && <p className="text-sm text-red-500">{profileErrors.nome}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                    />
                    {profileErrors.email && <p className="text-sm text-red-500">{profileErrors.email}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      placeholder="(00) 00000-0000"
                      value={profileForm.telefone}
                      onChange={handleProfileChange}
                    />
                    {profileErrors.telefone && <p className="text-sm text-red-500">{profileErrors.telefone}</p>}
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter>
              <Button type="submit" disabled={isLoading || !userData}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="senha">
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>Altere sua senha de acesso</CardDescription>
          </CardHeader>
          <form onSubmit={handlePasswordSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha Atual</Label>
                <Input
                  id="senhaAtual"
                  name="senhaAtual"
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={passwordForm.senhaAtual}
                  onChange={handlePasswordChange}
                />
                {passwordErrors.senhaAtual && <p className="text-sm text-red-500">{passwordErrors.senhaAtual}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  name="novaSenha"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={passwordForm.novaSenha}
                  onChange={handlePasswordChange}
                />
                {passwordErrors.novaSenha && <p className="text-sm text-red-500">{passwordErrors.novaSenha}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarSenha"
                  name="confirmarSenha"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={passwordForm.confirmarSenha}
                  onChange={handlePasswordChange}
                />
                {passwordErrors.confirmarSenha && (
                  <p className="text-sm text-red-500">{passwordErrors.confirmarSenha}</p>
                )}
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
