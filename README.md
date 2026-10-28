# TZ-08_Cvetochnaya_Masterskaya_Lepestok24
Сайт цветочной мастерской «Лепесток 24»: GA4, UTM, заявки в Google Таблицу, ManyChat, дашборд DataLens


# Цветочная мастерская «Леписток 24» — сайт и сквозная аналитика заявок

Курсовая работа по дисциплине ОП.03 «Информационные технологии», ТЗ № 08/2026.
Исполнитель: Кладити Дмитрий, группа 11/1-РПО-26/1.

Сайт кампании «День матери, 29 ноября 2026 года»: каждый посетитель приходит
с меткой источника, каждая заявка попадает в Google Таблицу, а руководитель
видит, какой канал приводит клиентов.

**Схема работы:**

![](/docs/scheme.png)

## Ссылки

| Что | Ссылка |
|---|---|
| Сайт на Vercel | http://tz08masterskayalepestok24.vercel.app/ |
| Описание работы | https://github.com/DmitriyKladiti/TZ-08_Cvetochnaya_Masterskaya_Lepestok24/blob/main/docs/opisanie.md |
| Презентация | https://github.com/DmitriyKladiti/TZ-08_Cvetochnaya_Masterskaya_Lepestok24/blob/main/presentation/zashchita.pdf |
| Таблица заявок (доступ на просмотр) | https://docs.google.com/spreadsheets/d/1bvdS8GTi6XtXcJxZS_L7bngTxrNdXGmLd3EVGpX-ROs/edit?gid=0#gid=0 |
| Reel с автоответом | https://www.instagram.com/p/De9wMR5CPnv/ |

**Measurement ID ресурса GA4:** G-SKHXGZNR94

## Что сделано

| Часть | Результат |
|---|---|
| Сайт | 8 страниц, статический HTML, Vercel |
| GA4 | 16 событий, 29 пользовательских параметров, ключевые: generate_lead, contact_click, messenger_click |
| UTM | 4 ссылкb в реестре, публикации в Instagram, QR на афише |
| Заявки | форма → Apps Script → лист `leads`, проверка полей и повторов |
| Instagram | ManyChat, две ветки: IG Mothers Day 2026 Care Reel и IG Mothers Day 2026 Care Reel 2 |
| Отчёты | Reports, Explore, воронка, путь |

## Технологии

HTML, CSS, JavaScript · Google Analytics 4 · Google Таблицы и Apps Script ·
ManyChat · GitHub и Vercel. Сайт создан с помощью ChatGPT
(запросы — в [docs/prompts.md](docs/prompts.md)).

## Структура

```text
index.html …         страницы сайта
js/script.js         все события GA4
docs/Code.gs         приёмник заявок
docs/                описание, реестр UTM, события, записка, схема
screens/             кадры-доказательства по разделам ТЗ
presentation/        презентация к защите
```

Не получилось: 
- Настроить дашборд в Yandex DataLens, так как ресурс работает нестабильно.
- Создать отчет key-events. Нужные события отмечены, но аналитика не может их отобразить их через филььтр ключевых событий.
- Открытие карточки букет и событие, отслеживающее это действие. Вся и иформация о букете полносьтю видна из каталога.
- Каналы мастерской (не связь, а именно каналы) не видны в подвале сайта, а только на странице с благодарностью. Как следствие событие social_click не отслеживает страницу, тольько сам факт перехода.
- Ошибка сруктуры: код всех событий написан в script.js а не в analytics.js.

ИИ использовался для: 
- Создания кода основных страниц сайта. 
- Создания кода событий