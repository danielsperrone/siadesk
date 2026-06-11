// Conversor de modelos do Dimensionador: SketchUp (FBX/OBJ) -> GLB
//
// Lê todos os .fbx/.obj de public/models/entrada/, converte para GLB via
// assimp (lê FBX ASCII e binário), aplica a escala definida em
// tools/escalas.json, normaliza a origem (centro da base no (0,0,0)) e
// embute as texturas encontradas na pasta de entrada.
//
// Uso:  npm run modelos
//
// Ao final imprime as dimensões em metros de cada peça — confira se batem
// com o tamanho real do equipamento.
import assimpjs from 'assimpjs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO, getBounds } from '@gltf-transform/core'

const RAIZ = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const ENTRADA = path.join(RAIZ, 'public', 'models', 'entrada')
const SAIDA = path.join(RAIZ, 'public', 'models')
const PECAS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'tools', 'pecas.json'), 'utf8'))

const EXTENSOES_MODELO = new Set(['.fbx', '.obj'])
const EXTENSOES_IMAGEM = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.tga'])

function listarRecursivo(dir) {
  const resultado = []
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const completo = path.join(dir, item.name)
    if (item.isDirectory()) resultado.push(...listarRecursivo(completo))
    else resultado.push(completo)
  }
  return resultado
}

// FBX ASCII referencia texturas por caminho absoluto da máquina de origem.
// Reescreve para apenas o nome do arquivo, para o assimp casar com as
// imagens da pasta de entrada e embutir no GLB.
function normalizarCaminhosTextura(textoFbx) {
  return textoFbx
    .replace(
      /(FileName|Filename|RelativeFilename):\s*"([^"]*)"/g,
      (_m, chave, caminho) => `${chave}: "${caminho.split(/[\\/]/).pop()}"`,
    )
    .replace(
      /("XRefUrl",\s*"",\s*")([^"]*)(")/g,
      (_m, antes, caminho, depois) => `${antes}${caminho.split(/[\\/]/).pop()}${depois}`,
    )
}

// Move a peça para que a origem (0,0,0) fique no ponto de ancoragem:
//   'centro'              -> centro da base do conjunto inteiro
//   'ancora-maior-altura' -> centro da base da malha mais alta (gabinete da
//                            cancela, poste com braço, etc.)
// Em ambos os modos a base da peça fica em Y = 0.
function normalizarOrigem(doc, modo) {
  const cena = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
  const total = getBounds(cena)

  let ancora = total
  if (modo === 'ancora-maior-altura') {
    let maiorAltura = -Infinity
    const visitar = (node) => {
      if (node.getMesh()) {
        const b = getBounds(node)
        const altura = b.max[1] - b.min[1]
        if (altura > maiorAltura) {
          maiorAltura = altura
          ancora = b
        }
      }
      node.listChildren().forEach(visitar)
    }
    cena.listChildren().forEach(visitar)
  }

  const dx = (ancora.min[0] + ancora.max[0]) / 2
  const dz = (ancora.min[2] + ancora.max[2]) / 2
  const dy = total.min[1]
  for (const raiz of cena.listChildren()) {
    const t = raiz.getTranslation()
    raiz.setTranslation([t[0] - dx, t[1] - dy, t[2] - dz])
  }
}

async function main() {
  if (!fs.existsSync(ENTRADA)) {
    fs.mkdirSync(ENTRADA, { recursive: true })
    console.log(`Pasta criada: ${ENTRADA}`)
    console.log('Coloque os .fbx exportados do SketchUp nela e rode novamente.')
    return
  }

  const arquivos = listarRecursivo(ENTRADA)
  const modelos = arquivos.filter((f) => EXTENSOES_MODELO.has(path.extname(f).toLowerCase()))
  const imagens = arquivos.filter((f) => EXTENSOES_IMAGEM.has(path.extname(f).toLowerCase()))

  if (modelos.length === 0) {
    console.log(`Nenhum .fbx/.obj encontrado em ${ENTRADA}`)
    return
  }

  const ajs = await assimpjs()
  const io = new NodeIO()
  console.log(`Convertendo ${modelos.length} modelo(s)...\n`)

  for (const modelo of modelos) {
    const nome = path.basename(modelo, path.extname(modelo)).toLowerCase()
    try {
      // --- 1. Conversão assimp -> GLB ---
      let dados = fs.readFileSync(modelo)
      const ehFbxAscii =
        path.extname(modelo).toLowerCase() === '.fbx' &&
        !dados.subarray(0, 18).equals(Buffer.from('Kaydara FBX Binary'))
      if (ehFbxAscii) {
        dados = Buffer.from(normalizarCaminhosTextura(dados.toString('latin1')), 'latin1')
      }

      const fileList = new ajs.FileList()
      fileList.AddFile(path.basename(modelo), new Uint8Array(dados))
      for (const img of imagens) {
        fileList.AddFile(path.basename(img), new Uint8Array(fs.readFileSync(img)))
      }

      const resultado = ajs.ConvertFileList(fileList, 'glb2')
      if (!resultado.IsSuccess() || resultado.FileCount() === 0) {
        console.log(`  ERRO em ${path.basename(modelo)}: ${resultado.GetErrorCode()}`)
        continue
      }
      const glbBruto = Buffer.from(resultado.GetFile(0).GetContent())

      // --- 2. Pós-processamento: escala + origem ---
      // O GLB do assimp pode referenciar texturas como arquivos externos;
      // lê via pasta temporária com as imagens ao lado para resolvê-las
      // (o writeBinary final embute tudo num único .glb).
      const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dimensionador-'))
      let doc
      try {
        fs.writeFileSync(path.join(temp, 'modelo.glb'), glbBruto)
        for (const img of imagens) {
          fs.copyFileSync(img, path.join(temp, path.basename(img)))
        }
        doc = await io.read(path.join(temp, 'modelo.glb'))
      } finally {
        fs.rmSync(temp, { recursive: true, force: true })
      }
      const config = PECAS[nome] ?? PECAS._padrao
      const escala = config.escala ?? 1

      if (escala !== 1) {
        for (const cena of doc.getRoot().listScenes()) {
          for (const raiz of cena.listChildren()) {
            const s = raiz.getScale()
            raiz.setScale([s[0] * escala, s[1] * escala, s[2] * escala])
          }
        }
      }

      normalizarOrigem(doc, config.origem ?? 'centro')

      const destino = path.join(SAIDA, `${nome}.glb`)
      fs.writeFileSync(destino, await io.writeBinary(doc))

      // --- 3. Relatório de dimensões ---
      const cena = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0]
      const { min, max } = getBounds(cena)
      const dims = [max[0] - min[0], max[1] - min[1], max[2] - min[2]]
      console.log(
        `  OK ${path.basename(modelo)} -> ${nome}.glb  ` +
          `(escala ${escala}; LxAxP: ${dims[0].toFixed(2)} x ${dims[1].toFixed(2)} x ${dims[2].toFixed(2)} m)`,
      )
    } catch (erro) {
      console.log(`  ERRO em ${path.basename(modelo)}: ${erro.message}`)
    }
  }

  console.log('\nConferir: as dimensoes acima batem com o tamanho real de cada peca?')
  console.log('Se nao baterem, ajuste a escala da peca em tools/pecas.json e rode de novo.')
}

main()
