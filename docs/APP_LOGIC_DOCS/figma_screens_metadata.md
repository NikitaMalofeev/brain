# Метаданные экранов из Figma

## Обзор блоков

Получены метаданные для 4 основных блоков приложения:
1. **Onboarding** (node-id: 38-1421) - 4 экрана онбординга
2. **Главная** (node-id: 38-1422) - 2 экрана главной страницы
3. **Библиотека** (node-id: 38-917) - 4 экрана библиотеки
4. **Профиль** (node-id: 36-790) - 4 экрана профиля

---

## 1. Блок "Onboarding" (38-1421)

### Техническая метадата:
```yaml
metadata:
  name: app / Brain Programming
  lastModified: '2025-05-20T14:20:31Z'
  thumbnailUrl: https://s3-alpha.figma.com/thumbnails/b5da3d5b-c521-4301-a7f6-74e7046e5668?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQ4GOSFWCRNQJ6QVT%2F20250522%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250522T000000Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=18bb5393933d843c29e2c7e1216972ca8a5be3b124b8635bb05ac6bfb6d68d54
  nodeId: 38-1421
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
  - id: '38:1421'
    name: Онбординг
    type: SECTION
    fills: fill_5ZCBY3
    strokes: stroke_UAE0N3
    layout: layout_TC1VCD
    children:
      - id: '38:1423'
        name: Добро пожаловать
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '38:1424'
        name: Главная
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '38:1425'
        name: Библиотека
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '38:1426'
        name: Профиль
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
```

### Экраны:
1. **Добро пожаловать** - первый экран онбординга
2. **Главная** - демонстрация главного экрана
3. **Библиотека** - демонстрация библиотеки
4. **Профиль** - демонстрация профиля

### Общие элементы:
- Navigation Bar с статус-баром iPhone X
- Home indicator
- Кнопки "Далее" и "Закрыть"
- Индикаторы прогресса (точки)
- Размеры: 375x812px

---

## 2. Блок "Главная" (38-1422)

### Техническая метадата:
```yaml
metadata:
  name: app / Brain Programming
  lastModified: '2025-05-20T14:20:31Z'
  thumbnailUrl: https://s3-alpha.figma.com/thumbnails/b5da3d5b-c521-4301-a7f6-74e7046e5668?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQ4GOSFWCRNQJ6QVT%2F20250522%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250522T000000Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=18bb5393933d843c29e2c7e1216972ca8a5be3b124b8635bb05ac6bfb6d68d54
  nodeId: 38-1422
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
  - id: '38:1422'
    name: Главная
    type: SECTION
    fills: fill_5ZCBY3
    strokes: stroke_UAE0N3
    layout: layout_TC1VCD
    children:
      - id: '38:1427'
        name: Главная
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '38:1428'
        name: Что такое баллы?
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
```

### Экраны:
1. **Главная страница** - основной экран с карточками ступеней
2. **Что такое баллы?** - информационный экран

### Основной экран содержит:
- Navigation Bar
- Панель заголовка с аватаром и приветствием "Привет, Иван"
- Счетчик баллов "100" с иконкой листа
- Карточки ступеней:
  - "Первая ступень" (разблокирована)
  - "Вторая", "Третья", "Четвертая ступень" (заблокированы)
- Прогресс-блок: "Выполнено 12 заданий", прогресс-бар
- "Еще 24 задания до второй ступени"
- Tab bar с навигацией

### Информационный экран:
- Детальное описание системы баллов
- Объяснение типов заданий (видео, аудио контент)

---

## 3. Блок "Библиотека" (38-917)

### Техническая метадата:
```yaml
metadata:
  name: app / Brain Programming
  lastModified: '2025-05-20T14:20:31Z'
  thumbnailUrl: https://s3-alpha.figma.com/thumbnails/b5da3d5b-c521-4301-a7f6-74e7046e5668?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQ4GOSFWCRNQJ6QVT%2F20250522%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20250522T000000Z&X-Amz-Expires=604800&X-Amz-SignedHeaders=host&X-Amz-Signature=18bb5393933d843c29e2c7e1216972ca8a5be3b124b8635bb05ac6bfb6d68d54
  nodeId: 38-917
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
  - id: '38:917'
    name: Библиотека
    type: SECTION
    fills: fill_5ZCBY3
    strokes: stroke_UAE0N3
    layout: layout_TC1VCD
    children:
      - id: '38:918'
        name: Библиотека
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '38:919'
        name: Первая ступень
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '38:920'
        name: Урок
        type: FRAME
        fills: fill_9T5I5R
        layout: layout_WFXYDO
      - id: '38:921'
        name: Квиз
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
```

