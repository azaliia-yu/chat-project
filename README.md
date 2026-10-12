# 💬 Chat Project — мультиплатформенный мессенджер

Кроссплатформенный чат в стиле Telegram, работающий одновременно в **веб-браузере**, **на десктопе** и **на мобильном устройстве**. Поддерживает каналы, отправку сообщений с автообновлением и полнотекстовый поиск.

Проект решает задачу организации общения в закрытом контуре: все компоненты разворачиваются локально на одном компьютере, не требуют облачных сервисов, платных подписок и внешних API. Один backend отдаёт данные сразу трём клиентам через общий REST API, что позволяет использовать чат с любого устройства.

---



## 🔧 Требования к окружению (Prerequisites)

### Обязательно

| Компонент | Версия | Зачем |
|-----------|--------|-------|
| **Python** | 3.12+ | Backend (Django) |
| **Node.js + npm** | 20 LTS или 22+ | Web, Desktop, Mobile |
| **PostgreSQL** | 16+ | Основная БД |
| **Elasticsearch** | 8.15.1 | Поиск по каналам и сообщениям |
| **Git** | 2.40+ | Клонирование репозитория |

### Опционально

| Компонент | Зачем |
|-----------|-------|
| **VS Code** | Удобная разработка |
| **pgAdmin 4** | Управление PostgreSQL через GUI (идёт с установщиком PostgreSQL) |
| **Android Studio** | Сборка APK для реального Android-устройства |

### Системные утилиты

- **Windows**: Command Prompt (cmd) или PowerShell
- **macOS / Linux**: bash / zsh
- Открытые порты: `5433` (PostgreSQL), `9200` (Elasticsearch), `8000` (Django), `5173` (React), `8100` (Ionic)

---

## 🚀 Установка (Installation)

### Шаг 0. Клонирование репозитория

```bash
git clone https://github.com/ВАШ_НИК/chat-project.git
cd chat-project
```

### Шаг 1. Установка системного ПО

Установите перечисленные компоненты из раздела «Требования»:

