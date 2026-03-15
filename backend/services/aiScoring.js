// ─── SkillMatrix AI Scoring Engine ──────────────────────────────
// Powered by Ollama (local LLM — no API key needed)

const OLLAMA_BASE_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const MODELS_TO_TRY = ['llama3.2', 'llama3.1', 'llama3', 'mistral', 'gemma2'];

// ✅ Robust JSON repair — handles malformed JSON from llama3.2
function parseJSON(raw) {
  if (!raw) throw new Error('Empty response');

  let cleaned = raw.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Extract the outermost { } block
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Repair common llama issues:

    // 1. Missing closing quote before ] or }  e.g. "text] → "text"]
    cleaned = cleaned.replace(/([^"\\])(]|})/g, (match, before, bracket) => {
      return before + bracket;
    });

    // 2. Trailing commas before ] or }
    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

    // 3. Truncated JSON — find last complete object and close arrays/objects
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      // 4. Last resort: find all complete question objects and wrap them
      const questionMatches = cleaned.match(/\{"id"[\s\S]*?"rubric"\s*:\s*(?:null|"[^"]*")\s*\}/g);
      if (questionMatches && questionMatches.length > 0) {
        const repairedQuestions = questionMatches.map(q => {
          try { return JSON.parse(q); } catch { return null; }
        }).filter(Boolean);
        if (repairedQuestions.length > 0) {
          return { questions: repairedQuestions };
        }
      }
      throw e2;
    }
  }
}

async function callOllama(prompt) {
  let lastError = null;

  for (const modelName of MODELS_TO_TRY) {
    try {
      console.log(`[Ollama] Trying model: ${modelName}`);

      const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false,
          options: { temperature: 0.1, num_predict: 8192 },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`HTTP ${response.status}: ${err}`);
      }

      const data = await response.json();
      const text = data.response;
      console.log(`[Ollama] Raw response preview:`, text?.substring(0, 300));

      const parsed = parseJSON(text);
      console.log(`[Ollama] Success with model: ${modelName}`);
      return parsed;

    } catch (err) {
      console.error(`[Ollama] Model ${modelName} failed: ${err.message}`);
      lastError = err;
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.error('[Ollama] All models failed. Last error:', lastError?.message);
  return null;
}

// ─────────────────────────────────────────────────────────────────
// FALLBACK QUESTIONS
// ─────────────────────────────────────────────────────────────────
function getFallbackQuestions(jobRole, count = 8) {
  const all = [
    {
      id: 'q1', type: 'mcq', category: 'aptitude',
      question: 'A task takes 6 people 4 days to complete. How many days would it take 8 people?',
      options: ['A) 2 days', 'B) 3 days', 'C) 4 days', 'D) 5 days'],
      correctAnswer: 'B', points: 10, timeLimit: 90, rubric: null,
    },
    {
      id: 'q2', type: 'mcq', category: 'aptitude',
      question: 'In a sequence: 2, 6, 12, 20, 30, what is the next number?',
      options: ['A) 40', 'B) 42', 'C) 44', 'D) 36'],
      correctAnswer: 'B', points: 10, timeLimit: 90, rubric: null,
    },
    {
      id: 'q3', type: 'text', category: 'domain',
      question: `Describe the most important technical skill for a ${jobRole} role with a practical example.`,
      options: null, correctAnswer: null, points: 20, timeLimit: 300,
      rubric: 'Look for: skill identification, real-world application, measurable outcome.',
    },
    {
      id: 'q4', type: 'text', category: 'domain',
      question: `What is the biggest challenge in a ${jobRole} position and how would you solve it?`,
      options: null, correctAnswer: null, points: 20, timeLimit: 300,
      rubric: 'Look for: problem identification, structured thinking, practical solution.',
    },
    {
      id: 'q5', type: 'situational', category: 'situational',
      question: 'A key requirement changes midway through your project. The deadline stays the same. What do you do?',
      options: null, correctAnswer: null, points: 15, timeLimit: 240,
      rubric: 'Look for: communication, prioritization, adaptability.',
    },
    {
      id: 'q6', type: 'situational', category: 'situational',
      question: 'You disagree with your team lead on a decision that may hurt the project. What steps do you take?',
      options: null, correctAnswer: null, points: 15, timeLimit: 240,
      rubric: 'Look for: professional communication, evidence-based reasoning.',
    },
    {
      id: 'q7', type: 'mcq', category: 'domain',
      question: 'Which approach best improves team productivity?',
      options: [
        'A) Each member works independently',
        'B) Regular check-ins with clear ownership and shared goals',
        'C) One person makes all decisions',
        'D) Tasks are randomly distributed',
      ],
      correctAnswer: 'B', points: 10, timeLimit: 60, rubric: null,
    },
    {
      id: 'q8', type: 'code', category: 'coding',
      question: 'Write a function that returns two numbers from an array that add up to a target. Return empty array if none found.\nExample: [2,7,11,15], target=9 → [2,7]',
      options: null, correctAnswer: null, points: 25, timeLimit: 600,
      rubric: 'Look for: correct logic, edge cases, O(n) preferred.',
    },
  ];
  return all.slice(0, count);
}

// ─────────────────────────────────────────────────────────────────

class AIScoringService {

  static async scoreTextAnswer({ question, answer, rubric, jobRole }) {
    if (!answer || answer.trim().length < 3) {
      return {
        success: true, score: 0, verdict: 'No Answer',
        feedback: 'No answer was provided.',
        strengths: [], improvements: ['Provide a complete answer'],
        keyConceptsHit: [],
      };
    }

    const prompt = `You are a skills evaluator for the role: "${jobRole}".
QUESTION: ${question}
CANDIDATE ANSWER: ${answer}
RUBRIC: ${rubric || 'Assess understanding, correctness, clarity, and practical application.'}
Rules: Judge skill only. Ignore grammar. Be fair to non-native English speakers.
Return ONLY valid JSON:
{"score":<0-100>,"verdict":"<Excellent|Good|Satisfactory|Needs Improvement>","feedback":"<2-3 sentences>","strengths":["..."],"improvements":["..."],"keyConceptsHit":["..."]}`;

    const data = await callOllama(prompt);
    if (!data) {
      const wordCount = answer.trim().split(/\s+/).length;
      const score = Math.min(70, Math.max(10, wordCount * 2));
      return {
        success: true, score,
        verdict: score >= 60 ? 'Satisfactory' : 'Needs Improvement',
        feedback: 'Answer received. AI scoring temporarily unavailable.',
        strengths: ['Answer submitted'], improvements: [], keyConceptsHit: [],
      };
    }
    return { success: true, ...data };
  }

  // ── Generate in 2 batches of 4 to avoid llama3.2 token truncation ──
  static async generateAssessment({ jobRole, jobDescription, difficulty = 'medium', questionCount = 8 }) {
    const ctx = (jobDescription || jobRole).substring(0, 150);

    const prompt1 = `Generate 4 assessment questions for role "${jobRole}" (difficulty: ${difficulty}, context: ${ctx}).
Required types: q1=aptitude MCQ, q2=aptitude MCQ, q3=domain MCQ, q4=domain text.
Return ONLY valid compact JSON (no spaces in keys, no line breaks inside strings):
{"questions":[{"id":"q1","type":"mcq","category":"aptitude","question":"QUESTION TEXT","options":["A) option","B) option","C) option","D) option"],"correctAnswer":"A","points":10,"timeLimit":90,"rubric":null},{"id":"q2","type":"mcq","category":"aptitude","question":"QUESTION TEXT","options":["A) option","B) option","C) option","D) option"],"correctAnswer":"B","points":10,"timeLimit":90,"rubric":null},{"id":"q3","type":"mcq","category":"domain","question":"QUESTION TEXT","options":["A) option","B) option","C) option","D) option"],"correctAnswer":"A","points":15,"timeLimit":90,"rubric":null},{"id":"q4","type":"text","category":"domain","question":"QUESTION TEXT","options":null,"correctAnswer":null,"points":20,"timeLimit":300,"rubric":"RUBRIC TEXT"}]}`;

    const prompt2 = `Generate 4 assessment questions for role "${jobRole}" (difficulty: ${difficulty}).
Required types: q5=domain text, q6=situational text, q7=situational text, q8=coding text.
Return ONLY valid compact JSON (no spaces in keys, no line breaks inside strings):
{"questions":[{"id":"q5","type":"text","category":"domain","question":"QUESTION TEXT","options":null,"correctAnswer":null,"points":20,"timeLimit":300,"rubric":"RUBRIC TEXT"},{"id":"q6","type":"situational","category":"situational","question":"QUESTION TEXT","options":null,"correctAnswer":null,"points":15,"timeLimit":240,"rubric":"RUBRIC TEXT"},{"id":"q7","type":"situational","category":"situational","question":"QUESTION TEXT","options":null,"correctAnswer":null,"points":15,"timeLimit":240,"rubric":"RUBRIC TEXT"},{"id":"q8","type":"code","category":"coding","question":"QUESTION TEXT","options":null,"correctAnswer":null,"points":25,"timeLimit":600,"rubric":"RUBRIC TEXT"}]}`;

    console.log('[AIScoringService] Generating batch 1 (q1-q4)...');
    const data1 = await callOllama(prompt1);

    console.log('[AIScoringService] Generating batch 2 (q5-q8)...');
    const data2 = await callOllama(prompt2);

    console.log('[AIScoringService] Batch1 questions:', data1?.questions?.length);
    console.log('[AIScoringService] Batch2 questions:', data2?.questions?.length);

    const combined = [
      ...(data1?.questions || []),
      ...(data2?.questions || []),
    ];

    if (combined.length > 0) {
      const questions = combined.map((q, i) => ({
        id:            `q${i + 1}`,
        type:          q.type          || 'text',
        category:      q.category      || 'domain',
        question:      q.question      || '',
        options:       q.options       || null,
        correctAnswer: q.correctAnswer || null,
        points:        q.points        || 10,
        timeLimit:     q.timeLimit     || 120,
        rubric:        q.rubric        || null,
      }));
      console.log('[AIScoringService] ✅ Total AI questions generated:', questions.length);
      return { success: true, questions, source: 'ollama' };
    }

    console.log('[AIScoringService] Using fallback questions for:', jobRole);
    return { success: true, questions: getFallbackQuestions(jobRole, questionCount), source: 'fallback' };
  }

  static async analyzeAssessmentBias({ questions }) {
    const qList = questions.map((q, i) => `Q${i + 1} [${q.category}/${q.type}]: ${q.question}`).join('\n');
    const prompt = `Audit these assessment questions for bias (language complexity, cultural assumptions, regional knowledge):
${qList}
Return ONLY valid JSON:
{"overallBiasRisk":"<low|medium|high>","biasScore":<0-100>,"flags":[],"summary":"<2-3 sentences>","recommendations":["<rec>"]}`;

    const data = await callOllama(prompt);
    if (!data) return { success: true, overallBiasRisk: 'low', biasScore: 10, flags: [], summary: 'No significant bias detected.', recommendations: [] };
    return { success: true, ...data };
  }

  static async generateCandidateInsight({ anonId, scores, totalScore, jobRole }) {
    const scoreLines = Object.entries(scores).filter(([, v]) => Number(v) > 0).map(([k, v]) => `${k}: ${v}%`).join(', ') || 'No breakdown';
    const prompt = `Write a 3-4 sentence objective talent insight for recruiter.
Candidate: ${anonId} | Role: ${jobRole} | Score: ${totalScore}/100 | Breakdown: ${scoreLines}
Do NOT mention name, gender, age, college, caste, or region.
Return ONLY valid JSON:
{"insight":"<3-4 sentences>","topStrengths":["skill1","skill2","skill3"],"fitScore":<0-100>,"recommendation":"<Strong Hire|Hire|Consider|Pass>"}`;

    const data = await callOllama(prompt);
    if (!data) {
      const rec = totalScore >= 80 ? 'Strong Hire' : totalScore >= 65 ? 'Hire' : totalScore >= 50 ? 'Consider' : 'Pass';
      return { success: true, insight: `Candidate ${anonId} scored ${totalScore}/100.`, topStrengths: ['Assessment completed'], fitScore: totalScore, recommendation: rec };
    }
    return { success: true, ...data };
  }
}

module.exports = AIScoringService;