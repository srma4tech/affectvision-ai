import { InterviewSessionEngine } from "../../shared/interview-session-engine.js";

const QUESTION_BANK = {
  behavioral: {
    communication: [
      "Tell me about a time you had to explain a complex idea to a non-technical stakeholder.",
      "Describe a situation where you handled a misunderstanding in a team.",
      "Share an example of receiving critical feedback and how you acted on it.",
      "Describe a time you had to influence someone without authority.",
      "How do you keep communication clear under pressure?",
    ],
    product: [
      "Tell me about a product decision you disagreed with and how you handled it.",
      "Describe a time you prioritized between competing roadmap requests.",
      "How did you use customer feedback to improve a product outcome?",
      "Share an example where a product experiment failed and what you learned.",
      "Describe how you align engineering, design, and business stakeholders.",
    ],
    general: [
      "Tell me about a time you solved a difficult problem under tight timelines.",
      "Describe a conflict in your team and how you resolved it.",
      "Give an example of a project where you took ownership end-to-end.",
      "What is a recent professional setback and what changed after it?",
      "Describe a situation where you had to adapt quickly to change.",
    ],
  },
  technical: {
    javascript: [
      "Explain event loop behavior and how you would debug async timing issues.",
      "How do `var`, `let`, and `const` differ in scope and runtime behavior?",
      "Describe how you optimize frontend performance in a large SPA.",
      "What are common memory leak causes in JavaScript apps and how do you prevent them?",
      "Explain a real bug you solved in JS and your debugging strategy.",
    ],
    react: [
      "How do you decide when to split components and lift state?",
      "Explain how React rendering works and when memoization helps.",
      "Describe your approach to handling side effects and data fetching.",
      "How do you design reusable hooks and avoid hidden coupling?",
      "Tell me about a React performance issue you diagnosed and fixed.",
    ],
    python: [
      "Explain Python's GIL and when multiprocessing is preferred over threading.",
      "How would you design a robust API client with retries and backoff in Python?",
      "Describe how you profile and optimize a slow Python function.",
      "How do you structure Python projects for maintainability and testing?",
      "Tell me about a production bug you fixed in Python and your root-cause process.",
    ],
    general: [
      "Walk me through a system or feature you built and key technical tradeoffs.",
      "How do you break down ambiguous technical requirements into implementation steps?",
      "Describe your approach to writing maintainable and testable code.",
      "Tell me about a hard production issue and how you diagnosed it.",
      "How do you evaluate technical debt against delivery timelines?",
    ],
  },
  hr: {
    communication: [
      "How would your previous manager describe your communication style?",
      "Tell me about a time you had to de-escalate a difficult conversation.",
      "How do you collaborate with teammates who work very differently from you?",
      "Describe how you prepare for important stakeholder conversations.",
      "What does professional accountability mean to you?",
    ],
    general: [
      "Tell me about yourself and what kind of role environment helps you perform best.",
      "Why are you interested in this role at this stage of your career?",
      "What are your top strengths and where are you actively improving?",
      "Describe a time you showed leadership without formal authority.",
      "What are your 12-month career goals and how does this role support them?",
    ],
  },
};

