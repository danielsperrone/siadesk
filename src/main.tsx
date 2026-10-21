import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { CloudGate } from './cloud/CloudGate'
import './styles.css'
import { SimulatorBridge } from './simulator/SimulatorBridge'
import { BalancaBridge } from './simulator/BalancaBridge'
import { DisplayBridge } from './simulator/DisplayBridge'
import { LeitoresBridge } from './simulator/LeitoresCena'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SimulatorBridge />
    <BalancaBridge />
    <DisplayBridge />
    <LeitoresBridge />
    <CloudGate><App /></CloudGate>
  </StrictMode>,
)
