const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ── User Model (Recruiter / Admin / Candidate accounts) ─────────
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['candidate', 'recruiter', 'admin'], default: 'candidate' },
  name: { type: String, required: true },
  company: String,
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

// ── Job Model ───────────────────────────────────────────────────
const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  company: { type: String, required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [String],
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
  isActive: { type: Boolean, default: true },
  applicationCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// ── Assessment Model ────────────────────────────────────────────
const QuestionSchema = new mongoose.Schema({
  id: String,
  type: { type: String, enum: ['mcq', 'text', 'code', 'situational'] },
  category: { type: String, enum: ['aptitude', 'domain', 'situational', 'coding'] },
  question: String,
  options: [String],
  correctAnswer: String,
  points: { type: Number, default: 10 },
  timeLimit: { type: Number, default: 120 },
  rubric: String,
  biasFlags: [String],
});

const AssessmentSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  title: String,
  questions: [QuestionSchema],
  totalPoints: Number,
  timeLimit: { type: Number, default: 3600 },
  aiGenerated: { type: Boolean, default: false },
  biasAudit: {
    overallBiasRisk: String,
    biasScore: Number,
    flags: Array,
    summary: String,
    lastChecked: Date,
  },
  createdAt: { type: Date, default: Date.now },
});

// ── Candidate Submission Model ──────────────────────────────────
const SubmissionSchema = new mongoose.Schema({
  // Anonymized data (visible to recruiter)
  anonId: { type: String, required: true, unique: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },

  // Scores (visible to recruiter)
  scores: {
    aptitude: { type: Number, default: 0 },
    domain: { type: Number, default: 0 },
    situational: { type: Number, default: 0 },
    coding: { type: Number, default: 0 },
  },
  totalScore: { type: Number, default: 0 },
  rank: Number,
  percentile: Number,

  // AI-generated insight (anonymized)
  aiInsight: {
    insight: String,
    topStrengths: [String],
    fitScore: Number,
    recommendation: String,
  },

  // Answers (for AI scoring)
  answers: [{
    questionId: String,
    answer: String,
    score: Number,
    aiFeedback: String,
    isCorrect: Boolean,
  }],

  // Anonymized profile (safe for recruiter)
  anonProfile: {
    maskedName: String,
    education: String,
    yearsExperience: Number,
    skills: [String],
  },

  // Status
  status: { type: String, enum: ['in_progress', 'submitted', 'shortlisted', 'rejected', 'revealed'], default: 'submitted' },
  shortlistedAt: Date,
  revealedAt: Date,
  revealedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Split-key encrypted identity (NEVER sent to recruiter until revealed)
  encryptedIdentity: {
    vaultA: { iv: String, data: String },
    vaultB: { iv: String, data: String },
  },

  // Real identity (only populated after reveal — admin only)
  realIdentity: {
    name: String,
    email: String,
    phone: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },

  submittedAt: { type: Date, default: Date.now },
  timeSpent: Number,
});

// ── Audit Log Model ─────────────────────────────────────────────
const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  target: String, // anonId or jobId
  details: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
});

module.exports = {
  User: mongoose.model('User', UserSchema),
  Job: mongoose.model('Job', JobSchema),
  Assessment: mongoose.model('Assessment', AssessmentSchema),
  Submission: mongoose.model('Submission', SubmissionSchema),
  AuditLog: mongoose.model('AuditLog', AuditLogSchema),
};
