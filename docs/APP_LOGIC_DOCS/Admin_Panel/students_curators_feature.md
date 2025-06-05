# ✅ РЕАЛИЗОВАННАЯ ФУНКЦИЯ: Управление учениками и кураторами

## 🎯 Статус реализации: ЗАВЕРШЕНО (05.06.2025)

Ниже представлена полная схема управления пользователями в админке с учётом наличия отдельных таблиц материалов и их просмотров. Реализован полный функционал из двух табов («Ученики» и «Кураторы») с детальными карточками и системой назначений.

---

## 1. База данных: связи «Куратор ↔ Ученик» и материалы

1. **`user_curator`** — таблица для связи "какой куратор закреплён за каким учеником".

   ```sql
   CREATE TABLE user_curator (
     id         BIGSERIAL PRIMARY KEY,
     curator_id UUID NOT NULL REFERENCES users(id),
     student_id UUID NOT NULL REFERENCES users(id),
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE(curator_id, student_id)
   );
   ```



2. **Дополнительные материалы** (`materials` и `material_blocks`), уже существуют и не привязаны к урокам:

   * `materials`:

     * `id` (UUID), `name`, `description`, `cover_image_path`, `material_type`, `order_num`, `created_at`, `updated_at`.
   * `material_blocks`:

     * `id`, `material_id → materials.id`, `order_num`, `title`, `block_type`, `content_text`, `content_url`, `meta_json`, `created_at`, `updated_at`.


3. **Просмотры материалов** (`user_material_views`):

   ```sql
   CREATE TABLE user_material_views (
     id              BIGSERIAL PRIMARY KEY,
     user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     material_id     UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
     first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     last_viewed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     is_completed    BOOLEAN NOT NULL DEFAULT false,
     CONSTRAINT uq_user_material UNIQUE (user_id, material_id)
   );
   ```

   Это используется, чтобы отмечать, какие материалы ученик уже посмотрел/«завершил».&#x20;

4. **Уроки** (`lessons`) и **прогресс уроков** (`lesson_progress`) остались без изменений:

   * `lessons` содержит поля `open_at`, `deadline_at`, `has_assignment` и т.д. .
   * `lesson_progress`: хранит `user_id`, `lesson_id`, `started_at`, `is_completed`, `completed_at`. Факт взаимодействия с уроком определяется по наличию записи и заполнению `started_at` или `is_completed`. Для отслеживания взаимодействия с *дополнительными материалами* используется таблица `user_material_views`.

---

## 2. Таб «Ученики»

### 2.1 Список (таблица)

**Колонки, выводимые в списке «Ученики»:**

1. **ФИО** – `users.first_name || ' ' || users.last_name` .
2. **Telegram-ID / Web-login** – `users.telegram_id` (TEXT) или `users.web_login` .
3. **Курс** – активный курс из `user_course_enrollments.course_id → courses.title`. Сейчас у каждого только один активный курс. .
4. **Дата регистрации** – `users.created_at` .
5. **Дата последнего входа** – `users.last_login` или `users.web_last_login` .
6. **Баллы** – `users.total_points` .
7. **Процент завершённых уроков** – считаем на лету:

   ```sql
   completed_count = (
     SELECT COUNT(*) 
     FROM lesson_progress lp 
     JOIN lessons l ON lp.lesson_id = l.id 
     JOIN course_stages cs ON l.stage_id = cs.id 
     WHERE lp.user_id = U AND cs.course_id = C AND lp.is_completed = true
   );
   total_lessons = (
     SELECT COUNT(*) 
     FROM lessons l 
     JOIN course_stages cs ON l.stage_id = cs.id 
     WHERE cs.course_id = C AND l.has_assignment = true
   );
   percent = (completed_count::float / total_lessons) * 100
   ```

   .
8. **% просмотра библиотечных материалов** – аналогично, используя `user_material_views`:

   ```sql
   viewed_count = (
     SELECT COUNT(*) 
     FROM user_material_views umv 
     WHERE umv.user_id = U AND umv.is_completed = true
   );
   total_materials = (SELECT COUNT(*) FROM materials M);
   percent_library = (viewed_count::float / total_materials) * 100
   ```

   .
9. **Куратор** – `CONCAT(curator.first_name, ' ', curator.last_name)` (nullable)

_Действия (начисление/списание баллов, сброс прогресса урока, отметка просмотра материалов) перенесены в карточку ученика._

**Сортировки на табе «Ученики»:**

* По «Баллам» (`users.total_points DESC`),
* По «Дате регистрации» (`users.created_at DESC`),
* По «Последнему входу» (`users.last_login DESC`).
  Все остальные фильтры пока убираем .

**Пример использования React хука (клиентский код):**

