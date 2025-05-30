# Метаданные экранов из Figma
*Обновлено: 29.05.2025 - новая карта экранов*

## Основная структура экранов (Node: 682-4626)

### Техническая метадата корневого узла:
```yaml
metadata:
  name: Карта экранов Brain Programming
  lastModified: '2025-01-29T12:00:00Z'
  nodeId: 682-4626
  type: SECTION

globalStyles:
  background: '#FFFFFF'
  dimensions:
    width: 375
    height: 812
  layout: column
```

### 🏠 Главные экраны (Core Screens)

#### 1. Главный экран / Landing
- **Figma ID**: 682-4667
- **Описание**: Стартовая страница с основной навигацией
- **Компоненты**: NavButton, Card градиенты, основные CTA элементы
- **Стиль**: Основной фиолетовый градиент фона

**Техническая метадата:**
```yaml
frameData:
  id: 682-4667
  name: Main Screen
  type: FRAME
  fills:
    - type: gradient
      colors: ['#E1C1F4', '#B862EA']
      angle: 135
  layout:
    mode: column
    alignItems: center
    gap: 16
  dimensions:
    width: 375
    height: 812

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

#### 2. Экран входа / Onboarding  
- **Figma ID**: 682-4669
- **Описание**: Авторизация через Telegram и онбординг
- **Компоненты**: TelegramLoginButton, Progress steps, Card containers
- **Стиль**: Центрированная компоновка, мягкие градиенты

**Техническая метадата:**
```yaml
frameData:
  id: 682-4669
  name: Onboarding
  type: FRAME
  fills:
    - type: solid
      color: '#FFFFFF'
  layout:
    mode: column
    alignItems: center
    justifyContent: center
    gap: 24

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

#### 3. Библиотека курсов / Library
- **Figma ID**: 682-4668  
- **Описание**: Каталог курсов с фильтрами и поиском
- **Компоненты**: SearchBar, FilterChips, CourseCard, CategoryTabs
- **Стиль**: Grid layout, карточная система

**Техническая метадата:**
```yaml
frameData:
  id: 682-4668
  name: Library
  type: FRAME
  fills:
    - type: solid
      color: '#FFFFFF'
  layout:
    mode: column
    gap: 16

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

### 📚 Контентные экраны (Content Screens)

#### 4. Детальный просмотр курса
- **Figma ID**: 682-4670
- **Описание**: Подробная информация о курсе и ступенях
- **Компоненты**: Hero section, StageCard, ProgressIndicator
- **Стиль**: Вертикальная прокрутка, иерархия контента

**Техническая метадата:**
```yaml
frameData:
  id: 682-4670
  name: Course Detail
  type: FRAME
  layout:
    mode: column
    gap: 20

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

#### 5. Урок / Lesson View
- **Figma ID**: 682-4671  
- **Описание**: Интерфейс прохождения урока
- **Компоненты**: AudioPlayer, TextContent, SubmissionForm, NavigationControls
- **Стиль**: Full-screen layout, bottom navigation

**Техническая метадата:**
```yaml
frameData:
  id: 682-4671
  name: Lesson View
  type: FRAME
  layout:
    mode: column
    justifyContent: space-between

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

#### 6. Проверка заданий / Review Interface
- **Figma ID**: 682-4672
- **Описание**: Интерфейс для проверки домашних заданий
- **Компоненты**: SubmissionCard, ReviewForm, StatusBadge, ActionButtons
- **Стиль**: Split-screen layout, форма справа

**Техническая метадата:**
```yaml
frameData:
  id: 682-4672
  name: Review Interface
  type: FRAME
  layout:
    mode: row
    gap: 24

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

### 👤 Пользовательские экраны (User Screens)

#### 7. Профиль пользователя
- **Figma ID**: 682-4673
- **Описание**: Личный кабинет с прогрессом и настройками
- **Компоненты**: UserAvatar, ProgressChart, SettingsList, StatsCards
- **Стиль**: Модульная компоновка, статистические элементы

