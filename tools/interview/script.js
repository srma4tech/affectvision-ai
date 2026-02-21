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
const nextStepEl = document.getElementById("next-step");
const restartSessionBtn = document.getElementById("restart-session");

let questionIndex = 0;
const askedQuestionIndexes = new Set([0]);
const metricSamples = [];
const sessionStartTime = Date.now();
let sessionEnded = false;
let questionMode = "automated";

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
  status.textContent = "Manual question sent to interviewee screen.";
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
    expressionEl.textContent = "No face detected";
    confidenceEl.textContent = "0%";
    runtimeStatus.textContent = "Waiting for face";
    return;
  }

  expressionEl.textContent = metrics.dominantExpression;
  confidenceEl.textContent = `${Math.round(metrics.confidence * 100)}%`;
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

  if (avgConfidence < 60) {
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
runtimeStatus.textContent = "Waiting for interviewee";

window.addEventListener("beforeunload", () => {
  channel.close();
});
