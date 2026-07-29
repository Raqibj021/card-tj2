# Автоматические письма Vizora.tj

## Что реализовано

- очередь `email_outbox` с блокировкой, повторными попытками и журналом ошибок;
- Edge Function `process-email-outbox`;
- шаблоны RU / TJ / EN;
- подтверждение оплаты и код активации;
- результат проверки и запрос дополнительных документов;
- приглашение сотрудника;
- уведомление об изменении данных;
- предупреждение об окончании тарифа;
- уведомление о блокировке;
- ответ поддержки;
- статусы заказов и договоров.

Подтверждение регистрации и восстановление пароля отправляет Supabase Auth.
Для них включите тот же Resend SMTP в Authentication → Emails → SMTP Settings.

## 1. База

Выполните `supabase/migrations/008_transactional_email.sql`.

## 2. Resend

Создайте бесплатный аккаунт Resend, подтвердите домен `vizora.tj`, создайте API key.

## 3. Секреты Edge Function

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxxxx \
  MAIL_WORKER_SECRET=СЛУЧАЙНАЯ_ДЛИННАЯ_СТРОКА \
  VIZORA_FROM_EMAIL="Vizora.tj <noreply@vizora.tj>" \
  VIZORA_REPLY_TO=support@vizora.tj \
  VIZORA_SITE_URL=https://raqibj021.github.io/card-tj2
```

## 4. Публикация функции

```bash
supabase functions deploy process-email-outbox --no-verify-jwt
```

## 5. Автоматический запуск

В Supabase Dashboard создайте Database Webhook для таблицы `email_outbox`:

- event: `INSERT`;
- method: `POST`;
- URL: `https://PROJECT_REF.supabase.co/functions/v1/process-email-outbox`;
- header: `x-mail-worker-secret: значение MAIL_WORKER_SECRET`.

Для повторной отправки временно не доставленных писем добавьте Cron-вызов функции
раз в 5 минут либо повторный Database Webhook на событие `UPDATE`.

## 6. SMTP для регистрации и восстановления пароля

В Resend откройте SMTP credentials. В Supabase:

`Authentication → Emails → SMTP Settings`

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: API key Resend
- Sender: `noreply@vizora.tj`
- Sender name: `Vizora.tj`

Никогда не добавляйте API key или service-role key в GitHub и клиентский `.env`.
