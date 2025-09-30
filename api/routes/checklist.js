const express = require('express');
const ChecklistController = require('../controllers/checklistController');

const router = express.Router();

// POST /generate - Generate checklist
router.post('/generate', ChecklistController.generateChecklist);

// POST /share - Share checklist
router.post('/share', ChecklistController.shareChecklist);

// GET /c/:slug - Get shared checklist
router.get('/c/:slug', ChecklistController.getSharedChecklist);

module.exports = router;
