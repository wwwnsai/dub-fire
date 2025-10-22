type EventCallback = (payload: any) => void

class EventBus {
  private events: Record<string, EventCallback[]> = {}

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) this.events[event] = []
    this.events[event].push(callback)
  }

  emit(event: string, payload?: any) {
    if (this.events[event]) {
      this.events[event].forEach((callback) => callback(payload))
    }
  }
}

export const eventBus = new EventBus()