const status = document.getElementById("status");
const appRoot = document.getElementById("app-root");
const practiceState = document.getElementById("practice-state");
const video = document.getElementById("video");
const videoWrapper = document.getElementById("video-wrapper");
const questionEl = document.getElementById("question");
const questionProgressEl = document.getElementById("question-progress");
const questionFeedbackEl = document.getElementById("question-feedback");
const answerInput = document.getElementById("answer-input");
const responseModeInputs = document.querySelectorAll('input[name="response-mode"]');
const audioControls = document.getElementById("audio-controls");
const startRecordingBtn = document.getElementById("start-recording");
const stopRecordingBtn = document.getElementById("stop-recording");
const clearTranscriptBtn = document.getElementById("clear-transcript");
const audioStatusEl = document.getElementById("audio-status");
const nextQuestionBtn = document.getElementById("next-question");
const endSessionBtn = document.getElementById("end-session");
const restartSessionBtn = document.getElementById("restart-session");
const expressionEl = document.getElementById("expression");
const confidenceEl = document.getElementById("confidence");
const facePresenceEl = document.getElementById("face-presence");
const liveHintEl = document.getElementById("live-hint");
const reportPanel = document.getElementById("report-panel");
const coachingPanel = document.getElementById("coaching-panel");
const setupPanel = document.getElementById("setup-panel");
const setupForm = document.getElementById("setup-form");
const interviewTypeEl = document.getElementById("interview-type");
const topicEl = document.getElementById("topic");
const customTopicEl = document.getElementById("custom-topic");
const customTopicLabelEl = document.getElementById("custom-topic-label");
const difficultyEl = document.getElementById("difficulty");
const questionCountEl = document.getElementById("question-count");
const browserNoteEl = document.getElementById("browser-note");
const startPracticeBtn = document.getElementById("start-practice");
const summaryList = document.getElementById("summary-list");
const expressionList = document.getElementById("expression-list");
const insightList = document.getElementById("insight-list");
const qualityList = document.getElementById("quality-list");
const integrityList = document.getElementById("integrity-list");
const responseBreakdownList = document.getElementById("response-breakdown-list");
const nextStepEl = document.getElementById("next-step");
const integrityModal = document.getElementById("integrity-modal");
const integrityModalMessage = document.getElementById("integrity-modal-message");
const integrityModalCloseBtn = document.getElementById("integrity-modal-close");

let engine = null;
let sessionEnded = false;
let questionIndex = 0;
let practiceQuestions = [];
let surveyConfig = null;
let responseMode = "text";
let speechRecognition = null;
let isRecording = false;
let policyViolationCount = 0;
let copyPasteAttemptCount = 0;
let lastPolicyViolationAt = 0;
let lastPolicyViolationReason = "";
let policyModalOpen = false;
const policyModalQueue = [];

const visualSamples = [];
const responses = [];
const policyEvents = [];
let sessionStartedAt = 0;
const MAX_POLICY_VIOLATIONS = 3;

function isGoogleChrome() {
  if (navigator.userAgentData?.brands) {
    return navigator.userAgentData.brands.some((brand) => brand.brand === "Google Chrome");
  }

  const ua = navigator.userAgent || "";
  return /Chrome/.test(ua) && !/Edg|OPR|Brave|SamsungBrowser|CriOS/.test(ua);
}

function updateBrowserConstraint() {
  const chromeSupported = isGoogleChrome();
  if (chromeSupported) {
    browserNoteEl.textContent = "Google Chrome detected. AI-assisted answer evaluation is enabled where available.";
    startPracticeBtn.disabled = false;
    return;
  }

  browserNoteEl.textContent = "This practice module is currently restricted to Google Chrome for best AI evaluation support.";
  startPracticeBtn.disabled = true;
}

function setListItems(target, items) {
  target.innerHTML = "";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = item;
    target.append(li);
  }
}

