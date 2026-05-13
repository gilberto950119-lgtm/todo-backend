// schemas/tasksSchema.js
// "요청 본문(req.body)이 우리가 기대하는 모양인가?"만 책임지는 파일.
// DB 저장 로직은 controllers/tasksController.js가 담당합니다.

const { z } = require('zod');

// ─────────────────────────────────────────────────────────────
// 자주 쓰는 작은 스키마들 (재사용)
// ─────────────────────────────────────────────────────────────

// "YYYY-MM-DD"  예: "2026-05-12"
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date는 YYYY-MM-DD 형식이어야 합니다');

// "HH:mm" 또는 빈 문자열  예: "09:30", ""
const timeSchema = z.union([
  z.literal(''),
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'time은 HH:mm 형식이어야 합니다'),
]);

const prioritySchema = z.enum(['high', 'medium', 'low']);
const repeatSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);

// 하위 작업(subtask) 한 개의 모양.
// 프론트(todoapp)는 { id, title, completed } 형태로 하위 작업을 보냅니다.
const subtaskSchema = z.object({
  id: z.string(),
  title: z.string().trim().min(1, '하위 작업 title은 필수입니다'),
  completed: z.boolean(),
});

// ─────────────────────────────────────────────────────────────
// 생성용 스키마: title, date 필수. 나머지는 기본값 채워줍니다.
// POST /api/tasks 의 본문이 이 모양이어야 통과합니다.
// ─────────────────────────────────────────────────────────────
const createTaskSchema = z.object({
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
});

// ─────────────────────────────────────────────────────────────
// 수정용 스키마: 모든 필드 선택. 단, 들어오면 형식은 확인합니다.
// 또한 본문이 비어 있으면 거절합니다(기존 동작 유지).
// PATCH /api/tasks/:id 의 본문 검증에 사용합니다.
// ─────────────────────────────────────────────────────────────
const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    date: dateSchema.optional(),
    time: timeSchema.optional(),
    priority: prioritySchema.optional(),
    categoryId: z.string().optional(),
    repeat: repeatSchema.optional(),
    notes: z.string().optional(),
    subtasks: z.array(subtaskSchema).optional(),
    completed: z.boolean().optional(),
    order: z.number().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: '수정할 필드가 없습니다',
  });
// 참고: zod의 z.object()는 기본적으로 정의되지 않은 필드를 "조용히 제거"합니다.
// 그래서 클라이언트가 _id, userId, createdAt 같은 걸 보내도 자동으로 걸러져요.
// 별도의 화이트리스트 코드가 필요 없어집니다.

// ─────────────────────────────────────────────────────────────
// 컨트롤러에서 쓰기 좋은 헬퍼:
// safeParse 결과의 첫 번째 에러 메시지를 사람이 읽기 좋은 한 줄로 뽑아줍니다.
// ─────────────────────────────────────────────────────────────
function firstErrorMessage(zodError) {
  const issue = zodError?.issues?.[0];
  if (!issue) return '입력값이 올바르지 않습니다';
  // 예: "title: title은 필수입니다"
  const path = issue.path?.join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  firstErrorMessage,
};
