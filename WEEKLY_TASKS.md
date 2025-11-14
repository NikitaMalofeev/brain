# WEEKLY TASKS - BRAINING PROJECT RELEASE 2

**Дата:** 14 ноября 2025
**Проект:** Brain Programming App
**Релиз:** 2.0

---

# 📋 ВЕРСИЯ 1: ПОДРОБНЫЙ ПЛАН (Technical Specification)

## 🎯 ЦЕЛЬ РЕЛИЗА
Трансформация приложения из закрытого (только для учеников) в гибридное (гости + ученики) с добавлением календаря, системы техник и улучшенной механики домашних заданий.

---

## 1️⃣ ГОСТЕВОЙ РЕЖИМ (Guest Mode)

### 1.1 База данных

**Таблица:** `users`
```sql
-- Добавить роль 'guest'
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guest';

-- Функция определения гостя
CREATE OR REPLACE FUNCTION is_user_guest(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_tariff_purchases
    WHERE user_id = $1
    AND is_active = true
    AND expiration_date > NOW()
  );
END;
$$ LANGUAGE plpgsql;
```

**Логика определения гостя:**
- Нет активного тарифа (`user_tariff_purchases` → `is_active = false` или `expiration_date < NOW()`)
- Автоматически получает статус `guest`

### 1.2 Фронтенд

**Хук:** `src/shared/hooks/useIsGuest.ts`
```typescript
export const useIsGuest = () => {
  const { user } = useSupabaseUser()
  const { data: hasActiveTariff } = useQuery({
    queryKey: ['hasActiveTariff', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_tariff_purchases')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .gt('expiration_date', new Date().toISOString())
        .single()
      return !!data
    },
    enabled: !!user
  })

  return !hasActiveTariff
}
```

**Компонент:** `src/features/guest-access/ui/GuestBlockedModal.tsx`
```typescript
interface Props {
  isOpen: boolean
  onClose: () => void
  ctaUrl?: string // URL на внешний сайт
}

export const GuestBlockedModal = ({ isOpen, onClose, ctaUrl }: Props) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Icon name="lock" size={48} />
      <Title>Доступно только ученикам</Title>
      <Description>
        Этот контент доступен только ученикам программы Brain Programming
      </Description>
      <Button
        variant="primary"
        href={ctaUrl || 'https://site.com/enroll'}
        external
      >
        Оставить заявку
      </Button>
      <Button variant="secondary" onClick={onClose}>
        Закрыть
      </Button>
    </Modal>
  )
}
```

### 1.3 Доступы для гостей по экранам

| Экран | Что видит гость | Ограничения |
|-------|----------------|-------------|
| **Техники** | 2 бесплатные техники, список всех техник | Не может слушать платные техники |
| **Календарь** | Календарную сетку с цветами модулей | Не может проваливаться в даты |
| **Главная** | Структуру модулей, дорожную карту (серую) | Может провалиться только в "Исцеление", уроки заблокированы |
| **Профиль** | Имя и аватарку из Telegram | Все прогрессы заблокированы, активна только кнопка "Помощь" |

### 1.4 Задачи

- [ ] Добавить роль `guest` в enum `user_role`
- [ ] Создать функцию `is_user_guest()`
- [ ] Создать хук `useIsGuest()`
- [ ] Создать компонент `GuestBlockedModal`
- [ ] Интегрировать гостевые ограничения на всех экранах
- [ ] Протестировать сценарии: гость → ученик, ученик → гость (истек тариф)

---

## 2️⃣ РАЗДЕЛ "ТЕХНИКИ" (Techniques)

### 2.1 База данных

**Создать таблицу `techniques`:**
```sql
CREATE TABLE techniques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  cover_image TEXT,
  duration_seconds INT,

  -- Статусы: 'free', 'purchasable', 'locked'
  status TEXT NOT NULL DEFAULT 'purchasable',

  -- URL для покупки на сайте
  purchase_url TEXT,

  -- URL чата с отделом продаж (для повышения тарифа)
  upgrade_tariff_chat_url TEXT,

  -- Метка "Доступна с модуля X"
  available_from_module TEXT,

  -- Условие разблокировки
  unlock_condition_type TEXT, -- null, 'after_technique', 'after_duration'
  unlock_condition_value JSONB, -- { "technique_id": "uuid", "duration_days": 30 }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица доступа пользователей к техникам
CREATE TABLE user_technique_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  technique_id UUID REFERENCES techniques(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- null = навсегда
  access_source TEXT, -- 'purchase', 'tariff', 'gift'
  UNIQUE(user_id, technique_id)
);

-- Функция проверки доступа к технике
CREATE OR REPLACE FUNCTION can_user_access_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
  v_unlock_condition_type TEXT;
  v_unlock_condition_value JSONB;
  v_prerequisite_id UUID;
  v_prerequisite_granted_at TIMESTAMPTZ;
  v_duration_days INT;
BEGIN
  -- Получить статус техники
  SELECT status, unlock_condition_type, unlock_condition_value
  INTO v_status, v_unlock_condition_type, v_unlock_condition_value
  FROM techniques
  WHERE id = p_technique_id;

  -- Бесплатные доступны всем
  IF v_status = 'free' THEN
    RETURN TRUE;
  END IF;

  -- Проверить владение
  IF EXISTS (
    SELECT 1 FROM user_technique_access
    WHERE user_id = p_user_id
    AND technique_id = p_technique_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Функция проверки, можно ли купить технику (для locked техник)
CREATE OR REPLACE FUNCTION can_user_purchase_technique(
  p_user_id UUID,
  p_technique_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_unlock_condition_type TEXT;
  v_unlock_condition_value JSONB;
  v_prerequisite_id UUID;
  v_prerequisite_granted_at TIMESTAMPTZ;
  v_duration_days INT;
BEGIN
  SELECT unlock_condition_type, unlock_condition_value
  INTO v_unlock_condition_type, v_unlock_condition_value
  FROM techniques
  WHERE id = p_technique_id;

  -- Нет условий - можно купить
  IF v_unlock_condition_type IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Условие: после получения другой техники + время
  IF v_unlock_condition_type = 'after_technique' THEN
    v_prerequisite_id := (v_unlock_condition_value->>'technique_id')::UUID;
    v_duration_days := (v_unlock_condition_value->>'duration_days')::INT;

    -- Проверить, есть ли доступ к предыдущей технике
    SELECT granted_at INTO v_prerequisite_granted_at
    FROM user_technique_access
    WHERE user_id = p_user_id
    AND technique_id = v_prerequisite_id;

    -- Нет доступа к предыдущей технике
    IF v_prerequisite_granted_at IS NULL THEN
      RETURN FALSE;
    END IF;

    -- Прошло недостаточно времени
    IF NOW() < v_prerequisite_granted_at + INTERVAL '1 day' * v_duration_days THEN
      RETURN FALSE;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

**Цепочка доступов (задать данные):**
```sql
-- 1. Императрица (доступна сразу)
INSERT INTO techniques (id, title, status, purchase_url) VALUES
('empress-uuid', 'Императрица', 'purchasable', 'https://site.com/buy/empress');

-- 2. Верховная жрица (через 1 месяц после Императрицы)
INSERT INTO techniques (
  id, title, status, purchase_url,
  unlock_condition_type, unlock_condition_value
) VALUES (
  'priestess-uuid',
  'Верховная жрица',
  'locked',
  'https://site.com/buy/priestess',
  'after_technique',
  '{"technique_id": "empress-uuid", "duration_days": 30}'
);

