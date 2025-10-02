const express = require('express');
const db = require('../config/database');
const router = express.Router();

// POST /api/groups - Add a new group
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO users.email_groups (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id, name, created_at, updated_at`,
      [name.trim()]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error adding group:', err);
    res.status(500).json({ success: false, error: 'Failed to add group', message: err.message });
  }
});

// GET /api/groups - Get all email groups
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM users.email_groups ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching email groups:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch email groups', message: err.message });
  }
});

// POST /api/groups/line - Add a new line group
router.post('/line', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO users.line_groups (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id, name, created_at, updated_at`,
      [name.trim()]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error adding line group:', err);
    res.status(500).json({ success: false, error: 'Failed to add line group', message: err.message });
  }
});

// GET /api/groups/line - Get all line groups
router.get('/line', async (req, res) => {
  try {
    const result = await db.query('SELECT id, name FROM users.line_groups ORDER BY id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching line groups:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch line groups', message: err.message });
  }
});

// PUT /api/groups/:id - Update email group
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name required' });
  }
  
  try {
    const result = await db.query(
      `UPDATE users.email_groups SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, updated_at`,
      [name.trim(), id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(500).json({ success: false, error: 'Failed to update group', message: err.message });
  }
});

// DELETE /api/groups/:id - Delete email group
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  if (isNaN(parseInt(id))) {
    return res.status(400).json({ success: false, error: 'Invalid group ID' });
  }
  
  try {
    const result = await db.query(
      `DELETE FROM users.email_groups WHERE id = $1 RETURNING id, name`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    
    res.json({ success: true, message: 'Group deleted successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ success: false, error: 'Failed to delete group', message: err.message });
  }
});

// PUT /api/groups/line/:id - Update line group
router.put('/line/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Group name required' });
  }
  
  try {
    const result = await db.query(
      `UPDATE users.line_groups SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, updated_at`,
      [name.trim(), id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Line group not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating line group:', err);
    res.status(500).json({ success: false, error: 'Failed to update line group', message: err.message });
  }
});

// DELETE /api/groups/line/:id - Delete line group
router.delete('/line/:id', async (req, res) => {
  const { id } = req.params;
  
  if (isNaN(parseInt(id))) {
    return res.status(400).json({ success: false, error: 'Invalid group ID' });
  }
  
  try {
    const result = await db.query(
      `DELETE FROM users.line_groups WHERE id = $1 RETURNING id, name`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Line group not found' });
    }
    
    res.json({ success: true, message: 'Line group deleted successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Error deleting line group:', err);
    res.status(500).json({ success: false, error: 'Failed to delete line group', message: err.message });
  }
});

module.exports = router;
