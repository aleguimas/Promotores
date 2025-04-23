export interface Candidate {
    id: number
    nome: string
    cpf?: string | null
    endereco?: string | null
    bairro?: string | null
    cidade?: string | null
    uf?: string | null
    cep?: string | null
    familia?: string | null
    horasistema?: string | null
    cargo_campo?: string | null
    status_usuario?: string | null
    latitude?: number | null
    longitude?: number | null
    disponibilidades?: Disponibilidade[]
    promotor?: string
    bandeira?: string
    loja?: string
    bandeira_id?: number | null
    loja_id?: number | null
    disponibilidade?: Disponibilidade
  }
  
  export interface Disponibilidade {
    id: number
    promotor_id: number
    segunda: string
    terca: string
    quarta: string
    quinta: string
    sexta: string
    sabado: string
    domingo: string
  }
  