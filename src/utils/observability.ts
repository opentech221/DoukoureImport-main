type QaEventDetail = Record<string, unknown>

function safeConsole(kind: "info" | "error", message: string, detail: QaEventDetail) {
  const logger = kind === "error" ? console.error : console.info
  logger(`[qa-event] ${message}`, detail)
}

export function emitQaEvent(message: string, detail: QaEventDetail = {}) {
  safeConsole("info", message, detail)

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("qa:event", {
        detail: {
          message,
          ...detail,
        },
      }),
    )
  }
}

export function emitQaError(message: string, error: unknown, detail: QaEventDetail = {}) {
  const normalizedError = error instanceof Error ? error.message : String(error)
  safeConsole("error", message, {
    ...detail,
    error: normalizedError,
  })

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(
      new CustomEvent("qa:event", {
        detail: {
          message,
          error: normalizedError,
          ...detail,
        },
      }),
    )
  }
}