import { InterviewSyncChannel } from "../../shared/interview-channel.js";

const QUESTIONS = [
  "Tell me about yourself and what role you are targeting.",
  "Describe a challenging problem you solved and your approach.",
  "Explain a time you received difficult feedback and what changed after that.",
  "Why do you want to work in this role at this company?",
];

const status = document.getElementById("status");
const runtimeStatus = document.getElementById("runtime-status");
const expressionEl = document.getElementById("expression");
const confidenceEl = document.getElementById("confidence");
const questionEl = document.getElementById("question");
const nextQuestionBtn = document.getElementById("next-question");
const endInterviewBtn = document.getElementById("end-interview");
const modeInputs = document.querySelectorAll('input[name="question-mode"]');
const manualQuestionInput = document.getElementById("manual-question");
const sendManualQuestionBtn = document.getElementById("send-manual-question");
const reportPanel = document.getElementById("report-panel");
const summaryList = document.getElementById("summary-list");
const expressionList = document.getElementById("expression-list");
const insightList = document.getElementById("insight-list");
const riskList = document.getElementById("risk-list");
const nextStepEl = document.getElementById("next-step");
const restartSessionBtn = document.getElementById("restart-session");
const riskLevelEl = document.getElementById("risk-level");

let questionIndex = 0;
const askedQuestionIndexes = new Set([0]);
const metricSamples = [];
const proctorEvents = [];
const sessionStartTime = Date.now();
let sessionEnded = false;
let questionMode = "automated";
let noFaceStreak = 0;

const channel = new InterviewSyncChannel((message) => {
  if (!message || !message.type || sessionEnded) {
    return;
  }

  if (message.type === "metrics:update") {
    handleMetrics(message.metrics);
    return;
  }

  if (message.type === "interviewee:status") {
    runtimeStatus.textContent = message.statusText || "Live";
    return;
  }

  if (message.type === "proctor:event") {
    proctorEvents.push({
      ...message,
      timestamp: Date.now(),
    });
  }
});

function updateQuestion() {
  questionEl.textContent = QUESTIONS[questionIndex];
}

function publishQuestion(questionText, source) {
  channel.publish({
    type: "question:update",
    question: questionText,
    source,
  });
}

nextQuestionBtn.addEventListener("click", () => {
  if (questionMode !== "automated" || sessionEnded) {
    return;
  }

  questionIndex = (questionIndex + 1) % QUESTIONS.length;
  askedQuestionIndexes.add(questionIndex);
  updateQuestion();
  publishQuestion(QUESTIONS[questionIndex], "automated");
});

sendManualQuestionBtn.addEventListener("click", () => {
  if (sessionEnded) {
    return;
  }

  if (questionMode !== "manual") {
    status.textContent = "Switch to 'Ask myself' mode to send a manual question.";
    return;
  }

  const question = manualQuestionInput.value.trim();
  if (!question) {
    status.textContent = "Enter a manual question before sending.";
    return;
  }

  questionEl.textContent = question;
  publishQuestion(question, "manual");
  manualQuestionInput.value = "";
  status.textContent = "Manual question sent to candidate screen.";
});

for (const input of modeInputs) {
  input.addEventListener("change", () => {
    questionMode = input.value;
    nextQuestionBtn.disabled = questionMode !== "automated" || sessionEnded;
    sendManualQuestionBtn.disabled = questionMode !== "manual" || sessionEnded;
  });
}

function handleMetrics(metrics) {
  if (sessionEnded) {
    return;
  }

  metricSamples.push({
    ...metrics,
    timestamp: Date.now(),
    questionIndex,
  });

  if (!metrics.hasFace) {
    noFaceStreak += 1;
    expressionEl.textContent = "No face detected";
    confidenceEl.textContent = "0%";
    runtimeStatus.textContent = "Waiting for face";
    if (noFaceStreak === 8) {
      proctorEvents.push({
        type: "proctor:event",
        eventType: "face_missing_long",
        detail: "Face missing for a sustained interval.",
        timestamp: Date.now(),
      });
    }
    riskLevelEl.textContent = "Medium";
    return;
  }

  noFaceStreak = 0;
  expressionEl.textContent = metrics.dominantExpression;
  confidenceEl.textContent = `${Math.round(metrics.confidence * 100)}%`;

  const sampleRisk =
    (metrics.faceCount > 1 ? 2 : 0) +
    (metrics.attentionAway ? 1 : 0) +
    (metrics.backgroundMotionScore > 0.35 ? 1 : 0);

  if (sampleRisk >= 3) {
    riskLevelEl.textContent = "High";
  } else if (sampleRisk >= 1) {
    riskLevelEl.textContent = "Medium";
  } else {
    riskLevelEl.textContent = "Low";
  }

  runtimeStatus.textContent = "Live";
}

updateQuestion();

function setListItems(listElement, items) {
  listElement.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    listElement.append(li);
  }
}

