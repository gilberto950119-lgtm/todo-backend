// routes/tasks.js
// "URL이 들어오면 어떤 함수에 넘길 것인가"만 정해두는 얇은 파일.
// 실제 일은 controllers/tasksController.js가 합니다.

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tasksController');

// /api/tasks  →  여기 위에 app.use('/api/tasks', ...) 가 prefix를 붙여줌
router.get('/', ctrl.getTasks);          // GET    /api/tasks            (?date= 도 지원)
router.post('/', ctrl.createTask);       // POST   /api/tasks
router.patch('/:id', ctrl.updateTask);   // PATCH  /api/tasks/:id
router.delete('/:id', ctrl.deleteTask);  // DELETE /api/tasks/:id

module.exports = router;