**Техническая метадата:**
```yaml
frameData:
  id: 682-4673
  name: Profile
  type: FRAME
  layout:
    mode: column
    gap: 24

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

#### 8. Чаты / Messages
- **Figma ID**: 682-4674
- **Описание**: Система сообщений и уведомлений
- **Компоненты**: MessageBubble, ChatInput, ContactList
- **Стиль**: Messenger-подобный интерфейс

**Техническая метадата:**
```yaml
frameData:
  id: 682-4674
  name: Messages
  type: FRAME
  layout:
    mode: column

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

### 🛠️ Административные экраны (Admin Screens)

#### 9. Админ панель
- **Figma ID**: 682-4675
- **Описание**: Управление курсами, пользователями и контентом
- **Компоненты**: DataTable, TabNavigation, ActionToolbar, ModalDialogs
- **Стиль**: Dashboard layout, таблично-ориентированный

**Техническая метадата:**
```yaml
frameData:
  id: 682-4675
  name: Admin Panel
  type: FRAME
  layout:
    mode: column

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

## Система навигации

### Нижняя навигация (Bottom TabBar)
- **Главная** - Home icon
- **Библиотека** - Library icon  
- **Чаты** - Messages icon
- **Профиль** - User icon

**Техническая метадата:**
```yaml
component: TabBar
id: 4-388
metadata:
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

### Верхняя навигация (Top Navigation)
- **Back button** - для внутренних экранов
- **Action buttons** - контекстные действия
- **Status indicators** - индикаторы статуса

**Техническая метадата:**
```yaml
component: NavigationBar
id: 4-29
metadata:
  height: 44
  background: transparent
  paddingHorizontal: 16
  paddingTop: 12

backButton:
  component: 4-19
  icon: 'Arrow/Chevron_Left_MD'
  size: 24
  color: '#000000'
  touchTarget: 44

closeButton:
  component: 4-22
  icon: 'Menu/Close_SM'
  size: 24
  color: '#000000'
  touchTarget: 44

actionButtons:
  moreVertical:
    component: 4-27
    icon: 'Menu/More_Vertical'
    size: 24
  
  chevronDown:
    component: 4-25
    icon: 'Arrow/Chevron_Down'
    size: 24

statusBar:
  height: 44
  background: transparent
  textColor: '#000000'
  batteryIndicator: true
  timeDisplay: true
```

## Ключевые компоненты дизайна

### Карточки (Cards)
```typescript
interface CardProps {
  variant: 'default' | 'gradient' | 'glass' | 'compact'
  elevation: 'none' | 'low' | 'medium' | 'high'
  borderRadius: 12 | 16 | 20 | 24 | 32
}
```

**Техническая метадата карточек:**
```yaml
components:
  defaultCard:
    background: '#FFFFFF'
    border: '1px solid rgba(255,255,255,0.14)'
    borderRadius: 24
    shadow: '0px 2px 12px rgba(0,0,0,0.06)'
    padding: 16
    
  gradientCard:
    background: 'linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%)'
    borderRadius: 24
    shadow: '0px 4px 20px rgba(0,0,0,0.08)'
    color: '#FFFFFF'
    
  glassCard:
    background: 'rgba(255,255,255,0.25)'
    backdropFilter: 'blur(20px)'
    border: '1px solid rgba(255,255,255,0.3)'
    borderRadius: 24
    shadow: '0px 4px 20px rgba(0,0,0,0.08)'
    
  compactCard:
    background: '#FFFFFF'
    borderRadius: 16
    shadow: '0px 2px 8px rgba(0,0,0,0.04)'
    padding: 12

elevationLevels:
  none: 'none'
  low: '0px 2px 8px rgba(0,0,0,0.04)'
  medium: '0px 4px 16px rgba(0,0,0,0.08)'
  high: '0px 8px 32px rgba(0,0,0,0.12)'
```

