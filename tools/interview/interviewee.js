import { InterviewSessionEngine } from "../../shared/interview-session-engine.js";
import { InterviewSyncChannel } from "../../shared/interview-channel.js";

const status = document.getElementById("status");
const runtimeStatus = document.getElementById("runtime-status");
const questionEl = document.getElementById("question");
const video = document.getElementById("video");
const videoWrapper = document.getElementById("video-wrapper");

const engine = new InterviewSessionEngine({
  videoElement: video,
  wrapperElement: videoWrapper,
  statusElement: status,
  options: {
    modelUrl: "../../models",
    renderOverlay: false,
  },
  onMetrics: (metrics) => {
    channel.publish({
      type: "metrics:update",
      metrics,
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
    status.textContent = "Interview in progress.";
    runtimeStatus.textContent = "Live";
    channel.publish({ type: "interviewee:status", statusText: "Live" });
  })
  .catch((error) => {
    console.error(error);
    runtimeStatus.textContent = "Error";
    status.textContent = "Could not initialize interviewee screen.";
    channel.publish({ type: "interviewee:status", statusText: "Error" });
  });

window.addEventListener("beforeunload", () => {
  channel.publish({ type: "interviewee:status", statusText: "Disconnected" });
  channel.close();
});
