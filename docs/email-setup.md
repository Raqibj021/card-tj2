# Автоматические письма Vizora.tj

Vizora использует очередь `email_outbox`, Edge Function и бесплатный Gmail-шлюз.
Регистрация и восстановление пароля отправляются непосредственно через SMTP
Supabase. Остальные служебные письма обрабатываются очередью каждые 10 минут.

## Какие письма автоматизированы

- код подтверждения регистрации и восстановление пароля — Supabase Auth SMTP;
- подтверждение оплаты и код активации тарифа;
- результат проверки и запрос дополнительных документов;
- приглашение сотрудника в организацию;
- уведомление об изменении данных;
- предупреждение об окончании тарифа;
- блокировка после проверки или жалобы;
- ответ службы поддержки;
- изменение статуса заказа и договора.

## 1. Миграция базы

Выполнить в SQL Editor:

`supabase/migrations/010_email_delivery_completion.sql`

## 2. Бесплатный Gmail-шлюз

1. Открыть [Google Apps Script](https://script.google.com/) под почтой
   `vizora.platform.tj@gmail.com`.
2. Создать новый проект `Vizora Mail Gateway`.
3. Заменить содержимое редактора кодом из
   `integrations/google-apps-script/VizoraMailGateway.gs`.
4. Открыть **Project Settings → Script properties**.
5. Добавить свойство `VIZORA_GATEWAY_SECRET` и длинную случайную строку.
6. Нажать **Deploy → New deployment → Web app**.
7. `Execute as`: **Me**. `Who has access`: **Anyone**.
8. Скопировать URL, который заканчивается на `/exec`.

## 3. Секреты Edge Function

В Supabase открыть **Edge Functions → Secrets** и добавить:

```text
MAIL_PROVIDER=google_apps_script
MAIL_WORKER_SECRET=отдельная_длинная_случайная_строка
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
GOOGLE_APPS_SCRIPT_SECRET=значение_VIZORA_GATEWAY_SECRET
VIZORA_REPLY_TO=vizora.platform.tj@gmail.com
VIZORA_SITE_URL=https://vizora.tj
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` Edge Function получает
автоматически. Их не нужно вставлять в код сайта.

## 4. Секреты GitHub

В репозитории открыть **Settings → Secrets and variables → Actions**.

Repository secrets:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF=kzyjkvztucihkbhitrvu
SUPABASE_MAIL_FUNCTION_URL=https://kzyjkvztucihkbhitrvu.supabase.co/functions/v1/process-email-outbox
MAIL_WORKER_SECRET
```

Значение `MAIL_WORKER_SECRET` должно совпадать с секретом Edge Function.

Repository variable:

```text
EMAIL_WORKER_ENABLED=true
```

## 5. Публикация и проверка

1. В GitHub Actions вручную запустить `Deploy Vizora email function`.
2. Затем запустить `Process Vizora service emails`.
3. В Supabase Table Editor открыть `email_outbox`.
4. Успешные письма получают статус `sent`; ошибка сохраняется в `last_error`.

После подключения домена Gmail-шлюз можно заменить на Resend без изменения базы
и шаблонов. Для этого достаточно установить `MAIL_PROVIDER=resend`,
`RESEND_API_KEY` и `VIZORA_FROM_EMAIL`.
