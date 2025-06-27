# 🎯 Приоритетные задачи

### 🔴 **[ТЕХПИСАТЕЛЬ]** Актуализация документации и CHANGELOG
**Дата:** 27.06.2025  
**Автор:** AI Assistant
**Статус:** 🟢 Выполнено

**ЦЕЛЬ:** Привести в порядок документацию проекта после крупных изменений (миграция на Supabase Storage, персональные токены) и зафиксировать все сделанные работы в `CHANGELOG.md`.

#### План реализации:
1.  🟢 **Анализ `TASK.md`**: Изучить все завершенные задачи для формирования списка изменений.
2.  🟢 **Обновление `CHANGELOG.md`**:
    - Создать новую версию релиза.
    - Перенести все выполненные задачи из `TASK.md` в `CHANGELOG.md`, сгруппировав их по категориям (Добавлено, Улучшено, Исправлено, Рефакторинг).
3.  🟢 **Очистка `TASK.md`**: После переноса информации в `CHANGELOG.md`, удалить из этого файла все завершенные задачи, чтобы он отражал только активную работу.
4.  🟢 **Формирование списка файлов для обновления документации**:
    - Проведен аудит `docs/` на предмет упоминаний "Cloudflare R2".
    - Определены документы, требующие обновления в связи с внедрением персональных токенов.
    - **СФОРМИРОВАН СПИСОК ФАЙЛОВ ДЛЯ ОБНОВЛЕНИЯ:**
      - **Замена Cloudflare R2 на Supabase Storage:**
        1.  `docs/README.md`
        2.  `docs/PLANNING.md`
        3.  `docs/APP_LOGIC_DOCS/Admin_Panel/admin_cloudflare_r2_integration.md`
        4.  `docs/APP_LOGIC_DOCS/cloudflare_r2_setup.md`
        5.  `docs/APP_LOGIC_DOCS/lesson_content_upload_guide.md`
        6.  `docs/APP_LOGIC_DOCS/main_navigation_flow.md`
        7.  `docs/APP_LOGIC_DOCS/stage_view_flow.md`
        8.  `docs/APP_LOGIC_DOCS/lesson_view_flow.md`
        9.  `docs/APP_LOGIC_DOCS/PRDs/PRD.md`
        10. `docs/APP_LOGIC_DOCS/Admin_Panel/curator_creation.md`
        11. `docs/APP_LOGIC_DOCS/Admin_Panel/admin_user_flow.md`
        12. `docs/APP_LOGIC_DOCS/Admin_Panel/admin_materials_markup.md`
        13. `docs/APP_LOGIC_DOCS/Admin_Panel/admin_design_specification.md`
      - **Обновление документации по Персональным Токенам:**
        14. `docs/APP_LOGIC_DOCS/access_tokens_feature.md`
        15. `docs/APP_LOGIC_DOCS/Admin_Panel/user_tokenization.md`
5.  🟢 **Обновление документации**: Последовательно обновить каждый файл из списка, заменяя устаревшую информацию на актуальную.

---

## 🚀 Технические улучшения

### 🟢 **[АРХИТЕКТУРА]** Восстановление типизированных префиксов для путей к файлам
- **Статус:** 🟢 Выполнено
- **Проблема:** В коде (`MaterialsManager.tsx`, `FileUploader.tsx`) использовались захардкоженные строки для префиксов путей в Supabase Storage.
- **Цель:** Вернуть централизованный и типизированный подход к управлению префиксами.
- **РЕЗУЛЬТАТ:**
    - ✅ **Создан файл с константами** `src/lib/supabase/storage_prefixes.ts`
    - ✅ **Рефакторинг `FileUploader.tsx`**: пропс `filePrefix` теперь типизирован и использует константы.
    - ✅ **Рефакторинг `MaterialsManager.tsx`**: все хардкодные префиксы заменены на импорты из `FILE_PREFIXES`.
    - ✅ **Финальная проверка**: подтверждено, что загрузка всех типов файлов в админке работает корректно.


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
-  🟢 **BlocksManager:**
  -  🟢 Создать директорию `src/pages/AdminPage/components/BlocksManager/`.
  -  🟢 Создать файл `BlocksManager.tsx` внутри.
  -  🟢 Перенести компонент `BlocksManager` и `BlocksManagerProps`.
  -  🟢 Добавить импорты в `BlocksManager.tsx`.
  -  🟢 Заменить код компонента в `AdminPage.tsx` на импорт.
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
  - ✅ В `AdminPage.tsx`
