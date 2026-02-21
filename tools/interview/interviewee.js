import { InterviewSessionEngine } from "../../shared/interview-session-engine.js";
import { InterviewSyncChannel } from "../../shared/interview-channel.js";

const status = document.getElementById("status");
const runtimeStatus = document.getElementById("runtime-status");
const questionEl = document.getElementById("question");
const video = document.getElementById("video");
const videoWrapper = document.getElementById("video-wrapper");

const motionState = {
  canvas: null,
  context: null,
  previousFrame: null,
  score: 0,
};

function initMotionAnalyzer() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 48;
  motionState.canvas = canvas;
  motionState.context = canvas.getContext("2d", { willReadFrequently: true });
}

function sampleBackgroundMotion() {
  if (!motionState.context || video.readyState < 2) {
    return motionState.score;
  }

  motionState.context.drawImage(video, 0, 0, motionState.canvas.width, motionState.canvas.height);
  const current = motionState.context.getImageData(
    0,
    0,
    motionState.canvas.width,
    motionState.canvas.height,
  ).data;

  if (!motionState.previousFrame) {
    motionState.previousFrame = new Uint8ClampedArray(current);
    motionState.score = 0;
    return motionState.score;
  }

  let delta = 0;
  for (let i = 0; i < current.length; i += 4) {
    const prevGray =
      (motionState.previousFrame[i] + motionState.previousFrame[i + 1] + motionState.previousFrame[i + 2]) / 3;
    const currGray = (current[i] + current[i + 1] + current[i + 2]) / 3;
    delta += Math.abs(currGray - prevGray);
  }

  const pixelCount = motionState.canvas.width * motionState.canvas.height;
  motionState.score = Math.min(1, delta / (pixelCount * 255));
  motionState.previousFrame = new Uint8ClampedArray(current);
  return motionState.score;
}

const engine = new InterviewSessionEngine({
  videoElement: video,
  wrapperElement: videoWrapper,
  statusElement: status,
  options: {
    modelUrl: "../../models",
    renderOverlay: false,
  },
  onMetrics: (metrics) => {
    const backgroundMotionScore = sampleBackgroundMotion();
    channel.publish({
      type: "metrics:update",
      metrics: {
        ...metrics,
        backgroundMotionScore,
      },
    });
  },
});

const channel = new InterviewSyncChannel((message) => {
  if (!message || !message.type) {
    return;
  }

  if (message.type === "question:update") {
    questionEl.textContent = message.question;
    runtimeStatus.textContent = "Question received";
    return;
  }

  if (message.type === "session:end") {
    runtimeStatus.textContent = "Interview ended";
    status.textContent = "Interviewer has ended the session.";
    engine.destroy();
  }
});

engine
  .init()
  .then(() => {
    initMotionAnalyzer();
    status.textContent = "Candidate session in progress.";
    runtimeStatus.textContent = "Live";
    channel.publish({ type: "interviewee:status", statusText: "Live" });
  })
  .catch((error) => {
    console.error(error);
    runtimeStatus.textContent = "Error";
    status.textContent = "Could not initialize candidate session screen.";
    channel.publish({ type: "interviewee:status", statusText: "Error" });
  });

window.addEventListener("beforeunload", () => {
  channel.publish({ type: "interviewee:status", statusText: "Disconnected" });
  channel.close();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    channel.publish({
      type: "proctor:event",
      eventType: "tab_hidden",
      detail: "Candidate session screen was hidden or tab switched.",
    });
  }
});
