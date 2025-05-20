# Telegram Mini Apps React Template с интеграцией Supabase

Этот шаблон демонстрирует, как разработчики могут реализовать одностраничное приложение на платформе Telegram Mini Apps, используя следующие технологии и библиотеки:

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview)
- [@telegram-apps SDK](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk/2-x)
- [Telegram UI](https://github.com/Telegram-Mini-Apps/TelegramUI)
- [Vite](https://vitejs.dev/)
- [Supabase](https://supabase.com/) для хранения данных пользователей

> Шаблон был создан с использованием [npm](https://www.npmjs.com/). Поэтому необходимо использовать его и для этого проекта. При использовании других пакетных менеджеров вы получите соответствующую ошибку.

## Установка зависимостей

Если вы только что клонировали этот шаблон, вам следует установить зависимости проекта с помощью команды:

```Bash
npm install
```

## Скрипты

Этот проект содержит следующие скрипты:

- `dev`. Запускает приложение в режиме разработки.
- `dev:https`. Запускает приложение в режиме разработки с использованием локально созданных действительных SSL-сертификатов.
- `build`. Собирает приложение для продакшена.
- `lint`. Запускает [eslint](https://eslint.org/) для проверки качества кода.
- `deploy`. Деплоит приложение на GitHub Pages.

Для запуска скрипта используйте команду `npm run`:

```Bash
npm run {script}
# Пример: npm run build
```

## Создание бота и Mini App

Прежде чем начать, убедитесь, что вы уже создали Telegram бота. Вот [подробное руководство](https://docs.telegram-mini-apps.com/platform/creating-new-app) о том, как это сделать.

## Запуск

Хотя Mini Apps предназначены для открытия в [приложениях Telegram](https://docs.telegram-mini-apps.com/platform/about#supported-applications), вы все равно можете разрабатывать и тестировать их вне Telegram в процессе разработки.

Для запуска приложения в режиме разработки используйте скрипт `dev`:

```bash
npm run dev:https
```

> [!NOTE]
> Поскольку мы используем [vite-plugin-mkcert](https://www.npmjs.com/package/vite-plugin-mkcert), при первом запуске режима разработки вы можете увидеть запрос пароля sudo. Плагину это необходимо для правильной настройки SSL-сертификатов. Чтобы отключить плагин, используйте команду `npm run dev`.

После этого вы увидите подобное сообщение в терминале:

```bash
VITE v5.2.12  ready in 237 ms

➜  Local:   https://localhost:5173/reactjs-template
➜  Network: https://172.18.16.1:5173/reactjs-template
➜  Network: https://172.19.32.1:5173/reactjs-template
➜  Network: https://192.168.0.171:5173/reactjs-template
➜  press h + enter to show help
```

Здесь вы можете увидеть ссылку `Local`, доступную локально, и ссылки `Network`, доступные для всех устройств в одной сети с текущим устройством.

Чтобы просмотреть приложение, нужно открыть ссылку `Local` (`https://localhost:5173/reactjs-template` в этом примере) в вашем браузере.

Важно отметить, что некоторые библиотеки в этом шаблоне, такие как `@telegram-apps/sdk`, не предназначены для использования вне Telegram.

Тем не менее, они работают корректно. Это потому, что файл `src/mockEnv.ts`, который импортируется в точке входа приложения (`src/index.ts`), использует функцию `mockTelegramEnv` для симуляции окружения Telegram. Этот трюк убеждает приложение, что оно работает в среде Telegram. Поэтому будьте осторожны и не используйте эту функцию в продакшн-режиме, если вы полностью не понимаете ее последствий.

> [!WARNING]
> Поскольку мы используем самоподписанные SSL-сертификаты, приложения Telegram для Android и iOS не смогут отображать приложение. Эти операционные системы обеспечивают более строгие меры безопасности, предотвращая загрузку Mini App. Чтобы решить эту проблему, обратитесь к [этому руководству](https://docs.telegram-mini-apps.com/platform/getting-app-link#remote).

## Архитектура проекта

### Обзор

Проект представляет собой Telegram Mini App на React, разработанное с использованием следующих технологий:
- React + TypeScript
- @telegram-apps/sdk-react для взаимодействия с Telegram API
- @telegram-apps/telegram-ui для компонентов UI
- TON Connect для интеграции с блокчейном TON
- Vite для сборки
- Supabase для хранения данных пользователей и других сущностей

### Структура файлов

```
reactjs-template
  ├── src
  │   ├── components          # Общие компоненты
  │   ├── css                 # Стили
  │   ├── helpers             # Вспомогательные функции
  │   ├── lib                 # Библиотеки и клиенты внешних сервисов
  │   │   └── supabase        # Клиент и хуки для работы с Supabase
  │   │       ├── client.ts   # Инициализация клиента Supabase
  │   │       ├── types.ts    # Типы данных для Supabase
  │   │       └── hooks       # React хуки для работы с Supabase
  │   ├── navigation          # Маршрутизация
  │   ├── pages               # Страницы приложения
  │   ├── index.tsx           # Точка входа
  │   ├── init.ts             # Инициализация приложения
  │   └── mockEnv.ts          # Мок Telegram окружения для локальной разработки
  ├── public                  # Статические файлы
  └── ...                     # Другие конфигурационные файлы
```

### Основные компоненты

#### Страницы

- **IndexPage** - Главная страница с навигацией по доступным функциям
- **ProfilePage** - Страница профиля пользователя с фото и функцией fullscreen
- **InitDataPage** - Страница для отображения данных initData от Telegram
- **LaunchParamsPage** - Страница с параметрами запуска приложения
- **ThemeParamsPage** - Страница с параметрами темы Telegram
- **TONConnectPage** - Страница для подключения TON кошелька
- **DiagnosticsPage** - Страница для диагностики соединения с Supabase и сервером

### Особенности реализации

1. **Получение данных пользователя**
   - Используем `initDataState` из `@telegram-apps/sdk-react` для получения информации о пользователе, включая фото
   
2. **Интеграция с Supabase**
   - Клиент Supabase инициализируется в `src/lib/supabase/client.ts`
   - Хук `useSupabaseUser` проверяет/создает/обновляет пользователя в Supabase на основе данных из Telegram
   - В `IndexPage` отображается статус подключения и данные пользователя из Supabase
   - Реализовано получение списка всех пользователей из таблицы `public.users`
   - Реализована диагностика соединения с Supabase через `DiagnosticsPage`
   
3. **Проверка окружения**
   - Реализована проверка запуска приложения внутри Telegram или в браузере
   - Для браузеров показывается специальное сообщение "Доступно только в приложениях Telegram"
   - Проверку можно отключить через переменную окружения `NEXT_PUBLIC_ALLOW_BROWSER_ACCESS=true`

4. **Функционал fullscreen**
   - Реализовано с использованием методов Telegram Mini Apps API:
     - `web_app_request_fullscreen` - запрос на полноэкранный режим
     - `web_app_exit_fullscreen` - выход из полноэкранного режима

5. **Навигация**
   - Реализована через React Router с использованием HashRouter
   - Маршруты определены в файле `navigation/routes.tsx`

## Настройка Supabase

### Структура базы данных

В репозитории содержится SQL файл для создания таблицы пользователей [docs/create_users_table.sql](docs/create_users_table.sql).

#### Таблица users
Основная таблица для хранения пользователей Telegram:
- `id` - UUID, первичный ключ (генерируется автоматически)
- `telegram_id` - ID пользователя в Telegram
- `first_name` - Имя пользователя из Telegram
- `last_name` - Фамилия пользователя из Telegram
- `username` - Юзернейм в Telegram (может быть null)
- `photo_url` - URL фото профиля из Telegram (может быть null)
- `auth_date` - Дата авторизации из Telegram
- `hash` - Хеш данных инициализации из Telegram
- `last_login` - Дата последнего входа (timestamptz)
- `created_at` - Дата создания записи (timestamptz с default now())
- `updated_at` - Дата обновления записи (timestamptz с default now())

### Настройка RLS (Row Level Security)

В репозитории содержится SQL файл для настройки RLS (Row Level Security) [docs/setup_rls.sql](docs/setup_rls.sql), который устанавливает:
- Политики доступа к таблице пользователей
- Ограничения на чтение, вставку и обновление данных

Для более безопасной настройки рекомендуется:
1. Использовать JWT токены с включенными claims для идентификации пользователей Telegram
2. Настроить политики RLS, чтобы пользователи могли видеть и редактировать только свои данные
3. Для приложений, работающих в режиме бота, создать соответствующую роль с более широкими правами

### Установка и настройка

1. Создайте новый проект в [Supabase](https://supabase.com/)
2. Выполните SQL-скрипт [docs/create_users_table.sql](docs/create_users_table.sql) в редакторе SQL Supabase
3. Настройте переменные окружения согласно `.env.example`
4. Опционально настройте RLS, выполнив скрипт [docs/setup_rls.sql](docs/setup_rls.sql)

## Переменные окружения

Проект использует следующие переменные окружения (пример файла `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Публичный ключ Supabase для анонимного доступа
- `NEXT_PUBLIC_ALLOW_BROWSER_ACCESS` - Флаг, позволяющий отключить проверку окружения Telegram (true/false)
- `NEXT_PUBLIC_IGNORE_BUILD_ERROR` - Флаг для игнорирования ошибок сборки
- `SUPABASE_PROJECT_ID` - ID проекта Supabase
- `SUPABASE_PROJECT_URL` - URL проекта Supabase
- `SUPABASE_SERVICE_KEY` - Сервисный ключ Supabase (с правами администратора)
- `VITE_SUPABASE_URL` - URL Supabase для Vite
- `VITE_SUPABASE_ANON_KEY` - Анонимный ключ Supabase для Vite

Для локальной разработки создайте файл `.env.local` на основе `.env.example` с вашими реальными значениями.

## Deploy

Этот шаблон использует GitHub Pages в качестве способа внешнего хостинга приложения. GitHub Pages предоставляет CDN, который позволит вашим пользователям быстро загружать приложение. Альтернативно, вы можете использовать такие сервисы, как [Heroku](https://www.heroku.com/) или [Vercel](https://vercel.com).

### Ручной деплой

Этот шаблон использует инструмент [gh-pages](https://www.npmjs.com/package/gh-pages), который позволяет деплоить ваше приложение прямо с вашего ПК.

#### Настройка

Перед запуском процесса деплоя убедитесь, что вы сделали следующее:

1. Заменили значение `homepage` в `package.json`. Инструмент деплоя GitHub Pages использует это значение для определения связанного проекта GitHub.
2. Заменили значение `base` в `vite.config.ts` и установили его на имя вашего GitHub репозитория. Vite будет использовать это значение при создании путей к статическим ресурсам.

Например, если ваше имя пользователя GitHub - `telegram-mini-apps`, а имя репозитория - `is-awesome`, значение в поле `homepage` должно быть следующим:

```json
{
  "homepage": "https://telegram-mini-apps.github.io/is-awesome"
}
```

А `vite.config.ts` должен иметь следующее содержание:

```ts
export default defineConfig({
  base: '/is-awesome/',
  // ...
});
```

Дополнительную информацию о настройке деплоя можно найти в [документации](https://github.com/tschaub/gh-pages?tab=readme-ov-file#github-pages-project-sites) `gh-pages`.

#### Перед деплоем

Перед деплоем приложения убедитесь, что вы сбилдили его и готовы задеплоить свежие статические файлы:

```bash
npm run build
```

Затем запустите процесс деплоя, используя скрипт `deploy`:

```Bash
npm run deploy
```

После успешного завершения деплоя посетите страницу с данными в соответствии с вашим именем пользователя и именем репозитория. Вот пример ссылки на страницу, используя данные, упомянутые выше:
https://telegram-mini-apps.github.io/is-awesome

### GitHub Workflow

Чтобы упростить процесс деплоя, этот шаблон включает предварительно настроенный [GitHub workflow](.github/workflows/github-pages-deploy.yml), который автоматически деплоит проект при пуше изменений в ветку `master`.

Чтобы включить этот воркфлоу, создайте новое окружение (или отредактируйте существующее) в настройках репозитория GitHub и назовите его `github-pages`. Затем добавьте ветку `master` в список веток деплоя.

Настройки окружения можно найти по ссылке: `https://github.com/{username}/{repository}/settings/environments`.

![img.png](.github/deployment-branches.png)

В случае, если вы не хотите делать это автоматически, или не используете GitHub в качестве кодовой базы проекта, удалите директорию `.github`.

### GitHub Web Interface

Альтернативно, разработчики могут настроить автоматический деплой, используя веб-интерфейс GitHub. Для этого перейдите по ссылке:
`https://github.com/{username}/{repository}/settings/pages`.

## TON Connect

Этот шаблон использует проект [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview) для демонстрации того, как разработчики могут интегрировать функционал, связанный с криптовалютой TON.

Манифест TON Connect, используемый в этом шаблоне, хранится в папке `public`, где находятся все публично доступные статические файлы. Не забудьте [настроить](https://docs.ton.org/develop/dapps/ton-connect/manifest) этот файл в соответствии с информацией вашего проекта.

## Полезные ссылки

- [Документация платформы](https://docs.telegram-mini-apps.com/)
- [Документация @telegram-apps/sdk-react](https://docs.telegram-mini-apps.com/packages/telegram-apps-sdk-react)
- [Чат сообщества разработчиков Telegram](https://t.me/devs)