### Кнопки (Buttons)  
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
  size: 'sm' | 'md' | 'lg' | 'xl'
  gradientType: 'primary' | 'secondary' | 'accent'
}
```

**Техническая метадата кнопок:**
```yaml
components:
  primaryButton:
    componentSet: 4-168
    background: 'linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%)'
    borderRadius: 32
    color: '#FFFFFF'
    fontFamily: 'Nunito'
    fontWeight: 700
    fontSize: 16
    lineHeight: 1.25
    padding: '16px'
    shadow: '0px 2px 8px rgba(0,0,0,0.1)'
    
  secondaryButton:
    background: 'linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%)'
    borderRadius: 32
    color: '#FFFFFF'
    fontFamily: 'Nunito'
    fontWeight: 700
    fontSize: 16
    
  outlineButton:
    background: 'transparent'
    border: '1.5px solid #B862EA'
    borderRadius: 32
    color: '#B862EA'
    
  ghostButton:
    background: 'rgba(255,255,255,0.25)'
    backdropFilter: 'blur(12px)'
    border: '1px solid rgba(255,255,255,0.3)'
    borderRadius: 32
    
  disabledButton:
    background: 'linear-gradient(135deg, #D0DFEA 0%, #BDD8EE 100%)'
    opacity: 0.4
    borderRadius: 32

buttonSizes:
  sm:
    padding: '8px 16px'
    fontSize: 14
    height: 32
  md:
    padding: '12px 24px'
    fontSize: 16
    height: 44
  lg:
    padding: '16px 32px'
    fontSize: 16
    height: 48
  xl:
    padding: '20px 40px'
    fontSize: 18
    height: 56

states:
  hover:
    transform: 'translateY(-2px)'
    shadow: '0px 4px 16px rgba(0,0,0,0.15)'
  active:
    transform: 'translateY(0)'
    scale: 0.98
  focus:
    outline: '2px solid #B862EA'
    outlineOffset: 2
```

### Цветовая система
- **Primary Gradient**: #E1C1F4 → #B862EA
- **Secondary Gradient**: #8DC5F1 → #63ABE6
- **Accent Gradient**: #FFE4A3 → #FFD166
- **Neutral Gradient**: #F3F3F3 → #EAEAEA

**Расширенная цветовая палитра:**
```yaml
colorSystem:
  primary:
    gradient: 'linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%)'
    light: '#E1C1F4'
    main: '#B862EA'
    dark: '#A04FD9'
    
  secondary:
    gradient: 'linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%)'
    light: '#8DC5F1'
    main: '#63ABE6'
    dark: '#4A9EE0'
    
  accent:
    gradient: 'linear-gradient(135deg, #FFE4A3 0%, #FFD166 100%)'
    light: '#FFE4A3'
    main: '#FFD166'
    dark: '#FFC633'
    
  neutral:
    gradient: 'linear-gradient(135deg, #F3F3F3 0%, #EAEAEA 100%)'
    light: '#F3F3F3'
    main: '#EAEAEA'
    dark: '#D9D9D9'
    
  semantic:
    success: '#4EB3FF'
    warning: '#FFD166'
    error: '#FF6B6B'
    info: '#63ABE6'
    
  text:
    primary: '#000000'
    secondary: '#9F9F9F'
    tertiary: '#8C8C8C'
    disabled: '#D9D9D9'
    
  background:
    primary: '#FFFFFF'
    secondary: '#F1F1F1'
    tertiary: '#EAF5FE'
    overlay: 'rgba(0,0,0,0.5)'
    
  borders:
    light: 'rgba(255,255,255,0.14)'
    medium: 'rgba(89,89,89,0.14)'
    strong: '#F1F1F1'
