# Dimensionador — Arquitetura do Projeto

Configurador desktop de projetos de automação de balança rodoviária (SIAMAC / linha OWL).
O usuário configura as peças do projeto; o aplicativo monta a cena 3D automaticamente,
gera as vistas técnicas, a documentação e exporta o PDF final no padrão do
"Desenho Técnico" entregue aos clientes (referência: `docs/exemplo-desenho-tecnico.pdf`,
projeto Lactalis OWLAUT-22042415519-07).

---

## 1. Princípio central

> **A configuração do projeto é a única fonte de verdade.**

Um único objeto (`ProjectConfig`, salvo como arquivo `.json`) descreve o projeto inteiro:
cliente, pedido/OS, dimensões da balança e os equipamentos selecionados. Tudo o mais é
**derivado** dele, sempre na mesma ordem:

```
ProjectConfig (JSON)
      │
      ▼
Motor de layout paramétrico  ──►  Lista de PieceInstance (peça + posição + rotação)
      │                                         │
      ▼                                         ▼
Especificação de páginas (PageSpec[])     Cena 3D (React Three Fiber)
      │                                         │
      ▼                                         ▼
Gerador de vistas (ViewSpec por página) ◄── snapshots renderizados
      │
      ▼
Páginas HTML A3 paisagem (vista + anotações + cotas + selo)
      │
      ▼
PDF final (Electron printToPDF)
```

Consequência prática: mudar "comprimento da balança: 18 → 24 m" reposiciona o 3D,
recalcula as cotas do posicionamento sugerido e atualiza todas as páginas do PDF.
Documento e desenho nunca dessincronizam.

---

## 2. Stack tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Desktop shell | **Electron** | App Windows; `webContents.printToPDF` gera o PDF vetorial nativamente |
| UI | **React 19 + TypeScript** | Formulários do configurador e tipagem forte do modelo de dados |
| 3D | **Three.js via React Three Fiber + drei** | Cena 3D reativa: mudou a config, o 3D atualiza sozinho |
| Modelos 3D | **glTF/GLB** (exportados do SketchUp) | Formato aberto, leve, carregamento nativo no Three.js |
| Estado | **Zustand** | Store simples para a configuração |
| Build | **Vite** | Dev server rápido, build simples |
| PDF | **HTML/CSS paginado + Electron printToPDF** | Layout de página em CSS (muito mais controlável que libs de PDF); imagens 3D entram como snapshots de alta resolução do canvas WebGL |
| Persistência | Arquivo de projeto `.json` | Simples, versionável, anexável a e-mail |

Scripts:

- `npm run dev` — desenvolvimento no navegador
- `npm run app` — janela Electron (desktop)
- `npm run build` — build de produção

---

## 3. Estrutura de pastas

```
Dimensionador/
├── ARQUITETURA.md            ← este documento
├── package.json
├── electron/
│   ├── main.cjs              ← janela + handler de exportação de PDF
│   └── preload.cjs           ← ponte segura renderer ↔ main (window.dimensionador)
├── public/
│   └── models/               ← GLBs exportados do SketchUp (ver LEIA-ME.txt)
├── docs/
│   ├── exemplo-desenho-tecnico.pdf  ← referência do PDF final (Lactalis)
│   └── paginas/              ← páginas do exemplo renderizadas em PNG
└── src/
    ├── types.ts              ← modelo de dados central
    ├── catalog/pieces.ts     ← catálogo de peças (geometria + metadados)
    ├── layout/
    │   ├── constants.ts      ← distâncias de engenharia (sem números mágicos no código)
    │   └── engine.ts         ← motor de layout paramétrico
    ├── store/project.ts      ← estado da configuração (zustand)
    ├── hooks/useModelosDisponiveis.ts ← detecção de GLBs presentes
    └── components/
        ├── ConfigPanel.tsx   ← painel de configuração
        ├── Scene.tsx         ← cena 3D (pista, grade, luz, peças)
        └── Piece.tsx         ← peça individual (GLB ou placeholder)

(planejado — fases 3 e 4)
    ├── views/                ← sistema de vistas (ViewSpec, câmeras, snapshot)
    ├── annotations/          ← linhas-guia, cotas, overlay SVG
    └── report/               ← PageSpec, templates HTML das páginas, selo, export PDF
```

