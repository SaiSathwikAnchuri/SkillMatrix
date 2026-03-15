const jwt = require('jsonwebtoken');
const { User, AuditLog } = require('../models');

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return res.status(401).json({ success: false, message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ success: false, message: 'User not found' });
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Role '${req.user.role}' not authorized` });
  }
  next();
};

exports.logAction = (action) => async (req, res, next) => {
  try {
    await AuditLog.create({
      action,
      performedBy: req.user?._id,
      target: req.params.anonId || req.params.jobId || req.params.id,
      details: { method: req.method, path: req.path, body: req.body },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } catch (e) { /* non-blocking */ }
  next();
};