function renderResponseBreakdown(items) {
  responseBreakdownList.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "response-text";
    empty.textContent = "No response evaluations captured for this session.";
    responseBreakdownList.append(empty);
    return;
  }

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "response-card";

    const title = document.createElement("h4");
    title.textContent = `Question ${item.questionNumber}`;
    card.append(title);

    const meta = document.createElement("p");
    meta.className = "response-meta";
    meta.textContent = `Score: ${item.evaluation.score}/100 | Mode: ${item.responseMode} | Source: ${item.evaluation.source}`;
    card.append(meta);

    const questionLabel = document.createElement("p");
    questionLabel.className = "response-label";
    questionLabel.textContent = "Question";
    card.append(questionLabel);

    const questionText = document.createElement("p");
    questionText.className = "response-text";
    questionText.textContent = item.question;
    card.append(questionText);

    const answerLabel = document.createElement("p");
    answerLabel.className = "response-label";
    answerLabel.textContent = "Your Answer";
    card.append(answerLabel);

    const answerText = document.createElement("p");
    answerText.className = "response-text";
    answerText.textContent = item.answer;
    card.append(answerText);

    const strengthsLabel = document.createElement("p");
    strengthsLabel.className = "response-label";
    strengthsLabel.textContent = "What Worked";
    card.append(strengthsLabel);

    const strengthsList = document.createElement("ul");
    strengthsList.className = "response-list";
    const strengths = item.evaluation.strengths?.length
      ? item.evaluation.strengths
      : ["Complete answer attempt captured."];
    for (const entry of strengths) {
      const li = document.createElement("li");
      li.textContent = entry;
      strengthsList.append(li);
    }
    card.append(strengthsList);

    const improvementsLabel = document.createElement("p");
    improvementsLabel.className = "response-label";
    improvementsLabel.textContent = "Improvement Suggestions";
    card.append(improvementsLabel);

    const improvementsList = document.createElement("ul");
    improvementsList.className = "response-list";
    const improvements = item.evaluation.improvements?.length
      ? item.evaluation.improvements
      : ["No major gaps detected for this response."];
    for (const entry of improvements) {
      const li = document.createElement("li");
      li.textContent = entry;
      improvementsList.append(li);
    }
    card.append(improvementsList);

    responseBreakdownList.append(card);
  }
}

function setQuestionFeedback(message, type = "info") {
  questionFeedbackEl.textContent = message;
  questionFeedbackEl.dataset.type = type;
}

function shouldEnforcePolicy() {
  return !sessionEnded && !setupPanel.classList.contains("hidden");
}

function showPolicyWarningModal(message) {
  policyModalQueue.push(message);
  if (policyModalOpen) {
    return;
  }
  const next = policyModalQueue.shift();
  if (!next) {
    return;
  }
  integrityModalMessage.textContent = next;
  integrityModal.classList.remove("hidden");
  policyModalOpen = true;
}

function closePolicyWarningModal() {
  integrityModal.classList.add("hidden");
  policyModalOpen = false;
  const next = policyModalQueue.shift();
  if (next) {
    showPolicyWarningModal(next);
  }
}

function registerPolicyViolation(reason) {
  if (sessionEnded || setupPanel && !setupPanel.classList.contains("hidden")) {
    return;
  }

  const now = Date.now();
  if (now - lastPolicyViolationAt < 1200) {
    return;
  }
  if (reason === lastPolicyViolationReason && now - lastPolicyViolationAt < 3500) {
    return;
  }
  lastPolicyViolationAt = now;
  lastPolicyViolationReason = reason;

  policyViolationCount += 1;
  policyEvents.push({
    timestamp: now,
    reason,
    count: policyViolationCount,
  });

  setQuestionFeedback(
    `Integrity warning ${policyViolationCount}/${MAX_POLICY_VIOLATIONS}: ${reason}`,
    "error",
  );
  status.textContent = `Integrity warning ${policyViolationCount}/${MAX_POLICY_VIOLATIONS}: ${reason}`;
  const remaining = Math.max(0, MAX_POLICY_VIOLATIONS - policyViolationCount);
  showPolicyWarningModal(
    `Warning ${policyViolationCount}/${MAX_POLICY_VIOLATIONS}: ${reason}${remaining > 0 ? ` ${remaining} attempts left.` : ""}`,
  );

  if (policyViolationCount >= MAX_POLICY_VIOLATIONS) {
    endSession("Session ended due to repeated integrity violations.");
  }
}

function setResponseMode(mode) {
  responseMode = mode;
  const isAudio = mode === "audio";
  audioControls.classList.toggle("hidden", !isAudio);
  audioStatusEl.classList.toggle("hidden", !isAudio);
  answerInput.placeholder = isAudio
    ? "Transcript will appear here while recording..."
    : "Type your answer here for quality evaluation...";
}

