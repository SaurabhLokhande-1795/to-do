const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper function to calculate points
const calculatePoints = (task) => {
  let points = 5; // Base points for completion
  if (task.completedOnTime) points += 10; // Bonus for on-time completion
  if (task.priority === 'high') points += 5; // Priority bonus
  else if (task.priority === 'medium') points += 3;
  return points;
};

// Helper function to update user stats
const updateUserStats = async (userId) => {
  const user = await User.findById(userId);
  const tasks = await Task.find({ userId });
  
  const totalPoints = tasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + t.pointsEarned, 0);
  
  user.totalPoints = totalPoints;
  user.level = Math.floor(totalPoints / 100) + 1;
  
  await user.save();
};

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, date, time, priority } = req.body;

    const task = new Task({
      userId: req.userId,
      title,
      date: new Date(date),
      time,
      priority
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get all tasks for user
router.get('/', auth, async (req, res) => {
  try {
    const { date, startDate, endDate, completed, priority } = req.query;
    
    let query = { userId: req.userId };
    
    if (date) {
      const queryDate = new Date(date);
      query.date = {
        $gte: new Date(queryDate.setHours(0, 0, 0, 0)),
        $lt: new Date(queryDate.setHours(23, 59, 59, 999))
      };
    }
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }
    
    if (priority) {
      query.priority = priority;
    }

    const tasks = await Task.find(query).sort({ date: -1, time: 1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get today's tasks
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await Task.find({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ time: 1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get monthly tasks
router.get('/monthly/:year/:month', auth, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const tasks = await Task.find({
      userId: req.userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const { title, date, time, priority, completed } = req.body;

    if (title) task.title = title;
    if (date) task.date = new Date(date);
    if (time) task.time = time;
    if (priority) task.priority = priority;

    if (completed !== undefined && completed !== task.completed) {
      task.completed = completed;
      
      if (completed) {
        task.completedAt = new Date();
        
        // Check if completed on time
        const taskDateTime = new Date(task.date);
        const [hours, minutes] = task.time.split(':');
        taskDateTime.setHours(parseInt(hours), parseInt(minutes));
        
        task.completedOnTime = task.completedAt <= taskDateTime;
        task.pointsEarned = calculatePoints(task);
        
        // Update user stats
        await updateUserStats(req.userId);
      } else {
        task.completedAt = null;
        task.completedOnTime = null;
        task.pointsEarned = 0;
        await updateUserStats(req.userId);
      }
    }

    await task.save();

    res.json({
      success: true,
      message: 'Task updated successfully',
      task
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Update user stats if task was completed
    if (task.completed) {
      await updateUserStats(req.userId);
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get task statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayTasks = await Task.find({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow }
    });

    const totalTasks = todayTasks.length;
    const completedTasks = todayTasks.filter(t => t.completed).length;
    const pendingTasks = totalTasks - completedTasks;
    const onTimeCompleted = todayTasks.filter(t => t.completedOnTime).length;

    const user = await User.findById(req.userId);

    res.json({
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        pendingTasks,
        totalPoints: user.totalPoints,
        onTimeCompleted
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;