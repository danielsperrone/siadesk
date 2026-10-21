const fs = require('node:fs')
const path = require('node:path')
const { spawn, execFileSync } = require('node:child_process')
const { Readable } = require('node:stream')
const { pipeline } = require('node:stream/promises')

function findBinary(app, name) {
  const exe = `${name}.exe`, root = path.resolve(__dirname, '../..')
  const candidates = [process.env[`SIADESK_${name.toUpperCase()}`], path.join(app.getPath('userData'), 'bin', exe),
    path.join(root, name, exe).replace('app.asar', 'app.asar.unpacked'), path.join(root, name, exe)]
  const found = candidates.find(p => p && fs.existsSync(p))
  if (found) return found
  try { return execFileSync('where.exe', [exe], { encoding: 'utf8', windowsHide: true, timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(/\r?\n/)[0] } catch { return null }
}

async function installBinary(app, name, signal) {
  const bin = path.join(app.getPath('userData'), 'bin')
  fs.mkdirSync(bin, { recursive: true })
  const temp = fs.mkdtempSync(path.join(bin, 'rtsp-install-'))
  try {
    const url = name === 'mediamtx'
      ? 'https://github.com/bluenviron/mediamtx/releases/download/v1.19.2/mediamtx_v1.19.2_windows_amd64.zip'
      : 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'
    const zip = path.join(temp, 'download.zip'), dest = path.join(temp, 'extraido')
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(240000)]) })
    if (!response.ok || !response.body) throw new Error(`Download de ${name}: HTTP ${response.status}`)
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(zip), { signal })
    fs.mkdirSync(dest)
    // O tar do Windows extrai ZIP sem depender dos módulos/perfis do PowerShell.
    await new Promise((resolve, reject) => {
      const child = spawn('tar.exe', ['-xf', zip, '-C', dest],
      { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], signal })
      let error = ''
      child.stderr.on('data', data => { error = (error + data.toString()).slice(-2000) })
      child.on('error', reject)
      child.on('close', code => code === 0 ? resolve() : reject(new Error(`Não foi possível extrair ${name} (${code}). ${error.trim()}`)))
    })
    signal.throwIfAborted()
    const find = dir => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) { const found = find(full); if (found) return found }
        else if (entry.name === `${name}.exe`) return full
      }
    }
    const exe = find(dest)
    if (!exe) throw new Error(`O pacote não contém ${name}.exe.`)
    const pending = path.join(bin, `${name}.pending`), final = path.join(bin, `${name}.exe`)
    fs.copyFileSync(exe, pending)
    fs.renameSync(pending, final)
    return final
  } finally {
    // A limpeza fica restrita à pasta temporária criada dentro do cache de binários.
    const resolved = path.resolve(temp)
    if (path.dirname(resolved) === path.resolve(bin) && path.basename(resolved).startsWith('rtsp-install-')) fs.rmSync(resolved, { recursive: true, force: true })
  }
}

async function ensureBinaries(app, signal, status) {
  const result = {}
  for (const name of ['mediamtx', 'ffmpeg']) {
    signal.throwIfAborted()
    result[name] = findBinary(app, name)
    if (!result[name]) {
      status(`Preparando ${name === 'ffmpeg' ? 'o vídeo (FFmpeg)' : 'o servidor RTSP'}… O primeiro uso precisa de internet e pode levar alguns minutos.`)
      result[name] = await installBinary(app, name, signal)
    }
  }
  return result
}
module.exports = { findBinary, ensureBinaries }