function stopAudioCapture() {
  if (speechRecognition && isRecording) {
    speechRecognition.stop();
  }
}

function setupSpeechRecognition() {
  const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!RecognitionCtor) {
    audioStatusEl.textContent = "Speech recognition is not available in this browser.";
    startRecordingBtn.disabled = true;
    stopRecordingBtn.disabled = true;
    return;
  }

  speechRecognition = new RecognitionCtor();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = "en-US";

  speechRecognition.onstart = () => {
    isRecording = true;
    startRecordingBtn.disabled = true;
    stopRecordingBtn.disabled = false;
    audioStatusEl.textContent = "Recording... speak your answer.";
  };

  speechRecognition.onresult = (event) => {
    let finalText = "";
    let interimText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += `${result[0].transcript} `;
      } else {
        interimText += `${result[0].transcript} `;
      }
    }

    const baseText = answerInput.value.trim();
    if (finalText.trim()) {
      answerInput.value = `${baseText}${baseText ? " " : ""}${finalText.trim()}`;
    }

    const preview = answerInput.value.trim();
    if (interimText.trim()) {
      audioStatusEl.textContent = `Recording... ${interimText.trim()}`;
    } else if (preview) {
      audioStatusEl.textContent = "Recording... transcript captured.";
    }
  };

  speechRecognition.onend = () => {
    isRecording = false;
    startRecordingBtn.disabled = false;
    stopRecordingBtn.disabled = true;
    if (responseMode === "audio") {
      audioStatusEl.textContent = "Recording stopped.";
    }
  };

  speechRecognition.onerror = (event) => {
    isRecording = false;
    startRecordingBtn.disabled = false;
    stopRecordingBtn.disabled = true;
    audioStatusEl.textContent = `Audio capture error: ${event.error}`;
  };
}

function updateQuestionView() {
  questionEl.textContent = practiceQuestions[questionIndex];
  questionProgressEl.textContent = `Question ${questionIndex + 1} of ${practiceQuestions.length}`;
}

function applyDifficulty(question, difficulty) {
  if (difficulty === "hard") {
    return `Hard follow-up: ${question} Include tradeoffs, risks, and measurable impact.`;
  }
  if (difficulty === "easy") {
    return `Foundational: ${question} Keep your answer clear and concise.`;
  }
  return question;
}

function buildQuestionSet(config) {
  const typeBank = QUESTION_BANK[config.interviewType] || QUESTION_BANK.behavioral;
  const source = typeBank[config.topic] || typeBank.general || QUESTION_BANK.behavioral.general;
  const selected = [];

  for (let i = 0; i < config.questionCount; i += 1) {
    selected.push(source[i % source.length]);
  }

  return selected.map((question) => {
    let withTopic = question;
    if (config.customTopic) {
      withTopic = `${question} Focus this answer on ${config.customTopic}.`;
    }
    return applyDifficulty(withTopic, config.difficulty);
  });
}

function coachingHint(metrics) {
  if (!metrics.hasFace) {
    return "Keep your face centered in frame while answering.";
  }
  if (metrics.confidence < 0.45) {
    return "Slow down and speak in short structured points.";
  }
  if (metrics.dominantExpression === "neutral") {
    return "Add energy in tone and facial expression to improve engagement.";
  }
  if (metrics.attentionAway) {
    return "Try maintaining eye-line focus with the camera.";
  }
  return "Good presence. Continue with concise and confident delivery.";
}

function onMetrics(metrics) {
  if (sessionEnded) {
    return;
  }

  visualSamples.push({ ...metrics, timestamp: Date.now(), questionIndex });

  if (!metrics.hasFace) {
    expressionEl.textContent = "No face detected";
    confidenceEl.textContent = "0%";
    facePresenceEl.textContent = "Low";
  } else {
    expressionEl.textContent = metrics.dominantExpression;
    confidenceEl.textContent = `${Math.round(metrics.confidence * 100)}%`;
    facePresenceEl.textContent = metrics.attentionAway ? "Distracted" : "Stable";
  }

  liveHintEl.textContent = coachingHint(metrics);
}