```

### Типографика
- **Заголовки**: SF Pro Display Bold/SemiBold
- **Основной текст**: SF Pro Text Regular/Medium  
- **Accent текст**: SF Pro Text Medium (цветной)

**Техническая спецификация типографики:**
```yaml
typography:
  fontFamilies:
    primary: 'Nunito, -apple-system, BlinkMacSystemFont, sans-serif'
    secondary: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif'
    
  fontSizes:
    xs: 12
    sm: 14
    base: 16
    lg: 18
    xl: 20
    '2xl': 24
    '3xl': 30
    
  fontWeights:
    light: 300
    regular: 400
    medium: 500
    semibold: 600
    bold: 700
    extrabold: 800
    
  lineHeights:
    tight: 1.25
    normal: 1.36
    relaxed: 1.43
    loose: 1.5
    
  textStyles:
    h1:
      fontFamily: 'Inter'
      fontSize: 24
      fontWeight: 700
      lineHeight: 1
      color: '#000000'
      
    h2:
      fontFamily: 'Nunito'
      fontSize: 20
      fontWeight: 700
      lineHeight: 1.36
      color: '#000000'
      
    h3:
      fontFamily: 'Montserrat'
      fontSize: 16
      fontWeight: 600
      lineHeight: 1.25
      color: '#000000'
      
    body:
      fontFamily: 'Inter'
      fontSize: 16
      fontWeight: 400
      lineHeight: 1.5
      letterSpacing: '-3%'
      color: '#000000'
      
    bodySmall:
      fontFamily: 'Inter'
      fontSize: 14
      fontWeight: 400
      lineHeight: 1.2857142857142858
      color: '#000000'
      
    caption:
      fontFamily: 'Montserrat'
      fontSize: 16
      fontWeight: 500
      lineHeight: 1.25
      color: '#000000'
```

### Эффекты
- **Glass Effect**: backdrop-filter: blur(20px)
- **Shadow System**: 0px 4px 20px rgba(0,0,0,0.08)
- **Border Radius**: 12px-32px range
- **Transitions**: 200ms ease-in-out

**Техническая спецификация эффектов:**
```yaml
effects:
  glassMorphism:
    primary:
      background: 'rgba(255,255,255,0.25)'
      backdropFilter: 'blur(20px)'
      border: '1px solid rgba(255,255,255,0.3)'
    
    secondary:
      background: 'rgba(225,225,225,0.6)'
      backdropFilter: 'blur(32px)'
      border: '1px solid #F1F1F1'
      
  shadows:
    card: '0px 2px 12px rgba(0,0,0,0.06)'
    button: '0px 2px 8px rgba(0,0,0,0.1)'
    glass: '0px 4px 20px rgba(0,0,0,0.08)'
    floating: '0px 8px 32px rgba(0,0,0,0.12)'
    
  borderRadius:
    xs: 12
    sm: 16
    md: 20
    lg: 24
    xl: 32
    full: 100
    
  transitions:
    fast: '200ms ease-in-out'
    medium: '300ms ease-in-out'
    slow: '500ms ease-in-out'
    
  animations:
    fadeIn:
      from: 'opacity: 0'
      to: 'opacity: 1'
      duration: '300ms'
      easing: 'ease-in-out'
      
    slideUp:
      from: 'transform: translateY(20px); opacity: 0'
      to: 'transform: translateY(0); opacity: 1'
      duration: '300ms'
      easing: 'ease-out'
      
    scaleIn:
      from: 'transform: scale(0.95); opacity: 0'
      to: 'transform: scale(1); opacity: 1'
      duration: '200ms'
      easing: 'ease-out'
