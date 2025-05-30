# Карта экранов Brain Programming

Построена на основе метаданных Figma (figma_screens_metadata.md) и требований PRD.md

---

## 🧭 Общая навигационная структура

### Роуты приложения (React Router):
```
/                     - Главная страница (Main Screen - Figma ID: 682-4667)
/onboarding           - Онбординг (Onboarding - Figma ID: 682-4669)
/library              - Библиотека ступеней (Library - Figma ID: 682-4668)
/library/stage/:id    - Детальная страница ступени (Course Detail - Figma ID: 682-4670)
/library/lesson/:id   - Урок (Lesson View - Figma ID: 682-4671)
/submissions          - Проверка заданий (Review Interface - Figma ID: 682-4672)
/profile              - Профиль (Profile - Figma ID: 682-4673)
/profile/chats        - Чаты (Messages - Figma ID: 682-4674)
/profile/help         - Помощь
/profile/faq          - FAQ
/admin                - Админ панель (Admin Panel - Figma ID: 682-4675)
```

---

## 🎯 1. БЛОК "ONBOARDING" (Figma ID: 682-4669)

### 1.1 Экран "Добро пожаловать"
**Роут:** `/onboarding`  
**Компонент:** `OnboardingWelcome.tsx`  
**Figma ID:** 682-4669

**🔽 Вводимые данные:**
- Данные пользователя Telegram (автоматически через WebApp SDK)
- Прогресс онбординга

