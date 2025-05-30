# Дизайн-принципы приложения Brain Programming
*Обновлено: 29.05.2025 - на основе новых компонентов Figma*

## Основные принципы

### Визуальный язык
- **Современные градиенты** — Основные элементы используют градиентные заливки для создания глубины
- **Стеклянный эффект** — Активное использование backdrop blur для создания современного glass-эффекта
- **Мягкие формы** — Скругленные углы от 12px до 32px для создания дружелюбного интерфейса
- **Компонентная система** — Единая система компонентов с вариантами состояний

### Новая цветовая схема

#### Основные градиенты
- **Основной фиолетовый градиент**: от #E1C1F4 до #B862EA
- **Вторичный голубой градиент**: от #8DC5F1 до #63ABE6  
- **Нейтральный градиент**: от #F3F3F3 до #EAEAEA

#### Цвета интерфейса
- **Основной фон**: #FFFFFF (чистый белый)
- **Основной текст**: #000000 (чёрный)
- **Вторичный текст**: #9F9F9F (серый)
- **Третичный текст**: #8C8C8C (тёмно-серый)
- **Метки и подписи**: #8D8D8D (средний серый)
- **Акцентные элементы**: #4EB3FF (голубой)
- **Фон карточек**: #EAF5FE (светло-голубой)
- **Границы**: rgba(255, 255, 255, 0.14) (полупрозрачный белый)

### Типография (Nunito)
- **Основной шрифт**: Nunito
- **Крупные заголовки**: Nunito Bold (700), 20px, line-height 1.36
- **Заголовки**: Nunito SemiBold (600), 16px, line-height 1.25
- **Основной текст**: Nunito Medium (500), 14px, line-height 1.43
- **Вторичный текст**: Nunito Regular (400), 12-14px, line-height 1.36
- **Кнопки**: Nunito Bold (700), 16px, line-height 1.25

### Компонентная система

#### 1. Кнопки
```css
/* Основная кнопка */
.primary-button {
  background: linear-gradient(135deg, #F3F3F3 0%, #EAEAEA 100%), 
              linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%);
  border-radius: 32px;
  padding: 16px;
  font: 700 16px/1.25 Nunito;
  color: #FFFFFF;
}

/* Отключенная кнопка */
.disabled-button {
  background: linear-gradient(135deg, #D0DFEA 0%, #BDD8EE 100%);
  border-radius: 32px;
  opacity: 0.4;
}
```

#### 2. Карточки контента
```css
/* Базовая карточка */
.content-card {
  background: #FFFFFF;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* Карточка прогресса */
.progress-card {
  background: #FFFFFF;
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 16px;
}
```

#### 3. Табы навигации
```css
/* Активная вкладка */
.tab-active {
  background: linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%);
  border-radius: 100px;
  padding: 6px;
}

/* Неактивная вкладка */
.tab-inactive {
  background: transparent;
  opacity: 0.6;
}
```

#### 4. Аудиоплеер
```css
.audio-player {
  background: #FFFFFF;
  border: 1px solid rgba(89, 89, 89, 0.14);
  border-radius: 32px;
  padding: 16px;
  backdrop-filter: blur(8px);
}

/* Кнопка воспроизведения */
.play-button {
  background: linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%);
  border-radius: 50%;
  width: 48px;
  height: 48px;
}
```

#### 5. Поля ввода
```css
.input-field {
  background: rgba(225, 225, 225, 0.6);
  border-top: 1px solid #F1F1F1;
  backdrop-filter: blur(32px);
  border-radius: 16px;
  padding: 12px;
}
```

## CSS-переменные (обновленные)

