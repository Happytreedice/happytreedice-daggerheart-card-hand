# Happytreedice Daggerheart Card Hand

Панель «рука карт» для системы [Daggerheart (Foundryborne)](https://github.com/Foundryborne/daggerheart) в Foundry VTT.
Показывает оружие, карты доменов, способности и расходники выбранного актёра в виде карт, оформленных в официальном стиле Daggerheart.

- **Foundry VTT:** 13 – 14 (проверено на 14.364, без jQuery и Dialog V1)
- **Система:** `daggerheart` (Foundryborne), проверено на 1.2.7 и 2.4.2

## Возможности

- Карты в руке с веерной раскладкой (угол настраивается), перетаскивание карты вверх = использование предмета, ПКМ = открыть лист предмета.
- Фильтры по типам (оружие / карты доменов / способности / расходники) и «только экипированное».
- Для противников (adversary) автоматически добавляется карта стандартной атаки.
- Шаблон карт по умолчанию воспроизводит официальный макет карты Daggerheart: баннер уровня с иконкой домена, значок стоимости Recall, золотая полоса-разделитель с типом карты, шрифты системы Foundryborne (Cinzel / Montserrat).
- **Подключаемые шаблоны карт**: другие модули могут добавлять собственные шаблоны (см. ниже).

## API для модулей-шаблонов

Внешний модуль может зарегистрировать собственный шаблон карт. Шаблон появится в настройках
(`Card Template`) автоматически.

### 1. Объявите зависимость в `module.json` своего модуля

```json
{
    "id": "my-daggerheart-card-template",
    "title": "My Daggerheart Card Template",
    "version": "1.0.0",
    "compatibility": { "minimum": "13", "verified": "14" },
    "relationships": {
        "requires": [
            {
                "id": "happytreedice-daggerheart-card-hand",
                "type": "module",
                "compatibility": { "minimum": "1.1.0" }
            }
        ],
        "systems": [
            { "id": "daggerheart", "type": "system", "compatibility": {} }
        ]
    },
    "esmodules": ["scripts/my-template.js"]
}
```

Благодаря `relationships.requires` Foundry не даст включить ваш модуль без установленного
Card Hand и предложит установить зависимость автоматически.

### 2. Зарегистрируйте шаблон

Рекомендуемый способ — хук `happytreedice-daggerheart-card-hand.registerTemplates`
(срабатывает на `i18nInit`, до построения настроек; подписывайтесь в `init`):

```js
Hooks.once('happytreedice-daggerheart-card-hand.registerTemplates', (api) => {
    api.registerTemplate({
        id: 'my-template',
        name: 'MY_MODULE.TemplateName',        // строка или i18n-ключ
        renderCard: (item) => `
            <div class="myt-card">
                <img src="${item.img}">
                <h3>${item.name}</h3>
            </div>
        `,
        // Необязательно: своя разметка панели (иначе используется стандартная)
        // renderPanel: ({ dragTitle, noActorText }) => `...`,
        attachStyles: () => { /* вставить свой <style> в document.head */ },
        detachStyles: () => { /* удалить свой <style> при смене шаблона */ }
    });
});
```

Либо в любой момент после `init` — через API модуля (список в настройках обновится динамически):

```js
game.modules.get('happytreedice-daggerheart-card-hand')?.api?.registerTemplate({ ... });
```

### Контракт шаблона

| Поле | Обязательное | Описание |
|---|---|---|
| `id` | да | Уникальный идентификатор (значение настройки `cardTemplate`). |
| `name` | да | Отображаемое имя; может быть ключом локализации. |
| `renderCard(item)` | да | Возвращает HTML-строку содержимого одной карты. Вставляется внутрь `.dh-card-scaler` (320×440, масштабируется до 0.5). |
| `renderPanel(options)` | нет | Разметка всей панели. Должна содержать `#daggerheart-hand`, `#dh-hand-drag-target` и `.dh-cards-container`. По умолчанию — стандартная панель. |
| `attachStyles()` | нет | Вызывается при активации шаблона — внедрите свои стили. |
| `detachStyles()` | нет | Вызывается при деактивации шаблона — удалите свои стили. |

`item` — документ `Item` системы Foundryborne (или синтетическая карта стандартной атаки противника
с той же структурой `system`). Полезные хелперы доступны в `api.HandManager`:
`formatDescription`, `formatRange`, `formatItemType`, `formatDomainCardType`, `escapeHtml`,
`_getDamageFormula`, `_getDamageLabels`, `getDomainConfig` (домены системы, включая homebrew).

Прочие методы API: `unregisterTemplate(id)`, `getTemplate(id)`, `getTemplateChoices()`, `TemplateRegistry` (Map).

## Настройки

Все настройки клиентские: включение панели, шаблон карт, угол веера, масштаб, ширина панели,
отступ снизу, фильтры типов карт, «только экипированное».
