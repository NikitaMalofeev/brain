# Дизайн-спецификация административной панели Brain Programming
*Обновлено: 04.06.2025 - РЕАЛЬНОЕ состояние админки на основе кода*

---

## 🎯 Философия дизайна админки

### Принципы
- **Функциональность превыше всего** - UX оптимизирован для ежедневной работы кураторов
- **Светлая тема с glass-эффектами** - современный дизайн с полупрозрачными элементами
- **Адаптивность** - работает на всех устройствах (мобайл + десктоп)
- **Консистентность** - единая система компонентов на основе CSS переменных
- **Быстрота работы** - оптимизация для массовых операций
- **Оптимизированные таблицы** - убраны избыточные счетчики для лучшего UX
- **Унифицированный интерфейс** - одинаковая логика для уроков и дополнительных материалов

> **Важно:** Документация описывает РЕАЛЬНОЕ состояние админки из файла `src/pages/AdminPage/AdminPage.css`

---

## 🎨 Цветовая схема (РЕАЛЬНАЯ)

### CSS переменные из кода
```css
:root {
  /* ===== ГРАДИЕНТЫ ===== */
  --admin-gradient-primary: linear-gradient(135deg, #E1C1F4 0%, #B862EA 100%);
  --admin-gradient-secondary: linear-gradient(135deg, #8DC5F1 0%, #63ABE6 100%);
  --admin-gradient-accent: linear-gradient(135deg, #FFE4A3 0%, #FFD166 100%);
  --admin-gradient-neutral: linear-gradient(135deg, #F3F3F3 0%, #EAEAEA 100%);

  /* ===== ОСНОВНЫЕ ЦВЕТА ===== */
  --admin-primary: #B862EA;
  --admin-primary-hover: #A04FD9;
  --admin-secondary: #63ABE6;
  --admin-success: #4EB3FF;
  --admin-warning: #FFD166;
  --admin-danger: #FF6B6B;
  --admin-danger-hover: #FF5252;
  --admin-info: #63ABE6;

  /* ===== ФОНЫ И ПОВЕРХНОСТИ ===== */
  --admin-bg: #FFFFFF;
  --admin-bg-light: #FFFFFF;
  --admin-bg-secondary: #F1F1F1;

  /* ===== ТЕКСТ И ТИПОГРАФИКА ===== */
  --admin-text: #000000;
  --admin-text-secondary: #9F9F9F;
  --admin-text-tertiary: #8C8C8C;
  --admin-text-label: #8D8D8D;

  /* ===== GLASS-ЭФФЕКТЫ ===== */
  --admin-glass-bg: rgba(255, 255, 255, 0.25);
  --admin-glass-bg-light: rgba(255, 255, 255, 0.9);
  --admin-glass-border: rgba(255, 255, 255, 0.14);
  --admin-glass-border-strong: rgba(89, 89, 89, 0.14);

  /* ===== BLUR-ЭФФЕКТЫ ===== */
  --admin-backdrop-filter: blur(20px);
  --admin-backdrop-filter-card: blur(12px);
  --admin-backdrop-filter-input: blur(32px);

  /* ===== ТЕНИ ===== */
  --admin-shadow-card: 0px 2px 12px rgba(0, 0, 0, 0.06);
  --admin-shadow-glass: 0px 4px 20px rgba(0, 0, 0, 0.08);
  --admin-shadow-floating: 0px 8px 32px rgba(0, 0, 0, 0.12);
  --admin-shadow-button: 0px 2px 8px rgba(0, 0, 0, 0.1);

  /* ===== ГРАНИЦЫ И РАЗДЕЛИТЕЛИ ===== */
  --admin-border: rgba(241, 241, 241, 1);
  --admin-border-light: rgba(225, 225, 225, 0.6);

  /* ===== СКРУГЛЕНИЯ ===== */
  --admin-radius-sm: 12px;
  --admin-radius-md: 16px;
  --admin-radius-lg: 24px;
  --admin-radius-xl: 32px;
  --admin-radius-full: 100px;

  /* ===== ПЕРЕХОДЫ И АНИМАЦИИ ===== */
  --admin-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --admin-transition-slow: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* ===== ТИПОГРАФИКА ===== */
  --admin-font-family: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

---

## 📝 Типографика (РЕАЛЬНАЯ)

### Шрифт
- **Основной шрифт**: Nunito через Google Fonts
- **Fallback**: -apple-system, BlinkMacSystemFont, sans-serif

### Заголовки из кода
```css
/* H1 - главный заголовок админки */
.admin-header h1 {
  font-size: 28px;
  font-weight: 700;
  background: var(--admin-gradient-primary);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent; /* Градиентный текст */
}

