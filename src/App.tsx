import { useState } from 'react'
import { ConfigPanel } from './components/ConfigPanel'
import { Scene } from './components/Scene'

export default function App() {
  const [mostrarRotulos, setMostrarRotulos] = useState(true)

  return (
    <div className="app">
      <ConfigPanel />
      <main className="viewport">
        <div className="toolbar">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={mostrarRotulos}
              onChange={(e) => setMostrarRotulos(e.target.checked)}
            />
            Mostrar rótulos
          </label>
        </div>
        <Scene mostrarRotulos={mostrarRotulos} />
      </main>
    </div>
  )
}
