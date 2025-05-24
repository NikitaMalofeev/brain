
# 🧩 stage_view_flow.md  
**Экран: "Ступень" / Детализация этапа обучения**

---

## 🎯 Цель флоу

Позволить пользователю зайти в конкретную ступень курса, изучить список уроков и перейти к их просмотру или выполнению задания.

---

## 🧠 Пользовательский опыт (UI)

**Экран: "Первая ступень"**  
Элементы на экране (согласно Figma):
- Название ступени
- Прогресс: «2 из 5 завершено»
- Список уроков:
  - Иконка контента (видео, текст, аудио, файл, ссылка)
  - Название
  - Статус урока: 🟢 завершено / ⚪ не начат / ⏳ в процессе
  - Метка "Есть задание" / Статус задания (сдано / не сдано / принято)
- Кнопка "Назад"
- Нижняя навигация (Tab Bar)

---

## ⚙️ Логика (backend / Supabase)

### 🔐 Доступ к ступени

- Каждая ступень (`course_stages`) может быть заблокирована:
  - `unlock_condition_type = previous_stage_completed`
  - `lives_remaining == 0` (игровая блокировка)
- При `lives_remaining = 0` → весь экран неактивен, показываем алерт.

---

### 📥 Загрузка данных

```ts
const stageId = params.stage_id

// Материалы
const materials = await supabase
  .from("materials")
  .select("*")
  .eq("stage_id", stageId)
  .order("order")

// Прогресс пользователя по материалам
const viewed = await supabase
  .from("material_status")
  .select("material_id")
  .eq("user_id", user.id)

// Задания, привязанные к материалам
const assignments = await supabase
  .from("assignments")
  .select("*")
  .in("material_id", materials.map(m => m.id))

// Сдачи по этим заданиям
const submissions = await supabase
  .from("submissions")
  .select("assignment_id, status")
  .eq("user_id", user.id)
````

---

## 🔄 Действия пользователя

### 1. Нажал на урок без задания

* Открывается `lesson_view` (контент)
* После 90% просмотра → mark as viewed → `material_status`

### 2. Нажал на урок с заданием

* Открывается `lesson_view` + кнопка «Перейти к заданию»
* Навигация: `assignment/:assignment_id`

---

## 🔁 Навигация

* ← `library` (список ступеней)
* → `lesson/:material_id`
* → `assignment/:assignment_id` (если материал содержит задание)

---

## 🗄 Задействованные таблицы

| Таблица             | Назначение                       |
| ------------------- | -------------------------------- |
| `course_stages`     | ID, название, условие доступа    |
| `lessons`           | Уроки в рамках ступени         |
| `assignments`       | Задания, связанные с уроками |
| `submissions`       | Состояние сдачи                  |
| `material_status`   | Просмотренность материалов       |
| `user_gamification` | Жизни, баллы                     |

---

## ✅ Acceptance Criteria

* [ ] Этап доступен при выполнении условий
* [ ] Загружается корректный список материалов
* [ ] Урок с `is_assignment_trigger` отображает кнопку «Перейти к заданию»
* [ ] Статусы задания отображаются: `submitted`, `approved`, `rejected`
* [ ] Если `lives = 0` — доступ к ступени заблокирован

---

## 📍 Структура компонентов

* `/pages/stage/[stage_id].tsx`
* `/components/LessonCard.tsx`
* `/lib/supabase/fetchStageViewData.ts`

---

## 🧱 Псевдокод (React-style)

```tsx
<StageScreen>
  {materials.map((m) => (
    <LessonCard
      key={m.id}
      title={m.title}
      icon={m.content_type}
      viewed={viewedIds.includes(m.id)}
      hasAssignment={assignmentsMap[m.id]}
      submissionStatus={submissionsMap[assignmentsMap[m.id]]?.status}
      onClick={() => router.push(`/lesson/${m.id}`)}
    />
  ))}
</StageScreen>
```

---

## 🧭 Следующие flow

→ `lesson_view_flow.md` — просмотр контента
→ `assignment_submission_tma_flow.md` или `assignment_submission_chat_report_flow.md`