```

## Адаптивность

### Breakpoints
- **Mobile**: 375px - 768px (основной фокус)
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+ (опционально)

### Mobile-first подход
- Все компоненты проектируются сначала для мобильных
- Telegram Mini App constraints учтены
- Touch-friendly интерфейсы (44px минимум для кнопок)

## Состояния компонентов

### Интерактивные состояния
- **Default** - базовое состояние
- **Hover** - при наведении (desktop)
- **Active** - при нажатии
- **Disabled** - неактивное состояние
- **Loading** - состояние загрузки

### Статусы данных
- **Empty** - пустое состояние
- **Loading** - загрузка данных
- **Error** - ошибка загрузки
- **Success** - успешная операция

## Анимации и переходы

### Принципы анимации
- **Duration**: 200-300ms для быстрых переходов
- **Easing**: ease-in-out для натуральности
- **Transform-based**: для лучшей производительности

### Типы анимаций
- **Page transitions** - slide, fade
- **Component entrance** - fade-up, scale
- **Loading states** - skeleton, spinner
- **Micro-interactions** - button press, toggle

## Руководство по обновлению

При изменениях в Figma:
1. Обновить Node ID в документации
2. Проверить новые компоненты и стили  
3. Синхронизировать цветовую палитру
4. Обновить типографику если изменилась
5. Добавить новые экраны в карту навигации

### Основной экран библиотеки:
- Navigation Bar
- Заголовок "Библиотека"
- Карточки ступеней с прогрессом
- Tab bar

### Экран ступени:
- Список уроков с индикаторами выполнения
- Прогресс по ступени

### Экран урока:
- Видео/аудио контент
- Элементы управления воспроизведением

### Экран квиза:
- Вопросы с вариантами ответов
- Кнопки навигации

---

## 4. Блок "Профиль" (36-790)

### Техническая метадата:
```yaml
metadata:
  name: app / Brain Programming
  lastModified: '2025-05-20T14:20:31Z'
  thumbnailUrl: https://s3-alpha.figma.com/thumbnails/b5da3d5b-c521-4301-a7f6-74e7046e5668?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQ4GOSFWCRNQJ6QVT%2F20250522%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250522T000000Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=18bb5393933d843c29e2c7e1216972ca8a5be3b124b8635bb05ac6bfb6d68d54
  nodeId: 36-790
  type: SECTION

components:
  '4:29':
    id: '4:29'
    key: 947334db014e223102eb0639adb7785a069dfea7
    name: Navigation Bar
  '4:22':
    id: '4:22'
    key: 3dc957216d72ebd5eaa6946aec7a4b35c63b8918
    name: State=Close
    componentSetId: '4:18'
  '4:16':
    id: '4:16'
    key: 59b7e9398ae1eda7a1f6eb9c5602a4865b148277
    name: Menu / Close_SM
  '4:25':
    id: '4:25'
    key: da5aa0e11f5d83b038bdd955afae0a5d2e1b2f6f
    name: Arrow / Chevron_Down
  '4:27':
    id: '4:27'
    key: 12abe01e2175cb0953505a21132e4749a00b9d35
    name: Menu / More_Vertical
  '4:181':
    id: '4:181'
    key: 9aa359e304102aad4cdda22c7287d5d33dc9400b
    name: type=outline, state=default, icons right=on, avatar=on
    componentSetId: '4:168'
  '4:147':
    id: '4:147'
    key: 4b5bc4fa269671658c71607b83ea6413112ce7e3
    name: type=circle
    componentSetId: '4:144'
  '4:160':
    id: '4:160'
    key: 63ab96426cef01b8c950f45a42e02725b4cb4c5d
    name: Arrow / Chevron_Right
  '4:388':
    id: '4:388'
    key: 165e55edc14b7854ecf3f49514f47e11baeb0d1c
    name: Tab bar
  '4:58':
    id: '4:58'
    key: 16875a9be606d9fb570f60c4b6ca3d466ff80c1f
    name: Navigation / House_01
  '4:66':
    id: '4:66'
    key: dd500aeea15b732bf76c479c8c9a8e62cd88ff5d
    name: State=Active
    componentSetId: '4:62'
  '4:72':
    id: '4:72'
    key: a89232709bc3bfe29f37275512ddaa00b60b8245
    name: Home indicator
  '4:150':
    id: '4:150'
    key: 0838d60d59d0c38cd8e8f648852a4384dc70ebf4
    name: User / User_02
  '4:19':
    id: '4:19'
    key: 402b6015db9119edf5d10b499a1e159c9e35753a
    name: State=Back
    componentSetId: '4:18'
  '4:14':
    id: '4:14'
    key: ae1204b880815db6c72736a450d0bdd84b1d5022
    name: Arrow / Chevron_Left_MD