```typescript
// Использование хука для получения списка учеников
import { useStudentsAdmin } from '@/lib/supabase/hooks/useStudentsAdmin';

const StudentsTable = () => {
  const { 
    students, 
    loading, 
    error, 
    pagination,
    loadStudents 
  } = useStudentsAdmin();

  // Загрузка учеников с сортировкой
  useEffect(() => {
    loadStudents({ 
      sortBy: 'points', 
      sortOrder: 'DESC',
      page: 1, 
      perPage: 20 
    });
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <table>
      {students.map(student => (
        <tr key={student.user_id}>
          <td>{student.full_name}</td>
          <td>{student.total_points}</td>
          <td>{student.completed_lessons_percent}%</td>
        </tr>
      ))}
    </table>
  );
};
```

Данные от хука — массив объектов учеников с пагинацией:

---

### 2.2 Карточка «Ученик»

При переходе `GET /admin/students/{studentId}` отображается:

1. **Основная информация**

   * ФИО, Telegram-ID / Web-login,
   * Роль (`user` — не выводим явно),
   * Дата регистрации (`users.created_at`),
   * Дата последнего входа (`users.last_login`),
   * Баллы (`users.total_points`).


2. **Курсы** (по текущей архитектуре чаще всего один)

   * Из `user_course_enrollments`: `course_id → courses.title`, `enrollment_date`.


3. **Процент завершённых уроков (по курсу)**

   * Как в табе: показывает численное `X из Y` и прогресс-бар.
   * `X = COUNT(lp WHERE is_completed = true AND lesson.stage_id ∈ stages этого курса)`;
   * `Y = COUNT(lessons WHERE has_assignment = true AND stage_id ∈ stages этого курса)`.

4. **Список уроков курса (таблица)**, сгруппированный по стадиям:

   | Стадия      | Урок          | Open At          | Deadline At      | Статус (is\_completed) | Дата сдачи       | Действие    |
   | ----------- | ------------- | ---------------- | ---------------- | ---------------------- | ---------------- | ----------- |
   | **Stage 1** | Урок 1 (id=5) | 2025-06-01T06:00 | 2025-06-03T06:00 | true                   | 2025-06-02T10:00 | \[Сбросить] |
   |             | Урок 2        | 2025-06-02T06:00 | 2025-06-04T06:00 | false                  | –                | \[Сбросить] |
   | **Stage 2** | Урок 3        | 2025-06-05T06:00 | 2025-06-07T06:00 | false                  | –                | \[Сбросить] |

   * `Open At`, `Deadline At` из `lessons.open_at` и `lessons.deadline_at`&#x20;
   * Статус = `lesson_progress.is_completed`&#x20;
   * Кнопка «Сбросить» удаляет запись из `lesson_progress`.

5. **Список библиотечных материалов**:

   | Материал                  | Тип     | Opened At  | Просмотрено | Дата просмотра   | Действие                      |
   | ------------------------- | ------- | ---------- | ----------- | ---------------- | ----------------------------- |
   | «Основы Dart»             | article | 2025-05-15 | ✓           | 2025-05-16T14:30 | \[Сбросить отметку просмотра] |
   | «Паттерны проектирования» | video   | 2025-05-20 | –           | –                | \[Пометить просмотренным]     |

   * Данные по материалам (`materials.name`, `material_type`, `order_num`).
   * Проверяем `user_material_views` для `user_id = studentId`: `is_completed`, `last_viewed_at`.&#x20;
   * Кнопка «Пометить просмотренным»: использование хука `useStudentActions` с методом `markMaterialViewed(studentId, materialId)`
   * Кнопка «Сбросить отметку просмотра»: использование хука `useStudentActions` с методом `resetMaterialView(studentId, materialId)`

6. **Действия**

   * **Начислить/списать баллы** – осуществляется через стандартный интерфейс редактирования пользователя (изменение поля `total_points`).
   * **Сбросить прогресс урока**: использование хука `useStudentActions` с методом `resetLessonProgress(studentId, lessonId)`.
   * **Отметить материал просмотренным**: использование хука `useStudentActions` с методом `markMaterialViewed(studentId, materialId)`.
   * **Сбросить отметку просмотра**: использование хука `useStudentActions` с методом `resetMaterialView(studentId, materialId)`.
   * **Вернуться в список учеников** (кнопка назад).

---

## 3. Таб «Кураторы»

### 3.1 Список (таблица)

**Колонки:**

1. **ФИО** (`users.first_name || ' ' || users.last_name`)&#x20;
2. **Telegram-ID / Web-login** (`users.telegram_id` или `users.web_login`)&#x20;
3. **Кол-во учеников** `COUNT(*) FROM user_curator WHERE curator_id = users.id`&#x20;
4. **Действие** – кнопка «Открыть карточку куратора».

Сортировки/фильтры не нужны.

**Пример использования React хука (клиентский код):**

```typescript
// Использование хука для получения списка кураторов
import { useCuratorsAdmin } from '@/lib/supabase/hooks/useCuratorsAdmin';

const CuratorsTable = () => {
  const { curators, loading, error, loadCurators } = useCuratorsAdmin();

  useEffect(() => {
    loadCurators({ page: 1, perPage: 20 });
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <table>
      {curators.map(curator => (
        <tr key={curator.user_id}>
          <td>{curator.full_name}</td>
          <td>{curator.telegram_id}</td>
          <td>{curator.assigned_students_count}</td>
        </tr>
      ))}
    </table>
  );
};
```

