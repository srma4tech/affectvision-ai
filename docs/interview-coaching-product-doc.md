# Interview Coaching Product Document

## 1. Product Overview

### 1.1 Product Name (Working)
MoodLens Interview Coach

### 1.2 Problem
Candidates often fail interviews due to poor delivery, nervousness, and weak communication structure, even when technical knowledge is sufficient. Existing tools over-index on generic AI chat feedback and lack behavioral signal tracking over time.

### 1.3 Solution
A privacy-first AI interview coaching platform that combines:
- Video behavioral cues (expression trends, attention proxy, composure stability)
- Audio communication cues (pace, pauses, fillers, clarity)
- Answer-structure coaching (STAR/role-specific rubrics)

The system provides real-time and post-session coaching, with measurable improvement across attempts.

### 1.4 Target Users
- Students and fresh graduates
- Working professionals preparing for job switches
- Coaching institutes and placement cells
- Enterprise internal candidates

---

## 2. Vision and Positioning

### 2.1 Vision
Become the default “practice layer” before high-stakes interviews by giving objective, explainable, and repeatable coaching feedback.

### 2.2 Positioning Statement
For candidates who need interview readiness, MoodLens Interview Coach is an AI practice platform that gives timeline-based behavioral and communication coaching, unlike generic chatbots that provide only text suggestions.

### 2.3 Core Differentiators
- Timeline analytics: detects confidence dips and recovery points by timestamp
- Interview rubric scoring per role and round type
- Improvement trajectories across sessions (not one-off reports)
- Transparent scoring factors and actionable coaching tasks
- Privacy controls and explicit consent-first experience

---

## 3. Product Scope

### 3.1 In Scope (MVP)
- Guided mock interview setup (role, level, interview type)
- Webcam + mic based practice session (browser)
- Real-time signal extraction (expression confidence, speech pace, filler count)
- AI question flow with adaptive follow-ups
- Post-session scorecard and annotated replay timeline
- Progress dashboard across sessions
- User auth, session history, deletion controls

### 3.2 Out of Scope (MVP)
- Real interviewer marketplace
- Hiring decision automation
- Medical/psychological diagnostics
- Advanced multi-party panel simulation with live avatars

---

## 4. User Stories

1. As a candidate, I want to run a 20-minute mock interview for a chosen role so I can prepare under realistic conditions.
2. As a candidate, I want timestamped feedback so I know exactly where I lost confidence.
3. As a candidate, I want a weekly plan based on my weak areas so I can improve efficiently.
4. As an institute admin, I want cohort-level analytics so I can monitor student readiness.
5. As a privacy-conscious user, I want to delete videos and analytics whenever I choose.

---

## 5. Functional Requirements

### 5.1 Interview Session
- Select role: SDE, Product, Data Analyst, Sales, HR
- Select round: HR, behavioral, technical intro, case
- Select difficulty: easy/medium/hard
- Session duration: 10, 20, 30 minutes
- Question engine supports dynamic follow-ups

### 5.2 Signal Processing
- Face detection and expression inference per frame window
- Stabilized confidence/composure score via temporal smoothing
- Audio transcription and speaking metrics:
  - Words per minute
  - Pause length distribution
  - Filler words frequency
  - Response latency

### 5.3 Feedback Engine
- Per-answer scoring with rubric dimensions:
  - Clarity
  - Structure
  - Relevance
  - Confidence delivery
- Session-level coaching summary
- Top strengths and top improvement areas
- Suggested drills mapped to weak dimensions

### 5.4 Reporting
- Timeline graph with key events
- Downloadable summary (PDF)
- Session comparison view (session N vs N-1)

### 5.5 Accounts and Data
- Email/OAuth login
- Session history and metadata
- Soft delete + hard delete pipeline
- Consent and policy acknowledgment logging

---

## 6. Non-Functional Requirements

