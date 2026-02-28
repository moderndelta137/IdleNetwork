import { create } from 'zustand'

type Speed = 1 | 2 | 4

type GameState = {
  ticks: number
  speed: Speed
  running: boolean
  setSpeed: (speed: Speed) => void
  start: () => () => void
}

let rafId: number | null = null
let previous = 0
let accumulator = 0

const baseTickMs = 100

export const useGameStore = create<GameState>((set, get) => ({
  ticks: 0,
  speed: 1,
  running: false,
  setSpeed: (speed) => set({ speed }),
  start: () => {
    if (get().running) {
      return () => undefined
    }

    set({ running: true })
    previous = performance.now()

    const step = (now: number) => {
      const state = get()
      const delta = now - previous
      previous = now

      accumulator += delta * state.speed

      while (accumulator >= baseTickMs) {
        accumulator -= baseTickMs
        set((current) => ({ ticks: current.ticks + 1 }))
      }

      rafId = requestAnimationFrame(step)
    }

    rafId = requestAnimationFrame(step)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      rafId = null
      accumulator = 0
      set({ running: false })
    }
  }
}))
