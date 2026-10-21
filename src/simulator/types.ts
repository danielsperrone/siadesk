import type { EstadoSemaforo } from '../types'

export type CanalSemaforo = 'entrada-a' | 'entrada-b' | 'saida-a' | 'saida-b'
export type CanalSensor = 'A' | 'B' | 'figurante'
export type CanalCancela = 'A' | 'B' | 'figurante'
export type ModoSensor = 'auto' | 'livre' | 'ocupado'
export interface ConfiguracaoCLP {
  portas: { modbus: number; owl: number }
  recolhido?: boolean
  modosSensores?: Partial<Record<'A' | 'B', ModoSensor>>
  semaforos?: Partial<Record<CanalSemaforo, boolean>>
  entradas?: Record<string, boolean>
}
export const SEMAFOROS: { id: CanalSemaforo; nome: string; memoria: number }[] = [
  { id: 'entrada-a', nome: 'Semáforo AA', memoria: 6 },
  { id: 'entrada-b', nome: 'Semáforo AB', memoria: 7 },
  { id: 'saida-a', nome: 'Semáforo BA', memoria: 8 },
  { id: 'saida-b', nome: 'Semáforo BB', memoria: 9 },
]
export interface EstadoCLP {
  running: boolean
  firmware: string
  sha256: string
  elapsed: number
  connected: boolean
  initializing: boolean
  presenceWrites: [number, number]
  ports: { modbus: number; owl: number }
  listening: { modbus: boolean; owl: boolean }
  clients: { modbus: number; owl: number }
  errors: string[]
  logs: { time: string; text: string }[]
  inputs: Record<string, boolean>
  outputs: Record<string, boolean>
  memory: boolean[]
  lights: Record<CanalSemaforo, EstadoSemaforo>
  gates: Record<'A' | 'B', boolean>
  sensors: Record<'A' | 'B', boolean>
  sensorMode: Record<'A' | 'B', ModoSensor>
}
export type ComandoCLP =
  | { type: 'configure'; settings: ConfiguracaoCLP }
  | { type: 'start'; ports?: { modbus: number; owl: number } }
  | { type: 'stop' }
  | { type: 'clear-log' }
  | { type: 'coil'; address: number; value: boolean }
  | { type: 'input'; index: number; value: boolean }
  | { type: 'sensors'; A: boolean; B: boolean }
  | { type: 'sensor-mode'; channel: 'A' | 'B'; mode: ModoSensor }

declare global {
  interface Window {
    clp?: {
      state: () => Promise<EstadoCLP | null>
      command: (command: ComandoCLP) => Promise<{ ok: boolean; error?: string }>
      onState: (callback: (state: EstadoCLP) => void) => () => void
    }
  }
}