- Reliability: 99.5% monthly uptime (MVP target)
- Performance:
  - Live inference latency target: < 250 ms at p50
  - Report generation < 10 seconds after session end
- Security:
  - JWT + refresh token or managed auth provider
  - TLS for transport, encryption at rest
- Scalability: stateless API + queue workers for report jobs
- Observability: request logs, job logs, metrics, alerting

---

## 7. Responsible AI, Privacy, and Ethics

### 7.1 Principles
- Coaching support only; not hiring decision automation
- No protected-attribute inference
- No mental health diagnosis claims

### 7.2 User Controls
- Explicit consent before camera/mic capture
- Session recording toggle
- Data retention selection at onboarding
- Delete all data option

### 7.3 Transparency
- Score explanation panel with contributing factors
- Confidence intervals and low-confidence warnings
- “Do not over-interpret” disclaimer for emotion outputs

### 7.4 Compliance Readiness
- GDPR/CCPA aligned consent + deletion workflows
- Audit logs for admin and data operations
- SOC 2 roadmap after PMF

---

## 8. Technical Architecture

### 8.1 Frontend
- Next.js (React + TypeScript)
- WebRTC media capture in browser
- Real-time UI using WebSocket for signal updates
- Charts for timeline analytics

### 8.2 Backend
- API: Node.js (NestJS) or FastAPI
- Services:
  - Auth Service
  - Interview Service
  - Signal Aggregation Service
  - Feedback/Scoring Service
  - Reporting Service

### 8.3 AI/Inference
- Client-side fast inference for low-latency cues when possible
- Server-side aggregation/scoring pipeline
- Model config registry with version tracking

### 8.4 Data
- PostgreSQL for core relational data
- Redis for queues/caching
- Object storage for optional recordings/reports

### 8.5 Infra
- Dockerized services
- Deploy on AWS/GCP/Azure
- CI/CD with staging + production environments

---

## 9. Proposed Database Schema (MVP)

## users
- id (uuid, pk)
- email (unique)
- password_hash (nullable if OAuth)
- full_name
- role (candidate/admin)
- created_at
- updated_at

## organizations
- id (uuid, pk)
- name
- plan_tier
- created_at

## organization_members
- id (uuid, pk)
- organization_id (fk)
- user_id (fk)
- member_role (owner/admin/member)

## interview_templates
- id (uuid, pk)
- role_track (sde/product/sales/...)
- round_type (hr/behavioral/technical/case)
- difficulty
- config_json

## sessions
- id (uuid, pk)
- user_id (fk)
- organization_id (nullable fk)
- template_id (fk)
- status (scheduled/live/completed/failed)
- started_at
- ended_at
- consent_version
- recording_url (nullable)

## questions
- id (uuid, pk)
- session_id (fk)
- sequence_no
- question_text
- source (template/ai_followup)
- asked_at

## responses
- id (uuid, pk)
- session_id (fk)
- question_id (fk)
- transcript_text
- started_at
- ended_at

## signal_events
- id (bigserial, pk)
- session_id (fk)
- ts
- emotion_json
- confidence_score
- composure_score
- pace_wpm
- fillers_count_window

## session_scores
- id (uuid, pk)
- session_id (fk, unique)
- overall_score
- communication_score
- confidence_score
- structure_score
- relevance_score
- summary_json

## recommendations
- id (uuid, pk)
- session_id (fk)
- priority (high/medium/low)
- title
- action_text

## exports
- id (uuid, pk)
- session_id (fk)
- export_type (pdf/csv)
- file_url
- created_at

---

## 10. API Design (MVP)

### Auth
- POST /v1/auth/signup
- POST /v1/auth/login
- POST /v1/auth/oauth
- POST /v1/auth/refresh

### Templates
- GET /v1/templates?role_track=&round_type=&difficulty=
- GET /v1/templates/{id}

### Sessions
- POST /v1/sessions
- GET /v1/sessions
- GET /v1/sessions/{id}
- POST /v1/sessions/{id}/start
- POST /v1/sessions/{id}/end
- DELETE /v1/sessions/{id}

