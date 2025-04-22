export interface PeriodoPreco {
  id: number
  tipo_dia: string
  inicio: string
  fim: string
  descricao: string
  valor_hora?: number
}

// Função para obter períodos disponíveis por dia da semana
export async function getPeriodosByDay(day: string): Promise<PeriodoPreco[]> {
  try {
    // Em um sistema real, você buscaria do banco de dados com base no dia
    // Por simplicidade, estamos retornando valores fixos

    // Períodos para dias úteis (segunda a sexta)
    if (["segunda", "terca", "quarta", "quinta", "sexta"].includes(day)) {
      return [
        { id: 1, tipo_dia: "segunda_sexta", inicio: "08:00", fim: "12:00", descricao: "Manhã (8h-12h)" },
        { id: 2, tipo_dia: "segunda_sexta", inicio: "13:00", fim: "17:00", descricao: "Tarde (13h-17h)" },
        { id: 3, tipo_dia: "segunda_sexta", inicio: "08:00", fim: "17:00", descricao: "Integral (8h-17h)" },
      ]
    }

    // Períodos para sábado
    if (day === "sabado") {
      return [
        { id: 4, tipo_dia: "sabado", inicio: "08:00", fim: "12:00", descricao: "Manhã (8h-12h)" },
        { id: 5, tipo_dia: "sabado", inicio: "13:00", fim: "16:00", descricao: "Tarde (13h-16h)" },
      ]
    }

    // Períodos para domingo
    if (day === "domingo") {
      return [{ id: 6, tipo_dia: "domingo", inicio: "09:00", fim: "13:00", descricao: "Manhã (9h-13h)" }]
    }

    return []
  } catch (error) {
    console.error("Erro ao buscar períodos:", error)
    return []
  }
}

// Função para calcular o valor da hora com base no promotor, dia e período
export async function calcularValorHora(promotorId: number, day: string, periodo: string): Promise<number> {
  try {
    // Em um sistema real, você buscaria do banco de dados
    // Por simplicidade, estamos retornando valores fixos

    // Valor base para dias úteis
    if (["segunda", "terca", "quarta", "quinta", "sexta"].includes(day)) {
      if (periodo.includes("Manhã")) return 40
      if (periodo.includes("Tarde")) return 40
      if (periodo.includes("Integral")) return 35 // Desconto para período integral
    }

    // Valor para sábado (acréscimo de 20%)
    if (day === "sabado") {
      return 48
    }

    // Valor para domingo (acréscimo de 50%)
    if (day === "domingo") {
      return 60
    }

    return 40 // Valor padrão
  } catch (error) {
    console.error("Erro ao calcular valor hora:", error)
    return 40 // Valor padrão em caso de erro
  }
}
