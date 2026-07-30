# Финальный запуск Vizora.tj

Этот список выполняется один раз при переводе интерфейса с GitHub Pages на
Cloudflare Pages. База Supabase, пользователи, визитки и файлы при этом не
переносятся и не удаляются.

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- `VITE_BASE_PATH=/`
- `VITE_PUBLIC_SITE_URL=https://vizora.tj`
- `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` — текущие значения
  проекта Supabase

Файл `public/_redirects` уже обеспечивает открытие внутренних адресов React
Router после обновления страницы.

## Supabase Authentication

В `Authentication → URL Configuration`:

- Site URL: `https://vizora.tj`
- Redirect URLs:
  - `https://vizora.tj/**`
  - `https://www.vizora.tj/**` — только если будет использоваться `www`
  - старый GitHub Pages URL оставить до окончания проверки нового домена

## Edge Function Secrets

В `Edge Functions → Secrets`:

- `VIZORA_SITE_URL=https://vizora.tj`
- `VIZORA_WALLET_ORIGIN=https://vizora.tj`

Остальные секреты почтового шлюза и Google Wallet не менять. После сохранения
секретов повторно запустить workflow развёртывания email и Wallet функций.

## Проверка перед переключением DNS

1. Войти и выйти из пользовательского кабинета.
2. Отдельно войти в `/admin/login` и убедиться, что пользовательская сессия не
   изменилась.
3. Зарегистрировать тестовый адрес и подтвердить шестизначный код.
4. Проверить восстановление пароля.
5. Открыть подтверждённую визитку по прямой ссылке и через QR.
6. Проверить письмо из очереди, Google Wallet и форму поддержки.
7. Только после этого направить основной домен на Cloudflare.

GitHub остаётся единственным хранилищем кода. Каждый push в `main` автоматически
создаёт новую сборку Cloudflare Pages; Supabase и существующие данные не
затрагиваются.