/* H2 - заголовки секций */
.section-header h2 {
  font-size: 22px;
  font-weight: 600;
  position: relative;
  padding-left: 12px;
}

/* Полоска слева от H2 */
.section-header h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 20px;
  background: var(--admin-gradient-primary);
  border-radius: 4px;
}
```

---

## 🧩 Система компонентов (РЕАЛЬНАЯ)

### 1. Кнопки

#### Основная кнопка (admin-button)
```css
.admin-button {
  border: none;
  padding: 12px 24px;
  border-radius: var(--admin-radius-xl);
  background: var(--admin-gradient-primary);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--admin-transition);
  position: relative;
  overflow: hidden;
}

.admin-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.admin-button:hover::before {
  left: 100%;
}

.admin-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--admin-shadow-floating);
}

.admin-button:active {
  transform: translateY(0);
  box-shadow: var(--admin-shadow-button);
}

.admin-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
```

#### Кнопка выхода (admin-logout-btn)
```css
.admin-logout-btn {
  background: rgba(255, 107, 107, 0.1);
  color: var(--admin-danger);
  border: 1px solid rgba(255, 107, 107, 0.2);
  padding: 10px 20px;
  border-radius: var(--admin-radius-md);
  font-weight: 600;
  transition: var(--admin-transition);
}

.admin-logout-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  transform: translateY(-1px);
}
```

#### Кнопки действий в таблицах
```css
.action-btn {
  border: none;
  padding: 8px 16px;
  border-radius: var(--admin-radius-md);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: var(--admin-transition);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Кнопка редактирования */
.edit-btn {
  background: rgba(99, 171, 230, 0.1);
  color: var(--admin-secondary);
  border: 1px solid rgba(99, 171, 230, 0.2);
}

.edit-btn::before {
  content: '✎';
  font-size: 14px;
}

.edit-btn:hover {
  background: rgba(99, 171, 230, 0.2);
  box-shadow: var(--admin-shadow-button);
  transform: translateY(-2px);
}

/* Кнопка удаления */
.delete-btn {
  background: rgba(255, 107, 107, 0.1);
  color: var(--admin-danger);
  border: 1px solid rgba(255, 107, 107, 0.2);
}

.delete-btn::before {
  content: '✕';
  font-size: 14px;
}

.delete-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  box-shadow: var(--admin-shadow-button);
  transform: translateY(-2px);
}
```

### 2. Поля ввода (admin-input)

```css
.admin-input {
  width: 100%;
  padding: 12px 16px;
  margin: 8px 0;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-md);
  font-size: 16px;
  background: var(--admin-glass-bg-light);
  color: var(--admin-text);
  backdrop-filter: var(--admin-backdrop-filter-input);
  -webkit-backdrop-filter: var(--admin-backdrop-filter-input);
  box-shadow: var(--admin-shadow-card);
  transition: var(--admin-transition);
  font-family: var(--admin-font-family);
}

.admin-input:focus {
  outline: none;
  border-color: var(--admin-primary);
  box-shadow: 0 0 0 2px rgba(184, 98, 234, 0.2);
  background: rgba(255, 255, 255, 0.95);
}
```

### 3. Таблицы (admin-table)

```css
.admin-table {
  width: 100%;
  background: var(--admin-glass-bg-light);
  backdrop-filter: var(--admin-backdrop-filter-card);
  border-radius: var(--admin-radius-lg);
  overflow: hidden;
  box-shadow: var(--admin-shadow-card);
  border: 1px solid var(--admin-glass-border);
}

.admin-table table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--admin-font-family);
}

.admin-table th {
  background: var(--admin-bg-secondary);
  color: var(--admin-text);
  font-weight: 600;
  text-align: left;
  padding: 16px 20px;
  font-size: 14px;
  border-bottom: 1px solid var(--admin-border);
}

.admin-table tbody tr {
  transition: var(--admin-transition);
}

