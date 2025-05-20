# Компоненты Telegram UI для Mini Apps

## Содержание
1. [Введение](#введение)
2. [Основные компоненты](#основные-компоненты)
   - [AppRoot](#approot)
   - [Text](#text)
   - [Card](#card)
   - [Section](#section)
   - [Button](#button)
   - [Avatar](#avatar)
   - [Tabbar](#tabbar)
3. [Компоненты для отображения статистики](#компоненты-для-отображения-статистики)
   - [Counter](#counter)
   - [Meter](#meter)
   - [Progress](#progress)
   - [Stats Card](#stats-card)
4. [Интерактивные компоненты](#интерактивные-компоненты)
   - [Cell](#cell)
   - [Switch](#switch)
   - [Checkbox](#checkbox)
   - [RadioGroup](#radiogroup)
   - [Input](#input)
5. [Структурные компоненты](#структурные-компоненты)
   - [Page](#page)
   - [SafeAreaFade](#safearefade)
   - [Group](#group)
   - [Placeholder](#placeholder)
6. [Уведомления и модальные окна](#уведомления-и-модальные-окна)
   - [Alert](#alert)
   - [Toast](#toast)
   - [Dialog](#dialog)
   - [BottomSheet](#bottomsheet)
7. [CSS переменные и темы](#css-переменные-и-темы)

## Введение

Библиотека `@telegram-apps/telegram-ui` предоставляет готовые компоненты интерфейса для создания Telegram Mini Apps в стиле нативного Telegram. Компоненты легко интегрируются в React-приложения и адаптируются к темам Telegram.

### Установка

```bash
npm install @telegram-apps/telegram-ui
```

### Подключение

```jsx
// В корневом компоненте
import '@telegram-apps/telegram-ui/dist/styles.css';
import { AppRoot } from '@telegram-apps/telegram-ui';

function App() {
  return (
    <AppRoot>
      {/* Ваше приложение */}
    </AppRoot>
  );
}
```

## Основные компоненты

### AppRoot

Корневой компонент, оборачивающий все приложение. Добавляет необходимые стили и обрабатывает темы.

```jsx
<AppRoot>
  {/* Содержимое приложения */}
</AppRoot>
```

### Text

Компонент для отображения текста с различными стилями и весами.

```jsx
<Text>Обычный текст</Text>
<Text weight="1">Очень тонкий текст</Text>
<Text weight="2">Тонкий текст</Text>
<Text weight="3">Полужирный текст</Text>
<Text weight="4">Жирный текст</Text>
<Text color="primary">Цветной текст</Text>
<Text size="l">Большой текст</Text>
<Text size="m">Средний текст</Text>
<Text size="s">Маленький текст</Text>
```

### Card

Контейнер с тенью и скругленными углами.

```jsx
<Card>
  <Text>Содержимое карточки</Text>
</Card>
```

### Section

Группирует связанный контент с заголовком и описанием.

```jsx
<Section header="Заголовок раздела" footer="Дополнительная информация">
  <Cell>Элемент 1</Cell>
  <Cell>Элемент 2</Cell>
</Section>
```

### Button

Кнопка действия с различными вариантами отображения.

```jsx
<Button size="l">Большая кнопка</Button>
<Button size="m">Средняя кнопка</Button>
<Button size="s">Маленькая кнопка</Button>

<Button appearance="accent">Акцентная кнопка</Button>
<Button appearance="positive">Позитивная кнопка</Button>
<Button appearance="negative">Негативная кнопка</Button>
<Button appearance="neutral">Нейтральная кнопка</Button>

<Button stretched>Растянутая кнопка</Button>
<Button disabled>Неактивная кнопка</Button>
<Button loading>Загрузка</Button>

<Button before={<Icon24Add />}>С иконкой</Button>
<Button after={<Icon24ChevronRight />}>С иконкой справа</Button>
```

### Avatar

Круглый аватар пользователя или группы.

```jsx
<Avatar size={48} src="https://example.com/avatar.jpg" alt="Имя пользователя" />
<Avatar size={36} initials="ИП" gradient="red" />
```

### Tabbar

Нижняя панель навигации с вкладками.

```jsx
<Tabbar>
  <Tabbar.Item
    selected={activeTab === 'home'}
    text="Главная"
    onClick={() => setActiveTab('home')}
    icon={<Icon24Home />}
  />
  <Tabbar.Item
    selected={activeTab === 'search'}
    text="Поиск"
    onClick={() => setActiveTab('search')}
    icon={<Icon24Search />}
  />
  <Tabbar.Item
    selected={activeTab === 'profile'}
    text="Профиль"
    onClick={() => setActiveTab('profile')}
    icon={<Icon24User />}
  />
</Tabbar>
```

## Компоненты для отображения статистики

### Counter

Отображает числовое значение с опциональной подписью.

```jsx
<Counter value={42} label="Сообщения" />
<Counter value={100} label="Очки" size="l" />
<Counter value={7.5} label="Рейтинг" decimal />
```

### Meter

Индикатор прогресса с визуальной шкалой.

```jsx
<Meter value={75} max={100} />
<Meter value={45} max={100} appearance="accent" />
<Meter value={30} max={100} appearance="negative" />
```

### Progress

Полоса прогресса для отображения загрузки или прогресса выполнения.

```jsx
<Progress value={65} />
<Progress value={35} appearance="accent" />
<Progress value={85} appearance="positive" />
<Progress value={15} appearance="negative" />
```

### Stats Card

Карточка с несколькими статистическими показателями.

```jsx
<StatsCard title="Ваша статистика">
  <StatsCard.Item value={42} label="Дни" />
  <StatsCard.Item value={156} label="Очки" />
  <StatsCard.Item value={8.5} label="Рейтинг" decimal />
</StatsCard>
```

## Интерактивные компоненты

### Cell

Ячейка списка с различными вариантами содержимого и взаимодействия.

```jsx
<Cell>Базовая ячейка</Cell>
<Cell before={<Avatar size={36} src="avatar.jpg" />}>С аватаром</Cell>
<Cell indicator="ДА">С индикатором</Cell>
<Cell subtitle="Дополнительная информация">С подзаголовком</Cell>
<Cell after={<Icon24ChevronRight />}>С иконкой справа</Cell>
<Cell disabled>Неактивная ячейка</Cell>
<Cell onClick={() => console.log('Клик!')}>Кликабельная ячейка</Cell>
```

### Switch

Переключатель для binary опций.

```jsx
<Switch checked={isEnabled} onChange={handleChange}>Включить уведомления</Switch>
<Switch disabled>Недоступная опция</Switch>
```

### Checkbox

Флажок для множественного выбора.

```jsx
<Checkbox checked={isSelected} onChange={handleChange}>Выбрать этот вариант</Checkbox>
<Checkbox disabled>Недоступный вариант</Checkbox>
```

### RadioGroup

Группа радио-кнопок для выбора одного варианта из нескольких.

```jsx
<RadioGroup value={selected} onChange={setSelected}>
  <Radio value="option1">Вариант 1</Radio>
  <Radio value="option2">Вариант 2</Radio>
  <Radio value="option3" disabled>Вариант 3 (недоступен)</Radio>
</RadioGroup>
```

### Input

Поле ввода текста.

```jsx
<Input placeholder="Введите имя" />
<Input value={name} onChange={handleChange} />
<Input type="password" placeholder="Пароль" />
<Input before={<Icon24Search />} placeholder="Поиск" />
<Input after={<Button size="s">Отправить</Button>} />
<Input status="error" statusText="Поле обязательно для заполнения" />
```

## Структурные компоненты

### Page

Компонент для создания полноценной страницы.

```jsx
<Page header={<Header>Заголовок страницы</Header>}>
  <Section header="Раздел">
    <Cell>Содержимое</Cell>
  </Section>
</Page>
```

### SafeAreaFade

Компонент для создания градиентного перехода в верхней части экрана под статусбаром Telegram.

```jsx
<SafeAreaFade />
```

### Group

Группирует компоненты с общим заголовком.

```jsx
<Group header={<Header>Заголовок группы</Header>}>
  <Cell>Элемент 1</Cell>
  <Cell>Элемент 2</Cell>
</Group>
```

### Placeholder

Заглушка при отсутствии данных или ошибке.

```jsx
<Placeholder
  icon={<Icon56ErrorOutline />}
  header="Ошибка загрузки"
  description="Попробуйте обновить страницу или проверьте соединение"
>
  <Button size="m">Повторить</Button>
</Placeholder>
```

## Уведомления и модальные окна

### Alert

Всплывающее окно с предупреждением или сообщением.

```jsx
<Alert
  header="Внимание"
  text="Вы действительно хотите удалить этот элемент?"
  actions={[
    { title: 'Отмена', mode: 'cancel' },
    { title: 'Удалить', mode: 'destructive', action: handleDelete }
  ]}
  onClose={handleClose}
/>
```

### Toast

Временное уведомление.

```jsx
<Toast text="Файл успешно загружен" />
<Toast text="Ошибка подключения" appearance="negative" />
```

### Dialog

Диалоговое окно с дополнительными действиями.

```jsx
<Dialog
  header="Настройки"
  content={<Cell>Настройки содержимого</Cell>}
  actions={[
    { title: 'Отмена', mode: 'cancel' },
    { title: 'Сохранить', action: handleSave }
  ]}
  onClose={handleClose}
/>
```

### BottomSheet

Выдвигающаяся снизу панель.

```jsx
<BottomSheet
  header="Выберите действие"
  onClose={handleClose}
>
  <Cell onClick={handleAction1}>Действие 1</Cell>
  <Cell onClick={handleAction2}>Действие 2</Cell>
  <Cell onClick={handleAction3}>Действие 3</Cell>
</BottomSheet>
```

## CSS переменные и темы

Telegram UI использует CSS переменные для определения тем и цветов. Можно использовать следующие переменные для создания собственных стилей:

```css
:root {
  /* Основные цвета */
  --tgui-color-accent: #4babfb;
  --tgui-color-accent-hover: #4095d6;
  --tgui-color-accent-active: #3b88c3;
  
  /* Цвета текста */
  --tgui-text-color: #000000;
  --tgui-secondary-text-color: #707579;
  
  /* Цвета фона */
  --tgui-background: #ffffff;
  --tgui-secondary-bg-color: #f1f1f1;
  
  /* Границы и разделители */
  --tgui-divider-color: #c9c9c9;
  
  /* Отступы и радиусы */
  --tgui-border-radius: 10px;
  --tgui-padding: 16px;
}

/* Для темной темы */
:root.dark {
  --tgui-text-color: #ffffff;
  --tgui-secondary-text-color: #aaaaaa;
  --tgui-background: #181818;
  --tgui-secondary-bg-color: #2b2b2b;
  --tgui-divider-color: #303030;
}
```

### Использование переменных в собственных компонентах

```jsx
const CustomComponent = styled.div`
  background-color: var(--tgui-background);
  color: var(--tgui-text-color);
  border-radius: var(--tgui-border-radius);
  padding: var(--tgui-padding);
  border: 1px solid var(--tgui-divider-color);
  
  &:hover {
    background-color: var(--tgui-secondary-bg-color);
  }
`;
```

## Адаптация к теме Telegram

Приложение автоматически адаптируется к выбранной пользователем теме Telegram (светлая/темная). Для ручного управления темой можно использовать CSS классы:

```jsx
<AppRoot mode="light"> {/* Принудительно светлая тема */}
  {/* Содержимое */}
</AppRoot>

<AppRoot mode="dark"> {/* Принудительно темная тема */}
  {/* Содержимое */}
</AppRoot>

<AppRoot mode="auto"> {/* Автоматическое определение (по умолчанию) */}
  {/* Содержимое */}
</AppRoot>
``` 