- **Python** — [python.org/downloads](https://www.python.org/downloads/) → отметить **Add Python to PATH**
- **Node.js** — [nodejs.org](https://nodejs.org/) → LTS
- **PostgreSQL** — [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
  - Пароль суперпользователя: `postgres`
  - Порт: **`5433`**
- **Elasticsearch 8.15.1** — [elastic.co/downloads/past-releases](https://www.elastic.co/downloads/past-releases/elasticsearch-8-15-1)
  - Скачать `.zip`, распаковать в `C:\elasticsearch`
- **Git** — [git-scm.com/download/win](https://git-scm.com/download/win)

Проверка:

```bash
python --version
node --version
npm --version
git --version
```

### Шаг 2. Настройка Elasticsearch

Отключить security (для локальной разработки):

Откройте `C:\elasticsearch\config\elasticsearch.yml` и замените блок security на:

```yaml
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
xpack.security.http.ssl:
  enabled: false
xpack.security.transport.ssl:
  enabled: false
```

Запуск (в отдельном окне терминала, не закрывать):

```bash
cd C:\elasticsearch\bin
elasticsearch.bat
```

Дождаться строки `started`. Проверка: `http://localhost:9200` возвращает JSON.

### Шаг 3. Создание базы данных PostgreSQL

```bash
set PGPASSWORD=postgres
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5433 -c "CREATE DATABASE chat_db;"
```

Проверка:

```bash
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5433 -l
```

В списке должна быть `chat_db`.

### Шаг 4. Backend (Django + DRF)

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Если файла `requirements.txt` нет:

```bash
pip install "django==5.1.4" "djangorestframework==3.15.2" "django-cors-headers==4.6.0" "psycopg2-binary==2.9.10" "elasticsearch==8.15.1" "elasticsearch-dsl==8.15.4" "django-elasticsearch-dsl==8.0"
```

Настройте `backend/config/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'chat_db',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'localhost',
        'PORT': '5433',
    }
}

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_elasticsearch_dsl',
    'chat',
]

CORS_ALLOW_ALL_ORIGINS = True

ELASTICSEARCH_DSL = {
    'default': {'hosts': 'http://localhost:9200'},
}

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}
```

Применить миграции и создать суперпользователя:

```bash
python manage.py migrate
python manage.py createsuperuser
```

Построить ES-индексы:

```bash
python manage.py search_index --rebuild -f
```

Запустить сервер (отдельное окно):

```bash
python manage.py runserver
```

Проверка: `http://127.0.0.1:8000/admin/` — открывается.

### Шаг 5. Web-версия (React)

Отдельное окно терминала:

```bash
cd frontend-react
npm install
npm run dev
```

Проверка: `http://localhost:5173` — открывается чат.

### Шаг 6. Desktop-версия (Electron)

⚠️ Требует **запущенного React** (шаг 5).

Отдельное окно терминала:

```bash
cd frontend-electron
npm install
npm start
```

Открывается окно приложения.

### Шаг 7. Mobile-версия (Ionic)

Отдельное окно терминала:

```bash
cd frontend-ionic
npm install
ionic serve
```

Проверка: `http://localhost:8100`

**Проверить мобильный вид:** DevTools (F12) → **Ctrl + Shift + M** → выбрать iPhone / Android.

### Шаг 8. Запуск всего стека

Итого нужно **5 окон терминала**, работающих одновременно:

| # | Окно | Команда |
|---|------|---------|
| 1 | Elasticsearch | `cd C:\elasticsearch\bin && elasticsearch.bat` |
| 2 | Django | `cd backend && venv\Scripts\activate && python manage.py runserver` |
| 3 | Web | `cd frontend-react && npm run dev` |
| 4 | Desktop | `cd frontend-electron && npm start` |
| 5 | Mobile | `cd frontend-ionic && ionic serve` |

Открыть в браузере:

- Web: `http://localhost:5173`
- Mobile: `http://localhost:8100`
- Admin: `http://127.0.0.1:8000/admin/`

---

## 🛠 Стек технологий

| Слой | Технология | Версия |
|------|------------|--------|
| Backend | Python | 3.12 |
| Backend | Django | 5.1.4 |
| Backend | Django REST Framework | 3.15.2 |
| Database | PostgreSQL | 18 |
| Search | Elasticsearch | 8.15.1 |
| Web | React + Vite | 19 + 8 |
| Desktop | Electron | 44 |
| Mobile | Ionic + Capacitor | latest |
| Runtime | Node.js | 24 |

---

## 🏗 Архитектура

```
┌──────────────────────────────────────────────────────────┐
│                       Клиенты                             │
├──────────────────┬──────────────────┬────────────────────┤
│  Web (React)     │  Desktop         │  Mobile            │
│  localhost:5173  │  (Electron)      │  (Ionic)           │
│                  │  грузит :5173    │  localhost:8100    │
└────────┬─────────┴────────┬─────────┴──────────┬─────────┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │ HTTP / JSON
                            ▼
         ┌──────────────────────────────────────┐
         │   Django REST API  (localhost:8000)  │
         └──────┬────────────────────────┬──────┘
                │                        │
                ▼                        ▼
     ┌──────────────────┐    ┌────────────────────────┐
     │   PostgreSQL     │    │   Elasticsearch        │
     │   localhost:5433 │    │   localhost:9200       │
     │   (chat_db)      │    │   (channels, messages) │
     └──────────────────┘    └────────────────────────┘
```

---

## 📁 Структура проекта

```
chat-project/
├── backend/                    # Django + DRF
│   ├── chat/                   # приложение чата
│   ├── config/                 # настройки Django
│   ├── venv/                   # виртуальное окружение
│   └── manage.py
├── frontend-react/             # Web (React + Vite)
├── frontend-electron/          # Desktop (Electron)
├── frontend-ionic/             # Mobile (Ionic + React)
├── docs/
│   └── screenshots/            # скриншоты для README
├── .gitignore
└── README.md
```

---

## 🌿 Ветки репозитория

| Ветка | Содержимое |
|-------|-----------|
| `main` | Backend + Web (React) |
| `electron` | + Desktop (Electron) |
| `ionic` | + Mobile (Ionic) |

```bash
git checkout main       # веб-версия
git checkout electron   # десктоп
git checkout ionic      # мобильная
```

---

## 🔌 API

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/api/channels/` | Список каналов |
| `POST` | `/api/channels/` | Создать канал |
| `GET` | `/api/channels/{id}/` | Детали канала |
| `DELETE` | `/api/channels/{id}/` | Удалить канал |
| `GET` | `/api/channels/{id}/messages/` | Сообщения канала |
| `POST` | `/api/channels/{id}/send_message/` | Отправить сообщение |
| `GET` | `/api/messages/` | Все сообщения |
| `DELETE` | `/api/messages/{id}/` | Удалить сообщение |

### Примеры

Создать канал:

```bash
curl -X POST http://127.0.0.1:8000/api/channels/ \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"general\",\"description\":\"Общий канал\"}"
```

Отправить сообщение:

```bash
curl -X POST http://127.0.0.1:8000/api/channels/1/send_message/ \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Привет, мир!\"}"
```

---

## ✨ Возможности

- 📢 **Каналы** — создание, удаление, список в сайдбаре
- 💬 **Сообщения** — отправка, автообновление каждые 3 сек, выравнивание «свои/чужие» как в Telegram
- 🔍 **Поиск** — Elasticsearch-индексы для каналов и сообщений
- 🖥️ **Три платформы** — Web (React), Desktop (Electron), Mobile (Ionic)
- 🌐 **REST API** — Django REST Framework
- 🔐 **Админка Django** — управление каналами и сообщениями через UI

---

## 📜 Лицензии

Все компоненты — бесплатные, с открытым исходным кодом:

| Компонент | Лицензия |
|-----------|----------|
| Python | PSF |
| Django / DRF | BSD-3 |
| PostgreSQL | PostgreSQL License |
| Elasticsearch | Elastic License 2.0 (бесплатно для локального использования) |
| Node.js / React / Vite / Electron / Ionic | MIT |
| VS Code | MIT |

Проект создан в учебных целях и полностью бесплатен для локального использования.

---

## 📝 Примечания

- Проект работает **только локально** на одном компьютере.
- Аутентификация отключена — все запросы анонимные. Для продакшена нужно добавить вход.
- Elasticsearch security отключён для упрощения локальной разработки.
- Настройки Django и Elasticsearch **не предназначены для продакшена**.

---

## 👤 Автор

Азалия — [github.com/azaliia-yu](https://github.com/azaliia-yu)
```
