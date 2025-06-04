# Верстка админ-панели для "Дополнительных материалов"

Этот документ описывает предполагаемую HTML-структуру и CSS-классы для интерфейса управления дополнительными материалами в админ-панели. Классы и стили ссылаются на `admin_design_specification.md`.

## 1. Общая структура страницы и навигация

- Новая вкладка "Доп. Материалы" будет добавлена в `.admin-tabs`.
  ```html
  <div class="admin-tabs">
    <!-- ... существующие табы ... -->
    <button class="admin-tab" data-tab="materials">Доп. Материалы</button>
  </div>
  ```
- Основной контейнер для контента вкладки: `<div class="admin-content" id="materials-content"></div>`

## 2. Страница списка материалов (`/admin/materials`)

Размещается внутри `#materials-content`.

```html
<div class="admin-page-section"> <!-- Общий контейнер для секции -->
  <div class="section-header">
    <h2>Дополнительные материалы</h2>
  </div>

  <div class="admin-toolbar"> <!-- Панель с фильтрами и кнопкой добавления -->
    <div class="admin-filters">
      <div class="form-group">
        <label for="material-type-filter">Тип материала:</label>
        <select id="material-type-filter" class="admin-input" style="width: auto; min-width: 200px;">
          <option value="all">Все типы</option>
          <option value="video">Видео</option>
          <option value="audio">Аудио</option>
          <!-- Другие типы, если появятся -->
        </select>
      </div>
    </div>
    <button class="admin-button" id="add-material-btn">
      <span class="icon-add"></span> Добавить материал
    </button>
  </div>

  <div class="admin-table-wrapper">
    <div class="admin-table">
      <table>
        <thead>
          <tr>
            <th>Обложка</th>
            <th>Название</th>
            <th>Тип</th>
            <th>Описание (кратко)</th>
            <th>Порядок</th>
            <th>Дата создания</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <!-- Пример строки для материала (будет генерироваться динамически) -->
          <tr>
            <td class="cell-cover">
              <img src="path/to/cover.jpg" alt="Обложка" class="table-cover-preview" />
              <!-- Кнопка для FileUploader может появляться при наведении или в режиме редактирования -->
            </td>
            <td class="editable-cell" data-field="name">Название материала 1</td>
            <td class="cell-type">
              <span class="admin-status" style="background-color: var(--admin-info-bg); color: var(--admin-info-text);">Видео</span>
            </td>
            <td class="editable-cell" data-field="description_short">Краткое описание...</td>
            <td class="editable-cell" data-field="order_num">1</td>
            <td class="cell-date">2024-06-05</td>
            <td class="actions-cell">
              <button class="action-btn blocks-btn" title="Блоки">🧱</button>
              <button class="action-btn edit-btn" title="Редактировать">✎</button>
              <button class="action-btn delete-btn" title="Удалить">✕</button>
            </td>
          </tr>
          <!-- ... другие материалы ... -->
        </tbody>
      </table>
    </div>
  </div>
</div>
```

**Примечания к верстке списка:**
- Класс `admin-toolbar` для размещения фильтров и кнопки "Добавить".
- Класс `editable-cell` для ячеек с инлайн-редактированием. Атрибут `data-field` для идентификации поля.
- Для обложки (`cell-cover`) можно добавить логику отображения `FileUploader` при клике или в специальном режиме.
- Цвета для бейджей типов материалов (`admin-status`) можно определить дополнительно или использовать существующие семантические (info, success и т.д., но лучше кастомные для типов).

## 3. Модальное окно создания/редактирования материала

Используется `.admin-modal-backdrop` и `.admin-modal`.

```html
<div class="admin-modal-backdrop" id="material-modal-backdrop" style="display:none;">
  <div class="admin-modal" id="material-modal">
    <button class="admin-modal-close" id="close-material-modal">×</button>
    <h3><span id="material-modal-title">Создание</span> материала</h3>
    
    <form id="material-form">
      <input type="hidden" id="material-id" />

      <div class="form-group">
        <label for="material-name">Название материала:</label>
        <input type="text" id="material-name" name="name" class="admin-input" required />
      </div>

      <div class="form-group">
        <label for="material-description">Описание:</label>
        <textarea id="material-description" name="description" class="admin-input" rows="4"></textarea>
      </div>

      <div class="form-group">
        <label>Обложка материала:</label>
        <div id="material-cover-preview" class="cover-preview-container">
          <!-- <img src="path/to/current_cover.jpg" alt="Текущая обложка" /> -->
        </div>
        <!-- Сюда будет интегрирован FileUploader -->
        <div id="material-cover-uploader"></div> 
        <button type="button" class="admin-button-outline" id="remove-material-cover-btn" style="display:none;">Удалить обложку</button>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="material-type">Тип материала:</label>
          <select id="material-type" name="material_type" class="admin-input" required>
            <option value="">Выберите тип</option>
            <option value="video">Видео</option>
            <option value="audio">Аудио</option>
            <!-- Другие типы, если появятся -->
          </select>
        </div>

        <div class="form-group">
          <label for="material-order">Порядковый номер:</label>
          <input type="number" id="material-order" name="order_num" class="admin-input" value="0" />
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="admin-button">Сохранить</button>
        <button type="button" class="admin-button-outline" id="cancel-material-modal">Отмена</button>
      </div>
    </form>
  </div>
</div>
```

## 4. Страница управления блоками материала (`/admin/materials/:materialId/blocks`)

Структура будет очень похожа на управление блоками урока.