```css
:root {
  /* Градиенты */
  --gradient-primary: linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%);
  --gradient-secondary: linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%);
  --gradient-neutral: linear-gradient(135deg, #F3F3F3 0%, #EAEAEA 100%);
  --gradient-card-bg: linear-gradient(135deg, #ACD3F3 0%, #91C3EC 100%);
  
  /* Основные цвета */
  --color-bg: #FFFFFF;
  --color-text-primary: #000000;
  --color-text-secondary: #9F9F9F;
  --color-text-tertiary: #8C8C8C;
  --color-text-label: #8D8D8D;
  --color-accent: #4EB3FF;
  
  /* Фоны */
  --bg-card: #FFFFFF;
  --bg-card-light: #EAF5FE;
  --bg-input: rgba(225, 225, 225, 0.6);
  
  /* Границы */
  --border-card: rgba(255, 255, 255, 0.14);
  --border-input: #F1F1F1;
  --border-subtle: rgba(89, 89, 89, 0.14);
  
  /* Эффекты */
  --blur-glass: blur(20px);
  --blur-card: blur(12px);
  --blur-input: blur(32px);
  
  /* Скругления */
  --radius-xs: 12px;
  --radius-sm: 16px;
  --radius-md: 24px;
  --radius-lg: 32px;
  --radius-full: 100px;
  
  /* Тени */
  --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.1);
  --shadow-button: 0 4px 16px rgba(0, 0, 0, 0.08);
  
  /* Переходы */
  --transition-standard: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  /* Типографика */
  --font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-h1: 20px;
  --font-size-h2: 16px;
  --font-size-body: 14px;
  --font-size-caption: 12px;
  --line-height-tight: 1.25;
  --line-height-normal: 1.36;
  --line-height-relaxed: 1.43;
}
```

## Анимации и эффекты

### Glass-эффекты
```css
.glass-effect {
  backdrop-filter: var(--blur-glass);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border-card);
}

.glass-input {
  backdrop-filter: var(--blur-input);
  background: var(--bg-input);
}
```

### Градиентные кнопки
```css
.gradient-button {
  background: var(--gradient-primary);
  border: none;
  border-radius: var(--radius-lg);
  color: white;
  transition: var(--transition-standard);
}

.gradient-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-button);
}

.gradient-button:active {
  transform: translateY(0);
}
```

### Состояния компонентов
```css
/* Активная вкладка с градиентом */
.tab.active {
  background: var(--gradient-primary);
  color: white;
  border-radius: var(--radius-full);
}

/* Карточка с hover эффектом */
.content-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}
```

## Принципы по компонентам

### Top Bar (Верхняя панель)
- Аватар пользователя (32x32px) с белой обводкой
- Счетчик баллов в градиентной рамке
- Отступы: 12px по вертикали, 16px по горизонтали
- ДНК иконка с голубым градиентом

### Tabs (Нижняя навигация)  
- Активная вкладка: фиолетовый градиент, белые иконки
- Неактивная вкладка: серые иконки, прозрачный фон
- Высота: 60px
- Отступы: 12px по бокам

### Карточки контента
- **Видео карточки**: превью + заголовок + теги
- **Аудио карточки**: компактный плеер + визуализация
- **Заблокированные**: overlay с иконкой замка
- Все с backdrop blur эффектом

### Аудиоплеер
- Круглая кнопка play/pause с градиентом
- Визуализация звука из прямоугольников разной высоты
- Время воспроизведения справа
- Обводка: rgba(89, 89, 89, 0.14)

### Pagination (Пагинация)
- Активная точка: фиолетовый градиент, прямоугольная
- Неактивные точки: серые кружки (#E7DBEF)
- Размер: 10x10px

### Input Fields (Поля ввода)
- Полупрозрачный фон с blur эффектом
- Плавающие лейблы
- Кнопка отправки с градиентом
- Скругление: 16px

## Адаптивность
- **Мобильные устройства**: Полная ширина 375px
- **Отступы**: 16px для контента, 12px для навигации
- **Компактность**: Все элементы оптимизированы для touch-интерфейса

## Доступность
- **Контрастность**: Соответствует WCAG 2.1 AA
- **Размеры кнопок**: Минимум 40x40px для touch targets
- **Градиенты**: Дублируются однотонными цветами для accessibility
- **Анимации**: Respects prefers-reduced-motion

## Технические требования

### Шрифты
```css
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap');
```

### Поддержка браузеров
- backdrop-filter: требует современные браузеры
- CSS градиенты: universal support
- border-radius: universal support

### Fallbacks
```css
.glass-effect {
  background: rgba(255, 255, 255, 0.95); /* fallback */
  backdrop-filter: blur(20px);
}
```

## Миграция со старого дизайна

### Изменения:
1. **Цветовая схема**: Переход на градиенты вместо плоских цветов
2. **Типографика**: Nunito вместо системного шрифта  
3. **Эффекты**: Добавление glass-эффектов и blur
4. **Компоненты**: Новая система табов и карточек
5. **Скругления**: Увеличены радиусы скругления

### Обратная совместимость:
- Старые CSS переменные сохранены с новыми значениями
- Компоненты расширены, но не сломаны
- Постепенная миграция компонентов на новый стиль