# SkillMatrix — Blind Recruitment System
### MERN Stack + Claude AI Integration

> "Not just blind to names — blind to bias itself."

---

## 🗂️ Project Structure

```
skillmatrix/
├── backend/          ← Node.js + Express + MongoDB
│   ├── server.js
│   ├── .env.example  ← Copy to .env and fill in
│   ├── config/       ← DB connection
│   ├── middleware/   ← JWT auth + audit logger
│   ├── models/       ← Mongoose schemas
│   ├── routes/       ← REST API endpoints
│   └── services/     ← AI scoring, anonymizer, fairness monitor
│
└── frontend/         ← React + Vite + Tailwind CSS
    ├── src/
    │   ├── pages/    ← Landing, Auth, Jobs, Assessment, Dashboard
    │   ├── components/ ← Shared UI components
    │   ├── context/  ← Auth context
    │   └── api/      ← Axios client
    └── ...
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd skillmatrix/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and fill in:
#   MONGO_URI       → your MongoDB Atlas URI
#   GEMINI_API_KEY → your Claude API key (sk-ant-...)
#   JWT_SECRET      → any random 32+ char string
#   VAULT_A_SECRET  → exactly 32 characters
#   VAULT_B_SECRET  → exactly 32 characters (different from A)

# Start dev server
npm run dev
# ✅ Running on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd skillmatrix/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# ✅ Running on http://localhost:5173
```

### 3. Open in Browser
Navigate to **http://localhost:5173**

---

## 🤖 AI Integration Points

| Feature | Claude Model | What it does |
|---------|-------------|--------------|
| Assessment Generator | claude-sonnet-4 | Generates 8 bias-free questions when a job is posted |
| Text Answer Scorer | claude-sonnet-4 | Scores text/situational/code answers 0–100 with feedback |
| Bias Auditor | claude-sonnet-4 | Audits assessment questions for language/cultural bias |
| Candidate Insight | claude-sonnet-4 | Writes 3-line anonymized insight per candidate for recruiter |

---

## 🔐 Security Architecture

### Split-Key Cryptographic Vault
- Candidate identity split into 2 AES-256-CBC encrypted halves
- Half A stored in Vault A (VAULT_A_SECRET)
- Half B stored in Vault B (VAULT_B_SECRET)  
- Reconstruction requires both keys — triggered only post-shortlist
- Every reveal logged with timestamp, user ID, and IP

### Anonymization Pipeline
- Name → masked (caste-indicating surnames filtered via India-specific list)
- College → tier-masked ("IIT Bombay" → "Tier-1 Engineering Graduate")
- Location → fully redacted
- Age, gender, photo → stripped
- Random alphanumeric ID assigned (e.g., A-047)

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` — Register candidate or recruiter
- `POST /api/auth/login` — Login
- `GET  /api/auth/me` — Get current user

### Jobs
- `GET  /api/jobs` — List all active jobs (public)
- `GET  /api/jobs/:id` — Single job
- `POST /api/jobs` — Create job + AI generates assessment (recruiter only)
- `GET  /api/jobs/:id/assessment` — Get assessment (no answers)

### Submissions
- `POST /api/submissions` — Submit assessment (candidate)
- `GET  /api/submissions/my` — My submissions (candidate)

### Recruiter
- `GET  /api/recruiter/jobs` — My jobs with stats
- `GET  /api/recruiter/dashboard/:jobId` — Anonymized leaderboard
- `POST /api/recruiter/shortlist/:anonId` — Shortlist candidate
- `POST /api/recruiter/reveal/:anonId` — Reveal identity (logged!)
- `GET  /api/recruiter/fairness/:jobId` — Full fairness report
- `GET  /api/recruiter/audit/:jobId` — Audit log

---

## 🛠️ Tech Stack

**Backend:** Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs, AES-256-CBC (Node crypto)

**AI:** Anthropic Claude API (@anthropic-ai/sdk)

**Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Recharts, Lucide Icons, Axios

**Fonts:** Sora (headings) + DM Sans (body) + DM Mono (code/IDs)

---

## 🎯 User Flows

### Candidate Flow
1. Register → Browse Jobs → Click Apply
2. Fill profile (encrypted instantly)
3. Take timed AI-generated assessment
4. Submit → AI scores answers in real-time
5. See anonymous result + rank
6. Get notified when shortlisted/revealed

### Recruiter Flow
1. Register → Post Job (describe role)
2. AI generates bias-free assessment automatically
3. View anonymized leaderboard with fairness score
4. Read AI insights per candidate
5. Shortlist candidates
6. Confirm + reveal identity (logged permanently)
7. Contact candidate outside system

---

## 📊 Fairness Monitoring

- **Fairness Score (0–100):** Based on coefficient of variation in score distribution
- **Demographic Parity:** Pass rate comparison across groups post-reveal
- **Distribution Analysis:** Flags if scores are suspiciously clustered or skewed
- **AI Bias Audit:** Claude analyzes question text for language/cultural bias signals
- **Audit Trail:** 100% immutable log of all recruiter actions