---

## 4. Modelo de dados

### 4.1 ProjectConfig — a configuração

Campos atuais: cliente, obra, comprimento/largura da plataforma, comprimento do módulo,
sentido de fluxo e os equipamentos selecionados (cancelas, semáforos, câmeras LPR,
totem, display, laços, barreiras, cabine, quadro).

Campos a adicionar (fase 2, alinhado ao selo do PDF): `pedidoOs` (ex.
"OWLAUT-22042415519-07"), `revisao`, `dataCriacao`, `dataAlteracao`.

### 4.2 Catálogo de peças

Cada tipo de peça (`PieceType`) descreve: nome, descrição, arquivo GLB, dimensões do
placeholder e cor. **Evolução planejada** (fase 2) — metadados que alimentam a
documentação, extraídos do padrão observado no PDF de exemplo:

```ts
interface PieceTypeDoc {
  codigo: string            // ex.: "SIAP01"
  requisitos: string[]      // ex.: "Necessita de energia 110/220v (3x 1,5mm. Destino: Quadro de distribuição)"
  cabos: CaboSpec[]         // tipo, bitola, destino → alimenta a página de FIAÇÃO
  notasInstalacao: string[] // notas técnicas → alimentam as páginas de detalhe
}
```

### 4.3 Composição de postes (modelo SIAP)

No padrão SIAMAC, os equipamentos são montados **sobre postes padronizados**:

| Código | Poste | Equipamentos montados |
|---|---|---|
| SIAP01 | 3,00 m — tubo 2½" SCH. 40 | Leitor antena RFID |
| SIAP02 | 3,00 m — tubo 2½" SCH. 40 | Câmera IP POE + 2 conjuntos de semáforos |
| SIAP03 | 3,00 m — tubo 2½" SCH. 40 | Sensor de barreira (receptor) |
| SIAP04 | 1,50 m | Sensor de barreira (emissor) + câmera de reconhecimento de veículo maior que a balança |

O catálogo será refatorado para **composição**: o poste é a peça base e os equipamentos
"encaixam" em alturas definidas (sockets). Uma instância SIAP02 = `poste-3m` +
`camera-ip` @ 2,8 m + `semaforo` ×2 @ 2,2 m. Isso permite:

- reusar o mesmo GLB de poste para todos os SIAPs;
- gerar a página de detalhe de cada SIAP automaticamente (elevação do poste com
  cota de altura + anotações dos equipamentos, como nas páginas 4–6 do exemplo);
- variar a composição por projeto sem criar novos tipos.

### 4.4 PieceInstance — o resultado do layout

`{ id, tipo, rotulo, posicao [x,y,z], rotacaoY, offset? }` — o `offset` é o ajuste fino
manual para obras atípicas; a regra dá a posição base, o offset corrige a exceção.

---

## 5. Motor de layout paramétrico

Arquivo: `src/layout/engine.ts`. Sistema de coordenadas (metros):

- **Origem (0,0,0)** no centro da plataforma da balança, no nível do piso
- **+X** = sentido do fluxo (entrada em −X, saída em +X)
- **+Y** = para cima
- **Z** = lateral; −Z é o lado do motorista, +Z o lado da cabine/painel

Cada peça tem uma **regra declarativa** que calcula posição e rotação a partir da
configuração. Exemplos implementados:

