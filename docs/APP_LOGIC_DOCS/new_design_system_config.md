# Конфигурация новой дизайн-системы
*Создано: 29.01.2025 - для применения в коде*

## Tailwind CSS конфигурация

### Градиенты для добавления в tailwind.config.js

```javascript
// Добавить в theme.extend.backgroundImage
backgroundImage: {
  // Основные градиенты
  'gradient-primary': 'linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%)',
  'gradient-secondary': 'linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%)',
  'gradient-accent': 'linear-gradient(135deg, #FFE4A3 0%, #FFD166 100%)',
  'gradient-neutral': 'linear-gradient(135deg, #F3F3F3 0%, #EAEAEA 100%)',
  
  // Специальные эффекты
  'gradient-glass': 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)',
  'gradient-dark': 'linear-gradient(135deg, #2D2D2D 0%, #1A1A1A 100%)',
}
```

### Цвета для добавления в theme.extend.colors

```javascript
colors: {
  brand: {
    purple: {
      50: '#F8F4FF',
      100: '#E1C1F4',
      500: '#B862EA',
      600: '#A04FD9',
      700: '#8A3DC7',
    },
    blue: {
      50: '#F0F8FF',
      100: '#8DC5F1', 
      500: '#63ABE6',
      600: '#4A9EE0',
      700: '#3291DA',
    },
    accent: {
      50: '#FFFAF0',
      100: '#FFE4A3',
      500: '#FFD166',
      600: '#FFC633',
      700: '#FFBC00',
    }
  },
  glass: {
    white: 'rgba(255, 255, 255, 0.25)',
    light: 'rgba(255, 255, 255, 0.1)',
    dark: 'rgba(0, 0, 0, 0.1)',
  }
}
```

### Тени для theme.extend.boxShadow

```javascript
boxShadow: {
  'glass': '0px 4px 20px rgba(0, 0, 0, 0.08)',
  'card': '0px 2px 12px rgba(0, 0, 0, 0.06)',
  'button': '0px 2px 8px rgba(0, 0, 0, 0.1)',
  'floating': '0px 8px 32px rgba(0, 0, 0, 0.12)',
}
```

### Backdrop blur для theme.extend.backdropBlur

```javascript
backdropBlur: {
  'glass': '20px',
  'card': '12px',
}
```

### Border radius для theme.extend.borderRadius

```javascript
borderRadius: {
  'card': '16px',
  'button': '12px', 
  'large': '24px',
  'xl': '32px',
}
```

## CSS Custom Properties

### Для добавления в src/css/globals.css

```css
:root {
  /* Новые CSS переменные */
  --gradient-primary: linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%);
  --gradient-secondary: linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%);
  --gradient-accent: linear-gradient(135deg, #FFE4A3 0%, #FFD166 100%);
  --gradient-neutral: linear-gradient(135deg, #F3F3F3 0%, #EAEAEA 100%);
  
  /* Glass эффекты */
  --glass-bg: rgba(255, 255, 255, 0.25);
  --glass-border: rgba(255, 255, 255, 0.3);
  --glass-blur: blur(20px);
  
  /* Тени */
  --shadow-glass: 0px 4px 20px rgba(0, 0, 0, 0.08);
  --shadow-card: 0px 2px 12px rgba(0, 0, 0, 0.06);
  
  /* Переходы */
  --transition-smooth: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

## Типовые классы компонентов

### Базовые карточки

```css
/* Glass Card */
.card-glass {
  @apply bg-white/25 backdrop-blur-glass border border-white/30 rounded-card shadow-glass;
}

/* Gradient Card */
.card-gradient-primary {
  @apply bg-gradient-primary rounded-card shadow-card;
}

.card-gradient-secondary {
  @apply bg-gradient-secondary rounded-card shadow-card;
}
```

### Базовые кнопки

```css
/* Primary Button */
.btn-primary {
  @apply bg-gradient-primary text-white font-medium px-6 py-3 rounded-button shadow-button transition-all duration-200 hover:scale-105 active:scale-95;
}

/* Secondary Button */
.btn-secondary {
  @apply bg-gradient-secondary text-white font-medium px-6 py-3 rounded-button shadow-button transition-all duration-200 hover:scale-105 active:scale-95;
}

/* Glass Button */
.btn-glass {
  @apply bg-white/25 backdrop-blur-card border border-white/30 text-gray-800 font-medium px-6 py-3 rounded-button transition-all duration-200 hover:bg-white/35;
}
```

## TypeScript интерфейсы компонентов

### Card Component Props

```typescript
interface CardProps {
  variant: 'default' | 'glass' | 'gradient-primary' | 'gradient-secondary' | 'gradient-accent';
  size: 'sm' | 'md' | 'lg' | 'xl';
  elevation: 'none' | 'low' | 'medium' | 'high';
  borderRadius: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
}
```

### Button Component Props

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'accent' | 'glass' | 'outline' | 'ghost';
  size: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}
```

### Navigation Props

```typescript
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number;
  onClick?: () => void;
}

interface TabBarProps {
  items: NavItemProps[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}
```

## Анимации и переходы

### Framer Motion варианты

```typescript
// Page transitions
export const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

// Card animations
export const cardVariants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  hover: { scale: 1.02, y: -2 },
  tap: { scale: 0.98 }
};

// Button animations
export const buttonVariants = {
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};
```

## Использование в компонентах

### Пример Card компонента

```tsx
import { motion } from 'framer-motion';
import { cardVariants } from './animations';

export const Card: React.FC<CardProps> = ({ 
  variant = 'default', 
  children, 
  className = '' 
}) => {
  const baseClass = 'p-4 transition-all duration-200';
  const variantClass = {
    'default': 'bg-white border border-gray-200 rounded-card shadow-card',
    'glass': 'card-glass',
    'gradient-primary': 'card-gradient-primary',
    'gradient-secondary': 'card-gradient-secondary',
  }[variant];

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      className={`${baseClass} ${variantClass} ${className}`}
    >
      {children}
    </motion.div>
  );
};
```

## План внедрения

### Этап 1: Обновление конфигурации
1. ✅ Обновить `tailwind.config.js` с новыми градиентами и цветами
2. ✅ Добавить CSS переменные в `globals.css`
3. ✅ Создать базовые utility классы

### Этап 2: Компоненты UI
1. 🔴 Обновить существующие компоненты с новыми стилями
2. 🔴 Создать новые базовые компоненты (Card, Button, Navigation)
3. 🔴 Добавить TypeScript интерфейсы

### Этап 3: Применение в страницах
1. 🔴 Обновить главную страницу с новым дизайном
2. 🔴 Применить к библиотеке курсов
3. 🔴 Обновить админ-панель
4. 🔴 Адаптировать остальные экраны

### Этап 4: Тестирование и полировка
1. 🔴 Проверить адаптивность на разных устройствах
2. 🔴 Оптимизировать анимации для производительности
3. 🔴 Финальная полировка деталей 