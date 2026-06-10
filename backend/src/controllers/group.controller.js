const Group = require('../models/Group');
const GroupMember = require('../models/GroupMember');
const User = require('../models/User');

async function createGroup(req, res) {
  try {
    const { name, description, currency } = req.body;
    if (!name) return res.status(400).json({ message: 'Group name is required' });

    const group = await Group.create({ name, description, currency: currency || 'INR', createdBy: req.user._id });
    await GroupMember.create({ groupId: group._id, userId: req.user._id, role: 'admin' });

    res.status(201).json({ group });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function listGroups(req, res) {
  try {
    const memberships = await GroupMember.find({ userId: req.user._id, isActive: true }).select('groupId');
    const groupIds = memberships.map(m => m.groupId);
    const groups = await Group.find({ _id: { $in: groupIds }, isActive: true }).sort({ createdAt: -1 });

    // attach member counts
    const counts = await GroupMember.aggregate([
      { $match: { groupId: { $in: groupIds }, isActive: true } },
      { $group: { _id: '$groupId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const result = groups.map(g => ({ ...g.toObject(), memberCount: countMap[g._id.toString()] || 0 }));
    res.json({ groups: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function getGroup(req, res) {
  try {
    const { groupId } = req.params;
    const membership = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
    if (!membership) return res.status(403).json({ message: 'Not a member of this group' });

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    const members = await GroupMember.find({ groupId, isActive: true }).populate('userId', 'name email phone');
    res.json({ group, members });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function inviteMember(req, res) {
  try {
    const { groupId } = req.params;
    const { email, phone } = req.body;

    if (!email && !phone) return res.status(400).json({ message: 'Email or phone required' });

    const membership = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
    if (!membership) return res.status(403).json({ message: 'Not a member of this group' });

    const query = email ? { email } : { phone };
    let user = await User.findOne(query);

    if (!user) {
      // stub user — no password until they register
      const bcrypt = require('bcryptjs');
      const stubHash = await bcrypt.hash(Math.random().toString(36), 10);
      user = await User.create({
        name: email || phone,
        email: email || undefined,
        phone: phone || undefined,
        passwordHash: stubHash,
      });
    }

    const existing = await GroupMember.findOne({ groupId, userId: user._id });
    if (existing) {
      if (existing.isActive) return res.status(409).json({ message: 'User already in group' });
      existing.isActive = true;
      await existing.save();
    } else {
      await GroupMember.create({ groupId, userId: user._id, role: 'member' });
    }

    res.json({ message: 'Member added', user: { _id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function removeMember(req, res) {
  try {
    const { groupId, userId } = req.params;
    const myMembership = await GroupMember.findOne({ groupId, userId: req.user._id, isActive: true });
    if (!myMembership || myMembership.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await GroupMember.findOneAndUpdate({ groupId, userId }, { isActive: false });
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { createGroup, listGroups, getGroup, inviteMember, removeMember };