- Módulos da plataforma enfileirados a partir de −comprimento/2
- Células de carga nas extremidades e junções entre módulos, nos dois lados
- Cancelas com recuo `RECUO_CANCELA` das bordas da plataforma
- Câmeras LPR a `DISTANCIA_LEITURA_LPR` da cancela, rotacionadas para o centro da faixa
- Sensores de barreira em pares (emissor/receptor) nas extremidades da plataforma
- Totem alinhado à janela do motorista; cabine afastada `AFASTAMENTO_CABINE`

Todas as distâncias vivem em `src/layout/constants.ts` com nomes autoexplicativos —
ajustar o padrão de instalação da empresa é editar um único arquivo, sem tocar em regra.

Refinamento planejado (fase 2): incorporar as distâncias cotadas na página
"POSICIONAMENTO SUGERIDO" do exemplo (3,00 m / 2,50 m / 1,00 m / 0,60 m / 0,675 m /
2,825 m) como o conjunto padrão de constantes, e instalar sensores **na diagonal em
relação à cancela** (nota da página 7 do exemplo: o braço não pode repousar
interrompendo o feixe, mas deve cruzá-lo ao abrir/fechar).

---

## 6. Pipeline dos modelos 3D (SketchUp → app)

As peças já existem em SketchUp. Fluxo de entrada:

1. Exportar cada peça como **GLB** para `public/models/<nome>.glb`
   (nomes exatos em `public/models/LEIA-ME.txt`)
2. Convenções: **unidades em metros**; **origem no centro da base** da peça
   (a peça "apoia" na origem); **frente voltada para +X** (eixo vermelho)
3. O app detecta o arquivo e troca o placeholder pelo modelo real ao recarregar —
   nenhuma alteração de código

Caminhos de exportação: SketchUp com extensão "glTF Export" (Extension Warehouse),
ou exportar `.dae`/`.obj` e converter no Blender.

---

## 7. Sistema de vistas — o coração da documentação

Análise do PDF de exemplo (11 páginas A3 paisagem, 1191×842 pt): **toda página técnica
é uma vista do mesmo cenário 3D** + anotações + selo. Estrutura observada:

| Pág. | Título (PLANTA:) | Tipo de vista | Conteúdo extra |
|---|---|---|---|
| 1 | Capa | — | Logo, cliente, última alteração, revisão |
| 2 | VISÃO GERAL DA BALANÇA | Planta (topo) | Rótulos com linha-guia de todos os equipamentos, seta "sentido de entrada" |
| 3 | POSTE | Elevação ortográfica | Cotas (350×350 mm, 250 mm…), 5 notas de engenharia (FCK, chumbadores, abraçadeiras) |
| 4 | SIAP01 | Elevação do poste | Cota de altura 3,00 m, anotação do leitor RFID com requisitos de cabos |
| 5 | SIAP02 | Elevação do poste | Câmera IP + semáforos, requisitos |
| 6 | SIAP03 e SIAP04 | Duas elevações | Sensores emissor/receptor, alturas 3,00 m e 1,50 m |
| 7 | DETALHE DOS SENSORES | **Isométrica 3D** | Cancela + postes + feixe (linha tracejada), notas de posicionamento |
| 8 | PAINEL SIAMAC | Elevação/detalhe | Requisitos de instalação |
| 9 | POSICIONAMENTO SUGERIDO | Planta cotada | Cotas entre equipamentos + disclaimer "PROJETO ORIENTATIVO/SUGESTIVO" |
| 10 | FIAÇÃO | Planta | Anotação por equipamento: tipo de cabo, bitola, destino |
| 11 | CAIXAS DE PASSAGEM | Planta esquemática | Caixas de rede/energia, dutos, legenda colorida |

### 7.1 ViewSpec — vistas declarativas

Cada vista é descrita por dados, não por código ad-hoc. **As orientações de câmera de
cada vista serão definidas conforme orientação do usuário** — a estrutura aceita
qualquer combinação:

```ts
interface ViewSpec {
  id: string
  tipo: 'planta' | 'elevacao' | 'isometrica' | 'perspectiva'
  // Câmera ortográfica para planta/elevação (sem distorção de perspectiva,
  // permite cotas em escala); perspectiva para isométricas ilustrativas
  camera: {
    posicao: [number, number, number]
    alvo: [number, number, number]
    projecao: 'ortografica' | 'perspectiva'
    zoom?: number            // escala da vista ortográfica
  }
  pecasVisiveis?: PieceTypeId[] | 'todas'   // detalhe de 1 poste = só ele visível
  enquadrar?: string[]      // ids de instâncias a enquadrar automaticamente
  fundo: 'branco'           // páginas técnicas têm fundo branco, sem terreno/grade
}
```

Vistas padrão derivadas da geometria (presets): **planta** = câmera ortográfica em
+Y olhando para baixo; **elevação frontal** = câmera em −Z; **elevação lateral** =
câmera em +X; **isométrica** = posição (1,1,1) normalizada. Páginas de detalhe de
poste reaproveitam a mesma cena com `pecasVisiveis` filtrado para uma única instância.

### 7.2 Renderização de snapshots

- Cena renderizada **offscreen** em alta resolução (mín. 300 DPI para A3 ⇒
  ~4900×3500 px na área útil) com `preserveDrawingBuffer` + `toDataURL`
- Fundo branco, sem grade/terreno/sombras de cena — só as peças e a pista quando
  fizer sentido (padrão visual do exemplo: render técnico limpo)
- Uma render por `ViewSpec`; o resultado entra como `<img>` na página HTML

### 7.3 Anotações (linhas-guia) e cotas

Padrão visual do exemplo: texto preto pequeno, **linha-guia vermelha fina** com ponto
na origem, cotas vermelhas com setas e texto do valor.

Implementação: **overlay SVG sobre o snapshot**. Para cada anotação:

1. O ponto 3D de ancoragem (ex.: topo do poste SIAP01) é **projetado para 2D** usando
   a mesma câmera da vista (`Vector3.project(camera)`)
2. O SVG desenha a linha-guia do ponto projetado até a caixa de texto, posicionada
   por um algoritmo simples de distribuição nas margens (evita sobreposição)
3. Cotas: dois pontos 3D projetados + linha com setas + valor calculado **da geometria
   real** (nunca digitado) — se o layout mudar, a cota muda junto

O texto da anotação vem dos metadados do catálogo (`requisitos`, `cabos`), o que torna
a página de FIAÇÃO 100% gerada: para cada instância presente no projeto, anota
tipo de cabo, bitola e destino.

---

## 8. Gerador de documentação e PDF

### 8.1 PageSpec — o documento como dados

O documento é uma lista de páginas gerada a partir da configuração:

```ts
interface PageSpec {
  titulo: string               // campo PLANTA: do selo, ex. "VISÃO GERAL DA BALANÇA"
  vista?: ViewSpec             // página técnica = vista + anotações
  anotacoes?: AnnotationSpec[]
  cotas?: DimensionSpec[]
  blocosTexto?: TextoSpec[]    // notas de engenharia, disclaimers, legendas
}
```

Regra de montagem: capa sempre; visão geral sempre; uma página de detalhe **por tipo
de SIAP presente** no projeto; detalhe dos sensores se houver barreiras; página do
painel; posicionamento sugerido; fiação; caixas de passagem. Item não selecionado ⇒
página não existe e nenhuma outra página o menciona.

### 8.2 Selo (carimbo) padrão

Presente em todas as páginas exceto a capa, canto inferior direito — componente HTML
único reutilizado:

```
┌────────────────┬──────────────────────────────┐
│ EMPRESA:       │ PEDIDO/OS:                   │
│ SIAMAC         │ OWLAUT-XXXXXXXXXXX-XX        │
├────────────────┴──────────────────────────────┤
│ CLIENTE: <cliente>                       [QR] │
├──────────────────────────┬─────────────────────┤
│ PLANTA: <título da pág.> │ CRIAÇÃO: <data>     │
├─────────┬────────────────┼──────────┬──────────┤
│ PÁGINA: │ www.siamac.com.br/owl │ ULTIMA ALTERAÇÃO: │ REVISÃO: │
└─────────┴────────────────┴──────────┴──────────┘
```

