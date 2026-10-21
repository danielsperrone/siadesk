import { create } from 'zustand'

export interface CloudUser { id: number; name: string; email: string; company_id: number; admin: boolean }
export interface CloudResult { ok: boolean; status: number; data?: any; error?: string }
declare global {
  interface Window {
    siasgl?: {
      session: () => Promise<{user: CloudUser} | null>
      login: (credentials: {email: string; password: string; two_factor_code?: string}) => Promise<CloudResult>
      request: (endpoint: string, method: string, body?: unknown) => Promise<CloudResult>
      logout: () => Promise<void>
    }
  }
}
export const useSession = create<{user: CloudUser | null; online: boolean; ready: boolean; message: string}>(() => ({
  user: null, online: false, ready: false, message: '',
}))
export function canEditStandards() { return !!useSession.getState().user?.admin }