### Live Signals
- WS /v1/sessions/{id}/stream
- POST /v1/sessions/{id}/signals/batch

### Q&A
- POST /v1/sessions/{id}/questions/next
- POST /v1/sessions/{id}/responses

### Reports
- GET /v1/sessions/{id}/report
- POST /v1/sessions/{id}/export
- GET /v1/exports/{export_id}

### Progress
- GET /v1/users/me/progress
- GET /v1/users/me/insights

### Admin (Institute)
- GET /v1/orgs/{org_id}/dashboard
- GET /v1/orgs/{org_id}/users/{user_id}/sessions

---

## 11. Scoring Framework (Initial)

Score weights (example):
- Communication: 30%
- Confidence/Composure: 25%
- Structure: 25%
- Relevance: 20%

Normalization strategy:
- Convert raw metrics to 0-100 using role-specific baselines
- Penalize low-confidence model outputs less aggressively
- Use moving averages to reduce frame-level volatility

Output format:
- numeric score
- confidence band (low/medium/high)
- top contributing positives
- top contributing negatives

---

## 12. Analytics and Success Metrics

### Product KPIs
- Activation: % users completing first full mock within 24h
- Retention: D7 and D30
- Engagement: sessions/user/week
- Outcome proxy: average score improvement after 3 sessions
- Conversion: free to paid

### Model Quality KPIs
- Inference failure rate
- Average confidence calibration error
- False spike rate (emotional volatility artifacts)

---

## 13. Monetization

### Individual Plans
- Free: limited mocks/month, basic report
- Pro: unlimited mocks, deep analytics, export reports

### B2B Plans
- Institute/Bootcamp seats
- Admin dashboard and cohort analytics
- API/LMS integration

---

## 14. 12-Month Roadmap

### Q1 (MVP)
- Core interview flow
- Basic signal extraction
- Scorecard + replay
- Auth + data management

### Q2
- Adaptive question engine improvements
- Better calibration and smoothing
- PDF reports and progress plans

### Q3
- Institute dashboard (multi-user)
- Cohort analytics and LMS integrations
- Billing and subscriptions

### Q4
- Mobile app support
- Enterprise security controls
- Advanced benchmarking and coaching packs

---

## 15. Risks and Mitigations

1. Risk: Over-interpretation of emotion signals
- Mitigation: clear disclaimers, confidence bands, explainability

2. Risk: Bias across lighting/skin tones/devices
- Mitigation: dataset audits, calibration by environment, quality checks

3. Risk: User drop after first session
- Mitigation: weekly plans, nudges, progress gamification

4. Risk: Privacy concerns reducing adoption
- Mitigation: transparent controls, deletion, local-processing options

---

## 16. Implementation Plan (Execution)

### Team (lean)
- 1 Product Manager
- 1 UI/Frontend Engineer
- 1 Backend Engineer
- 1 ML Engineer
- 1 QA/Automation (shared)

### Suggested Milestones
1. Week 1-2: Product spec freeze, architecture setup
2. Week 3-5: Session flow + live capture + question engine v1
3. Week 6-8: Signal aggregation + scoring v1 + report UI
4. Week 9-10: Privacy/compliance baseline + deletion pipeline
5. Week 11-12: Pilot launch with 20-50 users, metrics instrumentation

---

## 17. Immediate Next Build Steps (Actionable)

1. Refactor current static prototype to TypeScript modules.
2. Add consent screen and retention policy UI.
3. Introduce session orchestration (start/end/timestamps).
4. Add transcript + filler word analysis pipeline.
5. Build session scorecard page and progress history.
6. Add backend API + PostgreSQL schema and migrations.

---

## 18. Download and Sharing

This document file is located at:
- docs/interview-coaching-product-doc.md

You can share this file directly with product, design, and engineering teams as the baseline PRD + technical spec starter.
