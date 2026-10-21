import type { PosteAdicional } from '../types'

const metros = (valor: number) => `${valor.toFixed(2).replace('.', ',')} m`

/** Vista a partir do lado B: Z+ à esquerda e Z- à direita. Cotas entre eixos. */
export function DesenhoTrave({ poste, larguraBalanca }: { poste: PosteAdicional; larguraBalanca: number }) {
  const largura = larguraBalanca + poste.afastamentoZ + poste.afastamentoZPositivo
  const escala = Math.min(180 / largura, 220 / poste.altura)
  const xEsquerda = 175 - largura * escala / 2
  const xDireita = 175 + largura * escala / 2
  const yChao = 268
  const yBarra = yChao - poste.altura * escala
  const yCota = yBarra - 18
  const xCota = xEsquerda - 25
  return <svg className="desenho-trave" viewBox="0 0 300 320" role="img" aria-label={`Desenho cotado de ${poste.nome}: altura ${metros(poste.altura)} e largura ${metros(largura)}`}>
    <title>{poste.nome} - vista frontal cotada</title>
    <g fill="none" stroke="#64748b" strokeWidth="0.8">
      <path d={`M ${xEsquerda} ${yBarra - 5} V ${yCota - 5} M ${xDireita} ${yBarra - 5} V ${yCota - 5}`} />
      <path d={`M ${xEsquerda - 5} ${yBarra} H ${xCota - 5} M ${xEsquerda - 5} ${yChao} H ${xCota - 5}`} />
      <path d={`M ${xEsquerda - 12} ${yChao + 3} H ${xDireita + 12}`} />
    </g>
    <g fill="none" stroke="#8b1a1a" strokeWidth="1.2">
      <path d={`M ${xEsquerda} ${yCota} H ${xDireita} M ${xEsquerda - 3} ${yCota + 3} l 6 -6 M ${xDireita - 3} ${yCota + 3} l 6 -6`} />
      <path d={`M ${xCota} ${yBarra} V ${yChao} M ${xCota - 3} ${yBarra + 3} l 6 -6 M ${xCota - 3} ${yChao + 3} l 6 -6`} />
    </g>
    <path d={`M ${xEsquerda} ${yChao} V ${yBarra} H ${xDireita} V ${yChao}`} fill="none" stroke="#374151" strokeWidth="4" strokeLinejoin="round" />
    <g fill="#374151">
      <rect x={xEsquerda - 7} y={yChao} width="14" height="3" />
      <rect x={xDireita - 7} y={yChao} width="14" height="3" />
    </g>
    <g fill="#8b1a1a" fontSize="11" fontWeight="700" textAnchor="middle">
      <text x="175" y={yCota - 7}>{metros(largura)}</text>
      <text transform={`translate(${xCota - 8}, ${(yBarra + yChao) / 2}) rotate(-90)`}>{metros(poste.altura)}</text>
    </g>
    <g fill="#334155" fontSize="9" textAnchor="middle">
      <text x={xEsquerda} y={yChao + 17}>Z+</text>
      <text x={xDireita} y={yChao + 17}>Z-</text>
      <text x="150" y="304">Cotas entre eixos - vista a partir do lado B</text>
      <text x="150" y="316">Altura medida do chão ao eixo da barra</text>
    </g>
  </svg>
}
