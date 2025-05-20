# Документация по Telegram UI для Mini Apps

## Введение

`@telegram-apps/telegram-ui` - это официальная библиотека React-компонентов для создания Telegram Mini Apps с сохранением стиля и UX интерфейса Telegram. Библиотека предоставляет набор готовых компонентов, которые имитируют нативные элементы Telegram.

## Установка

```bash
npm i @telegram-apps/telegram-ui
```

После установки необходимо подключить стили в корневом компоненте:

```jsx
import '@telegram-apps/telegram-ui/dist/styles.css';
```

## Основные компоненты

### AppRoot

Корневой компонент, который должен оборачивать всё приложение:

```jsx
import { AppRoot } from '@telegram-apps/telegram-ui';

const App = () => (
  <AppRoot>
    {/* Остальные компоненты приложения */}
  </AppRoot>
);
```

### Tabbar

Компонент навигационной панели для переключения между основными разделами приложения:

```jsx
import { Tabbar } from '@telegram-apps/telegram-ui';

const Navigation = () => (
  <Tabbar>
    <Tabbar.Item 
      selected={isActive('/home')} 
      onClick={() => navigate('/home')}
      text="Главная"
    >
      <HomeIcon />
    </Tabbar.Item>
    <Tabbar.Item 
      selected={isActive('/profile')} 
      onClick={() => navigate('/profile')}
      text="Профиль"
    >
      <ProfileIcon />
    </Tabbar.Item>
    {/* Другие элементы... */}
  </Tabbar>
);
```

### Card

Компонент для группировки связанной информации:

```jsx
import { Card } from '@telegram-apps/telegram-ui';

<Card>
  <Card.Header>Заголовок карточки</Card.Header>
  <Card.Content>Содержимое карточки</Card.Content>
</Card>
```

## Компоненты для статистики и числовых показателей

### Counter

Компонент для отображения числовых счётчиков с возможностью указания тренда:

```jsx
import { Counter, Trend } from '@telegram-apps/telegram-ui';

// Счетчик с трендом роста
<Counter 
  value="100" 
  label="минут практики" 
  trend={Trend.Up} 
  trendValue="10%"
/>

// Простой счетчик
<Counter 
  value="7" 
  label="дней в потоке" 
/>

// Счетчик с важным значением
<Counter 
  value="3" 
  label="твоя сила" 
  size="large" 
  highlight
/>
```

### StatGroup

Компонент для группировки нескольких связанных статистических показателей:

```jsx
import { StatGroup, Counter, Trend } from '@telegram-apps/telegram-ui';

<StatGroup>
  <Counter value="3" label="Сила" size="large" highlight />
  <Counter value="100" label="минут практики" />
  <Counter value="7" label="дней в потоке" trend={Trend.Up} trendValue="2" />
</StatGroup>
```

### Progress

Компонент для отображения прогресса в виде линии или круга:

```jsx
import { Progress } from '@telegram-apps/telegram-ui';

// Линейный прогресс
<Progress value={75} max={100} />

// Круговой прогресс
<Progress type="circular" value={75} max={100} />
```

### CircleValue

Компонент для отображения важного числового показателя в круге:

```jsx
import { CircleValue } from '@telegram-apps/telegram-ui';

<CircleValue value="3" label="Твоя сила" />
```

## Стилизация компонентов

Компоненты автоматически адаптируются к текущей теме Telegram (светлой или темной), используя CSS-переменные:

- `--tgui-background` - основной фон
- `--tgui-background-rgb` - RGB значение основного фона
- `--tgui-text-color` - основной цвет текста
- `--tgui-secondary-text-color` - вторичный цвет текста
- `--tgui-hint-color` - цвет подсказок
- `--tgui-link-color` - цвет ссылок
- `--tgui-button-color` - цвет кнопок
- `--tgui-button-text-color` - цвет текста кнопок
- `--tgui-secondary-bg-color` - вторичный фон

## Рекомендации по созданию статистических компонентов

Для создания статистических компонентов, как на предоставленном скриншоте, рекомендуется:

1. Использовать `Card` для создания карточек с отступами
2. Применять крупный размер шрифта для числовых значений
3. Использовать вторичный (серый) текст для подписей
4. Добавлять иконки или индикаторы тренда
5. Соблюдать выравнивание и отступы, принятые в Telegram

### Пример реализации статистической карточки

```jsx
import { Card } from '@telegram-apps/telegram-ui';

<Card className="stat-card">
  <div className="stat-value">3</div>
  <div className="stat-label">ТВОЯ СИЛА</div>
</Card>

<style jsx>{`
  .stat-card {
    padding: 16px;
    text-align: center;
  }
  .stat-value {
    font-size: 32px;
    font-weight: 600;
    color: var(--tgui-text-color);
  }
  .stat-label {
    font-size: 14px;
    color: var(--tgui-secondary-text-color);
    text-transform: uppercase;
  }
`}</style>
```

## Полезные ресурсы

- [GitHub репозиторий](https://github.com/Telegram-Mini-Apps/TelegramUI)
- [Пример Mini App](https://github.com/Telegram-Mini-Apps/TGUI-Example)
- [Официальная документация Telegram Mini Apps](https://ton.org/mini-apps) 