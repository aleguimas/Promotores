export interface Candidate {
  id: number
  nome: string
  cpf?: string | null
  familia?: string | null
  horasistema?: string | null
  cargo_campo?: string | null
  status_usuario?: string | null
  disponibilidades?: Disponibilidade[]
  promotor?: string
  bandeira?: string
  loja?: string
  bandeira_id?: number | null
  loja_id?: number | null
  disponibilidade?: Disponibilidade
  cidade?: string
  uf?: string
}

export interface Disponibilidade {
  id: number
  promotor_id: number
  segunda: number
  terca: number
  quarta: number
  quinta: number
  sexta: number
  sabado: number
  domingo: number
}

export interface Loja {
  id: number
  bandeira_id: number
  nome: string
  cidade: string
  uf: string
  cep?: string | null
  bairro?: string | null
  endereco?: string | null
}

export interface Bandeira {
  id: number
  nome: string
  descricao?: string | null
}

export interface PromotorLoja {
  id: number
  promotor_id: number
  loja_id: number
  loja?: Loja
  promotor?: Promotor
}

export interface Promotor {
  id: number
  nome: string
  cpf?: string | null
  familia?: string | null
  horasistema?: string | null
  cargo_campo?: string | null
  status_usuario?: string | null
  disponibilidades?: Disponibilidade[]
}
