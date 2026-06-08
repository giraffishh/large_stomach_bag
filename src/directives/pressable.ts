import type { Directive } from 'vue'

const pressedClassName = 'is-pressed'
const pressFeedbackHoldMs = 120

type PressableElement = HTMLElement & {
  __pressableCleanup?: () => void
  __pressableResetTimer?: number
}

const isDisabled = (element: HTMLElement) => {
  if (element instanceof HTMLButtonElement) {
    return element.disabled
  }

  return element.getAttribute('aria-disabled') === 'true'
}

const clearResetTimer = (element: PressableElement) => {
  if (element.__pressableResetTimer === undefined) {
    return
  }

  window.clearTimeout(element.__pressableResetTimer)
  element.__pressableResetTimer = undefined
}

const clearPressed = (element: PressableElement) => {
  clearResetTimer(element)
  element.classList.remove(pressedClassName)
}

const setPressed = (element: PressableElement) => {
  if (isDisabled(element)) {
    clearPressed(element)
    return
  }

  clearResetTimer(element)
  element.classList.add(pressedClassName)
}

const releasePressed = (element: PressableElement) => {
  if (isDisabled(element)) {
    clearPressed(element)
    return
  }

  clearResetTimer(element)
  element.__pressableResetTimer = window.setTimeout(() => {
    element.classList.remove(pressedClassName)
    element.__pressableResetTimer = undefined
  }, pressFeedbackHoldMs)
}

export const pressable: Directive<PressableElement> = {
  mounted(element) {
    const handlePointerStart = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return
      }

      setPressed(element)

      if (element.setPointerCapture && !isDisabled(element)) {
        element.setPointerCapture(event.pointerId)
      }
    }

    const handlePointerRelease = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return
      }

      if (element.releasePointerCapture && element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId)
      }

      releasePressed(element)
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return
      }

      if (element.releasePointerCapture && element.hasPointerCapture?.(event.pointerId)) {
        element.releasePointerCapture(event.pointerId)
      }

      clearPressed(element)
    }

    const handlePressStart = () => setPressed(element)
    const handlePressRelease = () => releasePressed(element)
    const handlePressCancel = () => clearPressed(element)

    element.addEventListener('pointerdown', handlePointerStart)
    element.addEventListener('pointerup', handlePointerRelease)
    element.addEventListener('pointercancel', handlePointerCancel)
    element.addEventListener('touchstart', handlePressStart, { passive: true })
    element.addEventListener('touchend', handlePressRelease)
    element.addEventListener('touchcancel', handlePressCancel)
    element.addEventListener('blur', handlePressCancel)

    element.__pressableCleanup = () => {
      clearPressed(element)
      element.removeEventListener('pointerdown', handlePointerStart)
      element.removeEventListener('pointerup', handlePointerRelease)
      element.removeEventListener('pointercancel', handlePointerCancel)
      element.removeEventListener('touchstart', handlePressStart)
      element.removeEventListener('touchend', handlePressRelease)
      element.removeEventListener('touchcancel', handlePressCancel)
      element.removeEventListener('blur', handlePressCancel)
    }
  },
  beforeUnmount(element) {
    element.__pressableCleanup?.()
    element.__pressableCleanup = undefined
  },
}
