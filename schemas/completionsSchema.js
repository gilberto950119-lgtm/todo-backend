// schemas/completionsSchema.js
// completions 라우트의 params/query 모양만 책임지는 파일.
// 본문(body)이 없는 API라서 body 스키마는 두지 않습니다.

const { z } = require('zod');

// taskId는 tasks 컬렉션의 _id(ObjectId)를 문자열로 표현한 값.
// 항상 24자리 16진수 문자열입니다.
const taskIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'taskId는 24자 hex 문자열이어야 합니다');

// "YYYY-MM-DD"  예: "2026-05-12"
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date는 YYYY-MM-DD 형식이어야 합니다');

// PUT/DELETE /api/completions/:taskId/:date 의 URL 파라미터 검증
const paramsTaskIdDateSchema = z.object({
  taskId: taskIdSchema,
  date: dateSchema,
});

// DELETE /api/completions/task/:taskId 의 URL 파라미터 검증
const paramsTaskIdSchema = z.object({
  taskId: taskIdSchema,
});

// GET /api/completions?from=...&to=... 의 쿼리스트링 검증
const listQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

// zod 에러를 사람이 읽기 좋은 한 줄 메시지로 변환
function firstErrorMessage(zodError) {
  const issue = zodError?.issues?.[0];
  if (!issue) return '입력값이 올바르지 않습니다';
  const path = issue.path?.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

module.exports = {
  paramsTaskIdDateSchema,
  paramsTaskIdSchema,
  listQuerySchema,
  firstErrorMessage,
};
