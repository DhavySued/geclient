import { useRef } from 'react'

const EDGE_PX    = 120   // distância da borda para começar a rolar (px)
const MAX_SPEED  = 18    // máximo de pixels por frame

/**
 * Auto-scroll durante drag (@hello-pangea/dnd).
 *
 * Prioridade: usa `.kanban-scroll-area` (kanban pages) para ambos os eixos.
 * Fallback: `.page-scroll` para páginas sem kanban-scroll-area.
 *
 * Usa requestAnimationFrame + rastreamento de posição do mouse para
 * um scroll suave e proporcional à proximidade da borda.
 */
export function useDragScroll() {
  const rafRef   = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const moveRef  = useRef(null)

  function onDragScrollStart() {
    // Rastreia posição do mouse durante o drag
    const handleMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMove)
    moveRef.current = handleMove

    function tick() {
      const { x, y } = mouseRef.current

      // Usa kanban-scroll-area quando disponível, senão page-scroll
      const scrollEl = document.querySelector('.kanban-scroll-area')
                    ?? document.querySelector('.page-scroll')
      if (scrollEl) {
        const rect = scrollEl.getBoundingClientRect()

        // Vertical
        let dy = 0
        if (y < rect.top + EDGE_PX) {
          dy = -MAX_SPEED * (1 - (y - rect.top) / EDGE_PX)
        } else if (y > rect.bottom - EDGE_PX) {
          dy = MAX_SPEED * (1 - (rect.bottom - y) / EDGE_PX)
        }
        if (dy) scrollEl.scrollBy({ top: dy })

        // Horizontal
        let dx = 0
        if (x < rect.left + EDGE_PX) {
          dx = -MAX_SPEED * (1 - (x - rect.left) / EDGE_PX)
        } else if (x > rect.right - EDGE_PX) {
          dx = MAX_SPEED * (1 - (rect.right - x) / EDGE_PX)
        }
        if (dx) scrollEl.scrollBy({ left: dx })
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  function onDragScrollEnd() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (moveRef.current) {
      window.removeEventListener('mousemove', moveRef.current)
      moveRef.current = null
    }
  }

  return { onDragScrollStart, onDragScrollEnd }
}