function heuristicEvaluateAnswer(question, answer) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lower = answer.toLowerCase();
  const hasStructure = ["situation", "task", "action", "result", "impact"].some((token) =>
    lower.includes(token),
  );
  const hasNumbers = /\d/.test(answer);

  let score = 35;
  score += Math.min(35, wordCount * 0.8);
  if (hasStructure) {
    score += 15;
  }
  if (hasNumbers) {
    score += 8;
  }
  if (wordCount < 25) {
    score -= 18;
  }

  score = Math.max(10, Math.min(95, Math.round(score)));

  const strengths = [];
  const improvements = [];

  if (wordCount >= 45) {
    strengths.push("Response had adequate depth.");
  } else {
    improvements.push("Add more detail with concrete examples.");
  }

  if (hasStructure) {
    strengths.push("Answer showed a structured narrative.");
  } else {
    improvements.push("Use STAR format to improve answer flow.");
  }

  if (hasNumbers) {
    strengths.push("Included measurable impact.");
  } else {
    improvements.push("Include metrics or outcomes where possible.");
  }

  if (strengths.length === 0) {
    strengths.push("You attempted a complete response to the question.");
  }

  return {
    score,
    strengths,
    improvements,
    summary: `Heuristic review for: ${question}`,
    source: "heuristic",
  };
}

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function chromeAiEvaluateAnswer(question, answer, config) {
  if (!window.ai?.languageModel?.create || !window.ai?.languageModel?.capabilities) {
    return null;
  }

  try {
    const capability = await window.ai.languageModel.capabilities();
    if (capability.available === "no") {
      return null;
    }

    const session = await window.ai.languageModel.create();
    const prompt = [
      "You are an interview answer evaluator.",
      `Interview Type: ${config.interviewType}`,
      `Topic: ${config.customTopic || config.topic}`,
      `Difficulty: ${config.difficulty}`,
      `Question: ${question}`,
      `Answer: ${answer}`,
      "Return strict JSON only with keys:",
      '{"score": number 0-100, "strengths": string[], "improvements": string[], "summary": string}',
    ].join("\n");

    const resultText = await session.prompt(prompt);
    session.destroy?.();

    const parsed = extractJsonObject(resultText);
    if (!parsed || typeof parsed.score !== "number") {
      return null;
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(parsed.score))),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "AI quality evaluation completed.",
      source: "chrome-ai",
    };
  } catch {
    return null;
  }
}

async function withTimeout(promise, timeoutMs) {
  let timeoutId = null;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  return result;
}

async function evaluateAnswer(question, answer) {
  const aiResult = await withTimeout(chromeAiEvaluateAnswer(question, answer, surveyConfig), 8000);
  if (aiResult) {
    return aiResult;
  }
  return heuristicEvaluateAnswer(question, answer);
}

async function advanceQuestionWithEvaluation() {
  if (sessionEnded) {
    return;
  }

  const answer = answerInput.value.trim();
  if (!answer) {
    setQuestionFeedback("Please provide an answer before moving to the next question.", "error");
    status.textContent = "Please provide an answer before moving to the next question.";
    return;
  }

  const currentQuestion = practiceQuestions[questionIndex];
  nextQuestionBtn.disabled = true;
  nextQuestionBtn.textContent = "Evaluating...";
  setQuestionFeedback("Evaluating your response. Please wait...", "info");
  status.textContent = "Evaluating response...";

  const evaluation = await evaluateAnswer(currentQuestion, answer);
  responses.push({
    question: currentQuestion,
    answer,
    evaluation,
    questionNumber: questionIndex + 1,
    responseMode,
  });

  answerInput.value = "";

  if (questionIndex < practiceQuestions.length - 1) {
    questionIndex += 1;
    updateQuestionView();
    setQuestionFeedback("Evaluation complete. Proceed with the next answer.", "success");
    status.textContent = "Response evaluated. Continue with the next question.";
    nextQuestionBtn.disabled = false;
    nextQuestionBtn.textContent = "Evaluate and Next";
    return;
  }

  setQuestionFeedback("All questions evaluated. End session to view final report.", "success");
  status.textContent = "All configured questions are evaluated. End session to view full report.";
  nextQuestionBtn.textContent = "All Questions Evaluated";
}