.admin-table tbody tr:hover {
  background: rgba(184, 98, 234, 0.05);
}

.admin-table tbody tr:not(:last-child) td {
  border-bottom: 1px solid var(--admin-border-light);
}
```

### 4. Модальные окна (admin-modal)

```css
.admin-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: var(--admin-backdrop-filter);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

.admin-modal {
  background: var(--admin-glass-bg-light);
  backdrop-filter: var(--admin-backdrop-filter);
  border-radius: var(--admin-radius-lg);
  padding: 32px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--admin-shadow-floating);
  border: 1px solid var(--admin-glass-border);
  position: relative;
  animation: slideUp 0.3s ease-out;
}

.admin-modal h3 {
  margin: 0 0 24px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--admin-text);
  position: relative;
  padding-left: 12px;
}

.admin-modal h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 16px;
  background: var(--admin-gradient-primary);
  border-radius: 4px;
}

.admin-modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--admin-text-secondary);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: var(--admin-transition);
}

.admin-modal-close:hover {
  background: rgba(255, 107, 107, 0.1);
  color: var(--admin-danger);
}
```

### 5. Карточки (admin-card)

```css
.admin-card {
  background: var(--admin-glass-bg-light);
  backdrop-filter: var(--admin-backdrop-filter-card);
  border-radius: var(--admin-radius-lg);
  padding: 24px;
  border: 1px solid var(--admin-glass-border);
  box-shadow: var(--admin-shadow-card);
  margin-bottom: 24px;
}

.admin-card h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--admin-text);
  position: relative;
  padding-left: 12px;
}

.admin-card h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--admin-text-secondary);
}
```

### 6. Статусы и badges

```css
.admin-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  background: var(--admin-bg-secondary);
  color: var(--admin-text);
}

.admin-status.admin-yes {
  background: rgba(78, 179, 255, 0.1);
  color: var(--admin-success);
  border: 1px solid rgba(78, 179, 255, 0.2);
}

.admin-status.admin-no {
  background: rgba(255, 107, 107, 0.1);
  color: var(--admin-danger);
  border: 1px solid rgba(255, 107, 107, 0.2);
}
```

### 7. Статистические карточки

```css
.admin-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.admin-stat-card {
  background: var(--admin-glass-bg-light);
  padding: 16px 20px;
  border-radius: var(--admin-radius-md);
  border: 1px solid var(--admin-glass-border);
  box-shadow: var(--admin-shadow-card);
  min-width: 140px;
  text-align: center;
}

.admin-stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--admin-primary);
  margin-bottom: 4px;
}

.admin-stat-label {
  font-size: 12px;
  color: var(--admin-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}
```

---

## 📱 Layout и структура (РЕАЛЬНАЯ)

### Основной контейнер
```css
body.admin-mode {
  background: var(--admin-bg);
  overflow-x: hidden;
  font-family: var(--admin-font-family);
  min-height: 100vh;
  color: var(--admin-text);
}

.admin-page {
  min-height: 100vh;
  width: 100%;
  padding: 24px;
  background: var(--admin-bg);
  color: var(--admin-text);
  font-family: var(--admin-font-family);
  max-width: 1280px;
  margin: 0 auto;
  box-sizing: border-box;
}
```

### Заголовок админки
```css
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--admin-border);
}
```

### Табы навигации
```css
.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--admin-border);
  padding-bottom: 16px;
}

.admin-tab {
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: var(--admin-radius-md);
  color: var(--admin-text-secondary);
  font-weight: 500;
  cursor: pointer;
  transition: var(--admin-transition);
}

.admin-tab.active {
  background: var(--admin-gradient-primary);
  color: white;
  box-shadow: var(--admin-shadow-button);
}

.admin-tab.active::after {
  content: '';
  position: absolute;
  bottom: -17px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  background: var(--admin-primary);
  border-radius: 50%;
}