-- 3. Богиня (через 1 месяц после Верховной жрицы)
INSERT INTO techniques (
  id, title, status, purchase_url,
  unlock_condition_type, unlock_condition_value
) VALUES (
  'goddess-uuid',
  'Богиня',
  'locked',
  'https://site.com/buy/goddess',
  'after_technique',
  '{"technique_id": "priestess-uuid", "duration_days": 30}'
);
```

### 2.2 Фронтенд

**Структура:**
```
src/
├── entities/techniques/
│   ├── api/
│   │   ├── getTechniques.ts
│   │   ├── getTechniqueById.ts
│   │   ├── canAccessTechnique.ts
│   │   └── canPurchaseTechnique.ts
│   ├── hooks/
│   │   ├── useTechniques.ts
│   │   └── useCanAccessTechnique.ts
│   ├── types.ts
│   └── ui/
│       ├── TechniqueCard.tsx
│       └── TechniquePlayer.tsx
├── pages/TechniquesPage/
│   ├── TechniquesPage.tsx
│   └── components/
│       ├── TechniquesList.tsx
│       └── TechniquesTabs.tsx
```

**Компонент:** `src/pages/TechniquesPage/TechniquesPage.tsx`
```typescript
export const TechniquesPage = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all')
  const isGuest = useIsGuest()
  const { user } = useSupabaseUser()

  const { data: techniques, isLoading } = useQuery({
    queryKey: ['techniques', activeTab, user?.id],
    queryFn: async () => {
      if (activeTab === 'all') {
        return await supabase.from('techniques').select('*')
      } else {
        // Мои техники: бесплатные + купленные
        return await supabase
          .from('techniques')
          .select('*, user_technique_access!inner(*)')
          .or(`status.eq.free,user_technique_access.user_id.eq.${user?.id}`)
      }
    }
  })

  return (
    <Page>
      <Header>
        <Title>Техники</Title>
      </Header>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab value="all">Все техники</Tab>
        <Tab value="my">Мои техники</Tab>
      </Tabs>

      {isLoading ? (
        <Skeleton count={6} />
      ) : (
        <TechniquesList
          techniques={techniques}
          isGuest={isGuest}
        />
      )}
    </Page>
  )
}
```

**Компонент:** `src/entities/techniques/ui/TechniqueCard.tsx`
```typescript
interface Props {
  technique: Technique
  isGuest: boolean
}

export const TechniqueCard = ({ technique, isGuest }: Props) => {
  const { user } = useSupabaseUser()
  const canAccess = useCanAccessTechnique(technique.id)
  const canPurchase = useCanPurchaseTechnique(technique.id)
  const [showBlockedModal, setShowBlockedModal] = useState(false)

  const handleClick = () => {
    if (technique.status === 'free') {
      navigate(`/techniques/player/${technique.id}`)
      return
    }

    if (canAccess) {
      navigate(`/techniques/player/${technique.id}`)
      return
    }

    if (isGuest || !canAccess) {
      setShowBlockedModal(true)
    }
  }

  const renderActionButtons = () => {
    if (technique.status === 'free') {
      return <PlayButton />
    }

    if (canAccess) {
      return <Badge variant="success">Моя техника</Badge>
    }

    if (technique.status === 'locked' && !canPurchase) {
      return (
        <LockedBadge
          tooltip={`Доступна через ${getDaysUntilUnlock(technique)} дней`}
        />
      )
    }

    if (technique.status === 'purchasable' || (technique.status === 'locked' && canPurchase)) {
      return (
        <ButtonGroup>
          <Button
            href={technique.purchase_url}
            external
            variant="primary"
          >
            Купить на сайте
          </Button>
          {!isGuest && technique.upgrade_tariff_chat_url && (
            <Button
              href={technique.upgrade_tariff_chat_url}
              external
              variant="secondary"
            >
              Повысить тариф
            </Button>
          )}
        </ButtonGroup>
      )
    }
  }

  return (
    <>
      <Card onClick={handleClick} clickable={technique.status === 'free' || canAccess}>
        <CoverImage src={technique.cover_image} />
        <CardContent>
          <Title>{technique.title}</Title>
          <Description>{technique.description}</Description>

          {technique.available_from_module && (
            <Badge variant="info">
              Доступна с модуля {technique.available_from_module}
            </Badge>
          )}

          <Duration>{formatDuration(technique.duration_seconds)}</Duration>

          {renderActionButtons()}
        </CardContent>
      </Card>

      <GuestBlockedModal
        isOpen={showBlockedModal}
        onClose={() => setShowBlockedModal(false)}
      />
    </>
  )
}
```

### 2.3 Админка

**Добавить в AdminPage таб "Техники":**

```typescript
// src/pages/AdminPage/components/TechniquesManager.tsx
export const TechniquesManager = () => {
  const { data: techniques } = useTechniquesAdmin()
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null)

  return (
    <div>
      <Header>
        <Title>Управление техниками</Title>
        <CreateButton onClick={handleCreateTechnique} />
      </Header>

      <TechniquesTable
        techniques={techniques}
        onSelect={setSelectedTechnique}
      />

      {selectedTechnique && (
        <TechniqueEditor techniqueId={selectedTechnique} />
      )}
    </div>
  )
}

// Форма редактирования техники
interface TechniqueFormData {
  title: string
  description: string
  audio_url: string
  cover_image: string
  duration_seconds: number
  status: 'free' | 'purchasable' | 'locked'
  purchase_url?: string
  upgrade_tariff_chat_url?: string
  available_from_module?: string
  unlock_condition_type?: 'after_technique' | null
  unlock_condition_value?: {
    technique_id: string
    duration_days: number
  }
}
```

### 2.4 Экран плеера

**Компонент:** `src/pages/TechniquePlayerPage/TechniquePlayerPage.tsx`
```typescript
export const TechniquePlayerPage = () => {
  const { techniqueId } = useParams()
  const { data: technique } = useTechnique(techniqueId)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDescription, setShowDescription] = useState(false)

  return (
    <Page>
      <PlayerContainer>
        {/* Анимация для каждой техники (персональная) */}
        <TechniqueAnimation technique={technique} isPlaying={isPlaying} />

        <AudioPlayer
          src={technique.audio_url}
          isPlaying={isPlaying}
          onPlayPause={setIsPlaying}
        />

        <Title>{technique.title}</Title>

        <Button
          variant="text"
          onClick={() => setShowDescription(!showDescription)}
        >
          {showDescription ? 'Скрыть описание' : 'Читать описание'}
        </Button>

        {showDescription && (
          <Description>{technique.description}</Description>
        )}
      </PlayerContainer>
    </Page>
  )
}
```

### 2.5 Задачи

- [ ] Создать таблицу `techniques`
- [ ] Создать таблицу `user_technique_access`
- [ ] Создать функции `can_user_access_technique()` и `can_user_purchase_technique()`
- [ ] Заполнить данными техники (Императрица, Верховная жрица, Богиня)
- [ ] Создать `TechniquesPage` с табами
- [ ] Создать `TechniqueCard` с логикой статусов
- [ ] Создать `TechniquePlayerPage` с анимацией
- [ ] Добавить `TechniquesManager` в админку
- [ ] Изменить иконку и название таба "Библиотека" → "Техники"
- [ ] Протестировать цепочку доступов (Императрица → 30 дней → Жрица → 30 дней → Богиня)

---

## 3️⃣ КАЛЕНДАРЬ (Calendar)

### 3.1 База данных

```sql
-- 1. Таблица потоков
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- "Поток сентябрь 2025"
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица модулей потока (для цветовой подсветки)
CREATE TABLE stream_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  module_number INT NOT NULL,
  module_name TEXT NOT NULL, -- "Исцеление", "Психолог", "Доктор наук"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT NOT NULL, -- "#FF5733"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица событий календаря
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  module_id UUID REFERENCES stream_modules(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,

  -- Типы событий: 'zoom', 'offline', 'material_unlock', 'lesson_unlock'
  event_type TEXT NOT NULL,

  -- Ссылки и связи
  external_url TEXT, -- для Zoom-событий
  material_id UUID REFERENCES materials(id), -- для открытия материалов
  lesson_id INT REFERENCES lessons(id), -- для открытия уроков
  technique_id UUID REFERENCES techniques(id), -- для открытия техник

  cover_image TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Доступ к событиям по тарифам
CREATE TABLE event_tariff_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  tariff_id UUID REFERENCES tariffs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, tariff_id)
);