function buildResponseQualitySummary() {
  if (responses.length === 0) {
    return {
      avgScore: 0,
      strengths: ["No answer evaluations captured."],
      improvements: ["Attempt at least one full answer before ending session."],
    };
  }

  const avgScore = Math.round(
    responses.reduce((sum, response) => sum + response.evaluation.score, 0) / responses.length,
  );

  const strengthsPool = responses.flatMap((response) => response.evaluation.strengths || []);
  const improvementsPool = responses.flatMap((response) => response.evaluation.improvements || []);
  const audioResponses = responses.filter((response) => response.responseMode === "audio").length;

  return {
    avgScore,
    strengths: [...new Set(strengthsPool)].slice(0, 4),
    improvements: [...new Set(improvementsPool)].slice(0, 4),
    audioResponses,
  };
}

function buildReport() {
  const durationSec = Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000));
  const faceSamples = visualSamples.filter((sample) => sample.hasFace);
  const noFaceSamples = visualSamples.length - faceSamples.length;

  const avgConfidence = faceSamples.length
    ? Math.round(
        (faceSamples.reduce((sum, sample) => sum + sample.confidence, 0) / faceSamples.length) * 100,
      )
    : 0;

  const facePresencePct = visualSamples.length
    ? Math.round((faceSamples.length / visualSamples.length) * 100)
    : 0;

  const distribution = {};
  for (const sample of faceSamples) {
    distribution[sample.dominantExpression] = (distribution[sample.dominantExpression] || 0) + 1;
  }

  const sortedExpressions = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const expressionItems = sortedExpressions.length
    ? sortedExpressions.map(([label, count]) => `${label}: ${Math.round((count / faceSamples.length) * 100)}%`)
    : ["No expression trend available."];

  const quality = buildResponseQualitySummary();
  renderResponseBreakdown(responses);
  const qualityItems = [
    `Average response quality score: ${quality.avgScore}/100`,
    `Questions evaluated: ${responses.length}/${practiceQuestions.length}`,
    `Audio responses: ${quality.audioResponses}/${responses.length}`,
    `Evaluation source: ${responses.some((r) => r.evaluation.source === "chrome-ai") ? "Chrome AI + fallback" : "Heuristic fallback"}`,
    ...quality.strengths.map((item) => `Strength: ${item}`),
    ...quality.improvements.map((item) => `Improve: ${item}`),
  ];
  const integrityItems = [
    `Policy violations: ${policyViolationCount}/${MAX_POLICY_VIOLATIONS}`,
    `Copy/paste attempts blocked: ${copyPasteAttemptCount}`,
  ];
  if (policyEvents.length > 0) {
    for (const event of policyEvents.slice(-5)) {
      const t = new Date(event.timestamp).toLocaleTimeString();
      integrityItems.push(`${t} - ${event.reason}`);
    }
  } else {
    integrityItems.push("No integrity violations detected.");
  }

  const insights = [];
  if (quality.avgScore < 60) {
    insights.push("Response quality is below target. Expand examples and add measurable outcomes.");
  } else {
    insights.push("Response quality trend is healthy. Keep clarity and impact framing consistent.");
  }

  if (avgConfidence < 55) {
    insights.push("Confidence dropped in multiple intervals. Use slower pacing and controlled pauses.");
  }
  if (facePresencePct < 85) {
    insights.push("Face framing consistency needs improvement. Reposition camera and maintain eye-line.");
  }
  if (insights.length === 0) {
    insights.push("Balanced performance across delivery and content quality.");
  }

  setListItems(summaryList, [
    `Practice duration: ${durationSec}s`,
    `Interview type: ${surveyConfig.interviewType}`,
    `Topic: ${surveyConfig.customTopic || surveyConfig.topic}`,
    `Difficulty: ${surveyConfig.difficulty}`,
    `Questions attempted: ${responses.length}/${practiceQuestions.length}`,
    `Average confidence: ${avgConfidence}%`,
    `Face in frame: ${facePresencePct}%`,
    `No-face intervals: ${noFaceSamples}`,
  ]);

  setListItems(expressionList, expressionItems);
  setListItems(insightList, insights);
  setListItems(qualityList, qualityItems);
  setListItems(integrityList, integrityItems);

  if (quality.avgScore < 60) {
    nextStepEl.textContent =
      "Run another session on the same topic and answer with STAR structure plus one measurable outcome in each response.";
  } else if (avgConfidence < 55) {
    nextStepEl.textContent =
      "Keep current answer quality and focus next session on delivery stability, eye-line, and deliberate pace.";
  } else {
    nextStepEl.textContent =
      "Move to harder questions in the same topic and introduce constraint-based follow-up prompts for depth.";
  }
}

