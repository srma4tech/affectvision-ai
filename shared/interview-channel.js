const CHANNEL_NAME = "moodlens-interview";

export class InterviewSyncChannel {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.channel = null;

    if ("BroadcastChannel" in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => this.onMessage?.(event.data);
    }

    window.addEventListener("storage", (event) => {
      if (event.key !== CHANNEL_NAME || !event.newValue) {
        return;
      }

      try {
        const data = JSON.parse(event.newValue);
        this.onMessage?.(data);
      } catch {
        // Ignore malformed storage events.
      }
    });
  }

  publish(payload) {
    const data = {
      ...payload,
      publishedAt: Date.now(),
    };

    if (this.channel) {
      this.channel.postMessage(data);
      return;
    }

    localStorage.setItem(CHANNEL_NAME, JSON.stringify(data));
  }

  close() {
    this.channel?.close();
  }
}