-- 5. Привязка пользователей к потокам
CREATE TABLE user_stream_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, stream_id)
);

-- 6. Функция получения событий календаря для пользователя
CREATE OR REPLACE FUNCTION get_user_calendar_events(
  p_user_id UUID,
  p_month DATE
)
RETURNS TABLE (
  event_id UUID,
  title TEXT,
  description TEXT,
  event_date DATE,
  event_time TIME,
  event_type TEXT,
  external_url TEXT,
  module_color TEXT,
  module_name TEXT,
  can_access BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.description,
    e.event_date,
    e.event_time,
    e.event_type,
    e.external_url,
    m.color,
    m.module_name,
    CASE
      WHEN is_user_guest(p_user_id) THEN false
      ELSE EXISTS (
        SELECT 1 FROM user_tariff_purchases utp
        JOIN event_tariff_access eta ON eta.tariff_id = utp.tariff_id
        WHERE utp.user_id = p_user_id
        AND eta.event_id = e.id
        AND utp.is_active = true
        AND utp.expiration_date > NOW()
      )
    END AS can_access
  FROM calendar_events e
  JOIN user_stream_enrollments use ON use.stream_id = e.stream_id
  LEFT JOIN stream_modules m ON m.id = e.module_id
  WHERE use.user_id = p_user_id
  AND DATE_TRUNC('month', e.event_date) = DATE_TRUNC('month', p_month);
END;
$$ LANGUAGE plpgsql;

-- 7. Функция копирования потока (только контент, без дат)
CREATE OR REPLACE FUNCTION copy_stream(
  p_source_stream_id UUID,
  p_new_stream_name TEXT,
  p_new_start_date DATE
)
RETURNS UUID AS $$
DECLARE
  v_new_stream_id UUID;
  v_date_offset INT;
  v_source_start_date DATE;
BEGIN
  -- Создать новый поток
  INSERT INTO streams (name, course_id, start_date, is_active)
  SELECT p_new_stream_name, course_id, p_new_start_date, true
  FROM streams
  WHERE id = p_source_stream_id
  RETURNING id INTO v_new_stream_id;

  -- Получить исходную дату начала
  SELECT start_date INTO v_source_start_date
  FROM streams WHERE id = p_source_stream_id;

  -- Рассчитать смещение дат
  v_date_offset := p_new_start_date - v_source_start_date;

  -- Скопировать модули с новыми датами
  INSERT INTO stream_modules (stream_id, module_number, module_name, start_date, end_date, color)
  SELECT
    v_new_stream_id,
    module_number,
    module_name,
    start_date + v_date_offset,
    end_date + v_date_offset,
    color
  FROM stream_modules
  WHERE stream_id = p_source_stream_id;

  -- Скопировать события с новыми датами (без доступов - заполним вручную)
  INSERT INTO calendar_events (
    stream_id, module_id, title, description, event_date, event_time,
    event_type, external_url, material_id, lesson_id, technique_id, cover_image
  )
  SELECT
    v_new_stream_id,
    (SELECT id FROM stream_modules WHERE stream_id = v_new_stream_id AND module_number = sm.module_number),
    ce.title,
    ce.description,
    ce.event_date + v_date_offset,
    ce.event_time,
    ce.event_type,
    ce.external_url,
    ce.material_id,
    ce.lesson_id,
    ce.technique_id,
    ce.cover_image
  FROM calendar_events ce
  JOIN stream_modules sm ON sm.id = ce.module_id
  WHERE ce.stream_id = p_source_stream_id;

  RETURN v_new_stream_id;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 Фронтенд

**Компонент:** `src/pages/CalendarPage/CalendarPage.tsx`
```typescript
export const CalendarPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const isGuest = useIsGuest()
  const { user } = useSupabaseUser()

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', user?.id, selectedMonth],
    queryFn: () => supabase.rpc('get_user_calendar_events', {
      p_user_id: user?.id,
      p_month: selectedMonth
    })
  })

  const handleDateClick = (date: Date) => {
    if (isGuest) {
      // Показать попап для гостя
      setShowGuestModal(true)
      return
    }
    setSelectedDate(date)
  }

  return (
    <Page>
      <CalendarHeader
        month={selectedMonth}
        onPrevMonth={() => setSelectedMonth(subMonths(selectedMonth, 1))}
        onNextMonth={() => setSelectedMonth(addMonths(selectedMonth, 1))}
      />

      <CalendarGrid
        month={selectedMonth}
        events={events}
        selectedDate={selectedDate}
        onDateClick={handleDateClick}
      />

      {selectedDate && !isGuest && (
        <EventsList
          date={selectedDate}
          events={events?.filter(e => isSameDay(e.event_date, selectedDate))}
        />
      )}

      <ModuleColorLegend />
    </Page>
  )
}
```

**Компонент:** `src/widgets/calendar/ui/CalendarGrid.tsx`
```typescript
export const CalendarGrid = ({ month, events, selectedDate, onDateClick }: Props) => {
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month)
  })

  const getEventsForDay = (day: Date) => {
    return events?.filter(e => isSameDay(new Date(e.event_date), day)) || []
  }

  const getModuleColorsForDay = (day: Date) => {
    const dayEvents = getEventsForDay(day)
    return [...new Set(dayEvents.map(e => e.module_color).filter(Boolean))]
  }

  return (
    <div className={styles.grid}>
      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
        <div key={day} className={styles.dayName}>{day}</div>
      ))}

      {daysInMonth.map(day => {
        const dayEvents = getEventsForDay(day)
        const moduleColors = getModuleColorsForDay(day)
        const isSelected = selectedDate && isSameDay(day, selectedDate)
        const isToday = isToday(day)

        return (
          <CalendarDay
            key={day.toISOString()}
            date={day}
            hasEvents={dayEvents.length > 0}
            moduleColors={moduleColors}
            isSelected={isSelected}
            isToday={isToday}
            onClick={() => onDateClick(day)}
          />
        )
      })}
    </div>
  )
}
```

**Компонент:** `src/entities/calendar/ui/EventCard.tsx`
```typescript
export const EventCard = ({ event, canAccess }: Props) => {
  const navigate = useNavigate()

  const handleAction = () => {
    if (!canAccess) {
      // Показать попап "недоступно для вашего тарифа"
      return
    }

    switch (event.event_type) {
      case 'zoom':
      case 'offline':
        window.open(event.external_url, '_blank')
        break
      case 'lesson_unlock':
        navigate(`/library/lesson/${event.lesson_id}`)
        break
      case 'material_unlock':
        navigate(`/library/material/${event.material_id}`)
        break
      case 'technique_unlock':
        navigate(`/techniques/${event.technique_id}`)
        break
    }
  }

  return (
    <Card>
      {event.cover_image && <Image src={event.cover_image} />}

      <Badge color={event.module_color}>
        {event.module_name}
      </Badge>

      <Title>{event.title}</Title>
      <Description>{event.description}</Description>

      <DateTime>
        {format(new Date(event.event_date), 'dd MMMM yyyy', { locale: ru })}
        {event.event_time && `, ${event.event_time}`}
      </DateTime>

      <EventTypeBadge type={event.event_type} />

      {canAccess ? (
        <Button onClick={handleAction} variant="primary">
          {event.event_type === 'zoom' || event.event_type === 'offline'
            ? 'Перейти'
            : 'Открыть материал'}
        </Button>
      ) : (
        <LockedBadge>
          Недоступно для вашего тарифа
        </LockedBadge>
      )}
    </Card>
  )
}
```

### 3.3 Админка

**Добавить в AdminPage таб "Потоки и Календарь":**

```typescript
// src/pages/AdminPage/components/StreamsManager.tsx
export const StreamsManager = () => {
  const { data: streams } = useStreamsAdmin()
  const [selectedStream, setSelectedStream] = useState<string | null>(null)
  const copyStreamMutation = useMutation({
    mutationFn: async (params: { streamId: string, name: string, startDate: Date }) => {
      return await supabase.rpc('copy_stream', {
        p_source_stream_id: params.streamId,
        p_new_stream_name: params.name,
        p_new_start_date: params.startDate
      })
    }
  })

  return (
    <div>
      <StreamsList
        streams={streams}
        onSelect={setSelectedStream}
        onCopy={(streamId) => {
          // Показать диалог с вводом имени и даты
          const name = prompt('Имя нового потока')
          const startDate = prompt('Дата начала (YYYY-MM-DD)')
          if (name && startDate) {
            copyStreamMutation.mutate({ streamId, name, startDate: new Date(startDate) })
          }
        }}
      />

      {selectedStream && (
        <>
          <StreamEditor streamId={selectedStream} />
          <StreamModulesEditor streamId={selectedStream} />
        </>
      )}
    </div>
  )
}

// src/pages/AdminPage/components/CalendarEventsManager.tsx
export const CalendarEventsManager = () => {
  const [selectedStream, setSelectedStream] = useState<string | null>(null)
  const { data: events } = useCalendarEventsAdmin(selectedStream)

  return (
    <div>
      <StreamSelector value={selectedStream} onChange={setSelectedStream} />

      <EventsTable events={events} />

      <CreateEventForm streamId={selectedStream} />
    </div>
  )
}
```

### 3.4 Интеграция с ботом (пуш-уведомления)

**Создать Edge Function для отправки уведомлений:**
```typescript
// supabase/functions/send-event-notifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Получить события на завтра
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: events } = await supabase
    .from('calendar_events')
    .select(`
      *,
      user_stream_enrollments(user_id)
    `)
    .eq('event_date', tomorrow.toISOString().split('T')[0])

  // Отправить пуш-уведомления через Telegram Bot API
  for (const event of events) {
    for (const enrollment of event.user_stream_enrollments) {
      await sendTelegramNotification(enrollment.user_id, {
        title: event.title,
        message: `Завтра в ${event.event_time} - ${event.title}`,
        url: event.external_url
      })
    }
  }

  return new Response('OK')
})
```

**Настроить Cron в Supabase:**
```sql
-- Запускать каждый день в 19:00
SELECT cron.schedule(
  'send-event-notifications',
  '0 19 * * *',
  'https://your-project.supabase.co/functions/v1/send-event-notifications'
);
```

### 3.5 Задачи

- [ ] Создать таблицы `streams`, `stream_modules`, `calendar_events`
- [ ] Создать таблицы `event_tariff_access`, `user_stream_enrollments`
- [ ] Создать функции `get_user_calendar_events()` и `copy_stream()`
- [ ] Создать `CalendarPage` с сеткой
- [ ] Создать `CalendarGrid` с цветовой подсветкой
- [ ] Создать `EventCard` с кнопками действий
- [ ] Добавить `StreamsManager` и `CalendarEventsManager` в админку
- [ ] Создать Edge Function для пуш-уведомлений
- [ ] Настроить Cron для ежедневной отправки уведомлений
- [ ] Протестировать копирование потока

---

## 4️⃣ ДОМАШНИЕ ЗАДАНИЯ ПО ЗАДАНИЯМ (Assignments)

### 4.1 База данных

```sql
-- 1. Таблица заданий
CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  lesson_id INT REFERENCES lessons(id) ON DELETE CASCADE,
  order_num INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Изменить submissions
ALTER TABLE submissions ADD COLUMN assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE;
-- Теперь один submission = одно задание

-- 3. Таблица черновиков
CREATE TABLE assignment_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assignment_id INT REFERENCES assignments(id) ON DELETE CASCADE,
  draft_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, assignment_id)
);

-- 4. Функция получения прогресса по дню
CREATE OR REPLACE FUNCTION get_lesson_assignment_progress(
  p_user_id UUID,
  p_lesson_id INT
)
RETURNS TABLE (
  total_assignments INT,
  submitted_assignments INT,
  approved_assignments INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(a.id)::INT AS total_assignments,
    COUNT(s.id) FILTER (WHERE s.status IN ('pending_review', 'approved'))::INT AS submitted_assignments,
    COUNT(s.id) FILTER (WHERE s.status = 'approved')::INT AS approved_assignments
  FROM assignments a
  LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = p_user_id
  WHERE a.lesson_id = p_lesson_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Функция проверки, сдал ли ученик все ДЗ модулей "Исцеление" и "Психолог"
CREATE OR REPLACE FUNCTION has_user_completed_healing_and_psychologist(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_assignments INT;
  v_approved_assignments INT;
BEGIN
  -- Получить все задания из модулей "Исцеление" и "Психолог"
  SELECT
    COUNT(a.id),
    COUNT(s.id) FILTER (WHERE s.status = 'approved')
  INTO v_total_assignments, v_approved_assignments
  FROM assignments a
  JOIN lessons l ON l.id = a.lesson_id
  JOIN course_stages cs ON cs.id = l.stage_id
  LEFT JOIN submissions s ON s.assignment_id = a.id AND s.user_id = p_user_id
  WHERE cs.name IN ('Исцеление', 'Психолог');

  RETURN v_approved_assignments = v_total_assignments;
END;
$$ LANGUAGE plpgsql;

-- 6. Триггер для автоматического открытия модулей "Доктор наук" и "Спецслужбы"
CREATE OR REPLACE FUNCTION check_and_unlock_advanced_modules()
RETURNS TRIGGER AS $$
BEGIN
  -- Если все ДЗ из "Исцеления" и "Психолога" сданы
  IF has_user_completed_healing_and_psychologist(NEW.user_id) THEN
    -- Открыть доступ к модулям "Доктор наук" и "Спецслужбы"
    -- (предполагается, что есть функция unlock_stage_for_user)
    PERFORM unlock_stage_for_user(NEW.user_id, 'Доктор наук');
    PERFORM unlock_stage_for_user(NEW.user_id, 'Спецслужбы');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_unlock_advanced_modules
AFTER UPDATE OF status ON submissions
FOR EACH ROW
WHEN (NEW.status = 'approved')
EXECUTE FUNCTION check_and_unlock_advanced_modules();
```

### 4.2 Фронтенд

**Компонент:** `src/pages/LessonPage/components/AssignmentsList.tsx`
```typescript
export const AssignmentsList = ({ lessonId }: Props) => {
  const { user } = useSupabaseUser()
  const { data: assignments } = useAssignments(lessonId)
  const { data: submissions } = useUserSubmissions(user?.id, lessonId)
  const { data: drafts } = useUserDrafts(user?.id, lessonId)
  const { data: progress } = useLessonProgress(user?.id, lessonId)
  const { data: feedback } = useLessonFeedback(user?.id, lessonId) // ОС по дню в целом

  const allSubmitted = progress?.submitted_assignments === progress?.total_assignments

  return (
    <div>
      <ProgressBar
        current={progress?.submitted_assignments || 0}
        total={progress?.total_assignments || 0}
        label={`Сдал ${progress?.submitted_assignments || 0} из ${progress?.total_assignments || 0}`}
      />

      {assignments?.map(assignment => {
        const submission = submissions?.find(s => s.assignment_id === assignment.id)
        const draft = drafts?.find(d => d.assignment_id === assignment.id)

        return (
          <AssignmentItem
            key={assignment.id}
            assignment={assignment}
            submission={submission}
            draft={draft}
          />
        )
      })}

      {allSubmitted && !feedback && (
        <SuccessMessage>
          <Icon name="check-circle" />
          <Text>Молодец! Трекер уже проверяет</Text>
        </SuccessMessage>
      )}

      {feedback && (
        <FeedbackCard>
          <Title>Обратная связь от куратора</Title>
          <FeedbackText>{feedback.text}</FeedbackText>
        </FeedbackCard>
      )}
    </div>
  )
}
```

**Компонент:** `src/entities/assignments/ui/AssignmentItem.tsx`
```typescript
export const AssignmentItem = ({ assignment, submission, draft }: Props) => {
  const [text, setText] = useState(draft?.draft_text || '')
  const [expanded, setExpanded] = useState(false)

  const saveDraftMutation = useMutation({
    mutationFn: async (draftText: string) => {
      return await supabase
        .from('assignment_drafts')
        .upsert({
          user_id: user.id,
          assignment_id: assignment.id,
          draft_text: draftText
        })
    }
  })

  const submitMutation = useMutation({
    mutationFn: async (submissionText: string) => {
      return await supabase
        .from('submissions')
        .insert({
          user_id: user.id,
          assignment_id: assignment.id,
          submission_text: submissionText,
          status: 'pending_review'
        })
    }
  })

  // Автосохранение черновика
  const debouncedSave = useDebouncedCallback((value: string) => {
    saveDraftMutation.mutate(value)
  }, 1000)

  const handleChange = (value: string) => {
    setText(value)
    debouncedSave(value)
  }

  const renderStatus = () => {
    if (!submission) return null

    if (submission.status === 'approved') {
      return (
        <Badge variant="success">
          ✅ Задание принято! +{submission.points_awarded} баллов
        </Badge>
      )
    }

    if (submission.status === 'pending_review') {
      return <Badge variant="warning">⏳ На проверке</Badge>
    }

    if (submission.status === 'rejected') {
      return (
        <Badge variant="error">
          ❌ Требует доработки
        </Badge>
      )
    }
  }

  return (
    <Card>
      <CardHeader onClick={() => setExpanded(!expanded)}>
        <Title>{assignment.title}</Title>
        {renderStatus()}
        <ExpandIcon expanded={expanded} />
      </CardHeader>

      {expanded && (
        <CardContent>
          <Description>{assignment.description}</Description>

          {submission?.feedback_text && (
            <FeedbackBlock>
              <FeedbackLabel>Обратная связь:</FeedbackLabel>
              <FeedbackText>{submission.feedback_text}</FeedbackText>
            </FeedbackBlock>
          )}

          {(!submission || submission.status === 'rejected') && (
            <>
              <Textarea
                value={text}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Ваш ответ..."
                rows={6}
              />

              <FileUploader
                onUpload={(url) => setText(prev => `${prev}\n${url}`)}
              />

              <Button
                onClick={() => submitMutation.mutate(text)}
                disabled={!text.trim()}
                loading={submitMutation.isLoading}
              >
                Сдать задание
              </Button>

              {saveDraftMutation.isLoading && (
                <SavingIndicator>Сохранение...</SavingIndicator>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
```

### 4.3 Админка

**Изменить SubmissionsManager:**

```typescript
// src/pages/AdminPage/components/SubmissionsManager.tsx
export const SubmissionsManager = () => {
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null)
  const { data: submissions } = useSubmissionsAdmin(selectedLesson)

  // Группировать сдачи по пользователям и дням
  const groupedSubmissions = useMemo(() => {
    const groups = new Map()

    submissions?.forEach(submission => {
      const key = `${submission.user_id}-${submission.lesson_id}`
      if (!groups.has(key)) {
        groups.set(key, {
          user: submission.user,
          lesson: submission.lesson,
          assignments: []
        })
      }
      groups.get(key).assignments.push(submission)
    })

    return Array.from(groups.values())
  }, [submissions])

  return (
    <div>
      <LessonSelector value={selectedLesson} onChange={setSelectedLesson} />

      {groupedSubmissions.map(group => {
        const allSubmitted = group.assignments.every(a =>
          a.status === 'pending_review' || a.status === 'approved'
        )

        return (
          <UserSubmissionGroup key={`${group.user.id}-${group.lesson.id}`}>
            <GroupHeader>
              <UserInfo>
                <Avatar src={group.user.photo_url} />
                <Name>{group.user.first_name}</Name>
              </UserInfo>
              <Progress>
                {group.assignments.filter(a => a.status !== 'draft').length} / {group.assignments.length}
              </Progress>
            </GroupHeader>

            {group.assignments.map(submission => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                onApprove={handleApprove}
                onReject={handleReject}
                onManualCheck={handleManualCheck}
              />
            ))}

            {allSubmitted && (
              <FeedbackForm
                userId={group.user.id}
                lessonId={group.lesson.id}
                onSubmit={handleFeedbackSubmit}
              />
            )}
          </UserSubmissionGroup>
        )
      })}
    </div>
  )
}
```

### 4.4 Задачи

- [ ] Создать таблицу `assignments`
- [ ] Изменить таблицу `submissions` (добавить `assignment_id`)
- [ ] Создать таблицу `assignment_drafts`
- [ ] Создать функции `get_lesson_assignment_progress()` и `has_user_completed_healing_and_psychologist()`
- [ ] Создать триггер автоматического открытия модулей "Доктор наук" и "Спецслужбы"
- [ ] Мигрировать существующие submissions (разбить по заданиям, если нужно)
- [ ] Создать `AssignmentsList` с прогресс-баром
- [ ] Создать `AssignmentItem` с автосохранением
- [ ] Изменить `SubmissionsManager` в админке (группировка по дням)
- [ ] Добавить форму обратной связи по дню в целом
- [ ] Протестировать автоматическое открытие модулей

---

## 5️⃣ ДОПОЛНИТЕЛЬНЫЕ УЛУЧШЕНИЯ

### 5.1 Дорожная карта

**Компонент:** `src/widgets/roadmap/ui/RoadmapModal.tsx`
```typescript
export const RoadmapModal = ({ isOpen, onClose }: Props) => {
  const { user } = useSupabaseUser()
  const { data: progress } = useUserProgress(user?.id)
  const { data: tariff } = useActiveTariff(user?.id)

  const currentWeek = calculateCurrentWeek(tariff?.start_date, new Date())
  const totalWeeks = Math.ceil((tariff?.duration_days || 0) / 7)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ProgressBar current={currentWeek} total={totalWeeks} />

        <UserInfo>
          <Avatar src={user?.photo_url} />
          <Name>{user?.first_name}</Name>
        </UserInfo>

        <ModulesProgress>
          {progress?.modules.map(module => (
            <ModuleCircle
              key={module.id}
              name={module.name}
              progress={module.completed_lessons / module.total_lessons}
              locked={!module.has_access}
            />
          ))}
        </ModulesProgress>
      </ModalContent>
    </Modal>
  )
}
```

**Задачи:**
- [ ] Создать `RoadmapModal`
- [ ] Добавить кнопку "Дорожная карта" на `MainPage`
- [ ] Реализовать расчет текущей недели обучения
- [ ] Протестировать отображение для разных тарифов

### 5.2 Поиск по модулям

**Компонент:** `src/features/search/ui/SearchBar.tsx`
```typescript
import Fuse from 'fuse.js'

export const SearchBar = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const { data: lessons } = useLessons()

  const fuse = useMemo(() => {
    return new Fuse(lessons || [], {
      keys: ['name', 'description'],
      threshold: 0.3,
      includeScore: true
    })
  }, [lessons])

  const handleSearch = useDebouncedCallback((value: string) => {
    if (value.length < 2) {
      setResults([])
      return
    }

    const searchResults = fuse.search(value)
    setResults(searchResults.map(r => r.item))
  }, 300)

  return (
    <SearchContainer>
      <SearchInput
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          handleSearch(e.target.value)
        }}
        placeholder="Поиск по заданиям..."
      />

      {results.length > 0 && (
        <SearchResults>
          {results.map(lesson => (
            <SearchResultItem
              key={lesson.id}
              moduleName={lesson.stage.name}
              dayNumber={lesson.order_num}
              lessonName={lesson.name}
              onClick={() => {
                navigate(`/library/lesson/${lesson.id}`)
                setQuery('')
                setResults([])
              }}
            />
          ))}
        </SearchResults>
      )}
    </SearchContainer>
  )
}
```

**Задачи:**
- [ ] Установить `fuse.js`
- [ ] Создать `SearchBar`
- [ ] Добавить на `MainPage`
- [ ] Индексировать уроки с названиями и описаниями
- [ ] Протестировать поиск

### 5.3 Изменение TabBar

**Задачи:**
- [ ] Изменить порядок табов: Техники, Календарь, Главная, Профиль
- [ ] Изменить иконку "Библиотека" → "Техники"
- [ ] Добавить иконку "Календарь"

### 5.4 Автоскролл к текущему дню

```typescript
// В LessonPage или StageView
useEffect(() => {
  const currentLesson = lessons.find(l => {
    const openDate = new Date(l.open_at)
    const now = new Date()
    return openDate <= now && (!l.completed || isToday(openDate))
  })

  if (currentLesson) {
    document.getElementById(`lesson-${currentLesson.id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }
}, [lessons])
```

**Задачи:**
- [ ] Добавить автоскролл к текущему дню
- [ ] Протестировать на разных устройствах

### 5.5 Аудит производительности

**Задачи:**
- [ ] Запустить Lighthouse аудит
- [ ] Измерить FCP, LCP, TTI
- [ ] Оптимизировать lazy loading изображений
- [ ] Добавить prefetching для критических ресурсов
- [ ] Проверить bundle size (использовать `vite-bundle-visualizer`)
- [ ] Настроить CDN caching в Vercel
- [ ] Оптимизировать анимации (`will-change`, `transform`)

---

## 📊 ОЦЕНКА ВРЕМЕНИ

| Задача | Время | Приоритет |
|--------|-------|-----------|
| **1. Гостевой режим** | **6 часов** | 🔴 КРИТИЧНО |
| - База данных | 1 ч | |
| - Фронтенд (хук, модал) | 2 ч | |
| - Интеграция на всех экранах | 2 ч | |
| - Тестирование | 1 ч | |
| **2. Раздел "Техники"** | **10 часов** | 🔴 КРИТИЧНО |
| - База данных | 2 ч | |
| - Фронтенд (страница, карточки) | 4 ч | |
| - Админка | 2 ч | |
| - Плеер | 1 ч | |
| - Тестирование | 1 ч | |
| **3. Календарь** | **10 часов** | 🔴 КРИТИЧНО |
| - База данных | 2 ч | |
| - Фронтенд (сетка, события) | 4 ч | |
| - Админка | 2 ч | |
| - Интеграция с ботом | 1 ч | |
| - Тестирование | 1 ч | |
| **4. ДЗ по заданиям** | **4 часа** | 🔴 КРИТИЧНО |
| - База данных | 1 ч | |
| - Фронтенд (список заданий) | 2 ч | |
| - Админка | 1 ч | |
| **5. Дополнительно** | **5 часов** | 🟡 СРЕДНИЙ |
| - Дорожная карта | 2 ч | |
| - Поиск | 2 ч | |
| - TabBar + автоскролл | 1 ч | |
| **6. Аудит производительности** | **2 часа** | 🟢 НИЗКИЙ |
| **ИТОГО** | **~37 часов** | **≈ 1 неделя** |

---

## ✅ ЧЕКЛИСТ ГОТОВНОСТИ

### Гостевой режим
- [ ] Роль `guest` добавлена в БД
- [ ] Функция `is_user_guest()` создана
- [ ] Хук `useIsGuest()` работает
- [ ] Компонент `GuestBlockedModal` создан
- [ ] Логика для гостей на всех экранах:
  - [ ] Техники
  - [ ] Календарь
  - [ ] Главная
  - [ ] Профиль

### Раздел "Техники"
- [ ] Таблица `techniques` создана
- [ ] Таблица `user_technique_access` создана
- [ ] Функции доступа созданы
- [ ] Цепочка доступов работает (Императрица → Жрица → Богиня)
- [ ] `TechniquesPage` с табами
- [ ] `TechniqueCard` с статусами
- [ ] `TechniquePlayerPage` с анимацией
- [ ] `TechniquesManager` в админке
- [ ] TabBar обновлен (иконка, название)

### Календарь
- [ ] Таблицы `streams`, `stream_modules`, `calendar_events` созданы
- [ ] Функция `get_user_calendar_events()` работает
- [ ] Функция `copy_stream()` работает
- [ ] `CalendarPage` с сеткой
- [ ] Цветовая подсветка модулей
- [ ] `EventCard` с кнопками действий
- [ ] `StreamsManager` в админке
- [ ] `CalendarEventsManager` в админке
- [ ] Пуш-уведомления через бота

### ДЗ по заданиям
- [ ] Таблица `assignments` создана
- [ ] `submissions` обновлена (`assignment_id`)
- [ ] Таблица `assignment_drafts` создана
- [ ] Функция `get_lesson_assignment_progress()` работает
- [ ] Триггер автоматического открытия модулей
- [ ] `AssignmentsList` с прогресс-баром
- [ ] `AssignmentItem` с автосохранением
- [ ] `SubmissionsManager` в админке (группировка по дням)
- [ ] Форма обратной связи по дню

### Дополнительно
- [ ] Дорожная карта на главной
- [ ] Поиск по модулям
- [ ] TabBar обновлен (порядок табов)
- [ ] Автоскролл к текущему дню
- [ ] Аудит производительности проведен

---

## 🎯 МЕТРИКИ УСПЕХА

### Бизнес-метрики:
- ✅ Гостевой режим позволяет привлекать новых пользователей
- ✅ Раздел "Техники" доступен с табами и статусами
- ✅ Календарь показывает события для каждого потока
- ✅ Сдача ДЗ по заданиям улучшает UX

### Технические метрики:
- ✅ LCP < 2.5s
- ✅ Bundle size < 500KB (gzipped)
- ✅ TypeScript покрытие 100%
- ✅ Lighthouse Score > 90

---

---

---

# 📋 ВЕРСИЯ 2: КОРОТКИЙ ПЛАН (Jira Style)

## 🔴 EPIC 1: Гостевой режим

### BRAIN-101: Добавить роль `guest` в БД
**Story Points:** 1
**Priority:** Highest
**Description:** Добавить enum значение `guest` в тип `user_role`

**Acceptance Criteria:**
- [ ] Enum `user_role` содержит `guest`
- [ ] Создана функция `is_user_guest(user_id UUID)`

---

### BRAIN-102: Создать хук `useIsGuest`
**Story Points:** 2
**Priority:** Highest
**Description:** Хук для определения, является ли пользователь гостем

**Acceptance Criteria:**
- [ ] Хук возвращает `true` если нет активного тарифа
- [ ] Хук работает с React Query

---

### BRAIN-103: Создать компонент `GuestBlockedModal`
**Story Points:** 2
**Priority:** Highest
**Description:** Модальное окно с сообщением для гостей

**Acceptance Criteria:**
- [ ] Модальное окно с текстом "Доступно только ученикам"
- [ ] Кнопка "Оставить заявку" ведет на внешний сайт

---

### BRAIN-104: Интегрировать гостевые ограничения на экранах
**Story Points:** 5
**Priority:** Highest
**Description:** Применить логику гостевого доступа на всех экранах

**Acceptance Criteria:**
- [ ] Техники: гость видит 2 бесплатные, остальные заблокированы
- [ ] Календарь: гость видит сетку, но не может кликать на даты
- [ ] Главная: гость видит структуру, может провалиться только в "Исцеление"
- [ ] Профиль: все заблокировано, активна только кнопка "Помощь"

---

## 🔴 EPIC 2: Раздел "Техники"

### BRAIN-201: Создать таблицу `techniques`
**Story Points:** 3
**Priority:** Highest
**Description:** Таблица для хранения аудиопрактик

**Acceptance Criteria:**
- [ ] Таблица содержит поля: title, audio_url, status, purchase_url, unlock_condition
- [ ] Создана таблица `user_technique_access`

---

### BRAIN-202: Создать функции доступа к техникам
**Story Points:** 3
**Priority:** Highest
**Description:** Функции `can_user_access_technique()` и `can_user_purchase_technique()`

**Acceptance Criteria:**
- [ ] Функции проверяют бесплатный доступ
- [ ] Функции проверяют условия разблокировки (цепочка техник)
- [ ] Функции проверяют временные условия (30 дней)

---

### BRAIN-203: Создать `TechniquesPage` с табами
**Story Points:** 5
**Priority:** Highest
**Description:** Страница с табами "Все техники" / "Мои техники"

**Acceptance Criteria:**
- [ ] Переключение между табами работает
- [ ] Таб "Все техники" показывает все техники
- [ ] Таб "Мои техники" показывает бесплатные + купленные

---

### BRAIN-204: Создать `TechniqueCard`
**Story Points:** 5
**Priority:** Highest
**Description:** Карточка техники с логикой статусов

**Acceptance Criteria:**
- [ ] Отображение статусов: бесплатная, к покупке, моя, заблокирована
- [ ] Кнопки "Купить на сайте" / "Повысить тариф"
- [ ] Метка "Доступна с модуля X"
- [ ] Тултип для заблокированных техник

---

### BRAIN-205: Создать `TechniquePlayerPage`
**Story Points:** 3
**Priority:** High
**Description:** Страница плеера с анимацией

**Acceptance Criteria:**
- [ ] Воспроизведение аудио
- [ ] Персональная анимация для каждой техники
- [ ] Кнопка "Читать описание"

---

### BRAIN-206: Добавить `TechniquesManager` в админку
**Story Points:** 5
**Priority:** High
**Description:** Управление техниками через админку

**Acceptance Criteria:**
- [ ] CRUD операции для техник
- [ ] Загрузка аудио на R2
- [ ] Настройка условий разблокировки
- [ ] Настройка ссылок на покупку

---

### BRAIN-207: Изменить TabBar (иконка, название)
**Story Points:** 1
**Priority:** Medium
**Description:** Переименовать "Библиотека" → "Техники"

**Acceptance Criteria:**
- [ ] Название изменено
- [ ] Иконка изменена
- [ ] Порядок табов: Техники, Календарь, Главная, Профиль

---

## 🔴 EPIC 3: Календарь

### BRAIN-301: Создать таблицы потоков и модулей
**Story Points:** 3
**Priority:** Highest
**Description:** Таблицы `streams`, `stream_modules`, `calendar_events`

**Acceptance Criteria:**
- [ ] Таблица `streams` создана
- [ ] Таблица `stream_modules` создана (с цветами)
- [ ] Таблица `calendar_events` создана
- [ ] Таблицы `event_tariff_access`, `user_stream_enrollments` созданы

---

### BRAIN-302: Создать функции календаря
**Story Points:** 3
**Priority:** Highest
**Description:** Функции `get_user_calendar_events()` и `copy_stream()`

**Acceptance Criteria:**
- [ ] Функция `get_user_calendar_events()` возвращает события пользователя
- [ ] Функция `copy_stream()` копирует контент потока с новыми датами

---

### BRAIN-303: Создать `CalendarPage` с сеткой
**Story Points:** 5
**Priority:** Highest
**Description:** Страница календаря с сеткой месяца

**Acceptance Criteria:**
- [ ] Сетка календаря отображается корректно
- [ ] Переключение месяцев работает
- [ ] Текущая дата подсвечена
- [ ] Даты с событиями выделены

---

### BRAIN-304: Реализовать цветовую подсветку модулей
**Story Points:** 3
**Priority:** High
**Description:** Подсветка дат разными цветами в зависимости от модуля

**Acceptance Criteria:**
- [ ] Даты окрашены в цвета модулей
- [ ] Тултип с легендой цветов
- [ ] Несколько модулей в один день показывают все цвета

---

### BRAIN-305: Создать `EventCard`
**Story Points:** 3
**Priority:** High
**Description:** Карточка события с кнопками действий

**Acceptance Criteria:**
- [ ] Отображение названия, описания, даты, времени
- [ ] Кнопка "Перейти" для Zoom-событий
- [ ] Кнопка "Открыть материал" для материалов/уроков
- [ ] Индикация недоступных событий для тарифа

---

### BRAIN-306: Добавить `StreamsManager` в админку
**Story Points:** 5
**Priority:** High
**Description:** Управление потоками через админку

**Acceptance Criteria:**
- [ ] CRUD операции для потоков
- [ ] Настройка модулей потока (даты, цвета)
- [ ] Кнопка "Скопировать поток"

---

### BRAIN-307: Добавить `CalendarEventsManager` в админку
**Story Points:** 5
**Priority:** High
**Description:** Управление событиями календаря через админку

**Acceptance Criteria:**
- [ ] CRUD операции для событий
- [ ] Привязка событий к потокам
- [ ] Настройка доступа по тарифам
- [ ] Загрузка обложек

---

### BRAIN-308: Интеграция с ботом (пуш-уведомления)
**Story Points:** 3
**Priority:** Medium
**Description:** Отправка уведомлений перед событиями через Telegram

**Acceptance Criteria:**
- [ ] Edge Function для отправки уведомлений
- [ ] Cron задача запускается каждый день в 19:00
- [ ] Уведомления отправляются за 1 день до события

---

## 🔴 EPIC 4: ДЗ по заданиям

### BRAIN-401: Создать таблицу `assignments`
**Story Points:** 2
**Priority:** Highest
**Description:** Таблица для хранения заданий внутри урока

**Acceptance Criteria:**
- [ ] Таблица содержит: lesson_id, order_num, title, description
- [ ] `submissions` обновлена (добавлен `assignment_id`)

---

### BRAIN-402: Создать таблицу `assignment_drafts`
**Story Points:** 1
**Priority:** High
**Description:** Таблица для автосохранения черновиков

**Acceptance Criteria:**
- [ ] Таблица содержит: user_id, assignment_id, draft_text, updated_at
- [ ] Уникальность по (user_id, assignment_id)

---

### BRAIN-403: Создать функции прогресса
**Story Points:** 2
**Priority:** High
**Description:** Функции `get_lesson_assignment_progress()` и триггер открытия модулей

**Acceptance Criteria:**
- [ ] Функция возвращает total/submitted/approved заданий
- [ ] Триггер автоматически открывает "Доктор наук" и "Спецслужбы"

---

### BRAIN-404: Создать `AssignmentsList` с прогресс-баром
**Story Points:** 5
**Priority:** Highest
**Description:** Список заданий дня с прогресс-баром

**Acceptance Criteria:**
- [ ] Прогресс-бар "Сдал X из Y"
- [ ] Список заданий отображается
- [ ] Галочки на сданных заданиях
- [ ] Плашка "Молодец!" после сдачи всех

---

### BRAIN-405: Создать `AssignmentItem` с автосохранением
**Story Points:** 5
**Priority:** Highest
**Description:** Карточка задания с автосохранением черновика

**Acceptance Criteria:**
- [ ] Поле ввода с автосохранением (debounce 1 сек)
- [ ] Кнопка "Сдать задание"
- [ ] Отображение статуса (принято/на проверке/требует доработки)
- [ ] Обратная связь от куратора видна

---

### BRAIN-406: Изменить `SubmissionsManager` в админке
**Story Points:** 5
**Priority:** High
**Description:** Группировка сдач по дням, форма обратной связи

**Acceptance Criteria:**
- [ ] Сдачи группируются по пользователям и дням
- [ ] Видно, сколько заданий дня сдал ученик
- [ ] Форма обратной связи по дню в целом
- [ ] Ручное подтверждение сдачи задания

---

## 🟡 EPIC 5: Дополнительно

### BRAIN-501: Дорожная карта на главной
**Story Points:** 3
**Priority:** Medium
**Description:** Кнопка "дорожная карта" → попап

**Acceptance Criteria:**
- [ ] Кнопка на `MainPage`
- [ ] Попап с прогресс-баром недель
- [ ] Аватарка из Telegram
- [ ] Кружки прогресса по модулям

---

### BRAIN-502: Поиск по модулям
**Story Points:** 3
**Priority:** Medium
**Description:** Поиск по ДЗ на главной странице

**Acceptance Criteria:**
- [ ] Поле ввода с подсказками
- [ ] Поиск с использованием fuse.js
- [ ] Подсказки: модуль, день, название ДЗ
- [ ] Переход к конкретному дню

---

### BRAIN-503: Автоскролл к текущему дню
**Story Points:** 1
**Priority:** Low
**Description:** Автоматический скролл к текущему дню на странице модуля

**Acceptance Criteria:**
- [ ] При открытии модуля скролл к текущему дню
- [ ] Текущий день определяется по `open_at`

---

### BRAIN-504: Аудит производительности
**Story Points:** 2
**Priority:** Low
**Description:** Провести Lighthouse аудит и оптимизировать

**Acceptance Criteria:**
- [ ] Lighthouse Score > 90
- [ ] LCP < 2.5s
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lazy loading изображений

---

## 📊 СПРИНТ ПЛАН (1 НЕДЕЛЯ)

### Sprint 1 (День 1-2): Критичные фичи
- BRAIN-101, 102, 103 (Гостевой режим)
- BRAIN-201, 202, 203, 204 (Техники - база)
- BRAIN-301, 302, 303 (Календарь - база)

**Story Points:** 25
**Задачи:** 9

---

### Sprint 2 (День 3-4): Основные фичи
- BRAIN-104 (Гостевые ограничения)
- BRAIN-205, 206, 207 (Техники - завершение)
- BRAIN-304, 305 (Календарь - события)
- BRAIN-401, 402, 403 (ДЗ по заданиям - база)

**Story Points:** 28
**Задачи:** 9

---

### Sprint 3 (День 5): Завершение + Админка
- BRAIN-306, 307, 308 (Календарь - админка)
- BRAIN-404, 405, 406 (ДЗ по заданиям - завершение)
- BRAIN-501, 502, 503, 504 (Дополнительно)

**Story Points:** 27
**Задачи:** 10

---

## 📈 ДАШБОРД

| Эпик | Задач | Story Points | Приоритет | Статус |
|------|-------|--------------|-----------|--------|
| Гостевой режим | 4 | 10 | 🔴 Highest | ⚪ To Do |
| Раздел "Техники" | 7 | 25 | 🔴 Highest | ⚪ To Do |
| Календарь | 8 | 30 | 🔴 Highest | ⚪ To Do |
| ДЗ по заданиям | 6 | 24 | 🔴 Highest | ⚪ To Do |
| Дополнительно | 4 | 9 | 🟡 Medium | ⚪ To Do |
| **ИТОГО** | **29** | **98** | | |

---

## 🎯 DEFINITION OF DONE

### Code:
- [ ] Код написан и прошел code review
- [ ] TypeScript типизация 100%
- [ ] Нет console.log и закомментированного кода

### Testing:
- [ ] Функциональность протестирована вручную
- [ ] Протестировано на мобильных устройствах
- [ ] Нет критичных багов

### Database:
- [ ] Миграции применены
- [ ] RLS политики настроены
- [ ] Индексы созданы

### Documentation:
- [ ] Код задокументирован (комментарии)
- [ ] README обновлен (если нужно)

### Deploy:
- [ ] Изменения задеплоены на staging
- [ ] Проверено на продакшене

---

## 🚀 ПРИОРИТИЗАЦИЯ

### Must Have (обязательно в релиз):
1. Гостевой режим
2. Раздел "Техники"
3. Календарь
4. ДЗ по заданиям

### Should Have (желательно в релиз):
5. Дорожная карта
6. Поиск по модулям

### Could Have (можно отложить):
7. Автоскролл к текущему дню
8. Аудит производительности

---

**Конец документа**
