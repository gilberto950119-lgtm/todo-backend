// routes/completions.js
// URL과 컨트롤러 함수 연결만 담당하는 얇은 파일.
//
// ⚠️ 라우트 등록 순서가 중요합니다.
//    "/task/:taskId" 가 "/:taskId/:date" 보다 위에 있어야 합니다.
//    그렇지 않으면 "task"라는 문자열이 :taskId 자리로 흡수돼서
//    엉뚱한 라우트가 매칭됩니다.

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/completionsController');

// 더 구체적인 경로(고정 prefix "task/")를 먼저 등록
router.delete('/task/:taskId', ctrl.deleteCompletionsByTask); // DELETE /api/completions/task/:taskId

router.get('/', ctrl.listCompletions);                        // GET    /api/completions?from=&to=
router.put('/:taskId/:date', ctrl.setCompletion);             // PUT    /api/completions/:taskId/:date
router.delete('/:taskId/:date', ctrl.unsetCompletion);        // DELETE /api/completions/:taskId/:date

module.exports = router;