**🔼 Выводимые данные:**
- Центрированная welcome карточка с glass-эффектом
- Приветственное видео/контент
- Progress steps (высота 4px, активный цвет #B862EA)
- Telegram кнопка авторизации (градиент secondary)
- Кнопка "Далее" с primary градиентом

**📊 Таблицы Supabase:**
- `users` - создание/обновление профиля пользователя
- `user_course_enrollments` - запись о начале курса
- `lessons` - получение приветственного контента
- `users` - инициализация баллов/жизней (поля total_points: 0, lives_remaining: 3)

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  background: '#FFFFFF'
  layout: 'column, center, gap: 24'

components:
  welcomeCard:
    background: 'gradient-glass'
    backdropFilter: 'blur(20px)'
    borderRadius: 32
    padding: 24
  
  progressSteps:
    height: 4
    background: '#F3F3F3'
    activeColor: '#B862EA'
  
  telegramButton:
    background: 'gradient-secondary'
    borderRadius: 16
    height: 48
```

**🔗 Навигация:**
- "Далее" → `/` (главная)
- "Закрыть" → закрытие Telegram Mini App

---

## 🏠 2. БЛОК "ГЛАВНАЯ" (Figma ID: 682-4667)

### 2.1 Главная страница
**Роут:** `/`  
**Компонент:** `MainScreen/IndexPage.tsx`  
**Figma ID:** 682-4667

**🔽 Вводимые данные:**
- ID пользователя (Telegram)
- Текущая сессия

**🔼 Выводимые данные:**
- TopBar с аватаром (32px, белая обводка) и счетчиком баллов
- Приветствие "Привет, {имя пользователя}"
- Карточки ступеней в grid layout (2 колонки, gap: 12px)
- Прогресс-блок: "Выполнено X заданий"
- Progress indicators (линейные, высота 4px)
- TabBar навигация (компонент 4-388)

**📊 Таблицы Supabase:**
```sql
-- Основной запрос для главной:
SELECT 
  u.first_name, u.last_name, u.photo_url,
  u.total_points, u.lives_remaining,
  cs.name, cs.order_num, cs.is_unlocked,
  COUNT(l.id) as total_lessons,
  COUNT(CASE WHEN lp.is_completed THEN 1 END) as completed_lessons
FROM users u
JOIN user_course_enrollments uce ON u.id = uce.user_id
JOIN course_stages cs ON uce.course_id = cs.course_id
LEFT JOIN lessons l ON cs.id = l.stage_id
LEFT JOIN lesson_progress lp ON u.id = lp.user_id AND l.id = lp.lesson_id
WHERE u.id = $1
GROUP BY u.id, cs.id
ORDER BY cs.order_num;
```

**Таблицы:**
- `users` - имя, аватар, баллы, жизни пользователя
- `course_stages` - информация о ступенях (поле `is_unlocked`)
- `lesson_progress` - прогресс по урокам
- `lessons` - общее количество уроков

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  background: 'gradient-primary'
  layout: 'column, center, gap: 16'

components:
  topBar:
    avatar: 
      size: 32
      border: '#FFFFFF 1.5px'
    pointsCounter:
      background: 'gradient-secondary'
      borderRadius: 20
  
  stageCards:
    variant: 'gradient-primary'
    borderRadius: 24
    shadow: '0px 4px 20px rgba(0,0,0,0.08)'
    layout: grid
    columns: 2
    gap: 12

  tabBar:
    height: 60
    background: '#FFFFFF'
    activeTab: 'gradient-primary'
```

**🔗 Навигация:**
- Карточка ступени → `/library/stage/{stage_id}` (если разблокирована)
- Tab "Библиотека" → `/library`
- Tab "Чаты" → `/profile/chats`
- Tab "Профиль" → `/profile`

---

## 📚 3. БЛОК "БИБЛИОТЕКА" (Figma ID: 682-4668)

### 3.1 Основной экран библиотеки
**Роут:** `/library`  
**Компонент:** `LibraryPage/LibraryPage.tsx`  
**Figma ID:** 682-4668

**🔽 Вводимые данные:**
- ID пользователя
- Текущий прогресс

**🔼 Выводимые данные:**
- Заголовок "Библиотека"
- SearchBar (background: rgba(225,225,225,0.6), blur: 32px)
- Карточки ступеней в двухколоночной сетке
- Progress indicators для каждой ступени
- Статус каждой ступени (доступна/заблокирована)
- TabBar навигация

**📊 Таблицы Supabase:**
```sql
-- Используем функцию get_library_stages:
SELECT * FROM get_library_stages($user_id, $course_id);
```

**Таблицы:**
- `course_stages` - список ступеней с полем `is_unlocked`
- `lesson_progress` - прогресс пользователя по урокам
- `lessons` - для подсчета общего количества уроков

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  background: '#FFFFFF'
  layout: 'column, gap: 16'

components:
  searchBar:
    background: 'rgba(225,225,225,0.6)'
    backdropFilter: 'blur(32px)'
    borderRadius: 16
    height: 44
  
  stageCards:
    layout: grid
    columns: 2
    gap: 12
    cardStyle:
      borderRadius: 24
      shadow: '0px 2px 12px rgba(0,0,0,0.06)'
      background: '#FFFFFF'
  
  progressIndicators:
    type: linear
    height: 4
    background: '#EAEAEA'
    fillColor: '#B862EA'
```

**🔗 Навигация:**
- Карточка ступени → `/library/stage/{stage_id}` (если разблокирована)
- Tab "Главная" → `/`
- Tab "Профиль" → `/profile`

---

### 3.2 Детальный экран ступени
**Роут:** `/library/stage/:id`  
**Компонент:** `LibraryPage/StagePage.tsx`  
**Figma ID:** 682-4670

**🔽 Вводимые данные:**
- ID ступени из URL
- ID пользователя

**🔼 Выводимые данные:**
- Hero section (высота 200px, background: gradient-primary)
- Список уроков с индикаторами выполнения
- Completion badges (размер 24px, активный цвет #4EB3FF)
- Navigation controls

**📊 Таблицы Supabase:**
```sql
-- Получение уроков ступени:
SELECT 
  l.id, l.name, l.description, l.order_num, l.has_assignment,
  lp.is_completed,
  lp.completed_at
FROM lessons l
LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = $1
WHERE l.stage_id = $2
ORDER BY l.order_num;
```

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  layout: 'column, gap: 20'

components:
  heroSection:
    height: 200
    background: 'gradient-primary'
    borderRadius: '0 0 24 24'
  
  lessonList:
    gap: 12
    itemHeight: 72
    itemStyle:
      background: '#FFFFFF'
      borderRadius: 16
      border: '1px solid rgba(255,255,255,0.14)'
  
  completionBadge:
    size: 24
    activeColor: '#4EB3FF'
    inactiveColor: '#D9D9D9'
```

**🔗 Навигация:**
- Урок → `/library/lesson/{lesson_id}`
- "Назад" → `/library`

---

### 3.3 Экран урока
**Роут:** `/library/lesson/:id`  
**Компонент:** `LibraryPage/LessonPage.tsx`  
**Figma ID:** 682-4671

**🔽 Вводимые данные:**
- ID урока из URL
- ID пользователя
- Время просмотра/прослушивания

**🔼 Выводимые данные:**
- AudioPlayer (высота 80px, glass-эффект)
- PlayButton (размер 48px, gradient-primary, круглый)
- Waveform visualization (40px высота, 12 баров)
- Navigation controls (зафиксированы внизу)
- Текстовый контент урока
- Кнопка "Завершить урок"
- Кнопка сдачи задания (если `has_assignment = true`)

**📊 Таблицы Supabase:**
```sql
-- Получение блоков урока:
SELECT * FROM get_lesson_blocks($lesson_id);

-- Обновление прогресса:
SELECT mark_lesson_completed($lesson_id, $user_id);
```

**Таблицы:**
- `lessons` - основная информация урока
- `lesson_blocks` - блоки контента урока
- `lesson_progress` - отслеживание прогресса
- `submissions` - задания для сдачи

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  layout: 'column, space-between'

components:
  audioPlayer:
    height: 80
    background: '#FFFFFF'
    border: '1px solid rgba(89,89,89,0.14)'
    borderRadius: 32
    backdropFilter: 'blur(8px)'
  
  playButton:
    size: 48
    background: 'gradient-primary'
    borderRadius: '50%'
  
  waveform:
    height: 40
    bars: 12
    activeColor: '#B862EA'
    inactiveColor: '#E7DBEF'
  
  navigationControls:
    position: fixed
    bottom: 80
    background: '#FFFFFF'
    borderRadius: '24 24 0 0'
```

**🔗 Навигация:**
- "Сдать задание" → форма сдачи или `/submissions`
- "Назад" → `/library/stage/{stage_id}`

---

## 📝 4. БЛОК "ПРОВЕРКА ЗАДАНИЙ" (Figma ID: 682-4672)

### 4.1 Интерфейс проверки заданий
**Роут:** `/submissions` или `/admin/submissions`  
**Компонент:** `AdminPage/SubmissionsManager.tsx`  
**Figma ID:** 682-4672

**🔽 Вводимые данные:**
- Сдачи заданий от пользователей
- ID куратора/админа

**🔼 Выводимые данные:**
- Split-screen layout (60%/40%)
- Submission card слева
- Review form справа
- Status badges с цветовой кодировкой
- Action buttons для быстрых действий

**📊 Таблицы Supabase:**
```sql
-- Получение сдач для проверки:
SELECT s.*, u.first_name, u.last_name, u.photo_url,
       l.name as lesson_name, cs.name as stage_name
FROM submissions s
JOIN users u ON s.user_id = u.id
JOIN lessons l ON s.lesson_id = l.id
JOIN course_stages cs ON l.stage_id = cs.id
WHERE s.status IN ('submitted', 'pending_review')
ORDER BY s.submitted_at DESC;
```

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  layout: 'row, gap: 24'

components:
  submissionCard:
    width: '60%'
    background: '#FFFFFF'
    borderRadius: 16
    padding: 20
  
  reviewForm:
    width: '40%'
    background: '#EAF5FE'
    borderRadius: 16
    padding: 20
  
  statusBadges:
    submitted: '#FFE4A3'
    approved: '#4EB3FF'
    rejected: '#FF6B6B'
    borderRadius: 8
    padding: '4 8'
  
  actionButtons:
    gap: 12
    approve:
      background: 'gradient-secondary'
    reject:
      background: 'gradient-neutral'
```

**🔗 Навигация:**
- Доступно для кураторов и админов
- Интегрировано в админ-панель

---

## 👤 5. БЛОК "ПРОФИЛЬ" (Figma ID: 682-4673)

### 5.1 Основной экран профиля
**Роут:** `/profile`  
**Компонент:** `ProfilePage/ProfilePage.tsx`  
**Figma ID:** 682-4673

**🔽 Вводимые данные:**
- ID пользователя
- Данные сессии

**🔼 Выводимые данные:**
- User avatar (размер 80px, обводка #FFFFFF 2px)
- Stats cards в grid layout (2 колонки)
- Menu items (высота 56px каждый)
- Модульная компоновка элементов

**📊 Таблицы Supabase:**
- `users` - данные пользователя (имя, аватар, баллы, жизни)

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  layout: 'column, gap: 24'

components:
  userAvatar:
    size: 80
    border: '#FFFFFF 2px'
    shadow: '0px 4px 16px rgba(0,0,0,0.08)'
  
  statsCards:
    layout: grid
    columns: 2
    gap: 12
    cardStyle:
      background: 'gradient-glass'
      borderRadius: 16
      padding: 16
  
  menuItems:
    gap: 8
    itemHeight: 56
    itemStyle:
      background: '#FFFFFF'
      borderRadius: 12
      border: '1px solid #F1F1F1'
```

**🔗 Навигация:**
- "Чаты" → `/profile/chats`
- "Помощь" → `/profile/help`
- "FAQ" → `/profile/faq`

---

### 5.2 Экран "Чаты"
**Роут:** `/profile/chats`  
**Компонент:** `ProfilePage/ChatsPage.tsx`  
**Figma ID:** 682-4674

**🔽 Вводимые данные:**
- Список доступных чатов
- История сообщений

**🔼 Выводимые данные:**
- Chat list (gap: 1px между элементами)
- Message bubbles с максимальной шириной 70%
- Chat input с glass-эффектом

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  layout: column

components:
  chatList:
    gap: 1
    itemHeight: 72
    itemStyle:
      background: '#FFFFFF'
      borderBottom: '1px solid #F1F1F1'
  
  messageBubble:
    maxWidth: '70%'
    borderRadius: 16
    padding: 12
    sent:
      background: 'gradient-primary'
      color: '#FFFFFF'
    received:
      background: '#F3F3F3'
      color: '#000000'
  
  chatInput:
    height: 44
    background: 'rgba(225,225,225,0.6)'
    borderRadius: 22
    backdropFilter: 'blur(32px)'
```

---

## 🛠️ 6. БЛОК "АДМИН ПАНЕЛЬ" (Figma ID: 682-4675)

### 6.1 Административная панель
**Роут:** `/admin`  
**Компонент:** `AdminPage/AdminPage.tsx`  
**Figma ID:** 682-4675

**🔽 Вводимые данные:**
- Данные кураторов и админов
- Статистика приложения

**🔼 Выводимые данные:**
- Tab navigation (высота 48px)
- Data tables с заголовками
- Action buttons (32x32px)
- Modal dialogs для редактирования

**🎨 Дизайн-спецификация:**
```yaml
frameData:
  layout: column

components:
  tabNavigation:
    height: 48
    background: '#FFFFFF'
    activeTab:
      background: 'gradient-primary'
      borderRadius: 8
  
  dataTable:
    background: '#FFFFFF'
    border: '1px solid #E5E5E5'
    borderRadius: 8
    headerStyle:
      background: '#F8F9FA'
      height: 44
    rowStyle:
      height: 56
      borderBottom: '1px solid #F1F1F1'
  
  actionButtons:
    gap: 8
    edit:
      background: '#4EB3FF'
      color: '#FFFFFF'
    delete:
      background: '#FF6B6B'
      color: '#FFFFFF'
    size: '32x32'
    borderRadius: 6
  
  modalDialog:
    maxWidth: 500
    background: '#FFFFFF'
    borderRadius: 16
    shadow: '0px 8px 32px rgba(0,0,0,0.12)'
```

**🔗 Навигация:**
- Управление курсами, уроками, блоками
- Проверка домашних заданий
- Система ролей и прав доступа

---

## 🔄 Общие компоненты и состояния

### Navigation Bar (глобальный)
**Компонент:** `components/Navigation/NavigationBar.tsx`  
**Figma ID:** 4-29

**Компоненты:**
- Back button (4-19) - иконка Arrow/Chevron_Left_MD
- Close button (4-22) - иконка Menu/Close_SM  
- Action buttons (chevron down, more vertical)
- Status bar с временем и батареей

**Дизайн-спецификация:**
```yaml
component: NavigationBar
height: 44
background: transparent
paddingHorizontal: 16
paddingTop: 12

backButton:
  icon: 'Arrow/Chevron_Left_MD'
  size: 24
  color: '#000000'
  touchTarget: 44

closeButton:
  icon: 'Menu/Close_SM'
  size: 24
  color: '#000000'
  touchTarget: 44
```

### Tab Bar (глобальный)
**Компонент:** `components/TabBar/TabBar.tsx`  
**Figma ID:** 4-388

**Навигация:**
- Главная (Navigation/House_01) → `/`
- Библиотека (Library/Book_Open) → `/library` 
- Чаты (Communication/Chat) → `/profile/chats`
- Профиль (User/User_02) → `/profile`

**Дизайн-спецификация:**
```yaml
component: TabBar
height: 60
background: '#FFFFFF'
borderTop: '1px solid #F1F1F1'
position: fixed
bottom: 0

tabItems:
  home:
    icon: 'Navigation/House_01'
    iconSize: 24
    activeState:
      background: 'gradient-primary'
      borderRadius: 100
      iconColor: '#FFFFFF'
    inactiveState:
      iconColor: '#8D8D8D'
      opacity: 0.6

  library:
    icon: 'Library/Book_Open'
    iconSize: 24
    
  messages:
    icon: 'Communication/Chat'
    iconSize: 24
    badge:
      size: 16
      background: '#FF6B6B'
      color: '#FFFFFF'
    
  profile:
    icon: 'User/User_02'
    iconSize: 24

homeIndicator:
  component: 4-72
  width: 134
  height: 5
  background: '#000000'
  borderRadius: 2.5
  opacity: 0.3
  position: bottom-center
```

**Данные:**
- Активная вкладка
- Badge для сообщений (опционально)
- Состояния hover/active для компонентов

### Home Indicator (iOS)
**Компонент:** Home indicator  
**Figma ID:** 4-72

Системный индикатор iOS для Telegram Mini App:
- Ширина: 134px
- Высота: 5px  
- Цвет: #000000 с opacity 0.3
- Позиция: центр низа экрана

## 🎨 Дизайн-система компонентов

### Карточки (Cards)
**Базовые варианты:**
- Default Card - белый фон, тонкая обводка
- Gradient Card - градиентные фоны (primary/secondary)
- Glass Card - стеклянный эффект с blur

**Технические спецификации:**
```yaml
cardVariants:
  default:
    background: '#FFFFFF'
    border: '1px solid rgba(255,255,255,0.14)'
    borderRadius: 24
    shadow: '0px 2px 12px rgba(0,0,0,0.06)'
    
  gradientPrimary:
    background: 'linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%)'
    borderRadius: 24
    shadow: '0px 4px 20px rgba(0,0,0,0.08)'
    color: '#FFFFFF'
    
  glass:
    background: 'rgba(255,255,255,0.25)'
    backdropFilter: 'blur(20px)'
    border: '1px solid rgba(255,255,255,0.3)'
    borderRadius: 24
```

### Кнопки (Buttons)
**Система кнопок (ComponentSet 4-168):**
- Primary - gradient-primary фон
- Secondary - gradient-secondary фон  
- Outline - прозрачный с border
- Ghost - glass-эффект

**Состояния:**
- Default, Hover, Active, Disabled
- Icons left/right, с аватаром или без

### Иконки (Icons)
**Используемые семейства иконок:**
- Navigation (House_01, Chevron_Left_MD, Chevron_Down)
- Menu (Close_SM, More_Vertical)
- Communication (Chat)
- Library (Book_Open)
- User (User_02)
- Arrow (Chevron_Right)

Все иконки имеют размер 24px и цвет #000000 по умолчанию.

## 📊 Система уведомлений

### Реализация
- Supabase Realtime для real-time обновлений
- Badge компоненты для счетчиков
- Push уведомления через Telegram Bot API

### События уведомлений
- Разблокировка нового контента
- Проверка домашних заданий (approved/rejected)
- Начисление/списание баллов
- Системные сообщения от кураторов

### Badge система
```yaml
badgeComponent:
  size: 16
  background: '#FF6B6B'
  color: '#FFFFFF'
  borderRadius: 8
  fontSize: 12
  fontWeight: 600
  position: absolute
  top: -4
  right: -4
```

## 🗄️ Обновленная сводка по таблицам Supabase

### ✅ Основные таблицы (подтверждено в схеме):
1. **Пользователи:** `users` - с полями role, total_points, lives_remaining
2. **Курсы:** `courses`, `course_stages` (с полем is_unlocked), `lessons`, `assignments` 
3. **Контент:** `lesson_blocks` - блоки контента уроков
4. **Прогресс:** `lesson_progress` - упрощенная система прогресса  
5. **Сдачи:** `submissions` - сдачи заданий для проверки

### 🔄 Упрощения архитектуры (относительно PRD):
- `user_course_enrollments` → интегрировано в `users.course_id` 
- `user_stage_progress` → убрано, используется только `lesson_progress`
- `user_lesson_progress` → переименовано в `lesson_progress`
- `user_gamification` → интегрировано в `users` (поля total_points, lives_remaining)

### ❌ Таблицы из PRD, которых НЕТ в финальной схеме:
- Система материалов (`library_materials`) - не реализована
- Система ролей (`roles`, `user_roles`) - упрощена до поля `users.role`
- FAQ система (`faq_items`) - статический контент  
- Уведомления (`notification_templates`, `user_notifications_log`) - через Telegram
- Чаты (`telegram_chats`, `tariff_chat_access`) - статические ссылки

### 📝 Рекомендации по архитектуре:
1. **Упрощенная схема БД** соответствует MVP подходу
2. **Статический контент** (FAQ, чаты) хранится в коде для простоты
3. **Прогресс-система** упрощена до lesson-уровня (без детального stage progress)
4. **Роли пользователей** реализованы через enum в users.role

---

## 📱 Техническая реализация

### Размеры и адаптивность
- **Базовый размер:** 375x812px (iPhone X) - соответствует Figma фреймам
- **Система компонентов:** основана на 12px grid system
- **Отступы:** 16px для контента, 12px для навигации
- **Скругления:** от 12px до 32px в зависимости от компонента

### Градиентная система
```css
/* Основные градиенты из Figma */
--gradient-primary: linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%);
--gradient-secondary: linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%);
--gradient-accent: linear-gradient(135deg, #FFE4A3 0%, #FFD166 100%);
--gradient-neutral: linear-gradient(135deg, #F3F3F3 0%, #EAEAEA 100%);

/* Glass эффекты */
--glass-bg: rgba(255, 255, 255, 0.25);
--glass-blur: blur(20px);
--glass-border: rgba(255, 255, 255, 0.3);
```

### Состояния загрузки
- **Skeleton loaders** для карточек курсов
- **Loading states** для каждого экрана  
- **Error boundaries** для обработки ошибок Supabase
- **Optimistic updates** для улучшения UX

### Performance оптимизации
- **React Query** для кеширования запросов к Supabase
- **Image optimization** для аватаров и превью
- **Lazy loading** для тяжелых компонентов
- **Code splitting** по роутам

### Telegram Mini App интеграция
- **WebApp SDK** для получения пользовательских данных
- **Theme parameters** для адаптации под Telegram темы
- **Haptic feedback** для кнопок и действий
- **Main button** интеграция для ключевых действий

### Accessibility 
- **Keyboard navigation** для всех интерактивных элементов
- **Screen reader support** с правильными ARIA атрибутами  
- **High contrast mode** поддержка
- **Touch targets** минимум 44px для мобильных устройств

---

**Документ обновлен:** 29.01.2025  
**Статус:** Актуально для новой карты экранов Figma (Node: 682-4626)
