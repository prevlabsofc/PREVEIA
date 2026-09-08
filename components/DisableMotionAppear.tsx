'use client'

/**
 * Evita o caminho "optimized appear" do Framer Motion/motion-dom, que pode
 * lançar `Cannot read properties of undefined (reading 'startTime')` quando
 * `animation` ainda não foi criado no handoff.
 *
 * Com `MotionIsMounted = true` cedo, `startOptimizedAppearAnimation` retorna
 * sem registrar animações de aparecimento otimizadas. Animações `motion.*`
 * normais continuam funcionando.
 */
declare global {
  interface Window {
    MotionIsMounted?: boolean
  }
}

if (typeof window !== 'undefined') {
  window.MotionIsMounted = true
}

export function DisableMotionAppear() {
  return null
}