componentSets:
  '4:18':
    id: '4:18'
    key: 070a2878f91b16d7d6e6225e41b51c0344fe71e6
    name: btn
    description: ''
  '4:168':
    id: '4:168'
    key: 52efeb41bb2b740bb220e02bf3539a495b248359
    name: button
    description: ''
  '4:144':
    id: '4:144'
    key: 0443bb2e7754883663b454efebd7798624def27b
    name: img
    description: ''
  '4:62':
    id: '4:62'
    key: f5629fb694e8bc4bad0952b28df3c89fab38035a
    name: Bell
    description: ''

nodes:
  - id: '36:790'
    name: Профиль
    type: SECTION
    fills: fill_5ZCBY3
    strokes: stroke_UAE0N3
    layout: layout_TC1VCD
    children:
      - id: '4:200'
        name: Профиль
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '4:437'
        name: Профиль / Чаты
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '4:878'
        name: Профиль / Помощь
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '36:713'
        name: Профиль / Помощь / FAQ
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO

globalVars:
  styles:
    fill_5ZCBY3:
      - '#313030'
    stroke_UAE0N3:
      colors:
        - rgba(255, 255, 255, 0.1)
      strokeWeight: 1px
    layout_TC1VCD:
      mode: none
      dimensions:
        width: 1981
        height: 4100
    fill_9T5I5R:
      - '#F1F1F1'
    layout_WFXYDO:
      mode: none
      dimensions:
        width: 375
        height: 812
    fill_EJJ204:
      - '#FFFFFF'
    layout_7WVH67:
      mode: column
      alignItems: center
      sizing:
        horizontal: fixed
        vertical: hug
      locationRelativeToParent:
        x: 0
        'y': 0
      dimensions:
        width: 375
    fill_U0H5TP:
      - '#000000'
    layout_ADRZGR:
      mode: none
      sizing:
        horizontal: fixed
        vertical: fixed
      dimensions:
        width: 24
        height: 24
    stroke_QBKZ82:
      colors:
        - '#FFFFFF'
      strokeWeight: 1.5px
    style_HSY83I:
      fontFamily: Montserrat
      fontWeight: 500
      fontSize: 16
      lineHeight: 1.25em
      textAlignHorizontal: LEFT
      textAlignVertical: TOP
    stroke_QEN3XT:
      colors:
        - '#000000'
      strokeWeight: 1.5px
    layout_AY71V7:
      mode: none
      sizing:
        horizontal: hug
        vertical: hug
    layout_B7AG04:
      mode: none
      locationRelativeToParent:
        x: 9
        'y': 5
      dimensions:
        width: 7
        height: 14
    style_BC83B3:
      fontFamily: Inter
      fontWeight: 700
      fontSize: 24
      lineHeight: 1em
      textAlignHorizontal: LEFT
      textAlignVertical: TOP
    fill_X6MPSQ:
      - '#D9D9D9'
    style_SZV00A:
      fontFamily: Montserrat
      fontWeight: 600
      fontSize: 16
      lineHeight: 1.25em
      textAlignHorizontal: LEFT
      textAlignVertical: TOP
    style_MAT4TJ:
      fontFamily: Inter
      fontWeight: 400
      fontSize: 14
      lineHeight: 1.2857142857142858em
      textAlignHorizontal: LEFT
      textAlignVertical: TOP
    style_NAIVYV:
      fontFamily: Inter
      fontWeight: 400
      fontSize: 16
      lineHeight: 1.5em
      letterSpacing: '-3%'
      textAlignHorizontal: LEFT
      textAlignVertical: TOP
