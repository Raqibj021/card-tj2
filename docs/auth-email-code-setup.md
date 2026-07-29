# Код подтверждения регистрации

Интерфейс Vizora ожидает шестизначный код Supabase Auth.

## Настройка шаблона Supabase

1. Откройте проект Supabase.
2. Перейдите в **Authentication → Emails → Templates**.
3. Откройте шаблон **Confirm signup**.
4. Укажите тему: `Код подтверждения Vizora.tj`.
5. Вставьте HTML ниже и сохраните:

```html
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#0b172a">
  <h2 style="margin:0 0 12px">Подтверждение регистрации</h2>
  <p style="line-height:1.6;color:#536277">Введите этот код на странице Vizora.tj:</p>
  <div style="margin:24px 0;padding:18px;border-radius:12px;background:#eef5ff;text-align:center;font-size:32px;font-weight:800;letter-spacing:8px;color:#075fd1">
    {{ .Token }}
  </div>
  <p style="font-size:13px;line-height:1.6;color:#7c899a">Если вы не регистрировались на Vizora.tj, проигнорируйте это письмо.</p>
</div>
```

Для разработки можно использовать встроенную отправку Supabase. Перед публичным запуском необходимо подключить собственный SMTP и подтверждённый домен, иначе действуют строгие демонстрационные ограничения.