function buildReport() {
  const sessionDurationSec = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
  const faceSamples = metricSamples.filter((sample) => sample.hasFace);
  const noFaceSamples = metricSamples.length - faceSamples.length;

  if (metricSamples.length === 0) {
    setListItems(summaryList, [
      "No samples captured. Try allowing camera access and run another session.",
    ]);
    setListItems(expressionList, ["No expression data available."]);
    setListItems(insightList, ["Unable to compute insights for this run."]);
    setListItems(riskList, ["No risk signals captured because no candidate samples were received."]);
    riskLevelEl.textContent = "Unknown";
    nextStepEl.textContent = "Run a new interview and keep your face in frame for better analysis.";
    return;
  }

  const facePresencePct = Math.round((faceSamples.length / metricSamples.length) * 100);
  const avgConfidence = faceSamples.length
    ? Math.round(
        (faceSamples.reduce((sum, sample) => sum + sample.confidence, 0) / faceSamples.length) * 100,
      )
    : 0;

  const distribution = {};
  for (const sample of faceSamples) {
    distribution[sample.dominantExpression] = (distribution[sample.dominantExpression] || 0) + 1;
  }

  const sortedExpressions = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const topExpression = sortedExpressions.length ? sortedExpressions[0][0] : "none";

  const expressionItems = sortedExpressions.length
    ? sortedExpressions.map(([label, count]) => `${label}: ${Math.round((count / faceSamples.length) * 100)}%`)
    : ["No expression data captured."];

  const insights = [];
  const multiFaceSamples = metricSamples.filter((sample) => sample.faceCount > 1).length;
  const attentionAwaySamples = metricSamples.filter((sample) => sample.attentionAway).length;
  const highMotionSamples = metricSamples.filter((sample) => (sample.backgroundMotionScore || 0) > 0.35).length;
  const tabHiddenEvents = proctorEvents.filter((event) => event.eventType === "tab_hidden").length;
  const longMissingEvents = proctorEvents.filter((event) => event.eventType === "face_missing_long").length;

  if (facePresencePct < 80) {
    insights.push("Face visibility was inconsistent. Improve framing and lighting for stronger feedback.");
  }
  if (avgConfidence >= 75) {
    insights.push("High confidence consistency detected across the interview.");
  } else if (avgConfidence >= 50) {
    insights.push("Moderate confidence stability. Add slower breathing before each answer.");
  } else {
    insights.push("Low confidence consistency. Practice shorter, structured responses and deliberate pauses.");
  }

  if (topExpression === "neutral") {
    insights.push("Neutral expression dominated. Add more intentional energy and variation in delivery.");
  } else if (topExpression === "happy") {
    insights.push("Positive expression trend is strong. Keep this while tightening answer structure.");
  } else if (topExpression === "fearful" || topExpression === "sad") {
    insights.push("Stress indicators appeared frequently. Practice difficult questions in timed sets.");
  }

  if (insights.length === 0) {
    insights.push("Good baseline session. Increase question difficulty in the next run.");
  }

  const riskRate = metricSamples.length
    ? Math.round(
        ((multiFaceSamples * 2 + attentionAwaySamples + highMotionSamples + tabHiddenEvents * 3) /
          metricSamples.length) *
          100,
      )
    : 0;

  let riskBand = "Low";
  if (riskRate >= 30 || tabHiddenEvents > 1 || multiFaceSamples > 3) {
    riskBand = "High";
  } else if (riskRate >= 12 || tabHiddenEvents > 0 || multiFaceSamples > 0) {
    riskBand = "Medium";
  }

  const riskItems = [
    `Overall risk band: ${riskBand}`,
    `Additional face detected samples: ${multiFaceSamples}`,
    `Attention-away samples: ${attentionAwaySamples}`,
    `Background motion spikes: ${highMotionSamples}`,
    `Tab switched/hidden events: ${tabHiddenEvents}`,
    `Sustained face-missing events: ${longMissingEvents}`,
  ];

  const eventDetails = proctorEvents.slice(-5).map((event) => {
    const timeLabel = new Date(event.timestamp).toLocaleTimeString();
    return `${timeLabel}: ${event.detail || event.eventType}`;
  });
  if (eventDetails.length > 0) {
    riskItems.push(`Recent events: ${eventDetails.join(" | ")}`);
  }

  setListItems(summaryList, [
    `Duration: ${sessionDurationSec}s`,
    `Questions attempted: ${askedQuestionIndexes.size}/${QUESTIONS.length}`,
    `Samples captured: ${metricSamples.length}`,
    `Face in frame: ${facePresencePct}%`,
    `Average confidence: ${avgConfidence}%`,
    `No-face intervals: ${noFaceSamples}`,
  ]);

  setListItems(expressionList, expressionItems);
  setListItems(insightList, insights);
  setListItems(riskList, riskItems);
  riskLevelEl.textContent = riskBand;

  if (riskBand === "High") {
    nextStepEl.textContent = "Run a supervised re-interview and review flagged risk timestamps before decisioning.";
  } else if (avgConfidence < 60) {
    nextStepEl.textContent = "Repeat the same question set once with slower pacing and concise 60-90 second answers.";
  } else if (facePresencePct < 80) {
    nextStepEl.textContent = "Run the next session with eye-line alignment and brighter front lighting for cleaner tracking.";
  } else {
    nextStepEl.textContent = "Move to harder follow-up questions and focus on answer depth under time pressure.";
  }
}

function endInterview() {
  if (sessionEnded) {
    return;
  }

  sessionEnded = true;
  runtimeStatus.textContent = "Ended";
  status.textContent = "Interview ended. Report generated below.";
  nextQuestionBtn.disabled = true;
  sendManualQuestionBtn.disabled = true;
  endInterviewBtn.disabled = true;
  reportPanel.classList.remove("hidden");
  buildReport();
  channel.publish({ type: "session:end" });
}

endInterviewBtn.addEventListener("click", endInterview);
restartSessionBtn.addEventListener("click", () => {
  window.location.reload();
});
publishQuestion(QUESTIONS[questionIndex], "automated");
nextQuestionBtn.disabled = false;
sendManualQuestionBtn.disabled = true;
runtimeStatus.textContent = "Waiting for candidate";
riskLevelEl.textContent = "Low";
status.textContent = "Monitoring console ready. Open candidate session screen to start analytics.";

window.addEventListener("beforeunload", () => {
  channel.close();
});
