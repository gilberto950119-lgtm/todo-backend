// schemas/backupSchema.js
// 백업 import API가 받을 본문(req.body)의 모양만 책임지는 파일.
// 실제 DB 처리는 controllers/backupController.js가 담당합니다.
//
// 핵심 아이디어:
//  - export에서 내려준 그대로 import에 다시 넣어도 통과해야 합니다.
//  - 그래서 task/completion 한 건마다 id, userId, createdAt 같은 "복원용 필드"도
//    함께 들어올 수 있다고 가정하고 .passthrough()로 열어둡니다.
//  - 검증의 진짜 목적은 "필수 필드가 빠지지 않았나, 형식이 맞나" 입니다.

const { z } = require('zod');

// 24자 hex 문자열 (MongoDB ObjectId의 문자열 표현)
const objectIdHex = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, '24자 hex 문자열이어야 합니다');

// "YYYY-MM-DD"
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date는 YYYY-MM-DD 형식이어야 합니다');

// "HH:mm" 또는 빈 문자열
const timeSchema = z.union([
  z.literal(''),
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time은 HH:mm 형식이어야 합니다'),
]);

const prioritySchema = z.enum(['high', 'medium', 'low']);
const repeatSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);
const subtaskSchema = z.object({}).passthrough();

// ─────────────────────────────────────────────────────────────
// import에 들어오는 task 한 건의 모양.
//  - id: 옵션. 있으면 그 ObjectId로 복원, 없으면 새로 발급.
//  - title/date: 필수.
//  - 나머지는 기본값으로 채워줌 (createTaskSchema와 같은 규칙).
//  - userId/createdAt/updatedAt 등 export로 같이 나간 필드는 그대로 통과.
// ─────────────────────────────────────────────────────────────
const importTaskSchema = z
  .object({
    id: objectIdHex.optional(),
    title: z.string().trim().min(1, 'title은 필수입니다'),
    date: dateSchema,
    time: timeSchema.optional().default(''),
    priority: prioritySchema.optional().default('medium'),
    categoryId: z.string().optional().default('etc'),
    repeat: repeatSchema.optional().default('none'),
    notes: z.string().optional().default(''),
    subtasks: z.array(subtaskSchema).optional().default([]),
    completed: z.boolean().optional().default(false),
    order: z.number().optional().default(0),
  })
  .passthrough();

// ─────────────────────────────────────────────────────────────
// import에 들어오는 completion 한 건의 모양.
//  - id: 옵션. 있으면 그 ObjectId로 복원.
//  - taskId: 필수, 24자 hex. 어떤 task의 완료 기록인지 가리킴.
//  - date: 필수, YYYY-MM-DD.
//  - completedAt: 옵션. 문자열(JSON ISO) 또는 Date 둘 다 허용.
// ─────────────────────────────────────────────────────────────
const importCompletionSchema = z
  .object({
    id: objectIdHex.optional(),
    taskId: objectIdHex,
    date: dateSchema,
    completedAt: z.union([z.string(), z.date()]).optional(),
  })
  .passthrough();

// POST /api/backup/import 의 본문 모양:
//   { tasks: [...], completions: [...] }
const importBodySchema = z.object({
  tasks: z.array(importTaskSchema),
  completions: z.array(importCompletionSchema),
});

// zod 에러를 한 줄짜리 사람용 메시지로 변환 (다른 스키마 파일과 동일한 헬퍼)
function firstErrorMessage(zodError) {
  const issue = zodError?.issues?.[0];
  if (!issue) return '입력값이 올바르지 않습니다';
  const path = issue.path?.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

module.exports = {
  importBodySchema,
  firstErrorMessage,
};