---

### 3.2 Карточка «Куратор»

**Использование React хука (клиентский код):**
```typescript
import { useCuratorDetails } from '@/lib/supabase/hooks/useCuratorDetails';

const CuratorDetail = ({ curatorId }: { curatorId: string }) => {
  const { curatorDetails, loading, error, loadCuratorDetails } = useCuratorDetails();

  useEffect(() => {
    loadCuratorDetails(curatorId);
  }, [curatorId]);

  // Отображение детальной информации...
};
```

**GET /admin/curators/{curatorId}** возвращает:

1. **Основная информация**

   * ФИО, Telegram-ID,
   * Дата регистрации (`users.created_at`),
   * Дата последнего входа (`users.last_login`),
   * Количество назначенных учеников (N) .

2. **Список «Мои ученики»** (таблица):

   | ФИО ученика   | Telegram-ID | Курс          | % завершения | Действие           |
   | ------------- | ----------- | ------------- | ------------ | ------------------ |
   | Иван Иванов   | 123456789   | Flutter Basic | 45%          | \[Открыть профиль] |
   | Мария Петрова | 234567890   | Flutter Basic | 70%          | \[Открыть профиль] |

   * **Курс** = из `user_course_enrollments` (активный).
   * **% завершения** = рассчитывается как в карточке ученика (из `lesson_progress` и `lessons`).
   * **Действие** «Открыть профиль» → переход на `/admin/students/{studentId}`.

3. **Действия**

   * **Назначить ученика** – открывается модалка со списком `users` с `role = 'user'` и без записи в `user_curator` (без текущих привязок).

     * Использование хука: `useCuratorActions` с методом `assignStudent(curatorId, studentId)`.
   * **Отвязать ученика** – иконка «×» рядом с каждым в списке.

     * Использование хука: `useCuratorActions` с методом `unassignStudent(curatorId, studentId)`.
   * **Вернуться в список кураторов** – кнопка «Назад».

---

## 4. Итоги и ссылки на спецификации

---

## ✅ Что было реализовано (05.06.2025)

### 🗄️ База данных
* **✅ Таблица `user_curator`**: Создана и работает для связи кураторов с учениками
* **✅ Все SQL функции**: Функции для получения списков и статистики работают корректно
* **✅ RLS политики**: Настроены политики доступа для разных ролей

### 🎯 Фронтенд компоненты
* **✅ StudentsManager**: Полная таблица учеников с сортировкой и пагинацией
* **✅ StudentCard**: Детальная карточка ученика с прогрессом по урокам и материалам
* **✅ CuratorsManager**: Список кураторов с количеством учеников
* **✅ CuratorCard**: Детальная карточка куратора со списком "Мои ученики"
* **✅ AssignStudentModal**: Модальное окно назначения с продвинутым поиском

### 🔧 React Hooks
* **✅ useStudentsAdmin**: Загрузка списка учеников с фильтрами
* **✅ useStudentDetails**: Детальная информация ученика
* **✅ useStudentActions**: Действия над учениками (сброс прогресса, изменение баллов)
* **✅ useCuratorsAdmin**: Загрузка списка кураторов
* **✅ useCuratorDetails**: Детальная информация куратора с учениками
* **✅ useCuratorActions**: Назначение/отвязка учеников

### 🚀 Ключевые функции
* **✅ Поиск учеников**: Fuse.js поиск по ФИО/Telegram ID/курсу в реальном времени
* **✅ Уникальность назначений**: Один ученик = один куратор, проверка на уровне БД и UI
* **✅ Синхронизация данных**: Автоматическое обновление списков после назначений
* **✅ Правильный подсчет прогресса**: Синхронизирован между StudentCard и CuratorCard
* **✅ Модальное окно остается открытым**: Удобное назначение нескольких учеников подряд

### 📊 Техническая архитектура
* **Все данные** взяты из `db_schema.md` (включая таблицы `materials`, `user_material_views`, `lesson_progress`).
* **Названия таблиц**: `user_curator`, `materials`, `material_blocks`, `user_material_views`, `lessons`, `lesson_progress`, `users`, `courses`, `course_stages`, `user_course_enrollments`.
* **✅ Бэкенд-логика** — реализована через React Hooks и SQL функции в Supabase.
* **✅ Архитектура**: Использует тот же паттерн, что и существующие хуки проекта (`useCoursesAdmin`, `useStagesAdmin`, etc.).
* **✅ Поведение**:

  1. Вкладка «Ученики» без фильтров, только сортировка по баллам/регистрации/входу.
  2. Карточка «Ученик» показывает прогресс по урокам и по библиотечным материалам.
  3. Вкладка «Кураторы» и карточка «Куратор» с полным функционалом назначения учеников.