function endSession(forcedReason = "") {
  if (sessionEnded) {
    return;
  }

  sessionEnded = true;
  stopAudioCapture();
  engine?.destroy();
  practiceState.textContent = "Completed";
  status.textContent =
    typeof forcedReason === "string" && forcedReason
      ? forcedReason
      : "Practice session ended. Review your coaching report.";
  nextQuestionBtn.disabled = true;
  endSessionBtn.disabled = true;
  coachingPanel.classList.add("hidden");
  reportPanel.classList.remove("hidden");
  appRoot.classList.add("report-mode");
  buildReport();
}

async function startSessionFromSurvey() {
  if (!isGoogleChrome()) {
    status.textContent = "This module currently supports Google Chrome only.";
    return;
  }

  surveyConfig = {
    interviewType: interviewTypeEl.value,
    topic: topicEl.value,
    customTopic: topicEl.value === "custom" ? customTopicEl.value.trim() : "",
    difficulty: difficultyEl.value,
    questionCount: Number(questionCountEl.value),
  };

  if (surveyConfig.topic === "custom" && !surveyConfig.customTopic) {
    status.textContent = "Please enter a custom topic before starting.";
    return;
  }

  sessionStartedAt = Date.now();
  sessionEnded = false;
  questionIndex = 0;
  visualSamples.length = 0;
  responses.length = 0;
  policyEvents.length = 0;
  policyViolationCount = 0;
  copyPasteAttemptCount = 0;
  lastPolicyViolationAt = 0;
  lastPolicyViolationReason = "";

  practiceQuestions = buildQuestionSet(surveyConfig);
  updateQuestionView();
  nextQuestionBtn.textContent = "Evaluate and Next";
  answerInput.value = "";
  setQuestionFeedback("Answer the question, then click Evaluate and Next.", "info");
  audioStatusEl.textContent = "Microphone idle.";

  setupPanel.classList.add("hidden");
  coachingPanel.classList.remove("hidden");

  engine = new InterviewSessionEngine({
    videoElement: video,
    wrapperElement: videoWrapper,
    statusElement: status,
    options: {
      modelUrl: "../../models",
      renderOverlay: true,
    },
    onMetrics,
  });

  try {
    await engine.init();
    practiceState.textContent = "Live";
    status.textContent = "Practice session live. Answer each question and click 'Evaluate and Next'.";
    nextQuestionBtn.disabled = false;
    endSessionBtn.disabled = false;
    setQuestionFeedback("Integrity policy active: tab switching and copy/paste are not allowed.", "info");
  } catch (error) {
    console.error(error);
    practiceState.textContent = "Error";
    status.textContent = "Could not initialize practice session. Check camera permission and model loading.";
  }
}

