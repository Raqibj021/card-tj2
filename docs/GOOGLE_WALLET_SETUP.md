# Google Wallet для Vizora.tj

Интерфейс и серверная функция уже подготовлены. Ключ сервисного аккаунта хранится
только в Supabase Edge Function Secrets и никогда не попадает в браузер.

## Требуется перед включением

1. Создать Issuer account в Google Pay & Wallet Console.
2. Включить Google Wallet API в Google Cloud.
3. Создать service account и JSON-ключ.
4. Добавить email service account в Issuer account с ролью Developer.
5. Добавить в Supabase Edge Function Secrets:
   - `GOOGLE_WALLET_ISSUER_ID` — числовой Issuer ID;
   - `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` — полное содержимое JSON-ключа;
   - `VIZORA_WALLET_ORIGIN` — `https://vizora.tj` после подключения домена.
6. Запустить GitHub Actions workflow `Deploy Vizora wallet function`.
7. Создать тестовый пропуск и запросить Publishing access в Google Wallet Console.

До завершения этих шагов кнопка показывает безопасное уведомление об ожидании
подключения, а не выдаёт нерабочую ссылку.
