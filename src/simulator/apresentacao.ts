// Referência de conjunto de 5 eixos: Scania R360 4x2 + baú Facchini de 3 eixos,
// tara de 16.700 kg (UnB, Análise do impacto das condições de rodovias pavimentadas
// na renovação da frota de transporte rodoviário de carga, 2006, p. 64).
// https://www.transportes.unb.br/index.php?option=com_phocadownload&view=category&id=30:dissertacoes-2006&download=229
export const TARA_APRESENTACAO_KG = 16700
export const TOLERANCIA_APRESENTACAO_KG = 600

export function proximoPesoApresentacao(pesoAtual: number, aleatorio = Math.random): number {
  // Passos de 20 kg. Fora da faixa carregada, a próxima passagem será carregada.
  const vazio = pesoAtual > 50000
  const base = vazio ? TARA_APRESENTACAO_KG : 54000
  const tolerancia = vazio ? TOLERANCIA_APRESENTACAO_KG : 3000
  const passos = tolerancia / 20
  return base + (Math.floor(aleatorio() * (passos * 2 + 1)) - passos) * 20
}
