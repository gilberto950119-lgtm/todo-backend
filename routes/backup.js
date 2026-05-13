// routes/backup.js
// URL과 컨트롤러 함수 연결만 담당하는 얇은 파일.
// 실제 일은 controllers/backupController.js가 합니다.

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/backupController');

router.get('/export', ctrl.exportAll);    // GET    /api/backup/export
router.post('/import', ctrl.importAll);   // POST   /api/backup/import
router.delete('/all', ctrl.deleteAll);    // DELETE /api/backup/all

module.exports = router;