Cabeçalho: logo SIAMAC + três linhas horizontais (vinho `#8b1a1a`, verde `#1a7a4a`,
azul `#1a4a8b` — calibrar com o arquivo de logo oficial).

### 8.3 Exportação

1. As páginas são montadas como HTML/CSS com `@page { size: A3 landscape }` e
   quebras de página explícitas
2. Pré-visualização dentro do app (mesma renderização que vai para o PDF)
3. `window.dimensionador.exportPdf()` → IPC para o main process →
   `webContents.printToPDF({ pageSize: 'A3', landscape: true, printBackground: true })`
   (handler já implementado em `electron/main.cjs`; ajustar para A3 paisagem)

---

## 9. Roadmap

- **Fase 1 — Esqueleto 3D paramétrico** ✅ *(concluída)*
  Configurador + motor de layout + cena 3D com placeholders + detecção de GLBs +
  shell Electron com handler de PDF.

- **Fase 2 — Peças reais e catálogo completo** *(em andamento)*
  ✅ 17 peças convertidas do SketchUp (conversor próprio: assimp + escala +
  normalização de origem + texturas embutidas — `npm run modelos`, config em
  `tools/pecas.json`); ✅ catálogo refatorado para composição de postes (SIAP01–04,
  equipamentos montados em alturas de `layout/constants.ts`); ✅ constantes
  calibradas com as cotas do projeto Lactalis.
  Pendente: calibrar rotações/alturas finas dos equipamentos com o usuário;
  metadados de documentação (requisitos, cabos, notas); `pedidoOs`, `revisao` e
  datas na config; salvar/abrir arquivo de projeto `.json`.

- **Fase 3 — Sistema de vistas**
  ViewSpec + câmeras ortográficas + snapshots offscreen em alta resolução; presets de
  planta/elevações/isométrica; **orientações das vistas definidas com o usuário**;
  overlay SVG de anotações com linha-guia; cotas calculadas da geometria.

- **Fase 4 — Documentação e PDF**
  PageSpec + templates HTML A3 das 11 páginas-padrão; selo e cabeçalho SIAMAC;
  página de fiação gerada dos metadados de cabos; pré-visualização do documento no
  app; exportação A3 paisagem via printToPDF; QR code do selo.

- **Fase 5 — Acabamento**
  Empacotamento do instalador Windows (electron-builder); biblioteca de projetos
  recentes; ajuste fino de posição por peça na UI (offset manual); validações
  (ex.: balança menor que o módulo).

---

## 10. Decisões de arquitetura (resumo)

1. **HTML→PDF em vez de lib de PDF** — o layout das páginas técnicas (selo, tabelas,
   posicionamento absoluto de anotações) é muito mais simples em CSS; printToPDF gera
   vetorial com qualidade de impressão.
2. **Snapshots raster do 3D + anotações em SVG por cima** — separa o problema:
   o 3D só precisa renderizar limpo; texto, linhas-guia e cotas ficam nítidos
   (vetoriais) em qualquer zoom do PDF.
3. **Vistas/páginas como dados (ViewSpec/PageSpec)** — adicionar uma página nova ou
   mudar a orientação de uma vista é editar uma especificação, não escrever código.
4. **Cotas sempre calculadas da geometria** — proíbe valor digitado; elimina a classe
   inteira de erro "documento diz X, desenho mostra Y".
5. **Composição de postes (SIAP)** — espelha como a SIAMAC realmente monta e vende;
   um GLB de poste serve a todos os SIAPs.
6. **Constantes de engenharia centralizadas** — `layout/constants.ts` é o único lugar
   com distâncias; auditável e ajustável pelo time de engenharia.