.admin-tab:hover:not(.active) {
  background: rgba(184, 98, 234, 0.05);
  color: var(--admin-primary);
}
```

---

## 🔧 Формы и взаимодействие (РЕАЛЬНАЯ)

### Группы полей
```css
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--admin-text);
  font-size: 14px;
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.form-row .form-group {
  flex: 1;
  margin-bottom: 0;
  min-width: 200px;
}
```

### Действия формы
```css
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  flex-wrap: wrap;
}
```

### Чекбоксы
```css
.checkbox-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.checkbox-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.checkbox-group label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
```

---

## 📱 Адаптивность (РЕАЛЬНАЯ)

```css
@media (max-width: 768px) {
  .admin-page {
    padding: 16px;
  }

  .admin-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .admin-header button {
    width: 100%;
  }

  .section-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .admin-tabs {
    flex-wrap: wrap;
  }

  .admin-tab {
    flex: 1;
    min-width: 120px;
  }

  .admin-modal {
    width: 95%;
    padding: 20px;
  }

  .form-row {
    flex-direction: column;
  }

  .form-row .form-group {
    min-width: auto;
  }
}
```

---

## ⚡ Анимации (РЕАЛЬНАЯ)

### Переключение табов
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.admin-content.tab-switching {
  animation: fadeInUp 0.2s ease-out;
}
```

### Модальные окна
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Загрузка
```css
@keyframes spinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.admin-loading::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border: 2px solid var(--admin-border);
  border-top: 2px solid var(--admin-primary);
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
}
```

---

## 🎯 Специальные компоненты

### FileUploader (Реальная реализация)
- **Файл**: `src/components/FileUploader/FileUploader.tsx`
- **Drag & Drop** с визуальной обратной связью
- **Превью** для изображений, аудио и PDF
- **Кнопка удаления** существующих файлов
- **Интеграция с Supabase Storage**

### Редактируемые ячейки таблиц
```css
.editable-cell {
  cursor: pointer;
  position: relative;
  transition: var(--admin-transition);
  border-radius: 4px;
  padding: 4px 8px;
  margin: -4px -8px;
}

.editable-cell:hover {
  background: rgba(184, 98, 234, 0.05);
}

.editable-cell:hover::after {
  content: '✎';
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: var(--admin-primary);
  opacity: 0.7;
}

.editable-cell.editing {
  background: rgba(184, 98, 234, 0.1);
}
```

---

## 📊 Реальные примеры использования

### SubmissionsManager (Проверка ДЗ)
```tsx
// Статистические карточки
<div className="admin-stats">
  <div className="admin-stat-card">
    <div className="admin-stat-value">{stats.pending}</div>
    <div className="admin-stat-label">Ожидают проверки</div>
  </div>
</div>

// Фильтры
<div className="admin-filters">
  <div className="admin-filter-group">
    <label>Статус:</label>
    <select className="admin-input" value={statusFilter}>
      <option value="all">Все</option>
      <option value="pending">Ожидают проверки</option>
    </select>
  </div>
</div>

// Кнопки действий в таблице
<td className="actions-cell">
  <button className="action-btn edit-btn" title="Просмотреть детали">
    👁️
  </button>
  <button className="action-btn admin-yes" title="Быстро принять">
    ✅
  </button>
  <button className="action-btn admin-no" title="Быстро отклонить">
    ❌
  </button>
</td>
```

### Модальные окна (реальные примеры)
```tsx
// Обложка ступени
{isCoverModalOpen && editingCoverStage && (
  <div className="admin-modal-backdrop" onClick={closeCoverModal}>
    <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
      <button className="admin-modal-close" onClick={closeCoverModal}>×</button>
      <h3>Обложка ступени: {editingCoverStage.name}</h3>
      
      <div className="form-group">
        <label>Текущая обложка:</label>
        {/* Превью изображения */}
      </div>
      
      <div className="form-actions">
        <button className="admin-button" onClick={saveStageCover}>
          Сохранить обложку
        </button>
        <button className="admin-button" style={{ background: 'var(--admin-danger)' }}>
          Удалить обложку
        </button>
      </div>
    </div>
  </div>
)}
```

---

## 📊 Структура таблиц админки (ОБНОВЛЕНО 04.06.2025)

### 1. **Таблица курсов** - оптимизированная

**Колонки:**
1. **Название** - название курса (инлайн-редактирование)
2. **Подзаголовок** - краткое описание (инлайн-редактирование)  
3. **Дата создания** - автоматическая дата
4. **Действия** - кнопки управления

**❌ УБРАНО:** Колонка "Ступеней" с счетчиком `course_stages?.count`

**Обоснование:** Счетчик не несет практической ценности для кураторов, загромождает интерфейс.

