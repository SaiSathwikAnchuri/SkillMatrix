const express = require('express');
const { Submission, Job, AuditLog } = require('../models');
const { protect, authorize, logAction } = require('../middleware/auth');
const AnonymizerService = require('../services/anonymizer');
const FairnessMonitor = require('../services/fairnessMonitor');
const AIScoringService = require('../services/aiScoring');
const router = express.Router();

// GET /api/recruiter/jobs — recruiter's jobs with submission counts
router.get('/jobs', protect, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const jobs = await Job.find({ recruiter: req.user._id })
      .populate('assessmentId', 'title biasAudit')
      .sort('-createdAt');

    const jobsWithStats = await Promise.all(jobs.map(async (job) => {
      const subs = await Submission.find({ jobId: job._id });
      const shortlisted = subs.filter(s => s.status === 'shortlisted' || s.status === 'revealed').length;
      return {
        ...job.toObject(),
        stats: {
          total: subs.length,
          shortlisted,
          avgScore: subs.length ? Math.round(subs.reduce((s, c) => s + c.totalScore, 0) / subs.length) : 0,
        },
      };
    }));

    res.json({ success: true, jobs: jobsWithStats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/recruiter/dashboard/:jobId — full leaderboard (anonymized)
router.get('/dashboard/:jobId', protect, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId).populate('assessmentId');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const submissions = await Submission.find({ jobId: req.params.jobId })
      .select('-encryptedIdentity -realIdentity -answers')
      .sort('rank');

    // Fairness report
    const fairnessReport = FairnessMonitor.buildFairnessReport(submissions);

    // Build anonymized leaderboard
    const leaderboard = submissions.map(sub => ({
      anonId: sub.anonId,
      rank: sub.rank,
      percentile: sub.percentile,
      totalScore: sub.totalScore,
      scores: sub.scores,
      anonProfile: sub.anonProfile,
      aiInsight: sub.aiInsight,
      status: sub.status,
      submittedAt: sub.submittedAt,
      // Identity is NOT included here
    }));

    res.json({ success: true, job: { title: job.title, description: job.description }, leaderboard, fairnessReport });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/recruiter/shortlist/:anonId — shortlist a candidate
router.post('/shortlist/:anonId', protect, authorize('recruiter', 'admin'),
  logAction('SHORTLIST_CANDIDATE'),
  async (req, res) => {
    try {
      const sub = await Submission.findOne({ anonId: req.params.anonId });
      if (!sub) return res.status(404).json({ success: false, message: 'Candidate not found' });
      if (sub.status === 'revealed') return res.status(400).json({ success: false, message: 'Already revealed' });

      sub.status = 'shortlisted';
      sub.shortlistedAt = Date.now();
      await sub.save();

      res.json({ success: true, message: `Candidate ${req.params.anonId} shortlisted`, anonId: req.params.anonId });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// POST /api/recruiter/reveal/:anonId — reveal identity (logged, irreversible)
router.post('/reveal/:anonId', protect, authorize('recruiter', 'admin'),
  logAction('REVEAL_IDENTITY'),
  async (req, res) => {
    try {
      const sub = await Submission.findOne({ anonId: req.params.anonId });
      if (!sub) return res.status(404).json({ success: false, message: 'Candidate not found' });
      if (sub.status !== 'shortlisted') {
        return res.status(400).json({ success: false, message: 'Can only reveal shortlisted candidates' });
      }

      // Decrypt identity using split-key
      const realIdentity = AnonymizerService.decryptIdentity(sub.encryptedIdentity);

      // Save reveal to database
      sub.status = 'revealed';
      sub.revealedAt = Date.now();
      sub.revealedBy = req.user._id;
      sub.realIdentity = { ...sub.realIdentity, name: realIdentity.name, email: realIdentity.email };
      await sub.save();

      res.json({
        success: true,
        message: 'Identity revealed and logged',
        revealed: {
          anonId: sub.anonId,
          name: realIdentity.name,
          email: realIdentity.email,
          originalProfile: realIdentity.realProfile,
          revealedAt: sub.revealedAt,
          revealedBy: req.user.name,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// GET /api/recruiter/fairness/:jobId — full fairness report
router.get('/fairness/:jobId', protect, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const submissions = await Submission.find({ jobId: req.params.jobId });
    const revealedSubs = await Submission.find({ jobId: req.params.jobId, status: 'revealed' })
      .select('totalScore realIdentity');

    const revealed = revealedSubs.map(s => ({
      totalScore: s.totalScore,
      realGender: s.realIdentity?.originalProfile?.gender,
    }));

    const report = FairnessMonitor.buildFairnessReport(submissions, revealed);

    // Also get AI bias analysis on the assessment
    const job = await Job.findById(req.params.jobId).populate('assessmentId');
    let assessmentBias = null;
    if (job?.assessmentId) {
      assessmentBias = job.assessmentId.biasAudit;
    }

    res.json({ success: true, report, assessmentBias });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/recruiter/audit/:jobId — audit log for a job
router.get('/audit/:jobId', protect, authorize('recruiter', 'admin'), async (req, res) => {
  try {
    const logs = await AuditLog.find({ details: { $regex: req.params.jobId } })
      .populate('performedBy', 'name email role')
      .sort('-timestamp')
      .limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
