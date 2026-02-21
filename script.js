const MODEL_URL = "./models";
const DETECTION_INTERVAL_MS = 100;

const video = document.getElementById("video");
const status = document.getElementById("status");
const videoWrapper = document.querySelector(".video-wrapper");

let detectionIntervalId = null;
let overlayCanvas = null;
let isDetecting = false;

function setStatus(message) {
  status.textContent = message;
}

async function loadModels() {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
  ]);
}

function clearDetectionLoop() {
  if (detectionIntervalId !== null) {
    clearInterval(detectionIntervalId);
    detectionIntervalId = null;
  }
}

function stopStream() {
  if (!video.srcObject) {
    return;
  }

  for (const track of video.srcObject.getTracks()) {
    track.stop();
  }
  video.srcObject = null;
}

function syncOverlaySize() {
  if (!overlayCanvas) {
    return;
  }

  const displaySize = {
    width: video.videoWidth || video.clientWidth || 720,
    height: video.videoHeight || video.clientHeight || 560,
  };

  faceapi.matchDimensions(overlayCanvas, displaySize);
  overlayCanvas.width = displaySize.width;
  overlayCanvas.height = displaySize.height;
}

async function startVideo() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus("Camera API is not supported in this browser.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    setStatus("Camera started. Detecting mood...");
  } catch (error) {
    console.error(error);
    setStatus("Unable to access camera. Please allow permission and reload.");
  }
}

function ensureOverlayCanvas() {
  if (overlayCanvas) {
    return;
  }

  overlayCanvas = faceapi.createCanvasFromMedia(video);
  videoWrapper.append(overlayCanvas);
}

async function runDetectionTick() {
  if (isDetecting || !overlayCanvas || video.readyState < 2) {
    return;
  }

  isDetecting = true;
  try {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    const displaySize = {
      width: overlayCanvas.width,
      height: overlayCanvas.height,
    };
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const context = overlayCanvas.getContext("2d");

    context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    faceapi.draw.drawDetections(overlayCanvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(overlayCanvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(overlayCanvas, resizedDetections);
  } catch (error) {
    console.error(error);
    setStatus("Face detection failed. Check console for details.");
  } finally {
    isDetecting = false;
  }
}

video.addEventListener("play", () => {
  ensureOverlayCanvas();
  syncOverlaySize();
  clearDetectionLoop();
  detectionIntervalId = setInterval(runDetectionTick, DETECTION_INTERVAL_MS);
});

video.addEventListener("loadedmetadata", syncOverlaySize);
window.addEventListener("resize", syncOverlaySize);
window.addEventListener("beforeunload", () => {
  clearDetectionLoop();
  stopStream();
});

loadModels()
  .then(() => {
    setStatus("Models loaded. Requesting camera permission...");
    return startVideo();
  })
  .catch((error) => {
    console.error(error);
    setStatus("Failed to load models. Ensure the app is served over HTTP.");
  });
