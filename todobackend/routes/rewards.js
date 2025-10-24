// ==================== routes/rewards.js ====================
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Achievement definitions
const achievements = [
  { id: 1, name: 'First Step', requirement: 1, type: 'tasksCompleted' },
  { id: 2, name: 'Getting Started', requirement: 10, type: 'tasksCompleted' },
  { id: 3, name: 'Task Master', requirement: 50, type: 'tasksCompleted' },
  { id: 4, name: 'Century Club', requirement: 100, type: 'tasksCompleted' },
  { id: 5, name: 'Punctual', requirement: 5, type: 'onTimeCompleted' },
  { id: 6, name: 'Time Lord', requirement: 25, type: 'onTimeCompleted' },
  { id: 7, name: 'Hot Streak', requirement: 7, type: 'streak' },
  { id: 8, name: 'Unstoppable', requirement: 30, type: 'streak' },
  { id: 9, name: 'Early Bird', requirement: 1, type: 'earlyTask' },
  { id: 10, name: 'Night Owl', requirement: 1, type: 'lateTask' },
  { id: 11, name: 'Perfectionist', requirement: 7, type: 'perfectWeek' },
  { id: 12, name: 'Legend', requirement: 1000, type: 'totalPoints' }
];

// Get user rewards and achievements
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const tasks = await Task.find({ userId: req.userId });

    const tasksCompleted = tasks.filter(t => t.completed).length;
    const onTimeCompleted = tasks.filter(t => t.completedOnTime).length;

    // Check and unlock achievements
    const unlockedAchievements = [];
    
    for (const achievement of achievements) {
      let isUnlocked = false;
      
      switch (achievement.type) {
        case 'tasksCompleted':
          isUnlocked = tasksCompleted >= achievement.requirement;
          break;
        case 'onTimeCompleted':
          isUnlocked = onTimeCompleted >= achievement.requirement;
          break;
        case 'streak':
          isUnlocked = user.currentStreak >= achievement.requirement;
          break;
        case 'totalPoints':
          isUnlocked = user.totalPoints >= achievement.requirement;
          break;
        case 'earlyTask':
          isUnlocked = tasks.some(t => {
            const hour = parseInt(t.time.split(':')[0]);
            return t.completed && hour < 8;
          });
          break;
        case 'lateTask':
          isUnlocked = tasks.some(t => {
            const hour = parseInt(t.time.split(':')[0]);
            return t.completed && hour >= 22;
          });
          break;
      }
      
      if (isUnlocked) {
        unlockedAchievements.push(achievement.id);
      }
    }

    res.json({
      success: true,
      rewards: {
        totalPoints: user.totalPoints,
        level: user.level,
        currentStreak: user.currentStreak,
        tasksCompleted,
        onTimeCompleted,
        badgesEarned: unlockedAchievements.length,
        unlockedAchievements
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const users = await User.find()
      .select('name username avatar totalPoints level')
      .sort({ totalPoints: -1 })
      .limit(10);

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      name: user._id.equals(req.userId) ? 'You' : user.name,
      username: user.username,
      avatar: user.avatar,
      points: user.totalPoints,
      level: user.level,
      isCurrentUser: user._id.equals(req.userId)
    }));

    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;