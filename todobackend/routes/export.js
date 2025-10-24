const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Export tasks as CSV
router.get('/csv', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = { userId: req.userId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const tasks = await Task.find(query).sort({ date: -1 });

    const csvWriter = createCsvWriter({
      path: 'tasks_export.csv',
      header: [
        { id: 'date', title: 'Date' },
        { id: 'title', title: 'Task' },
        { id: 'time', title: 'Time' },
        { id: 'priority', title: 'Priority' },
        { id: 'completed', title: 'Completed' },
        { id: 'completedOnTime', title: 'On Time' },
        { id: 'pointsEarned', title: 'Points' }
      ]
    });

    const records = tasks.map(task => ({
      date: task.date.toISOString().split('T')[0],
      title: task.title,
      time: task.time,
      priority: task.priority,
      completed: task.completed ? 'Yes' : 'No',
      completedOnTime: task.completedOnTime ? 'Yes' : 'No',
      pointsEarned: task.pointsEarned
    }));

    await csvWriter.writeRecords(records);

    res.download('tasks_export.csv', 'tasks_export.csv', (err) => {
      if (err) console.error(err);
      fs.unlinkSync('tasks_export.csv');
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed', error: error.message });
  }
});

// Export tasks as PDF
router.get('/pdf', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let query = { userId: req.userId };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const tasks = await Task.find(query).sort({ date: -1 });

    const doc = new PDFDocument();
    const filename = 'tasks_export.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    // Title
    doc.fontSize(20).text('TaskMaster - Task Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Tasks
    doc.fontSize(14).text('Task List:', { underline: true });
    doc.moveDown();

    tasks.forEach((task, index) => {
      doc.fontSize(10);
      doc.text(`${index + 1}. ${task.title}`, { continued: true });
      doc.text(` - ${task.date.toISOString().split('T')[0]} ${task.time}`);
      doc.text(`   Priority: ${task.priority} | Status: ${task.completed ? 'Completed' : 'Pending'} | Points: ${task.pointsEarned}`);
      doc.moveDown(0.5);
    });

    // Summary
    doc.moveDown(2);
    doc.fontSize(14).text('Summary:', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Total Tasks: ${tasks.length}`);
    doc.text(`Completed: ${tasks.filter(t => t.completed).length}`);
    doc.text(`On Time: ${tasks.filter(t => t.completedOnTime).length}`);
    doc.text(`Total Points: ${tasks.reduce((sum, t) => sum + t.pointsEarned, 0)}`);

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed', error: error.message });
  }
});

module.exports = router;