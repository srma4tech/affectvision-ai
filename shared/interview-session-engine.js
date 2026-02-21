const DEFAULT_OPTIONS = {
  modelUrl: "./models",
  detectionIntervalMs: 120,
  renderOverlay: true,
};

export class InterviewSessionEngine {
  constructor({ videoElement, wrapperElement, statusElement, onMetrics, options = {} }) {
    this.video = videoElement;
    this.wrapper = wrapperElement;
    this.status = statusElement;
    this.onMetrics = onMetrics;
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.canvas = null;
    this.intervalId = null;
    this.isDetecting = false;
    this.boundSyncSize = this.syncOverlaySize.bind(this);
  }

  setStatus(text) {
    if (this.status) {
      this.status.textContent = text;
    }
  }

  async init() {
    await this.loadModels();
    await this.startCamera();
    this.video.addEventListener("play", () => this.startDetectionLoop());
    this.video.addEventListener("loadedmetadata", this.boundSyncSize);
    window.addEventListener("resize", this.boundSyncSize);
    window.addEventListener("beforeunload", () => this.destroy());
  }

  async loadModels() {
    this.setStatus("Loading models...");
    await Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(this.options.modelUrl),
      window.faceapi.nets.faceLandmark68Net.loadFromUri(this.options.modelUrl),
      window.faceapi.nets.faceExpressionNet.loadFromUri(this.options.modelUrl),
    ]);
    this.setStatus("Models ready. Requesting camera access...");
  }

  async startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.setStatus("Camera API is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      this.video.srcObject = stream;
      this.setStatus("Camera started. Detecting expressions...");
    } catch (error) {
      console.error(error);
      this.setStatus("Unable to access camera. Allow permission and reload.");
    }
  }

  ensureCanvas() {
    if (!this.options.renderOverlay) {
      return;
    }

    if (this.canvas) {
      return;
    }
    this.canvas = window.faceapi.createCanvasFromMedia(this.video);
    this.wrapper.append(this.canvas);
  }

  syncOverlaySize() {
    if (!this.options.renderOverlay || !this.canvas) {
      return;
    }

    const clientRect = this.video.getBoundingClientRect();
    const displaySize = {
      width: Math.round(clientRect.width) || this.video.clientWidth || this.video.videoWidth || 960,
      height: Math.round(clientRect.height) || this.video.clientHeight || this.video.videoHeight || 720,
    };

    window.faceapi.matchDimensions(this.canvas, displaySize);
    this.canvas.width = displaySize.width;
    this.canvas.height = displaySize.height;
  }

  startDetectionLoop() {
    this.ensureCanvas();
    if (this.options.renderOverlay) {
      this.syncOverlaySize();
    }
    this.stopDetectionLoop();

    this.intervalId = setInterval(async () => {
      await this.detectTick();
    }, this.options.detectionIntervalMs);
  }

  stopDetectionLoop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async detectTick() {
    if (this.isDetecting || this.video.readyState < 2) {
      return;
    }

    if (this.options.renderOverlay && !this.canvas) {
      return;
    }

    this.isDetecting = true;
    try {
      const detections = await window.faceapi
        .detectAllFaces(this.video, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      const displaySize = this.options.renderOverlay
        ? {
            width: this.canvas.width,
            height: this.canvas.height,
          }
        : {
            width: this.video.videoWidth || this.video.clientWidth || 960,
            height: this.video.videoHeight || this.video.clientHeight || 720,
          };

      const resized = window.faceapi.resizeResults(detections, displaySize);
      if (this.options.renderOverlay) {
        const context = this.canvas.getContext("2d");
        context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        window.faceapi.draw.drawDetections(this.canvas, resized);
        window.faceapi.draw.drawFaceLandmarks(this.canvas, resized);
        window.faceapi.draw.drawFaceExpressions(this.canvas, resized);
      }

      if (typeof this.onMetrics === "function") {
        this.onMetrics(this.buildMetrics(detections));
      }
    } catch (error) {
      console.error(error);
      this.setStatus("Detection failed. Check console and reload.");
    } finally {
      this.isDetecting = false;
    }
  }

  buildMetrics(detections) {
    if (!detections || detections.length === 0) {
      return {
        hasFace: false,
        faceCount: 0,
        dominantExpression: "No face detected",
        confidence: 0,
        attentionAway: false,
      };
    }

    const primary = detections[0];
    const expressions = primary.expressions || {};
    let dominantExpression = "neutral";
    let confidence = 0;

    for (const [label, score] of Object.entries(expressions)) {
      if (score > confidence) {
        dominantExpression = label;
        confidence = score;
      }
    }

    const faceCount = detections.length;
    const box = primary.detection?.box;
    const landmarks = primary.landmarks;
    let attentionAway = false;
    if (box && landmarks) {
      const nose = landmarks.getNose()[3] || landmarks.getNose()[0];
      if (nose) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const horizontalOffset = Math.abs(nose.x - centerX) / box.width;
        const verticalOffset = Math.abs(nose.y - centerY) / box.height;
        attentionAway = horizontalOffset > 0.2 || verticalOffset > 0.2;
      }
    }

    return {
      hasFace: true,
      faceCount,
      dominantExpression,
      confidence,
      attentionAway,
    };
  }

  stopCamera() {
    if (!this.video.srcObject) {
      return;
    }

    for (const track of this.video.srcObject.getTracks()) {
      track.stop();
    }
    this.video.srcObject = null;
  }

  destroy() {
    this.stopDetectionLoop();
    this.stopCamera();
    window.removeEventListener("resize", this.boundSyncSize);
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
  }
}
