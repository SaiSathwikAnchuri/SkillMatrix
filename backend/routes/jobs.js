const express = require('express');
const { Job, Assessment, Submission } = require('../models');
const { protect, authorize } = require('../middleware/auth');
const AIScoringService = require('../services/aiScoring');
const router = express.Router();

// ─────────────────────────────────────────────────────────────────
// GET /api/jobs — public list
// ─────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true })
      .select('title description company skills difficulty applicationCount createdAt assessmentId')
      .sort('-createdAt');
    res.json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/jobs/:id/assessment
// ─────────────────────────────────────────────────────────────────
router.get('/:id/assessment', protect, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('assessmentId');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // ── Auto-heal: assessment missing → generate it now ────────────
    if (!job.assessmentId) {
      console.log(`[AUTO-HEAL] Job ${job._id} has no assessment — generating now...`);

      const aiResult = await AIScoringService.generateAssessment({
        jobRole:        job.title,
        jobDescription: job.description,
        difficulty:     job.difficulty || 'medium',
        questionCount:  8,
      });

      console.log('[AUTO-HEAL] AI source:', aiResult.source);
      console.log('[AUTO-HEAL] Questions count:', aiResult.questions?.length);

      if (!aiResult.success || aiResult.questions.length === 0) {
        return res.status(503).json({
          success: false,
          message: 'Assessment generation failed completely. Please restart the backend server.',
        });
      }

      if (aiResult.source === 'fallback') {
        console.log('[AUTO-HEAL] ⚠️  Using fallback questions — Ollama may not be running');
      } else {
        console.log('[AUTO-HEAL] ✅ Using AI-generated questions from Ollama');
      }

      const totalPoints = aiResult.questions.reduce((sum, q) => sum + (q.points || 10), 0);

      const assessment = await Assessment.create({
        jobId:       job._id,
        title:       `${job.title} Assessment`,
        questions:   aiResult.questions,
        totalPoints,
        timeLimit:   3600,
        aiGenerated: true,
      });

      job.assessmentId = assessment._id;
      await job.save();

      await job.populate('assessmentId');
      console.log(`[AUTO-HEAL] Assessment ${assessment._id} created and linked to job ${job._id}`);
    }

    const assessment = job.assessmentId;

    // Strip correct answers before sending to candidate
    const safeQuestions = assessment.questions.map(q => ({
      id:        q.id,
      type:      q.type,
      category:  q.category,
      question:  q.question,
      options:   q.options   || null,
      points:    q.points    || 10,
      timeLimit: q.timeLimit || 120,
      rubric:    null,
    }));

    res.json({
      success: true,
      assessment: {
        _id:         assessment._id,
        title:       assessment.title,
        totalPoints: assessment.totalPoints,
        timeLimit:   assessment.timeLimit || 3600,
        questions:   safeQuestions,
      },
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid job ID format.' });
    }
    console.error('[assessment route error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/jobs/:id — single job detail
// ─────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('assessmentId');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    res.json({ success: true, job });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid job ID format.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/jobs — recruiter creates job + AI generates assessment
// ─────────────────────────────────────────────────────────────────
router.post('/', protect, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const { title, description, skills, difficulty } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }

    const job = await Job.create({
      title,
      description,
      skills:     skills || [],
      difficulty: difficulty || 'medium',
      company:    req.user.company || 'Company',
      recruiter:  req.user._id,
    });

    console.log(`[jobs] Generating assessment for: ${title}`);

    const aiResult = await AIScoringService.generateAssessment({
      jobRole:        title,
      jobDescription: description,
      difficulty:     difficulty || 'medium',
      questionCount:  8,
    });

    console.log('[jobs] AI source:', aiResult.source);
    console.log('[jobs] Questions count:', aiResult.questions?.length);

    if (aiResult.source === 'fallback') {
      console.log('[jobs] ⚠️  Using fallback questions — Ollama may not be running');
    } else {
      console.log('[jobs] ✅ Using AI-generated questions from Ollama');
    }

    let assessment = null;

    if (aiResult.success && aiResult.questions.length > 0) {
      const totalPoints = aiResult.questions.reduce((sum, q) => sum + (q.points || 10), 0);
      const biasAudit   = await AIScoringService.analyzeAssessmentBias({ questions: aiResult.questions });

      assessment = await Assessment.create({
        jobId:       job._id,
        title:       `${title} Assessment`,
        questions:   aiResult.questions,
        totalPoints,
        timeLimit:   3600,
        aiGenerated: true,
        biasAudit:   { ...biasAudit, lastChecked: new Date() },
      });

      job.assessmentId = assessment._id;
      await job.save();

      console.log(`[jobs] Assessment ${assessment._id} saved to DB`);
    }

    res.status(201).json({ success: true, job, assessment });
  } catch (err) {
    console.error('[jobs POST error]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;