### Экраны:
1. **Библиотека** - основной экран библиотеки
2. **Первая ступень** - детальный экран ступени
3. **Урок** - экран урока
4. **Квиз** - экран квиза

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
```

### Экраны:
1. **Профиль** - основной экран профиля
2. **Важные чаты** - список чатов
3. **Помощь** - список контактов поддержки
4. **FAQ** - часто задаваемые вопросы

### Основной экран профиля:
- Navigation Bar с кнопками "Закрыть" и меню
- Аватар пользователя с приветствием "Привет, Иван"
- Кнопки:
  - "Важные чаты" (с иконкой стрелки)
  - "Помощь" (с иконкой стрелки)
  - "FAQ" (с иконкой стрелки)
- Tab bar

### Экран "Важные чаты":
- Navigation Bar с кнопкой "Назад"
- Заголовок "Важные чаты"
- Список чатов (Чат 1, Чат 2, Чат 3, Чат 4)
- Каждый чат содержит:
  - Аватар
  - Название чата
  - Краткое описание
  - Иконка стрелки

### Экран "Помощь":
- Navigation Bar с кнопкой "Назад"
- Заголовок "Помощь"
- Список контактов поддержки:
  - Алена, Ваня, Макс, Маша, Ваня, Елена
- Каждый контакт с аватаром и именем

### Экран "FAQ":
- Navigation Bar с кнопкой "Назад"
- Заголовок "FAQ"
- Подробный текст с ответами на вопросы:
  - Как работают пригласительные ссылки?
  - Как работает оплата?
  - Информация о списаниях и картах

---

## Общие UI компоненты

### Navigation Bar:
- Статус-бар iPhone X (время 9:41, батарея, Wi-Fi, сигнал)
- Кнопки навигации (Назад, Закрыть, Меню)

### Tab Bar:
- Главная (иконка дома)
- Библиотека (иконка колокольчика)
- Профиль (иконка пользователя)

### Кнопки:
- Основные кнопки с закругленными углами (24px)
- Кнопки навигации с иконками стрелок
- Состояния: активные/неактивные

### Цветовая схема:
- Основной фон: #F1F1F1
- Белый: #FFFFFF
- Черный: #000000
- Серый: #8C8C8C
- Темно-серый: #242424

### Типографика:
- Заголовки: Inter, 700, 24px
- Основной текст: Inter, 500, 16-20px
- Вторичный текст: Inter, 400, 12-16px
- Кнопки: Montserrat, 500-600, 16px

---

## Размеры экранов
Все экраны имеют стандартные размеры iPhone: **375x812px**

---

## 🔗 Связи между экранами (Navigation Flow)

На основе анализа Connector line элементов в метаданных Figma:

### Блок "Onboarding" (38-1421) - Последовательная навигация:

#### 1. Добро пожаловать → Главная (демо)
- **От:** Экран "Добро пожаловать" (38:1423)
- **К:** Экран "Главная" (38:1424)
- **Триггер:** Кнопка "Далее"
- **Тип навигации:** Horizontal swipe/push

#### 2. Главная (демо) → Библиотека (демо)
- **От:** Экран "Главная" (38:1424)
- **К:** Экран "Библиотека" (38:1425)
- **Триггер:** Кнопка "Далее"
- **Тип навигации:** Horizontal swipe/push

#### 3. Библиотека (демо) → Профиль (демо)
- **От:** Экран "Библиотека" (38:1425)
- **К:** Экран "Профиль" (38:1426)
- **Триггер:** Кнопка "Далее"
- **Тип навигации:** Horizontal swipe/push

#### 4. Любой экран → Выход из онбординга
- **От:** Любой экран онбординга
- **К:** Главное приложение
- **Триггер:** Кнопка "Закрыть"
- **Тип навигации:** Modal dismiss

### Блок "Главная" (38-1422) - Информационные связи:

#### 1. Главная → Что такое баллы?
- **От:** Основной экран "Главная" (38:1427)
- **К:** Информационный экран "Что такое баллы?" (38:1428)
- **Триггер:** Кнопка/ссылка "Что такое баллы?" или иконка "?"
- **Тип навигации:** Modal overlay/push

#### 2. Главная → Библиотека (через Tab Bar)
- **От:** Экран "Главная" (38:1427)
- **К:** Библиотека
- **Триггер:** Tab "Библиотека" в Tab Bar
- **Тип навигации:** Tab switch

#### 3. Главная → Профиль (через Tab Bar)
- **От:** Экран "Главная" (38:1427)
- **К:** Профиль
- **Триггер:** Tab "Профиль" в Tab Bar
- **Тип навигации:** Tab switch

### Блок "Библиотека" (38-917) - Иерархическая навигация:

#### 1. Библиотека → Первая ступень
- **От:** Основной экран "Библиотека" (38:918)
- **К:** Детальный экран "Первая ступень" (38:919)
- **Триггер:** Нажатие на карточку "Первая ступень"
- **Тип навигации:** Push (с кнопкой "Назад")

#### 2. Первая ступень → Урок
- **От:** Экран "Первая ступень" (38:919)
- **К:** Экран "Урок" (38:920)
- **Триггер:** Нажатие на урок в списке
- **Тип навигации:** Push (с кнопкой "Назад")

#### 3. Урок → Квиз
- **От:** Экран "Урок" (38:920)
- **К:** Экран "Квиз" (38:921)
- **Триггер:** Кнопка "Пройти квиз" или автоматически после урока
- **Тип навигации:** Push (с кнопкой "Назад")

#### 4. Библиотека → Главная (через Tab Bar)
- **От:** Экран "Библиотека" (38:918)
- **К:** Главная
- **Триггер:** Tab "Главная" в Tab Bar
- **Тип навигации:** Tab switch

#### 5. Библиотека → Профиль (через Tab Bar)
- **От:** Экран "Библиотека" (38:918)
- **К:** Профиль
- **Триггер:** Tab "Профиль" в Tab Bar
- **Тип навигации:** Tab switch

### Блок "Профиль" (36-790) - Основные связи:

#### 1. Профиль → Важные чаты
- **От:** Основной экран профиля (4:200)
- **К:** Экран "Профиль / Чаты" (4:437)
- **Триггер:** Кнопка "Важные чаты" с иконкой стрелки
- **Connector ID:** 36:777
- **Тип навигации:** Push (с кнопкой "Назад")

#### 2. Профиль → Помощь
- **От:** Основной экран профиля (4:200)
- **К:** Экран "Профиль / Помощь" (4:878)
- **Триггер:** Кнопка "Помощь" с иконкой стрелки
- **Connector ID:** 36:786
- **Тип навигации:** Push (с кнопкой "Назад")

#### 3. Помощь → FAQ
- **От:** Экран "Профиль / Помощь" (4:878)
- **К:** Экран "Профиль / Помощь / FAQ" (36:713)
- **Триггер:** Кнопка "FAQ" с иконкой стрелки
- **Connector ID:** 49:802
- **Тип навигации:** Push (с кнопкой "Назад")

#### 4. Профиль → Главная (через Tab Bar)
- **От:** Основной экран профиля (4:200)
- **К:** Главная
- **Триггер:** Tab "Главная" в Tab Bar
- **Тип навигации:** Tab switch

#### 5. Профиль → Библиотека (через Tab Bar)
- **От:** Основной экран профиля (4:200)
- **К:** Библиотека
- **Триггер:** Tab "Библиотека" в Tab Bar
- **Тип навигации:** Tab switch

### Общие паттерны навигации:

#### Tab Bar Navigation (Глобальная):
- **Главная** ↔ **Библиотека** ↔ **Профиль**
- Доступна на всех основных экранах
- Переключение между разделами приложения

#### Modal Navigation:
- **Onboarding** → **Главная** (после завершения)
- Кнопки "Далее" для перехода между экранами онбординга
- Кнопка "Закрыть" для выхода из онбординга

#### Stack Navigation (в рамках разделов):
- **Библиотека** → **Первая ступень** → **Урок** → **Квиз**
- **Профиль** → **Важные чаты** / **Помощь** → **FAQ**
- Все с кнопками "Назад" для возврата

#### Информационные модалы:
- **Главная** → **"Что такое баллы?"**
- Overlay экраны с дополнительной информацией

### Технические детали связей:

```yaml
connectors:
  # Onboarding flow
  - type: SEQUENTIAL
    flow: Добро пожаловать → Главная → Библиотека → Профиль
    navigation: horizontal_swipe
    controls: ["Далее", "Закрыть"]
    
  # Главная flow  
  - type: MODAL
    from: Главная (38:1427)
    to: Что такое баллы? (38:1428)
    trigger: info_button
    
  # Библиотека flow
  - type: HIERARCHICAL
    flow: Библиотека → Первая ступень → Урок → Квиз
    navigation: push_stack
    controls: ["Назад"]
    
  # Профиль flow
  - id: '36:777'
    name: Connector line
    type: CONNECTOR
    from: Профиль (4:200)
    to: Профиль / Чаты (4:437)
    stroke: '#818181'
    strokeWeight: 4px
    
  - id: '36:786'
    name: Connector line
    type: CONNECTOR
    from: Профиль (4:200)
    to: Профиль / Помощь (4:878)
    stroke: '#818181'
    strokeWeight: 4px
    
  - id: '49:802'
    name: Connector line
    type: CONNECTOR
    from: Профиль / Помощь (4:878)
    to: Профиль / Помощь / FAQ (36:713)
    stroke: '#818181'
    strokeWeight: 4px
    
  # Tab Bar navigation (глобальная)
  - type: TAB_SWITCH
    tabs: [Главная, Библиотека, Профиль]
    available_on: all_main_screens
```

### Интерактивные элементы:

#### Кнопки навигации:
- **Arrow / Chevron_Right** (4:160) - переход вперед
- **Arrow / Chevron_Left_MD** (4:14) - возврат назад
- **Menu / Close_SM** (4:16) - закрытие модалов

#### Состояния кнопок:
- **State=Back** (4:19) - кнопка возврата
- **State=Close** (4:22) - кнопка закрытия
- **State=Active** (4:66) - активное состояние

---

## Техническая информация Figma

### Общая метадата файла:
- **Название проекта:** app / Brain Programming
- **Последнее изменение:** 2025-05-20T14:20:31Z
- **Файл ID:** 6MLWNEEVI64L7CNaJk5XyG
- **Thumbnail URL:** Доступен для предпросмотра (срок действия до 2025-05-29)

### Node ID блоков:
- Onboarding: 38-1421
- Главная: 38-1422  
- Библиотека: 38-917
- Профиль: 36-790 