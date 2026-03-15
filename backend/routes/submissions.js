const express = require('express');
const { Job, Assessment, Submission } = require('../models');
const { protect, authorize, logAction } = require('../middleware/auth');
const AIScoringService = require('../services/aiScoring');
const AnonymizerService = require('../services/anonymizer');
const FairnessMonitor = require('../services/fairnessMonitor');
const router = express.Router();

// POST /api/submissions — candidate submits assessment
router.post('/', protect, authorize('candidate'), async (req, res) => {
  try {
    const { jobId, assessmentId, answers, profile, timeSpent } = req.body;

    // Check already submitted
    const existing = await Submission.findOne({ jobId, 'realIdentity.userId': req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'Already submitted for this job' });

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });

    const job = await Job.findById(jobId);

    // ── Step 1: Score each answer ───────────────────────────────
    const scoredAnswers = [];
    const categoryScores = { aptitude: [], domain: [], situational: [], coding: [] };

    for (const answer of answers) {
      const question = assessment.questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      let score = 0, aiFeedback = '', isCorrect = false;

      if (question.type === 'mcq') {
        isCorrect = answer.answer === question.correctAnswer;
        score = isCorrect ? question.points : 0;
        aiFeedback = isCorrect ? 'Correct answer selected.' : `Incorrect. Correct answer: ${question.correctAnswer}`;
      } else {
        // AI scores text/situational/code answers
        const aiResult = await AIScoringService.scoreTextAnswer({
          question: question.question,
          answer: answer.answer || '',
          rubric: question.rubric,
          jobRole: job?.title || 'General',
        });
        score = Math.round((aiResult.score / 100) * question.points);
        aiFeedback = aiResult.feedback || '';
        isCorrect = aiResult.score >= 60;
      }

      scoredAnswers.push({ questionId: question.id, answer: answer.answer, score, aiFeedback, isCorrect });

      const cat = question.category || 'domain';
      const maxPoints = question.points;
      categoryScores[cat].push((score / maxPoints) * 100);
    }

    // ── Step 2: Calculate category scores ──────────────────────
    const calcAvg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const scores = {
      aptitude: calcAvg(categoryScores.aptitude),
      domain: calcAvg(categoryScores.domain),
      situational: calcAvg(categoryScores.situational),
      coding: calcAvg(categoryScores.coding),
    };
    const totalScore = Math.round(
      (scores.aptitude * 0.25) + (scores.domain * 0.40) + (scores.situational * 0.20) + (scores.coding * 0.15)
    );

    // ── Step 3: Anonymize candidate profile ────────────────────
    const anonId = AnonymizerService.generateAnonId();
    const encryptedIdentity = AnonymizerService.encryptIdentity({
      name: req.user.name,
      email: req.user.email,
      userId: req.user._id.toString(),
      realProfile: profile,
    });
    const anonProfile = {
      maskedName: AnonymizerService.maskName(req.user.name),
      education: AnonymizerService.maskCollege(profile?.college, profile?.degree),
      yearsExperience: profile?.yearsExperience || 0,
      skills: profile?.skills || [],
    };

    // ── Step 4: AI insight (based on scores only) ──────────────
    const aiInsight = await AIScoringService.generateCandidateInsight({
      anonId,
      scores,
      totalScore,
      jobRole: job?.title || 'General',
    });

    // ── Step 5: Create submission ───────────────────────────────
    const submission = await Submission.create({
      anonId, jobId, assessmentId,
      scores, totalScore,
      aiInsight,
      answers: scoredAnswers,
      anonProfile,
      encryptedIdentity,
      realIdentity: { userId: req.user._id },
      timeSpent,
    });

    // Update job application count
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

    // Recalculate ranks for this job
    await updateRanks(jobId);

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      anonId,
      totalScore,
      scores,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: recalculate ranks after new submission
async function updateRanks(jobId) {
  const subs = await Submission.find({ jobId }).sort('-totalScore');
  for (let i = 0; i < subs.length; i++) {
    const percentile = Math.round(((subs.length - i) / subs.length) * 100);
    await Submission.findByIdAndUpdate(subs[i]._id, { rank: i + 1, percentile });
  }
}

// GET /api/submissions/my — candidate sees their own submission
router.get('/my', protect, authorize('candidate'), async (req, res) => {
  try {
    const subs = await Submission.find({ 'realIdentity.userId': req.user._id })
      .select('anonId jobId totalScore scores rank percentile status submittedAt aiInsight.recommendation')
      .populate('jobId', 'title company');
    res.json({ success: true, submissions: subs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, updateRanks };
