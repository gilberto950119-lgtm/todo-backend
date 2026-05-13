// server.js
// 앱의 진입점. .env 로드 → DB 연결 → Express 시작 순서로 동작합니다.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { connectDB } = require('./db');
const tasksRouter = require('./routes/tasks');
const completionsRouter = require('./routes/completions');
const backupRouter = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;

// ── 미들웨어 ─────────────────────────────────────
app.use(cors());            // 프론트(다른 origin)에서 호출 허용
// 백업 import 본문이 클 수 있어서 기본 100kb → 10mb로 상한을 올립니다.
app.use(express.json({ limit: '10mb' }));    // JSON 요청 본문 파싱

// ── 헬스 체크 ────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ ok: true, data: { message: 'todo-backend running' } });
});

// ── 라우트 등록 ──────────────────────────────────
app.use('/api/tasks', tasksRouter);
app.use('/api/completions', completionsRouter);
app.use('/api/backup', backupRouter);

// ── 404 핸들러 (위에서 매치 안 된 모든 요청) ─────────
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not Found' });
});

// ── 에러 핸들러 (next(err)로 넘어온 에러를 한 곳에서 처리) ─
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ ok: false, error: err.message || 'Server Error' });
});

// ── 부팅 ────────────────────────────────────────
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`서버 실행 중: http://localhost:${PORT}`);
    });
  } catch (e) {
    console.error('서버 시작 실패:', e);
    process.exit(1);
  }
})();
