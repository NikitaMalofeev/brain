# Активные задачи проекта "Brain Programming"

## 🎯 Приоритетные задачи

### 🟡 **[UX]** Информативность и безопасность
- 🔴 Добавить информативные алерты при удалении сущностей
- 🔴 Добавить алерты при выходе без сохранения изменений

---

## 🎨 UI/UX доработки

### 🟡 **[Дизайн]** Соответствие Figma
- 🟡 Последняя карточка при нечетном количестве - на два столбца
- 🟡 Проверить выравнивание label "ступень" под карточкой
- 🔴 Финальное тестирование соответствия дизайну Figma

### 🟡 **[Тестирование]** Адаптивность и производительность
- 🟡 Тестирование адаптивности на разных размерах экрана
- 🟡 Протестировать работу обложек уроков в браузере
- 🟡 Протестировать полный флоу: урок → завершение → разблокировка следующего

---

## 🚀 Технические улучшения

### 🟡 **[Оптимизация]** Очистка кода
- 🔴 Удалить неиспользуемый AudioPlayer.tsx
- 🔴 Очистить неиспользуемые CSS стили из Player.css

---

## 🛠️ **[Рефакторинг]** Декомпозиция гигантского AdminPage.tsx

**Цель:** Уменьшить размер файла `AdminPage.tsx` (сейчас >2000 строк), повысить читаемость и поддерживаемость кода путем разделения на модули и хуки.

### **Этап 1: Декомпозиция компонентов (Вынос в отдельные файлы)**
- 🔴 **CoursesManager:**
  - 🔴 Создать директорию `src/pages/AdminPage/components/CoursesManager/`.
  - 🔴 Создать файл `CoursesManager.tsx` внутри новой директории.
  - 🔴 Перенести компонент `CoursesManager` и его пропсы (`CoursesManagerProps`) из `AdminPage.tsx` в новый файл.
  - 🔴 Добавить необходимые импорты (`React`, `useState`, `useCoursesAdmin`) в `CoursesManager.tsx`.
  - 🔴 Заменить код компонента в `AdminPage.tsx` на импорт из нового файла.
- 🔴 **StagesManager:**
  - 🔴 Создать директорию `src/pages/AdminPage/components/StagesManager/`.
  - 🔴 Создать файл `StagesManager.tsx` внутри.
  - 🔴 Перенести компонент `StagesManager` и `StagesManagerProps` из `AdminPage.tsx`.
  - 🔴 Добавить необходимые импорты в `StagesManager.tsx`.
  - 🔴 Заменить код компонента в `AdminPage.tsx` на импорт.
- 🔴 **TariffLimitsSection:**
  - 🔴 Создать файл `TariffLimitsSection.tsx` в `src/pages/AdminPage/components/StagesManager/`.
  - 🔴 Перенести компонент `TariffLimitsSection` и `TariffLimitsSectionProps` из `AdminPage.tsx`.
  - 🔴 Добавить импорты (`React`, `useState`, `useEffect`, `useTariffLimits`) в `TariffLimitsSection.tsx`.
  - 🔴 Импортировать `TariffLimitsSection` в `StagesManager.tsx`.
- 🔴 **BlocksManager:**
  - 🔴 Создать директорию `src/pages/AdminPage/components/BlocksManager/`.
  - 🔴 Создать файл `BlocksManager.tsx` внутри.
  - 🔴 Перенести компонент `BlocksManager` и `BlocksManagerProps`.
  - 🔴 Добавить импорты в `BlocksManager.tsx`.
  - 🔴 Заменить код компонента в `AdminPage.tsx` на импорт.
- 🔴 **Breadcrumb:**
  - 🔴 Создать директорию `src/pages/AdminPage/components/Breadcrumb/`.
  - 🔴 Создать файл `Breadcrumb.tsx` внутри.
  - 🔴 Перенести компонент `Breadcrumb` и `BreadcrumbProps`.
  - 🔴 Заменить код компонента в `AdminPage.tsx` на импорт.
