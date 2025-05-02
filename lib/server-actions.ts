"use server"

import prisma from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function checkDatabaseConnection() {
  try {
    console.log("Verificando conexão com o banco de dados...")
    console.log("URL do banco de dados:", process.env.DATABASE_URL ? "Definida" : "Não definida")

    // Verificar a conexão com o banco de dados
    await prisma.$queryRaw`SELECT 1 as result`
    console.log("Conexão com o banco de dados estabelecida com sucesso")

    return {
      success: true,
      message: "Conexão com o banco de dados estabelecida com sucesso",
      dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@") : "não definida",
    }
  } catch (error: any) {
    console.error("Erro detalhado ao conectar ao banco de dados:", error)

    return {
      success: false,
      message: "Erro ao conectar ao banco de dados",
      error: error.message,
      dbUrl: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ":***@") : "não definida",
    }
  }
}

// Adicionar esta interface antes da função seedDatabaseIfEmpty
interface BandeiraRaw {
  id: number
  nome: string
}

// Adicionar esta interface antes da função seedDatabaseIfEmpty
interface LojaRaw {
  id: number
  nome: string
  cidade: string
  uf: string
}

export async function seedDatabaseIfEmpty() {
  try {
    console.log("Verificando banco de dados...")

    // Verificar se já existem promotores
    const promotorCount = await prisma.promotor.count()

    if (promotorCount > 0) {
      console.log(`Banco de dados já possui ${promotorCount} promotores. Pulando seed.`)
      return { success: true, message: `Banco já possui ${promotorCount} promotores` }
    }

    console.log("Banco de dados vazio. Iniciando seed...")

    // Verificar se as tabelas necessárias existem
    try {
      // Verificar se a tabela bandeiras existe
      await prisma.$executeRaw`SELECT 1 FROM bandeiras LIMIT 1`
    } catch (error) {
      console.log("Tabela bandeiras não existe. Criando...")
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS bandeiras (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(255) NOT NULL UNIQUE,
          descricao TEXT
        )
      `
    }

    try {
      // Verificar se a tabela lojas existe
      await prisma.$executeRaw`SELECT 1 FROM lojas LIMIT 1`
    } catch (error) {
      console.log("Tabela lojas não existe. Criando...")
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS lojas (
          id SERIAL PRIMARY KEY,
          bandeira_id INTEGER NOT NULL,
          nome VARCHAR(255) NOT NULL,
          cidade VARCHAR(255) NOT NULL,
          uf VARCHAR(2) NOT NULL,
          FOREIGN KEY (bandeira_id) REFERENCES bandeiras(id)
        )
      `
    }

    try {
      // Verificar se a tabela promotor_loja existe
      await prisma.$executeRaw`SELECT 1 FROM promotor_loja LIMIT 1`
    } catch (error) {
      console.log("Tabela promotor_loja não existe. Criando...")
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS promotor_loja (
          id SERIAL PRIMARY KEY,
          promotor_id INTEGER NOT NULL,
          loja_id INTEGER NOT NULL,
          FOREIGN KEY (promotor_id) REFERENCES promotores(id),
          FOREIGN KEY (loja_id) REFERENCES lojas(id)
        )
      `
    }

    // Criar períodos
    await prisma.$executeRaw`
      INSERT INTO periodos (tipo_dia, inicio, fim, descricao)
      VALUES 
        ('segunda_sexta', '08:00', '12:00', 'Manhã (8h-12h)'),
        ('segunda_sexta', '13:00', '17:00', 'Tarde (13h-17h)'),
        ('segunda_sexta', '08:00', '17:00', 'Integral (8h-17h)'),
        ('sabado', '08:00', '12:00', 'Manhã (8h-12h)'),
        ('sabado', '13:00', '16:00', 'Tarde (13h-16h)'),
        ('domingo', '09:00', '13:00', 'Manhã (9h-13h)')
      ON CONFLICT DO NOTHING
    `

    // Criar cliente de teste
    const clienteExistente = await prisma.cliente.findFirst({
      where: {
        email: "teste@exemplo.com",
      },
    })

    if (!clienteExistente) {
      await prisma.cliente.create({
        data: {
          nome: "Cliente Teste",
          email: "teste@exemplo.com",
          telefone: "11999999999",
        },
      })
    }

    // Criar bandeiras
    const bandeiras = [
      { nome: "Supermercado A", descricao: "Rede de supermercados A" },
      { nome: "Supermercado B", descricao: "Rede de supermercados B" },
      { nome: "Loja C", descricao: "Rede de lojas C" },
      { nome: "Mercado D", descricao: "Rede de mercados D" },
    ]

    for (const bandeira of bandeiras) {
      await prisma.$executeRaw`
        INSERT INTO bandeiras (nome, descricao)
        VALUES (${bandeira.nome}, ${bandeira.descricao})
        ON CONFLICT (nome) DO NOTHING
      `
    }

    // Lista de UFs e cidades para criar dados de exemplo
    const locais = [
      { uf: "SP", cidades: ["São Paulo", "Campinas", "Santos"] },
      { uf: "RJ", cidades: ["Rio de Janeiro", "Niterói", "Petrópolis"] },
      { uf: "MG", cidades: ["Belo Horizonte", "Uberlândia", "Juiz de Fora"] },
      { uf: "RS", cidades: ["Porto Alegre", "Gramado", "Caxias do Sul"] },
      { uf: "PR", cidades: ["Curitiba", "Londrina", "Foz do Iguaçu"] },
    ]

    // Buscar todas as bandeiras criadas
    const todasBandeiras = await prisma.$queryRaw<BandeiraRaw[]>`SELECT id, nome FROM bandeiras`

    // Criar lojas para cada bandeira
    for (const bandeira of todasBandeiras) {
      for (const local of locais) {
        for (const cidade of local.cidades) {
          await prisma.$executeRaw`
            INSERT INTO lojas (bandeira_id, nome, cidade, uf)
            VALUES (${bandeira.id}, ${`${bandeira.nome} - ${cidade}`}, ${cidade}, ${local.uf})
            ON CONFLICT DO NOTHING
          `
        }
      }
    }

    // Buscar todas as lojas criadas
    const todasLojas = await prisma.$queryRaw<LojaRaw[]>`SELECT id, nome, cidade, uf FROM lojas`

    // Criar promotores de exemplo para cada local
    for (const local of locais) {
      for (const cidade of local.cidades) {
        // Verificar se o promotor já existe usando SQL bruto
        const promotorExistente = await prisma.$queryRaw`
          SELECT id FROM promotores.promotores 
          WHERE nome = ${`Promotor ${cidade}`} 
          AND cidade = ${cidade} 
          AND uf = ${local.uf}
          LIMIT 1
        `

        if ((promotorExistente as any[]).length === 0) {
          // Criar promotor usando SQL bruto para evitar problemas de tipagem
          const promotorResult = await prisma.$executeRaw`
            INSERT INTO promotores.promotores (
              nome, 
              cpf, 
              endereco, 
              bairro, 
              cidade, 
              uf, 
              cep, 
              familia, 
              horasistema, 
              status_usuario, 
              latitude, 
              longitude
            ) VALUES (
              ${`Promotor ${cidade}`},
              ${Math.floor(Math.random() * 99999999999)
                .toString()
                .padStart(11, "0")},
              ${`Rua Exemplo, ${Math.floor(Math.random() * 1000)}`},
              ${`Bairro ${Math.floor(Math.random() * 10) + 1}`},
              ${cidade},
              ${local.uf},
              ${Math.floor(Math.random() * 99999999)
                .toString()
                .padStart(8, "0")},
              ${"Geral"},
              ${"40"},
              ${"Ativo"},
              ${-23.5505 + (Math.random() - 0.5) * 10},
              ${-46.6333 + (Math.random() - 0.5) * 10}
            ) RETURNING id
          `

          // Obter o ID do promotor inserido
          const promotorId = (promotorResult as any)[0]?.id

          // Criar disponibilidade para o promotor
          await prisma.disponibilidade.create({
            data: {
              promotor_id: promotorId,
              segunda: 8,
              terca: 8,
              quarta: 8,
              quinta: 8,
              sexta: 8,
              sabado: 4,
              domingo: 0,
            },
          })

          // Associar o promotor a algumas lojas da mesma cidade
          const lojasNaCidade = todasLojas.filter((loja: any) => loja.cidade === cidade && loja.uf === local.uf)

          // Selecionar até 3 lojas aleatórias para o promotor
          const lojasParaAssociar = lojasNaCidade
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.min(3, lojasNaCidade.length))

          for (const loja of lojasParaAssociar) {
            await prisma.$executeRaw`
              INSERT INTO promotor_loja (promotor_id, loja_id)
              VALUES (${promotorId}, ${loja.id})
              ON CONFLICT DO NOTHING
            `
          }

          // Criar valores para cada período
          const periodos = await prisma.periodo.findMany()
          for (const periodo of periodos) {
            // Definir valor base com base no tipo de dia
            let valorBase = 40 // Valor padrão para dias úteis

            if (periodo.tipo_dia === "sabado") {
              valorBase = 48 // Acréscimo de 20% para sábado
            } else if (periodo.tipo_dia === "domingo") {
              valorBase = 60 // Acréscimo de 50% para domingo
            }

            // Verificar se a tabela valores_promotor_periodo existe
            try {
              await prisma.$executeRaw`
                INSERT INTO valores_promotor_periodo (promotor_id, periodo_id, valor_hora, data_inicio)
                VALUES (${promotorId}, ${periodo.id}, ${valorBase}, CURRENT_TIMESTAMP)
                ON CONFLICT DO NOTHING
              `
            } catch (error) {
              console.error(`Erro ao inserir valor para promotor ${promotorId} e período ${periodo.id}:`, error)
            }
          }
        }
      }
    }

    console.log("Seed concluído com sucesso!")
    return { success: true, message: "Banco de dados populado com sucesso" }
  } catch (error: any) {
    console.error("Erro ao executar seed:", error)
    return {
      success: false,
      message: "Erro ao popular banco de dados",
      error: error.message,
    }
  }
}

async function getValorHoraPromotorPeriodo(promotorId: number, periodoId: number): Promise<number> {
  try {
    const valorPromotorPeriodo = await prisma.valorPromotorPeriodo.findFirst({
      where: {
        promotor_id: promotorId,
        periodo_id: periodoId,
      },
      orderBy: {
        data_inicio: "desc",
      },
    })

    if (!valorPromotorPeriodo) {
      console.warn(
        `Valor não encontrado para promotor ${promotorId} e período ${periodoId}. Retornando valor padrão de 40.`,
      )
      return 40 // Valor padrão caso não encontre
    }

    return valorPromotorPeriodo.valor_hora
  } catch (error) {
    console.error(`Erro ao buscar valor para promotor ${promotorId} e período ${periodoId}:`, error)
    return 40 // Valor padrão em caso de erro
  }
}

// Interface para os itens do pedido na função registrarPedido
interface PedidoItemInput {
  promotorId: number
  diasSelecionados: {
    [key: string]: {
      selected: boolean
      hours: number | string
      period: string
    }
  }
}

// Atualizar a função registrarPedido para usar o ID do cliente autenticado
export async function registrarPedido(clienteId: number, formaPagamento: string, pedidoItens: PedidoItemInput[]) {
  try {
    // Verificar se o cliente existe
    if (!clienteId) {
      return {
        success: false,
        message: "Cliente não identificado. Faça login para continuar.",
      }
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    })

    if (!cliente) {
      return {
        success: false,
        message: "Cliente não encontrado. Faça login novamente.",
      }
    }

    // Criar o pedido
    const pedido = await prisma.pedido.create({
      data: {
        cliente_id: clienteId,
        forma_pagamento: formaPagamento,
        status: "pendente", // Defina o status inicial
      },
    })

    // Criar as seleções de promotores para o pedido
    for (const item of pedidoItens) {
      const { promotorId, diasSelecionados } = item

      for (const dia in diasSelecionados) {
        if (diasSelecionados.hasOwnProperty(dia)) {
          const diaSelecionado = diasSelecionados[dia]

          if (diaSelecionado.selected && diaSelecionado.hours && diaSelecionado.period) {
            // Buscar o período pelo nome
            const periodo = await prisma.periodo.findFirst({
              where: {
                id: Number.parseInt(diaSelecionado.period),
              },
            })

            if (!periodo) {
              throw new Error(`Período não encontrado: ${diaSelecionado.period}`)
            }

            // Buscar o valor da hora para este promotor e período
            const valorHora = await getValorHoraPromotorPeriodo(promotorId, periodo.id)

            // Calcular o valor total
            const horas = Number(diaSelecionado.hours)
            const valor_total = horas * valorHora

            await prisma.selecaoPromotor.create({
              data: {
                pedido_id: pedido.id,
                promotor_id: promotorId,
                dia_semana: dia,
                periodo_id: periodo.id,
                horas: horas,
                valor_hora: valorHora,
                valor_total: valor_total,
              },
            })
          }
        }
      }
    }

    return {
      success: true,
      message: "Pedido registrado com sucesso!",
      pedidoId: pedido.id,
    }
  } catch (error: any) {
    console.error("Erro ao registrar pedido:", error)
    return {
      success: false,
      message: error.message || "Erro ao registrar pedido",
    }
  }
}

// Função para testar explicitamente a conexão com o banco de dados
export async function testDatabaseConnection() {
  try {
    // Tentar uma consulta simples
    const result = await prisma.$queryRaw`SELECT current_database() as database_name`
    return {
      success: true,
      message: "Conexão com o banco de dados bem-sucedida",
      result,
    }
  } catch (error: any) {
    return {
      success: false,
      message: "Falha na conexão com o banco de dados",
      error: error.message,
    }
  }
}

// Adicione uma função para depurar o banco de dados
export async function debugDatabase() {
  try {
    console.log("Iniciando debug do banco de dados...")

    // Verificar total de promotores
    const totalPromotores = await prisma.promotor.count()
    console.log(`Total de promotores: ${totalPromotores}`)

    // Verificar UFs disponíveis
    const ufs = await prisma.$queryRaw`SELECT DISTINCT uf FROM promotores WHERE uf IS NOT NULL`
    console.log(`UFs disponíveis: ${JSON.stringify(ufs)}`)

    // Verificar algumas cidades por UF
    for (const ufObj of ufs as any[]) {
      const uf = ufObj.uf
      const cidades = await prisma.$queryRaw`
        SELECT DISTINCT cidade FROM promotores 
        WHERE uf = ${uf} AND cidade IS NOT NULL 
        LIMIT 5
      `
      console.log(`Cidades em ${uf}: ${JSON.stringify(cidades)}`)
    }

    // Verificar bandeiras
    const bandeiras = await prisma.bandeira.findMany({
      select: { id: true, nome: true },
      take: 10,
    })
    console.log(`Bandeiras: ${JSON.stringify(bandeiras)}`)

    // Verificar lojas
    const lojas = await prisma.loja.findMany({
      select: { id: true, nome: true, bandeira_id: true, cidade: true, uf: true },
      take: 10,
    })
    console.log(`Lojas: ${JSON.stringify(lojas)}`)

    // Verificar relações promotor-loja
    const promotorLojas = await prisma.promotorLoja.count()
    console.log(`Total de relações promotor-loja: ${promotorLojas}`)

    return {
      success: true,
      totalPromotores,
      ufs: ufs,
      bandeiras,
      lojas: lojas.length,
      promotorLojas,
    }
  } catch (error) {
    console.error("Erro ao depurar banco de dados:", error)
    return {
      success: false,
      error: String(error),
    }
  }
}

// Interface para os itens do pedido na função getPedidosUsuario
interface PedidoItemDetalhe {
  id: number
  promotor_nome: string
  dia_semana: string
  periodo_descricao: string
  horas: number
  valor_hora: number
  valor_total: number
}

// Interface para o pedido na função getPedidosUsuario
interface PedidoDetalhe {
  id: number
  data_criacao: string
  status: string
  forma_pagamento: string
  valor_total: number
  itens: PedidoItemDetalhe[]
}

// Interface para o resultado da função getPedidosUsuario
interface PedidosResult {
  success: boolean
  pedidos: PedidoDetalhe[]
  message?: string
}

// Função para buscar os pedidos do usuário
export async function getPedidosUsuario(userId: number): Promise<PedidosResult> {
  try {
    // Verificar se o usuário está autenticado
    const currentUser = await getCurrentUser()

    if (!currentUser || currentUser.id !== userId) {
      return {
        success: false,
        message: "Usuário não autorizado",
        pedidos: [], // Garantir que pedidos seja sempre um array
      }
    }

    // Buscar os pedidos do usuário usando SQL bruto para evitar problemas de tipagem
    const pedidosRaw = await prisma.$queryRaw`
      SELECT 
        p.id, 
        p.data_criacao, 
        p.status, 
        p.forma_pagamento
      FROM 
        promotores.pedidos p
      WHERE 
        p.cliente_id = ${userId}
      ORDER BY 
        p.data_criacao DESC
    `

    // Buscar os itens de cada pedido
    const pedidosFormatados: PedidoDetalhe[] = await Promise.all(
      (pedidosRaw as any[]).map(async (pedido) => {
        // Buscar os itens do pedido
        const itensRaw = await prisma.$queryRaw`
          SELECT 
            sp.id,
            sp.dia_semana,
            sp.horas,
            sp.valor_hora,
            sp.valor_total,
            pr.nome as promotor_nome,
            pe.descricao as periodo_descricao
          FROM 
            promotores.selecao_promotores sp
          JOIN 
            promotores.promotores pr ON sp.promotor_id = pr.id
          JOIN 
            promotores.periodos pe ON sp.periodo_id = pe.id
          WHERE 
            sp.pedido_id = ${pedido.id}
        `

        // Calcular o valor total do pedido
        const valorTotal = (itensRaw as any[]).reduce((total: number, item: any) => total + Number(item.valor_total), 0)

        // Converter os itens para o formato esperado
        const itens: PedidoItemDetalhe[] = (itensRaw as any[]).map((item: any) => ({
          id: Number(item.id),
          promotor_nome: String(item.promotor_nome),
          dia_semana: String(item.dia_semana),
          periodo_descricao: String(item.periodo_descricao),
          horas: Number(item.horas),
          valor_hora: Number(item.valor_hora),
          valor_total: Number(item.valor_total),
        }))

        return {
          id: Number(pedido.id),
          data_criacao: new Date(pedido.data_criacao).toISOString(),
          status: String(pedido.status),
          forma_pagamento: String(pedido.forma_pagamento),
          valor_total: valorTotal,
          itens: itens,
        }
      }),
    )

    return {
      success: true,
      pedidos: pedidosFormatados,
    }
  } catch (error) {
    console.error("Erro ao buscar pedidos do usuário:", error)
    return {
      success: false,
      message: "Erro ao buscar pedidos",
      pedidos: [], // Garantir que pedidos seja sempre um array
    }
  }
}
