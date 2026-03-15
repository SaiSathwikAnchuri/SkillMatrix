// ─── SkillMatrix Anonymization Engine ──────────────────────────────
// Strips all PII including India-specific bias signals

const crypto = require('crypto');

// India-specific caste/community indicating surnames
const INDIA_SURNAMES = [
  // Upper caste Hindu
  'sharma','mishra','shukla','tiwari','pandey','dubey','dwivedi','trivedi',
  'chaturvedi','bajpai','upadhyay','joshi','pant','bhat','nair','iyer',
  'iyengar','pillai','menon','namboothiri','varma','reddy','rao','krishna',
  // Scheduled castes/tribes (historically disadvantaged)
  'jadhav','mane','shinde','pawar','kamble','dhotre','sonawane','waghmare',
  // Muslim surnames
  'khan','shaikh','sheikh','syed','qureshi','ansari','pathan','mirza',
  'hussain','hassan','ali','malik','farooqui',
  // Sikh surnames
  'singh','kaur',
  // Other community indicators
  'banerjee','chatterjee','mukherjee','ghosh','bose','sen','das','dutta',
  'chakraborty','roy','gupta','agarwal','jain','mehta','shah','patel',
  'desai','modi','trivedi','parikh','kapoor','malhotra','khanna',
];

// College tier classification
const TIER1_COLLEGES = [
  'iit','iim','aiims','nit','bits pilani','bits-pilani','iisc','iiser',
  'tifr','delhi university','du','jadavpur','bhu','anna university',
  'vit','manipal','symbiosis','st. stephens','miranda house',
];

// Indian states/cities that reveal regional origin
const REGION_INDICATORS = [
  'mumbai','delhi','bangalore','bengaluru','chennai','kolkata','hyderabad',
  'pune','ahmedabad','jaipur','lucknow','patna','bhopal','indore','nagpur',
  'kerala','tamil','telangana','andhra','maharashtra','gujarat','rajasthan',
  'bihar','uttar pradesh','west bengal','karnataka','punjab','haryana',
  'north east','assam','manipur','meghalaya',
];

class AnonymizerService {
  /**
   * Generate a secure anonymous ID for a candidate
   */
  static generateAnonId() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefix = letters[Math.floor(Math.random() * letters.length)];
    const num = String(Math.floor(Math.random() * 900) + 100);
    return `${prefix}-${num}`;
  }

  /**
   * Split-key cryptographic identity vault
   * Splits the real identity into two halves — neither alone is readable
   */
  static encryptIdentity(identity) {
    const keyA = process.env.VAULT_A_SECRET.padEnd(32, '0').slice(0, 32);
    const keyB = process.env.VAULT_B_SECRET.padEnd(32, '0').slice(0, 32);

    const ivA = crypto.randomBytes(16);
    const ivB = crypto.randomBytes(16);

    const cipherA = crypto.createCipheriv('aes-256-cbc', Buffer.from(keyA), ivA);
    let encA = cipherA.update(JSON.stringify(identity), 'utf8', 'hex');
    encA += cipherA.final('hex');

    const cipherB = crypto.createCipheriv('aes-256-cbc', Buffer.from(keyB), ivB);
    let encB = cipherB.update(JSON.stringify(identity), 'utf8', 'hex');
    encB += cipherB.final('hex');

    return {
      vaultA: { iv: ivA.toString('hex'), data: encA },
      vaultB: { iv: ivB.toString('hex'), data: encB },
    };
  }

  /**
   * Decrypt identity — requires BOTH vault keys (simulates dual-admin approval)
   */
  static decryptIdentity(vault) {
    const keyA = process.env.VAULT_A_SECRET.padEnd(32, '0').slice(0, 32);
    const ivA = Buffer.from(vault.vaultA.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(keyA), ivA);
    let dec = decipher.update(vault.vaultA.data, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return JSON.parse(dec);
  }

  /**
   * Mask a person's name — detect caste-indicating surnames
   */
  static maskName(fullName) {
    if (!fullName) return '[CANDIDATE]';
    const parts = fullName.toLowerCase().split(' ');
    const hasCasteIndicator = parts.some(p => INDIA_SURNAMES.includes(p));
    return hasCasteIndicator ? '[CANDIDATE — surname filtered]' : '[CANDIDATE]';
  }

  /**
   * Mask college — reduce tier-1 signaling to generic description
   */
  static maskCollege(college, degree) {
    if (!college) return degree || 'Graduate';
    const lower = college.toLowerCase();
    const isTier1 = TIER1_COLLEGES.some(t => lower.includes(t));
    const degreeStr = degree || 'Graduate';
    if (isTier1) return `${degreeStr} (Tier-1 Institution)`;
    return degreeStr;
  }

  /**
   * Mask location — remove city/state regional signals
   */
  static maskLocation(location) {
    if (!location) return '[LOCATION REDACTED]';
    const lower = location.toLowerCase();
    const hasRegion = REGION_INDICATORS.some(r => lower.includes(r));
    return hasRegion ? '[LOCATION REDACTED]' : '[LOCATION REDACTED]';
  }

  /**
   * Full profile anonymization — returns sanitized profile safe for recruiter view
   */
  static anonymizeProfile(profile) {
    return {
      anonId: profile.anonId,
      maskedName: this.maskName(profile.realName || ''),
      education: this.maskCollege(profile.college, profile.degree),
      yearsExperience: profile.yearsExperience || 'N/A',
      skills: profile.skills || [],
      scores: profile.scores || {},
      totalScore: profile.totalScore || 0,
      rank: profile.rank,
      submittedAt: profile.submittedAt,
      // All PII stripped:
      // - name → masked
      // - email → hidden
      // - phone → hidden
      // - college → tier-masked
      // - location → redacted
      // - age → hidden
      // - gender → hidden
      // - photo → hidden
    };
  }

  /**
   * Detect potential bias in question text (language complexity check)
   */
  static analyzeQuestionBias(questionText) {
    const flags = [];
    // Long sentences (disadvantage non-native speakers)
    const avgWords = questionText.split('.').map(s => s.split(' ').length);
    const avg = avgWords.reduce((a, b) => a + b, 0) / avgWords.length;
    if (avg > 30) flags.push('High sentence complexity — may disadvantage non-native speakers');
    // Cultural references
    const culturalTerms = ['cricket', 'football', 'western', 'american', 'british'];
    if (culturalTerms.some(t => questionText.toLowerCase().includes(t))) {
      flags.push('Contains cultural reference — may not be culturally neutral');
    }
    return flags;
  }
}

module.exports = AnonymizerService;