- 🔴 **Итоговая зачистка Этапа 1:**
  - 🔴 Проверить и удалить все перенесенные компоненты и их пропсы из `AdminPage.tsx`.
  - 🔴 Убедиться, что все новые компоненты правильно импортированы и приложение работает.

### **Этап 2: Централизация типов**
- 🔴 Создать файл `src/pages/AdminPage/types.ts`.
- 🔴 **Вынести типы:**
    - 🔴 Перенести `SupabaseUser` в `types.ts` и экспортировать.
    - 🔴 Перенести `NavigationState` в `types.ts` и экспортировать.
    - 🔴 Перенести `SubmissionsNavigationState` в `types.ts` и экспортировать.
    - 🔴 Перенести `BlockModalData` в `types.ts` и экспортировать.
- 🔴 **Обновить импорты:**
    - 🔴 В `AdminPage.tsx` заменить локальные типы на импорты из `src/pages/AdminPage/types.ts`.
    - 🔴 В `Breadcrumb.tsx` обновить импорт `NavigationState`.
    - 🔴 В `BlocksManager.tsx` обновить импорт `BlockModalData`.

### **Этап 3: Инкапсуляция логики в кастомные хуки**
- 🔴 **Создать директорию для хуков:** `src/pages/AdminPage/hooks/`.
- 🔴 **`useAdminAuth` Hook:**
  - 🔴 Создать файл `useAdminAuth.ts` в новой директории.
  - 🔴 Перенести всю логику аутентификации: `useState` для `passwordAuth`, `password`, `error`, `adminUser`, `login`, `authLoading`.
  - 🔴 Перенести `useEffect` для валидации localStorage.
  - 🔴 Перенести функции `authenticateUser` и `handleLogout`.
  - 🔴 Хук должен возвращать объект со всеми состояниями и функциями.
  - 🔴 В `AdminPage.tsx` удалить перенесенную логику и вызвать хук `useAdminAuth`.
- 🔴 **`useCourseNavigation` Hook:**
  - 🔴 Создать файл `useCourseNavigation.ts`.
  - 🔴 Перенести `useState` для `navigation`.
  - 🔴 Перенести функции-обработчики: `handleCourseSelect`, `handleStageSelect`, `handleLessonSelect`, `handleNavigationBack`.
  - 🔴 Хук должен возвращать `navigation` и функции-обработчики.
  - 🔴 В `AdminPage.tsx` удалить перенесенную логику и вызвать хук `useCourseNavigation`.
- 🔴 **`useSubmissionsNavigation` Hook:**
  - 🔴 Создать файл `useSubmissionsNavigation.ts`.
  - 🔴 Перенести `useState` для `submissionsNavigation`.
  - 🔴 Перенести функции-обработчики: `handleSubmissionSelect`, `handleSubmissionsBack`.
  - 🔴 В `AdminPage.tsx` удалить перенесенную логику и вызвать хук `useSubmissionsNavigation`.
- 🔴 **Итоговая проверка Этапа 3:**
  - 🔴 Убедиться, что `AdminPage.tsx` стал значительно меньше и в основном содержит JSX-разметку и вызовы хуков.
  - 🔴 Проверить работоспособность навигации и аутентификации.

---

## 🎯 Новые функции для пользователей

### 🟡 **[Пользовательский интерфейс]** Дополнительные материалы
- 🔴 Разработать UI для отображения списка материалов (пользовательская часть)
- 🔴 Разработать UI для просмотра отдельного материала (пользовательская часть)
- 🔴 Интегрировать материалы в основную навигацию приложения

---

## 📊 Статус до MVP

**🎯 Готовность к запуску:** ~99%

**🔄 Можно доделать после запуска:**
- Финальное тестирование UI/UX (0.5 дня)
- Улучшения UX (информативные алерты)
- Очистка неиспользуемого кода
- Исправление остальных TypeScript lint ошибок

📝 **Полная история изменений и выполненных задач в [CHANGELOG.md](./CHANGELOG.md)**

---
*Последнее обновление: 11.06.2025*