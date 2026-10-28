# TZ-08_Cvetochnaya_Masterskaya_Lepestok24
Сайт цветочной мастерской «Лепесток 24»: GA4, UTM, заявки в Google Таблицу, ManyChat, дашборд DataLens

## Ссылки

| Что | Ссылка |
|---|---|
| Сайт на Vercel | http://tz08masterskayalepestok24.vercel.app/ |
| Описание работы `docs/opisanie.md` | https://github.com/DmitriyKladiti/Information-Technology/blob/kursovaya-rabota/kursovaya_rabota/docs/opisanie.md |
| Презентация `presentation/zashchita.pdf` | https://github.com/DmitriyKladiti/Information-Technology/blob/kursovaya-rabota/kursovaya_rabota/opisanie.md |
| Таблица заявок (доступ на просмотр) | ___ |
| Дашборд DataLens | ___ |
| Reel с автоответом | ___ |

**Measurement ID ресурса GA4:** G-SKHXGZNR94

Не получилось: 
- Настроить дашборд в Yandex DataLens, так как ресурс работает нестабильно.
- Создать отчет key-events. Нужные события отмечены, но аналитика не может их отобразить их через филььтр ключевых событий.
- Открытие карточки букет и событие, отслеживающее это действие. Вся и иформация о букете полносьтю видна из каталога.
- Каналы мастерской (не связь, а именно каналы) не видны в подвале сайта, а только на странице с благодарностью. Как следствие событие social_click не отслеживает страницу, тольько сам факт перехода.
- Ошибка сруктуры: код всех событий написан в script.js а не в analytics.js.

ИИ использовался для: 
- Создания кода основных страниц сайта. 
- Создания кода событий