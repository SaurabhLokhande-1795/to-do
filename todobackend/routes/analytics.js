const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Get analytics data
router.get('/', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    const tasks = await Task.find({
      userId: req.userId,
      date: { $gte: daysAgo }
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const onTime = tasks.filter(t => t.completedOnTime).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;
    const avgDaily = (total / parseInt(days)).toFixed(1);

    // Daily activity data
    const dailyActivity = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayTasks = tasks.filter(t => {
        const taskDate = new Date(t.date);
        return taskDate >= date && taskDate < nextDate;
      });

      dailyActivity.push({
        date: date.toISOString().split('T')[0],
        total: dayTasks.length,
        completed: dayTasks.filter(t => t.completed).length
      });
    }

    res.json({
      success: true,
      analytics: {
        total,
        completed,
        onTime,
        completionRate,
        onTimeRate,
        avgDaily,
        dailyActivity
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get monthly stats
router.get('/monthly/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const tasks = await Task.find({
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate }
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      success: true,
      monthlyStats: {
        total,
        completed,
        completionRate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;


