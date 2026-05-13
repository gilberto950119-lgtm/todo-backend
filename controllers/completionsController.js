// controllers/completionsController.js
// 반복 일정 완료 기록(completions) 컬렉션과 대화하는 곳.
// 컬렉션 문서 모양:
//   { _id, userId, taskId, date, completedAt }

const { getCollection } = require('../db');
const {
  paramsTaskIdDateSchema,
  paramsTaskIdSchema,
  listQuerySchema,
  firstErrorMessage,
} = require('../schemas/completionsSchema');

// 인증 도입 전까지는 1인 사용자로 가정
const USER_ID = 'default';

function completions() {
  return getCollection('completions');
}

// _id(ObjectId) → id(문자열)로 바꿔서 프론트가 쓰기 편하게
function toClient(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

// ─────────────────────────────────────────────────────────────
// GET /api/completions?from=YYYY-MM-DD&to=YYYY-MM-DD
// from/to를 둘 다 안 주면 전체 반환.
// ─────────────────────────────────────────────────────────────
async function listCompletions(req, res, next) {
  try {
    const parsed = listQuerySchema.safeParse(req.query || {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: firstErrorMessage(parsed.error) });
    }
    const { from, to } = parsed.data;

    const filter = { userId: USER_ID };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const list = await completions()
      .find(filter)
      .sort({ date: 1 })
      .toArray();

    res.json({ ok: true, data: list.map(toClient) });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// PUT /api/completions/:taskId/:date
// 같은 (userId, taskId, date) 조합이 있으면 completedAt만 갱신,
// 없으면 새로 삽입(upsert). 같은 키로 여러 번 요청해도 한 건만 남습니다.
// ─────────────────────────────────────────────────────────────
async function setCompletion(req, res, next) {
  try {
    const parsed = paramsTaskIdDateSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: firstErrorMessage(parsed.error) });
    }
    const { taskId, date } = parsed.data;

    const now = new Date();
    const result = await completions().findOneAndUpdate(
      { userId: USER_ID, taskId, date },
      {
        $set: { completedAt: now },
        $setOnInsert: { userId: USER_ID, taskId, date },
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.json({ ok: true, data: toClient(result) });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/completions/:taskId/:date
// 해당 날짜의 완료 기록 한 건을 삭제. 없으면 deletedCount: 0.
// ─────────────────────────────────────────────────────────────
async function unsetCompletion(req, res, next) {
  try {
    const parsed = paramsTaskIdDateSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: firstErrorMessage(parsed.error) });
    }
    const { taskId, date } = parsed.data;

    const result = await completions().deleteOne({ userId: USER_ID, taskId, date });
    res.json({
      ok: true,
      data: { taskId, date, deleted: result.deletedCount },
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/completions/task/:taskId
// 특정 task의 모든 날짜 완료 기록을 한 번에 삭제.
// (task 자체가 삭제될 때 정리 용도로 호출)
// ─────────────────────────────────────────────────────────────
async function deleteCompletionsByTask(req, res, next) {
  try {
    const parsed = paramsTaskIdSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: firstErrorMessage(parsed.error) });
    }
    const { taskId } = parsed.data;

    const result = await completions().deleteMany({ userId: USER_ID, taskId });
    res.json({
      ok: true,
      data: { taskId, deleted: result.deletedCount },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listCompletions,
  setCompletion,
  unsetCompletion,
  deleteCompletionsByTask,
};
