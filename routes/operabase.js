const express = require('express');
const router = express.Router();

const operabaseController = require('../controllers/operabase-controller');

router.post('/', operabaseController.getInfo);

module.exports = router;