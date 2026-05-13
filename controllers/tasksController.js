// controllers/tasksController.js
// 실제 DB와 대화하는 곳. 라우트는 이 함수들을 호출만 합니다.
// 입력값 검증은 schemas/tasksSchema.js 에 위임했습니다.

const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const {
  createTaskSchema,
  updateTaskSchema,
  firstErrorMessage,
} = require('../schemas/tasksSchema');

// 인증을 도입하기 전까지는 1인 사용자로 가정
const USER_ID = 'default';

// tasks 컬렉션 핸들 (호출할 때마다 가져오면 안전합니다)
function tasks() {
  return getCollection('tasks');
}

// completions 컬렉션 핸들. task 삭제 시 같은 taskId의 완료 기록을 함께 정리하기 위해 사용합니다.
function completions() {
  return getCollection('completions');
}

// MongoDB의 _id(ObjectId)를 프론트가 쓰기 좋은 id(문자열)로 변환
function toClient(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

// URL로 받은 id 문자열을 ObjectId로 안전하게 변환 (잘못된 형식이면 null)
function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/tasks            전체 조회
// GET /api/tasks?date=...   특정 날짜만 조회
// ─────────────────────────────────────────────────────────────
async function getTasks(req, res, next) {
  try {
    const filter = { userId: USER_ID };
    if (req.query.date) {
      filter.date = req.query.date; // 예: "2026-05-12"
    }

    const list = await tasks()
      .find(filter)
      .sort({ date: 1, time: 1, order: 1 }) // 날짜 → 시간 → 수동순서
      .toArray();

    res.json({ ok: true, data: list.map(toClient) });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/tasks   할 일 추가
// 검증은 createTaskSchema 가 담당. 통과하면 기본값까지 채워서 돌려줍니다.
// ─────────────────────────────────────────────────────────────
async function createTask(req, res, next) {
  try {
    const parsed = createTaskSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: firstErrorMessage(parsed.error) });
    }

    const now = new Date();
    const doc = {
      userId: USER_ID,
      ...parsed.data, // title, date, time, priority, categoryId, repeat, notes, subtasks, completed, order
      createdAt: now,
      updatedAt: now,
    };

    const result = await tasks().insertOne(doc);
    res.status(201).json({
      ok: true,
      data: toClient({ _id: result.insertedId, ...doc }),
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/tasks/:id   부분 수정
// 검증은 updateTaskSchema 가 담당.
// 정의되지 않은 필드(예: _id, userId, createdAt)는 자동으로 제거됩니다.
// ─────────────────────────────────────────────────────────────
async function updateTask(req, res, next) {
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) {
      return res.status(400).json({ ok: false, error: '잘못된 id 형식입니다' });
    }

    const parsed = updateTaskSchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: firstErrorMessage(parsed.error) });
    }

    const update = { ...parsed.data, updatedAt: new Date() };

    // mongodb v6+ : findOneAndUpdate는 문서를 직접 반환 (없으면 null)
    const updated = await tasks().findOneAndUpdate(
      { _id, userId: USER_ID },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, error: '해당 할 일을 찾을 수 없습니다' });
    }
    res.json({ ok: true, data: toClient(updated) });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/tasks/:id
// ─────────────────────────────────────────────────────────────
async function deleteTask(req, res, next) {
  try {
    const _id = toObjectId(req.params.id);
    if (!_id) {
      return res.status(400).json({ ok: false, error: '잘못된 id 형식입니다' });
    }

    const result = await tasks().deleteOne({ _id, userId: USER_ID });
    if (result.deletedCount === 0) {
      return res.status(404).json({ ok: false, error: '해당 할 일을 찾을 수 없습니다' });
    }

    // task가 실제로 지워졌을 때만 같은 taskId의 completions를 정리합니다.
    // completions의 taskId 필드는 tasks._id를 문자열로 저장한 값이라서 req.params.id를 그대로 사용합니다.
    await completions().deleteMany({ userId: USER_ID, taskId: req.params.id });

    res.json({ ok: true, data: { id: req.params.id } });
  } catch (e) {
    next(e);
  }
}

module.exports = { getTasks, createTask, updateTask, deleteTask };
