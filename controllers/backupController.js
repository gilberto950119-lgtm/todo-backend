// controllers/backupController.js
// tasks + completions 두 컬렉션을 통째로 다루는 백업/복원/초기화 컨트롤러.
//
// 응답 형식은 다른 컨트롤러와 동일:
//   성공: { ok: true, data }
//   실패: { ok: false, error }

const { ObjectId } = require('mongodb');
const { getCollection } = require('../db');
const { importBodySchema, firstErrorMessage } = require('../schemas/backupSchema');

// 인증 도입 전까지 1인 사용자 가정 (tasksController와 동일한 값)
const USER_ID = 'default';

function tasks() {
  return getCollection('tasks');
}
function completions() {
  return getCollection('completions');
}

// _id(ObjectId) → id(문자열). 다른 컨트롤러와 같은 변환 규칙.
function toClient(doc) {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id.toString(), ...rest };
}

// "혹시 모를 잘못된 날짜 값"을 안전하게 Date로 바꾸는 작은 헬퍼.
// JSON으로 직렬화돼 들어온 ISO 문자열도, 이미 Date 객체인 것도 모두 처리합니다.
function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────────────────────
// GET /api/backup/export
// 현재 사용자(USER_ID)의 tasks + completions 전체를 JSON으로 내려줍니다.
// 그대로 파일로 저장해 두면 import로 다시 복구할 수 있어요.
// ─────────────────────────────────────────────────────────────
async function exportAll(req, res, next) {
  try {
    const [taskList, compList] = await Promise.all([
      tasks().find({ userId: USER_ID }).sort({ date: 1, time: 1, order: 1 }).toArray(),
      completions().find({ userId: USER_ID }).sort({ date: 1 }).toArray(),
    ]);

    res.json({
      ok: true,
      data: {
        exportedAt: new Date().toISOString(),
        tasks: taskList.map(toClient),
        completions: compList.map(toClient),
      },
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/backup/import
// 받은 데이터로 "교체" 합니다.
//   1) 본문을 Zod로 검증
//   2) 기존 tasks/completions 전부 삭제 (USER_ID 범위)
//   3) 받은 데이터를 insertMany로 한꺼번에 넣기
//
// 주의:
//  - 트랜잭션은 사용하지 않습니다. 1인용/개발용으로 단순함을 우선했어요.
//    insert 중 에러가 나면 일부만 들어간 상태가 될 수 있습니다.
//  - id가 있으면 그 ObjectId로 복원합니다. completions.taskId가 변하지 않은 채
//    같은 task를 가리키게 하기 위함입니다.
//  - userId 필드는 항상 USER_ID로 강제합니다.
// ─────────────────────────────────────────────────────────────
async function importAll(req, res, next) {
  try {
    const parsed = importBodySchema.safeParse(req.body || {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: firstErrorMessage(parsed.error) });
    }
    const { tasks: tasksIn, completions: compsIn } = parsed.data;

    // ── 1) 기존 데이터 비우기 ─────────────────────
    await Promise.all([
      tasks().deleteMany({ userId: USER_ID }),
      completions().deleteMany({ userId: USER_ID }),
    ]);

    const now = new Date();

    // ── 2) 들어온 데이터 → DB 문서 모양으로 변환 ─────
    const taskDocs = tasksIn.map((t) => {
      // id, userId, createdAt, updatedAt는 별도 처리, 나머지는 그대로 넣음
      const { id, userId: _ignored, createdAt, updatedAt, ...rest } = t;
      const doc = {
        ...rest,
        userId: USER_ID, // 항상 강제
        createdAt: parseDate(createdAt) || now,
        updatedAt: parseDate(updatedAt) || now,
      };
      if (id) doc._id = new ObjectId(id);
      return doc;
    });

    const compDocs = compsIn.map((c) => {
      const { id, userId: _ignored, completedAt, ...rest } = c;
      const doc = {
        ...rest,
        userId: USER_ID,
        completedAt: parseDate(completedAt) || now,
      };
      if (id) doc._id = new ObjectId(id);
      return doc;
    });

    // ── 3) insertMany는 빈 배열을 싫어해서 분기해서 처리 ─
    let insertedTasks = 0;
    let insertedCompletions = 0;
    if (taskDocs.length > 0) {
      const r = await tasks().insertMany(taskDocs);
      insertedTasks = r.insertedCount;
    }
    if (compDocs.length > 0) {
      const r = await completions().insertMany(compDocs);
      insertedCompletions = r.insertedCount;
    }

    res.json({
      ok: true,
      data: { tasks: insertedTasks, completions: insertedCompletions },
    });
  } catch (e) {
    next(e);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/backup/all
// 현재 사용자(USER_ID)의 tasks + completions 를 모두 비웁니다.
// "초기화" 버튼이 호출할 API.
// ─────────────────────────────────────────────────────────────
async function deleteAll(req, res, next) {
  try {
    const [t, c] = await Promise.all([
      tasks().deleteMany({ userId: USER_ID }),
      completions().deleteMany({ userId: USER_ID }),
    ]);

    res.json({
      ok: true,
      data: { tasks: t.deletedCount, completions: c.deletedCount },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { exportAll, importAll, deleteAll };
