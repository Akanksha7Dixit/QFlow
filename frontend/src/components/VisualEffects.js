import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const REVEAL_SELECTOR = '.app-main .card, .app-main .queue-card, .app-main .clinic-page-header, .app-main .clinic-stat-grid, .app-main .clinic-workspace-grid, .app-main .metric-block, .app-main .patient-ticket, .app-main .department-card, .app-main .care-record, .app-main .report-card, .app-main .clinic-panel'

function revealWords() {
  document.querySelectorAll('.app-main h1, .app-main h2').forEach((heading) => {
    if (heading.dataset.wordsRevealed) return
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT)
    const textNodes = []
    while (walker.nextNode()) textNodes.push(walker.currentNode)

    textNodes.forEach((node) => {
      const parts = node.textContent.split(/(\s+)/)
      const fragment = document.createDocumentFragment()
      parts.forEach((part, index) => {
        if (!part.trim()) {
          fragment.append(document.createTextNode(part))
          return
        }
        const word = document.createElement('span')
        word.className = 'headline-word'
        word.style.setProperty('--word-index', index)
        word.textContent = part
        fragment.append(word)
      })
      node.replaceWith(fragment)
    })

    heading.dataset.wordsRevealed = 'true'
  })
}

function animateCounter(element) {
  const targetText = element.textContent.trim()
  const target = Number(targetText.replace(/,/g, ''))
  if (!Number.isFinite(target) || target < 0 || element.dataset.counterTarget === targetText) return

  element.dataset.counterTarget = targetText
  const startedAt = performance.now()
  const duration = 850
  const update = (now) => {
    const progress = Math.min((now - startedAt) / duration, 1)
    const eased = 1 - ((1 - progress) ** 4)
    element.textContent = Math.round(target * eased).toLocaleString()
    if (progress < 1) requestAnimationFrame(update)
    else element.textContent = targetText
  }
  requestAnimationFrame(update)
}

export default function VisualEffects() {
  const location = useLocation()

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const main = document.querySelector('.app-main')

    revealWords()
    if (main) main.classList.remove('route-enter')
    requestAnimationFrame(() => main?.classList.add('route-enter'))

    if (reducedMotion) {
      revealTargets.forEach((element) => element.classList.add('is-visible'))
      return undefined
    }

    const observeRevealTargets = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((element, index) => {
        if (element.classList.contains('motion-reveal')) return
        element.classList.add('motion-reveal')
        element.style.setProperty('--reveal-index', index % 8)
        revealObserver.observe(element)
      })
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return
        target.classList.add('is-visible')
        target.querySelectorAll('.metric-value, .queue-number, .queue-card-stats strong').forEach(animateCounter)
        if (target.matches('.metric-block')) target.querySelectorAll('.metric-value').forEach(animateCounter)
        observer.unobserve(target)
      })
    }, { threshold: 0.12 })

    observeRevealTargets()
    const contentObserver = new MutationObserver(() => {
      revealWords()
      observeRevealTargets()
    })
    if (main) contentObserver.observe(main, { childList: true, subtree: true })

    document.querySelectorAll('.metric-value, .queue-number, .queue-card-stats strong').forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) animateCounter(element)
    })

    const progress = document.querySelector('.scroll-progress')
    const updateProgress = (event) => {
      const target = event.currentTarget
      const scrollable = target === window ? document.documentElement : target
      const maxScroll = scrollable.scrollHeight - scrollable.clientHeight
      const amount = maxScroll > 0 ? scrollable.scrollTop / maxScroll : 0
      if (progress) progress.style.transform = `scaleX(${amount})`
    }
    window.addEventListener('scroll', updateProgress, { passive: true })
    main?.addEventListener('scroll', updateProgress, { passive: true })
    updateProgress({ currentTarget: main || window })

    const handlePointerMove = (event) => {
      const card = event.target.closest('.card, .queue-card, .metric-block, .department-card')
      if (card && !event.target.closest('button, a, input, select')) {
        const rect = card.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        card.style.setProperty('--spot-x', `${x * 100}%`)
        card.style.setProperty('--spot-y', `${y * 100}%`)
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 2.4}deg`)
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 2.4}deg`)
      }

      const button = event.target.closest('.btn')
      if (button && !button.disabled) {
        const rect = button.getBoundingClientRect()
        button.style.setProperty('--magnet-x', `${(event.clientX - rect.left - rect.width / 2) * 0.08}px`)
        button.style.setProperty('--magnet-y', `${(event.clientY - rect.top - rect.height / 2) * 0.08}px`)
      }
    }
    const resetPointerStyles = (event) => {
      const card = event.target.closest('.card, .queue-card, .metric-block, .department-card')
      const button = event.target.closest('.btn')
      if (card && !card.contains(event.relatedTarget)) {
        card.style.removeProperty('--tilt-x')
        card.style.removeProperty('--tilt-y')
      }
      if (button && !button.contains(event.relatedTarget)) {
        button.style.removeProperty('--magnet-x')
        button.style.removeProperty('--magnet-y')
      }
    }
    document.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('pointerout', resetPointerStyles)

    return () => {
      revealObserver.disconnect()
      contentObserver.disconnect()
      window.removeEventListener('scroll', updateProgress)
      main?.removeEventListener('scroll', updateProgress)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerout', resetPointerStyles)
    }
  }, [location.pathname])

  return <div className="scroll-progress" aria-hidden="true" />
}