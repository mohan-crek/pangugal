const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const GroupMember = require('../models/GroupMember');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !password) return res.status(400).json({ message: 'Name and password are required' });
    if (!email && !phone) return res.status(400).json({ message: 'Email or phone is required' });

    const existing = await User.findOne({ $or: [email ? { email } : null, phone ? { phone } : null].filter(Boolean) });
    if (existing) return res.status(409).json({ message: 'User with this email or phone already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email: email || undefined, phone: phone || undefined, passwordHash });

    // If a stub user existed with same email/phone (invited before registering), this won't happen
    // because stub users don't have passwords — handled at invite time by reusing the same record.

    const token = signToken(user._id);
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, phone, password } = req.body;
    if (!password || (!email && !phone)) {
      return res.status(400).json({ message: 'Credential and password required' });
    }

    const query = email ? { email } : { phone };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