```html
<!-- Breadcrumbs -->
<div class="admin-breadcrumbs">
  <a href="/admin">Админка</a> &gt; 
  <a href="/admin/materials">Доп. Материалы</a> &gt;
  <span id="breadcrumb-material-name">Название материала</span> &gt;
  <span>Блоки</span>
</div>

<div class="admin-page-section">
  <div class="section-header">
    <h2>Блоки материала: <span id="blocks-material-title">Название материала</span></h2>
  </div>

  <div class="admin-toolbar">
    <button class="admin-button" id="add-material-block-btn">
      <span class="icon-add"></span> Добавить блок
    </button>
  </div>

  <div id="material-blocks-list" class="blocks-list-container">
    <!-- Пример одного блока (будет генерироваться динамически) -->
    <div class="admin-card block-card" data-block-id="1">
      <div class="block-header">
        <span class="block-order">#1</span>
        <h4 class="block-title-display">Заголовок блока 1 (если есть)</h4>
        <span class="block-type-display">(Тип: Текст)</span>
        <div class="block-actions">
          <button class="action-btn edit-block-btn" title="Редактировать блок">✎</button>
          <button class="action-btn delete-block-btn" title="Удалить блок">✕</button>
        </div>
      </div>
      <div class="block-content-preview">
        <p>Краткое превью текстового контента...</p>
        <!-- или: <img src="path/to/image_preview.jpg" /> -->
        <!-- или: <a href="kinescope_url" target="_blank">Ссылка на видео Kinescope</a> -->
      </div>
      <!-- Элементы для Drag & Drop (если будут) -->
    </div>
    <!-- ... другие блоки ... -->
    <div class="empty-state" style="display:none;">Нет блоков для этого материала. Нажмите "Добавить блок".</div>
  </div>
</div>
```
**Примечания к верстке блоков:**
- `.block-card` используется для каждого блока, по аналогии с `.admin-card`.
- Действия над блоком (`.block-actions`) вынесены в заголовок карточки блока.

## 5. Модальное окно создания/редактирования блока материала

Используется `.admin-modal-backdrop` и `.admin-modal`.

```html
<div class="admin-modal-backdrop" id="material-block-modal-backdrop" style="display:none;">
  <div class="admin-modal" id="material-block-modal">
    <button class="admin-modal-close" id="close-material-block-modal">×</button>
    <h3><span id="material-block-modal-title">Создание</span> блока материала</h3>

    <form id="material-block-form">
      <input type="hidden" id="material-block-id" />
      <input type="hidden" id="parent-material-id" />

      <div class="form-row">
        <div class="form-group" style="flex-basis: 70%;">
          <label for="material-block-title-input">Заголовок блока (необязательно):</label>
          <input type="text" id="material-block-title-input" name="title" class="admin-input" />
        </div>
        <div class="form-group" style="flex-basis: 30%;">
          <label for="material-block-order">Порядок:</label>
          <input type="number" id="material-block-order" name="order_num" class="admin-input" value="0" required />
        </div>
      </div>

      <div class="form-group">
        <label for="material-block-type-select">Тип блока:</label>
        <select id="material-block-type-select" name="block_type" class="admin-input" required>
          <option value="">Выберите тип блока</option>
          <option value="text">Текст</option>
          <option value="video">Видео (Kinescope URL)</option>
          <option value="audio">Аудио (файл)</option>
          <option value="image">Изображение (файл)</option>
          <option value="pdf">PDF-документ (файл)</option>
        </select>
      </div>

      <!-- Динамические поля для контента в зависимости от типа блока -->
      <div id="material-block-content-fields">
        
        <div class="form-group content-field" data-type="text" style="display:none;">
          <label for="material-block-content-text">Текстовое содержимое:</label>
          <textarea id="material-block-content-text" name="content_text" class="admin-input" rows="10"></textarea>
          <!-- Здесь можно интегрировать Rich Text Editor -->
        </div>

        <div class="form-group content-field" data-type="video" style="display:none;">
          <label for="material-block-content-url-video">URL видео (Kinescope):</label>
          <input type="url" id="material-block-content-url-video" name="content_url_video" class="admin-input" placeholder="https://kinescope.io/..." />
        </div>

        <div class="form-group content-field" data-type="audio" style="display:none;">
          <label>Файл аудио:</label>
          <div id="material-block-audio-uploader"></div> <!-- FileUploader для аудио -->
          <input type="hidden" id="material-block-content-url-audio" name="content_url_audio" />
          <div id="material-block-audio-preview"></div> <!-- Для отображения текущего файла -->
        </div>

        <div class="form-group content-field" data-type="image" style="display:none;">
          <label>Файл изображения:</label>
          <div id="material-block-image-uploader"></div> <!-- FileUploader для изображений -->
          <input type="hidden" id="material-block-content-url-image" name="content_url_image" />
          <div id="material-block-image-preview"></div> <!-- Для отображения текущего файла -->
        </div>

        <div class="form-group content-field" data-type="pdf" style="display:none;">
          <label>Файл PDF:</label>
          <div id="material-block-pdf-uploader"></div> <!-- FileUploader для PDF -->
          <input type="hidden" id="material-block-content-url-pdf" name="content_url_pdf" />
          <div id="material-block-pdf-preview"></div> <!-- Для отображения текущего файла -->
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="admin-button">Сохранить блок</button>
        <button type="button" class="admin-button-outline" id="cancel-material-block-modal">Отмена</button>
      </div>
    </form>
  </div>
</div>
```

**Примечания к верстке модального окна блока:**
- `.content-field` будет отображаться/скрываться в зависимости от выбранного `material-block-type-select`.
- Для файловых типов (`audio`, `image`, `pdf`) предполагается использование компонента `FileUploader`, результат (URL в R2) будет записываться в соответствующее скрытое поле `content_url_audio/image/pdf`.

Этот документ должен дать хорошее представление о том, как будет выглядеть и структурироваться админка для дополнительных материалов. Если все ок, то следующим шагом будет реализация этих компонентов. Если есть правки или пожелания к верстке – говори! 