### 2. **Таблица ступеней** - переработанная структура

**Новый порядок колонок:**
1. **Обложка** - превью изображения + кнопка редактирования (ПЕРЕМЕЩЕНО в первый столбец)
2. **Название** - название ступени (инлайн-редактирование)
3. **Описание** - описание ступени (инлайн-редактирование)
4. **Порядок** - порядковый номер (инлайн-редактирование)
5. **Разблокирована** - переключатель доступа
6. **Действия** - кнопки управления

**❌ УБРАНО:** Колонка "Уроков" с счетчиком `lessons?.count`
**✅ ИЗМЕНЕНО:** Колонка "Обложка" перемещена на первое место

**Обоснование:** 
- Обложка как первая колонка улучшает визуальное восприятие
- Счетчик уроков избыточен, кураторы переходят к урокам через кнопку "Уроки"

### 3. **Таблица уроков** - очищенная от избыточности

**Колонки:**
1. **Обложка** - превью изображения + кнопка редактирования
2. **Название** - название урока (инлайн-редактирование)
3. **Описание** - описание урока (инлайн-редактирование)
4. **Порядок** - порядковый номер (инлайн-редактирование)
5. **Есть ДЗ** - переключатель has_assignment
6. **Открытие** - дата и время открытия урока
7. **Дедлайн** - дедлайн сдачи задания
8. **Действия** - кнопки управления

**❌ УБРАНО:** Колонка "Блоков" с счетчиком `lesson_blocks?.count`

**Обоснование:** Количество блоков не критично для принятия решений, кураторы переходят к блокам через кнопку "Блоки"

---

**Документ обновлен:** 04.06.2025  
**Статус:** Зафиксировано РЕАЛЬНОЕ состояние админки  
**Источник:** Анализ файлов `src/pages/AdminPage/AdminPage.css` и компонентов 

## 🆕 Новые компоненты (РЕАЛИЗОВАНО)

### MaterialsManager - Управление дополнительными материалами
**Статус:** ✅ ПОЛНОСТЬЮ РЕАЛИЗОВАНО в `MaterialsManager.tsx`

**Основные возможности:**
- Список всех дополнительных материалов с фильтрами по типу (video/audio)
- Инлайн-редактирование названий, описаний и порядка материалов
- Модальные окна создания/редактирования материалов с загрузкой обложек
- Управление блоками материалов с поддержкой всех типов контента
- Интеграция с Supabase Storage для загрузки файлов
- Поддержка m4a формата аудио файлов

### DraggableMaterialBlockRow - Drag & Drop для блоков
**Статус:** ✅ РЕАЛИЗОВАНО

**Функционал:**
- Перетаскивание блоков для изменения порядка
- Визуальная обратная связь при перетаскивании
- Автоматическое сохранение нового порядка
- Плавные анимации переходов

### Новые модальные окна
**Статус:** ✅ РЕАЛИЗОВАНО

1. **Модальное окно материала** - создание/редактирование материалов
2. **Модальное окно блока материала** - управление контентом блоков
3. **Улучшенная система фильтров** - фильтры по типам материалов

### CSS стили для новых компонентов
```css
/* Drag & Drop для блоков материалов */
.draggable-block-row {
  cursor: grab;
  transition: var(--admin-transition);
  border-radius: var(--admin-radius-md);
}

.draggable-block-row:hover {
  background: var(--admin-glass-bg-light);
  transform: translateY(-1px);
  box-shadow: var(--admin-shadow-card);
}

.draggable-block-row.dragging {
  opacity: 0.7;
  transform: rotate(2deg);
  z-index: 1000;
  box-shadow: var(--admin-shadow-floating);
}

/* Фильтры материалов */
.admin-filters .material-type-filter {
  background: var(--admin-glass-bg);
  backdrop-filter: var(--admin-backdrop-filter);
  border: 1px solid var(--admin-glass-border);
  border-radius: var(--admin-radius-md);
}

/* Превью обложек материалов */
.material-cover-preview {
  border-radius: var(--admin-radius-md);
  overflow: hidden;
  box-shadow: var(--admin-shadow-card);
  background: var(--admin-glass-bg-light);
}

.material-cover-preview img {
  width: 100%;
  height: auto;
  display: block;
}
``` 