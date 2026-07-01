const express = require('express');
const crypto = require('crypto');
const { readTasks, writeTasks } = require('../data/store');

const router = express.Router();

const VALID_STATUS = ['todo', 'in-progress', 'done'];
const VALID_PRIORITY = ['low', 'medium', 'high'];

function validateTaskInput(body, { partial = false } = {}) {
  const errors = [];
  const out = {};

  if (!partial || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      errors.push('title is required and must be a non-empty string');
    } else {
      out.title = body.title.trim();
    }
  }

  if (body.description !== undefined) {
    out.description = String(body.description).trim();
  } else if (!partial) {
    out.description = '';
  }

  if (body.dueDate !== undefined && body.dueDate !== null && body.dueDate !== '') {
    const d = new Date(body.dueDate);
    if (isNaN(d.getTime())) {
      errors.push('dueDate must be a valid date');
    } else {
      out.dueDate = d.toISOString().slice(0, 10); // store as YYYY-MM-DD
    }
  } else if (!partial) {
    out.dueDate = null;
  }

  if (body.priority !== undefined) {
    if (!VALID_PRIORITY.includes(body.priority)) {
      errors.push(`priority must be one of: ${VALID_PRIORITY.join(', ')}`);
    } else {
      out.priority = body.priority;
    }
  } else if (!partial) {
    out.priority = 'medium';
  }

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      errors.push(`status must be one of: ${VALID_STATUS.join(', ')}`);
    } else {
      out.status = body.status;
    }
  } else if (!partial) {
    out.status = 'todo';
  }

  if (body.category !== undefined) {
    out.category = String(body.category).trim();
  } else if (!partial) {
    out.category = '';
  }

  return { errors, data: out };
}

// GET /api/tasks?status=&priority=&category=&search=&sortBy=&order=
router.get('/', async (req, res, next) => {
  try {
    let tasks = await readTasks();
    const { status, priority, category, search, sortBy, order } = req.query;

    if (status) tasks = tasks.filter((t) => t.status === status);
    if (priority) tasks = tasks.filter((t) => t.priority === priority);
    if (category) {
      tasks = tasks.filter(
        (t) => t.category.toLowerCase() === String(category).toLowerCase()
      );
    }
    if (search) {
      const q = String(search).toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }

    const sortableFields = ['dueDate', 'priority', 'createdAt', 'title', 'status'];
    const priorityRank = { low: 0, medium: 1, high: 2 };
    if (sortBy && sortableFields.includes(sortBy)) {
      const dir = order === 'desc' ? -1 : 1;
      tasks.sort((a, b) => {
        let av = a[sortBy];
        let bv = b[sortBy];
        if (sortBy === 'priority') {
          av = priorityRank[av];
          bv = priorityRank[bv];
        }
        if (sortBy === 'dueDate') {
          av = av ? new Date(av).getTime() : Infinity;
          bv = bv ? new Date(bv).getTime() : Infinity;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const task = tasks.find((t) => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks
router.post('/', async (req, res, next) => {
  try {
    const { errors, data } = validateTaskInput(req.body);
    if (errors.length) return res.status(400).json({ errors });

    const now = new Date().toISOString();
    const task = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const tasks = await readTasks();
    tasks.push(task);
    await writeTasks(tasks);

    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tasks/:id  (full or partial update)
router.put('/:id', async (req, res, next) => {
  try {
    const { errors, data } = validateTaskInput(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ errors });

    const tasks = await readTasks();
    const idx = tasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });

    tasks[idx] = {
      ...tasks[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await writeTasks(tasks);
    res.json(tasks[idx]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tasks/:id/status  (quick status toggle)
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUS.includes(status)) {
      return res.status(400).json({ errors: [`status must be one of: ${VALID_STATUS.join(', ')}`] });
    }

    const tasks = await readTasks();
    const idx = tasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });

    tasks[idx].status = status;
    tasks[idx].updatedAt = new Date().toISOString();

    await writeTasks(tasks);
    res.json(tasks[idx]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const tasks = await readTasks();
    const idx = tasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });

    const [removed] = tasks.splice(idx, 1);
    await writeTasks(tasks);
    res.json(removed);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