function handleClipboardViolation(event, reason) {
  if (sessionEnded || setupPanel.classList.contains("hidden") === false) {
    return;
  }
  event.preventDefault();
  copyPasteAttemptCount += 1;
  registerPolicyViolation(reason);
}

function setupIntegrityGuards() {
  answerInput.addEventListener("paste", (event) => handleClipboardViolation(event, "Paste is disabled."));
  answerInput.addEventListener("copy", (event) => handleClipboardViolation(event, "Copy is disabled during session."));
  answerInput.addEventListener("cut", (event) => handleClipboardViolation(event, "Cut is disabled during session."));
  answerInput.addEventListener("drop", (event) => handleClipboardViolation(event, "Drag and drop input is disabled."));

  document.addEventListener("visibilitychange", () => {
    if (policyModalOpen) {
      return;
    }
    if (document.hidden && !sessionEnded && setupPanel.classList.contains("hidden")) {
      registerPolicyViolation("Tab or window switch detected.");
    }
  });

  window.addEventListener("blur", () => {
    if (policyModalOpen) {
      return;
    }
    if (!sessionEnded && setupPanel.classList.contains("hidden")) {
      registerPolicyViolation("Window focus lost.");
    }
  });

  window.addEventListener("keydown", (event) => {
    if (sessionEnded || !setupPanel.classList.contains("hidden")) {
      return;
    }

    const key = event.key.toLowerCase();
    const blockedShortcut =
      (event.ctrlKey && (key === "c" || key === "v" || key === "x" || key === "t" || key === "n" || key === "w" || key === "tab")) ||
      (event.metaKey && (key === "c" || key === "v" || key === "x" || key === "t" || key === "n" || key === "w")) ||
      (event.altKey && key === "tab");

    if (blockedShortcut) {
      event.preventDefault();
      if (key === "c" || key === "v" || key === "x") {
        copyPasteAttemptCount += 1;
      }
      registerPolicyViolation("Restricted keyboard shortcut used.");
    }
  });

  document.addEventListener("contextmenu", (event) => {
    if (sessionEnded || !setupPanel.classList.contains("hidden")) {
      return;
    }
    event.preventDefault();
    registerPolicyViolation("Context menu is disabled during session.");
  });
}

topicEl.addEventListener("change", () => {
  const isCustom = topicEl.value === "custom";
  customTopicEl.classList.toggle("hidden", !isCustom);
  customTopicLabelEl.classList.toggle("hidden", !isCustom);
});

for (const input of responseModeInputs) {
  input.addEventListener("change", () => {
    if (input.checked) {
      setResponseMode(input.value);
      if (input.value !== "audio") {
        stopAudioCapture();
      }
    }
  });
}

startRecordingBtn.addEventListener("click", () => {
  if (!speechRecognition) {
    audioStatusEl.textContent = "Speech recognition is not available.";
    return;
  }
  if (isRecording) {
    return;
  }
  speechRecognition.start();
});

stopRecordingBtn.addEventListener("click", () => {
  stopAudioCapture();
});

clearTranscriptBtn.addEventListener("click", () => {
  answerInput.value = "";
  audioStatusEl.textContent = isRecording ? "Recording... speak your answer." : "Transcript cleared.";
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startSessionFromSurvey();
});

nextQuestionBtn.addEventListener("click", async () => {
  await advanceQuestionWithEvaluation();
});

endSessionBtn.addEventListener("click", () => {
  endSession();
});
restartSessionBtn.addEventListener("click", () => {
  stopAudioCapture();
  window.location.reload();
});
integrityModalCloseBtn.addEventListener("click", () => {
  closePolicyWarningModal();
});
integrityModal.addEventListener("click", (event) => {
  if (event.target === integrityModal) {
    closePolicyWarningModal();
  }
});

updateBrowserConstraint();
setupSpeechRecognition();
setupIntegrityGuards();
setResponseMode("text");
coachingPanel.classList.add("hidden");
reportPanel.classList.add("hidden");
setQuestionFeedback("");
status.textContent = "Complete the survey to start your Chrome-based practice session.";
