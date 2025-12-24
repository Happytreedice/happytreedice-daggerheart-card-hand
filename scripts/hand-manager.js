import { SmoothDnD, CardSmoothDnD } from './dnd.js';
import { getTemplate, getTemplateChoices } from './registry.js';

/**
 * Daggerheart Card Hand Manager
 * Handles UI creation, state management, and interaction logic.
 */
export class HandManager {
    static MODULE_NAME = 'happytreedice-daggerheart-card-hand';

    static SETTING_ENABLED = 'handEnabled';
    static SETTING_TEMPLATE = 'cardTemplate';
    static SETTING_ARC_ANGLE = 'arcAngle';
    static SETTING_FILTER_EQUIPPED = 'filterEquipped';
    static SETTING_SCALE = 'handScale';
    static SETTING_WIDTH = 'handWidthPx';
    static SETTING_BOTTOM = 'bottom';

    static _currentActor = null;
    static _isCollapsed = false;
    static _dndInstance = null;

    // Optimization: Cache DOM elements
    static _$panel = null;
    static _$container = null;
    static _refreshDebounceTimer = null;

    static getSetting(key) {
        try {
            return game.settings.get(this.MODULE_NAME, key);
        } catch (e) {
            // Fallback values if settings are not registered or module ID mismatch
            const defaults = {
                [this.SETTING_ENABLED]: true,
                [this.SETTING_TEMPLATE]: 'default',
                [this.SETTING_ARC_ANGLE]: 10,
                [this.SETTING_FILTER_EQUIPPED]: true,
                [this.SETTING_SCALE]: 1.0,
                [this.SETTING_WIDTH]: 800,
                [this.SETTING_BOTTOM]: 15
            };
            return defaults[key];
        }
    }

    static registerSettings() {

        game.settings.register(this.MODULE_NAME, this.SETTING_ENABLED, {
            name: this.translate("SETTINGS.ENABLED_NAME"),
            hint: this.translate("SETTINGS.ENABLED_HINT"),
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
            onChange: () => this.refreshHand()
        });

        const templateChoices = getTemplateChoices();

        game.settings.register(this.MODULE_NAME, this.SETTING_TEMPLATE, {
            name: this.translate("SETTINGS.TEMPLATE_NAME"),
            hint: this.translate("SETTINGS.TEMPLATE_HINT"),
            scope: "client",
            config: true,
            type: String,
            default: "default",
            choices: templateChoices,
            onChange: () => {
                if (this._$panel) {
                    this._$panel.remove();
                    this._$panel = null;
                    this._$container = null;
                }
                this.refreshHand();
            }
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_ARC_ANGLE, {
            name: this.translate("SETTINGS.ARC_ANGLE_NAME"),
            hint: this.translate("SETTINGS.ARC_ANGLE_HINT"),
            scope: "client",
            config: true,
            type: Number,
            default: 10,
            range: { min: 0, max: 45, step: 1 },
            onChange: () => this.applyCardFanLayout()
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_FILTER_EQUIPPED, {
            name: this.translate("SETTINGS.FILTER_EQUIPPED_NAME"),
            hint: this.translate("SETTINGS.FILTER_EQUIPPED_HINT"),
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
            onChange: () => this.refreshHand()
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_SCALE, {
            name: this.translate("SETTINGS.SCALE_NAME"),
            hint: this.translate("SETTINGS.SCALE_HINT"),
            scope: "client",
            config: true,
            type: Number,
            default: 1.0,
            range: { min: 0.5, max: 2.0, step: 0.1 },
            onChange: () => this.applyStyles()
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_BOTTOM, {
            name: this.translate("SETTINGS.BOTTOM_NAME"),
            hint: this.translate("SETTINGS.BOTTOM_HINT"),
            scope: "client",
            config: true,
            type: Number,
            default: 15,
            range: { min: 0, max: 400, step: 1 },
            onChange: () => this.applyStyles()
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_WIDTH, {
            name: this.translate("SETTINGS.WIDTH_NAME"),
            hint: this.translate("SETTINGS.WIDTH_HINT"),
            scope: "client",
            config: true,
            type: Number,
            default: 800,
            range: { min: 600, max: 2000, step: 50 },
            onChange: () => {
                this.applyStyles();
                this.applyCardFanLayout();
            }
        });
    }

    static translate(key) {
        const fullKey = `QUICK_ITEMS.${key}`;
        if (game.i18n.has(fullKey)) return game.i18n.localize(fullKey);
        return game.i18n.localize(key);
    }

    static itemHasActions(item) {
        const actions = item.system?.actions;
        if (!actions) return false;
        if (typeof actions.size === 'number') return actions.size > 0;
        if (typeof actions === 'object') return Object.keys(actions).length > 0;
        return false;
    }

    // --- Helpers ---

    static _getDamageFormula(item) {
        if (!item.system.attack?.damage?.parts) return "";

        const parts = [];
        for (const part of item.system.attack.damage.parts) {
            const { value } = part;
            // Use system logic or fallback
            // Replicating Daggerheart's DHActionDiceData.getFormula logic roughly if needed,
            // but since we have the item, we might be able to rely on its data if it's prepared.

            // However, the `value` in `parts` is a DataModel instance in the system. 
            // If `item` is a proper system document, `value.getFormula()` should work.
            // But let's be safe and replicate the formula construction if accessors aren't available 
            // or if we want to be sure.

            let formula = "";
            if (value.custom?.enabled) {
                formula = value.custom.formula;
            } else {
                const multiplier = value.multiplier === 'flat' ? value.flatMultiplier : `@${value.multiplier}`;
                // Handle bonus sign
                const bonus = value.bonus ? (value.bonus < 0 ? ` - ${Math.abs(value.bonus)}` : ` + ${value.bonus}`) : '';
                formula = `${multiplier ?? 1}${value.dice}${bonus}`;
            }

            // Replace data
            const rollData = item.actor?.getRollData() ?? {};
            if (Roll.replaceFormulaData) {
                formula = Roll.replaceFormulaData(formula, rollData);
            }
            parts.push(formula);
        }

        return parts.join(" + ");
    }

    static _getDamageLabels(item) {
        if (!item.system.attack?.damage?.parts) return "";

        const uniqueTypes = new Set();
        for (const part of item.system.attack.damage.parts) {
            if (part.type) {
                const types = part.type instanceof Set ? part.type : (Array.isArray(part.type) ? part.type : [part.type]);
                types.forEach(t => uniqueTypes.add(t));
            }
        }

        const labels = [];
        for (const type of uniqueTypes) {
            const config = CONFIG.DH?.GENERAL?.damageTypes?.[type];
            if (config?.label) {
                labels.push(game.i18n.localize(config.label));
            }
        }

        return labels.join(" / ");
    }

    /**
     * Форматирует описание карточки: удаляет простые директивы и заменяет
     * ссылки формата `@Something[...] {Label}` на жирную метку `<strong>Label</strong>`.
     * Возвращает HTML-строку, готовую для вставки в DOM (метки экранируются).
     * @param {string} desc
     * @returns {string}
     */
    static formatDescription(desc) {
        let descHtml = desc || '';
        // Remove simple @Template[...] directives
        descHtml = descHtml.replace(/@Template\[[^\]]*\]/g, '');
        // Replace patterns like @Something[...]{Label} -> <strong>Label</strong>
        descHtml = descHtml.replace(/@[^\[]*\[[^\]]*\]\{([^}]*)\}/g, (m, label) => {
            const escaped = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<strong>${escaped}</strong>`;
        });
        return descHtml;
    }

    /**
     * Форматирует и локализует данные по дальности атаки/оружия.
     * Поддерживает строки и объекты вида {type, value} или {range, distance}.
     * Возвращает локализованную строку вида "<RangeLabel>: <TranslatedType> <value>" или пустую строку.
     * @param {any} range
     * @returns {string}
     */
    static formatRange(range) {
        if (!range && range !== 0) return '';
        const i18n = (typeof game !== 'undefined' && game.i18n) ? game.i18n : null;
        const rangeLabel = i18n && i18n.has('DAGGERHEART.GENERAL.range') ? i18n.localize('DAGGERHEART.GENERAL.range') : 'Range';

        let type = '';
        let value = '';

        if (typeof range === 'object') {
            type = range.type || range.rangeType || range.mode || '';
            value = range.value ?? range.distance ?? range.range ?? '';
        } else if (typeof range === 'string') {
            // If it's a single word, treat as a type; otherwise as a raw value (e.g. "10 ft")
            if (/^[a-zA-Z_]+$/.test(range)) type = range;
            else value = range;
        } else {
            value = String(range);
        }

        let translatedType = '';
        if (type) {
            const key = `DAGGERHEART.CONFIG.Range.${type}.short`;
            if (i18n && i18n.has(key)) translatedType = i18n.localize(key);
            else translatedType = type;
        }

        const parts = [];
        if (translatedType) parts.push(translatedType);
        if (value !== null && value !== undefined && String(value) !== '') parts.push(String(value));

        if (parts.length === 0) return '';
        return `${rangeLabel}: ${parts.join(' ')}`;
    }

    /**
     * Создаёт синтетическую карту стандартной атаки для противника (adversary).
     * Возвращает объект, совместимый с `createCardElement` и шаблоном.
     * @param {Actor} actor
     */
    static _createAdversaryStandardAttack(actor) {
        if (!actor) return null;

        // Не добавляем, если у актора уже есть явно названная стандартная атака
        const existing = actor.items?.find?.(i => i.name && i.name.toLowerCase().includes('standard attack'));
        if (existing) return null;

        const id = `adv-std-${actor.id}`;

        // Попробуем взять данные атаки из actor.system.attack, если есть
        const atk = actor.system?.attack || actor.system?.actions || null;

        const atkName = atk?.name || 'Standard Attack';
        const img = atk?.img || 'icons/svg/sword.svg';

        // Damage parts: если в данных актора есть parts, используем их, иначе дефолт
        const parts = (atk && atk.damage && atk.damage.parts) ? atk.damage.parts : [
            {
                value: {
                    custom: { enabled: false, formula: '' },
                    multiplier: 'flat',
                    flatMultiplier: 1,
                    dice: 'd6',
                    bonus: 0
                },
                applyTo: 'hitPoints',
                type: ['physical']
            }
        ];

        const synthetic = {
            id,
            name: atkName,
            type: 'weapon',
            img,
            actor,
            system: {
                description: { value: ' ' },
                domain: 'default',
                level: '',
                recallCost: 0,
                stress: 0,
                attack: {
                    // preserve roll data if present
                    roll: atk?.roll || (actor.system?.attack?.roll ?? {}),
                    damage: {
                        parts,
                        includeBase: atk?.damage?.includeBase ?? false,
                        direct: atk?.damage?.direct ?? false
                    },
                    type: atk?.type || 'attack',
                    range: atk?.range || ''
                }
            }
        };

        // Добавляем метод roll, чтобы HandManager.useItem мог его вызвать
        synthetic.roll = async function (event) {
            const item = this;
            const actor = item.actor;
            const speaker = ChatMessage.getSpeaker({ actor });

            // Try to invoke the system-provided attack if available (matches sheet button behavior)
            try {
                const sysAttack = actor.system?.attack;
                if (sysAttack && typeof sysAttack.use === 'function') {
                    // Call with null event to mimic sheet button
                    try {
                        const res = sysAttack.use({});
                        if (res instanceof Promise) await res;
                        return;
                    } catch (inner) {
                        // If call fails, fall back to manual rolling below
                        console.warn('Adversary synthetic attack: actor.system.attack.use failed, falling back', inner);
                    }
                }
            } catch (e) {
                // ignore and continue to manual roll
            }

            // 1) Attack roll (use d20, with possible advantage/disadvantage)
            try {
                const rollData = actor.getRollData ? actor.getRollData() : {};
                const atkRollData = item.system.attack.roll || {};

                // Determine d20 expression (support advantage/disadvantage)
                let atkDiceExpr = '1d20';
                const advState = atkRollData.advState || atkRollData.advantage || 'neutral';
                if (advState === 'adv' || advState === 'advantage') atkDiceExpr = '2d20kh1';
                if (advState === 'dis' || advState === 'disadvantage') atkDiceExpr = '2d20kl1';

                const atkBonusOwn = (typeof atkRollData.bonus === 'number') ? atkRollData.bonus : (atkRollData.bonus ?? 0);
                const atkBonusActor = actor.system?.bonuses?.roll?.attack?.bonus ?? 0;
                const totalBonus = (Number(atkBonusOwn) || 0) + (Number(atkBonusActor) || 0);

                const atkFormula = `${atkDiceExpr}${totalBonus ? ` + ${totalBonus}` : ''}`;

                const atkRoll = await new Roll(atkFormula, rollData).evaluate({ async: true });
                await atkRoll.toMessage({ speaker, flavor: `${item.name} — Attack Roll` });
            } catch (e) {
                console.warn('Adversary synthetic attack: failed attack roll', e);
            }

            // 2) Damage roll
            try {
                const damageFormula = HandManager._getDamageFormula(item);
                if (damageFormula && damageFormula.trim() !== '') {
                    const dmgRoll = await new Roll(damageFormula, actor.getRollData ? actor.getRollData() : {}).evaluate({ async: true });
                    await dmgRoll.toMessage({ speaker, flavor: `${item.name} — Damage` });
                } else {
                    ChatMessage.create({ speaker, content: `${item.name}: No damage formula available.` });
                }
            } catch (e) {
                console.warn('Adversary synthetic attack: failed damage roll', e);
            }
        };

        return synthetic;
    }

    // --- UI ---

    static get currentTemplate() {
        const id = this.getSetting(this.SETTING_TEMPLATE);
        // Fallback to 'default' if the selected template is missing
        return getTemplate(id) || getTemplate('default');
    }

    static createHandPanel() {
        // Optimization: Use cached selector if available
        if (this._$panel || document.getElementById('daggerheart-hand')) {
            this._$panel = $('#daggerheart-hand');
            this._$container = this._$panel.find('.dh-cards-container');
            return;
        }

        const dragTitle = this.translate("TOOLTIPS.DRAG");
        const noActorText = this.translate('NO_ACTOR');

        // Получаем HTML панели из текущего шаблона
        const template = this.currentTemplate;
        if (!template) {
            console.error("Quick Items Daggerheart | No template found!");
            return;
        }

        const html = template.renderPanel({ dragTitle, noActorText });

        $('body').append(html);

        // Cache references immediately
        this._$panel = $('#daggerheart-hand');
        this._$container = this._$panel.find('.dh-cards-container');

        this.applyStyles();

        this._dndInstance = new SmoothDnD('#daggerheart-hand', '#dh-hand-drag-target', (newLeft) => {
            this.savePosition(newLeft);
        });

        const isEnabled = this.getSetting(this.SETTING_ENABLED);

        if (!isEnabled) {
            this._$panel.addClass('hidden'); // Скрываем всю панель
            return;
        }

        const controlled = canvas.tokens?.controlled || [];

        if (controlled.length === 0) {
            this._$panel.addClass('hidden');
            this._currentActor = null; // Сбрасываем текущего актера
            return;
        }
    }

    static toggleHand() {
        if (!this._$panel) return;

        this._isCollapsed = !this._isCollapsed;
        const $bg = this._$panel.find('.hand-background-plate');

        if (this._isCollapsed) {
            this._$container.fadeOut(200);
            $bg.fadeOut(200);
            this._$panel.addClass('collapsed');
        } else {
            this._$panel.removeClass('collapsed');
            this._$container.fadeIn(200, () => this.applyCardFanLayout());
            $bg.fadeIn(200);
        }
    }

    static applyStyles() {
        if (!this._$panel) return;

        const scale = this.getSetting(this.SETTING_SCALE);
        const width = Math.max(600, this.getSetting(this.SETTING_WIDTH));
        const $wrapper = this._$panel.find('.hand-wrapper');

        $wrapper.css({
            'transform': `scale(${scale})`,
            'transform-origin': 'bottom center',
            'width': `${width}px`
        });

        this.applyCardFanLayout();
    }

    static async savePosition(left) {

        if (!game.modules.get(this.MODULE_NAME)?.active) return;

        try {
            await game.user.setFlag(this.MODULE_NAME, 'handPosition', { left });
        } catch (e) {
            console.warn("Quick Items Daggerheart | Failed to save position:", e);
        }
    }

    static restorePosition() {

        if (!game.modules.get(this.MODULE_NAME)?.active) return;

        let pos;
        try {
            pos = game.user.getFlag(this.MODULE_NAME, 'handPosition');
        } catch (e) {
            console.warn("Quick Items Daggerheart | Failed to read flags:", e);
            return;
        }

        if (pos && pos.left !== undefined) {
            if (!this._$panel) this._$panel = $('#daggerheart-hand');

            this._$panel.css({
                left: `${pos.left}px`,
                transform: 'translateX(0)',
                bottom: '0px'
            });

            if (this._dndInstance) {
                this._dndInstance.updatePosition(pos.left);
            }
        }
    }

    static refreshHandDebounced() {
        if (this._refreshDebounceTimer) clearTimeout(this._refreshDebounceTimer);
        this._refreshDebounceTimer = setTimeout(() => this.refreshHand(), 50);
    }

    static refreshHand() {
        if (!this._$panel) this.createHandPanel();

        const isEnabled = this.getSetting(this.SETTING_ENABLED);
        if (!isEnabled) {
            this._$panel.addClass('hidden');
            return;
        }

        const controlled = canvas.tokens?.controlled || [];
        if (controlled.length === 0) {
            this._$panel.addClass('hidden');
            this._currentActor = null;
            return;
        } else {
            this._$panel.removeClass('hidden');
        }

        const $container = this._$container;
        $container.empty();

        let actor = controlled[0].actor;
        this._currentActor = actor;

        if (!actor) {
            $container.append(`<div class="no-cards">${this.translate('NO_ACTOR')}</div>`);
            return;
        }

        const allItems = actor.items ? Array.from(actor.items) : [];

        const showEquippedOnly = this.getSetting(this.SETTING_FILTER_EQUIPPED);

        const cards = allItems.filter(item => {
            if (['class', 'subclass', 'race', 'ancestry', 'community'].includes(item.type)) return false;

            const hasActions = this.itemHasActions(item);
            const isWeapon = item.type === 'weapon';
            const isDomain = item.type === 'domainCard';

            if (!hasActions && !isWeapon && !isDomain) return false;

            if (showEquippedOnly) {
                if (item.system?.hasOwnProperty('equipped') && item.system.equipped == false) return false;
                if (isDomain && item.system.inVault == true) return false;
            }

            if (actor.system.isItemAvailable(item) == false) return false;

            return true;
        });

        if (cards.length === 0) {
            $container.append(`<div class="no-cards">${this.translate('NO_ITEMS')}</div>`);
            return;
        }

        cards.sort((a, b) => {
            const typeScore = (t) => {
                if (t === 'weapon') return 1;
                if (t === 'domainCard') return 2;
                return 3;
            };
            return typeScore(a.type) - typeScore(b.type) || a.name.localeCompare(b.name);
        });

        // Получаем текущий шаблон
        const template = this.currentTemplate;

        const fragment = document.createDocumentFragment();
        cards.forEach(item => {
            const el = this.createCardElement(item, template);
            fragment.appendChild(el[0]);
        });

        $container.append(fragment);
        this.applyCardFanLayout();
    }

    static createCardElement(item, template) {
        // Используем функцию renderCard из выбранного шаблона
        const tempHtml = template.renderCard(item);
        const html = `
            <div class="dh-card" data-item-id="${item.id}" data-type="${item.type}">
                <div class="dh-card-scaler">
                ${tempHtml}
                </div>
            </div>
        `;
        const $el = $(html);

        new CardSmoothDnD($el[0], () => {
            this.useItem(item);
        }, () => {
            this.applyCardFanLayout();
        });

        return $el;
    }

    static applyCardFanLayout() {
        if (!this._$container) return;

        const cards = this._$container.children('.dh-card');
        const count = cards.length;
        if (count === 0) return;

        const maxAngle = this.getSetting(this.SETTING_ARC_ANGLE);
        const wrapperWidth = this._$panel.find('.hand-wrapper').width();
        const cardWidth = 160;
        const availableSpace = wrapperWidth - 40;

        let marginLeft = -20;
        const totalNeeded = count * cardWidth;

        if (totalNeeded > availableSpace) {
            const spacePerCard = (availableSpace - cardWidth) / (count - 1);
            marginLeft = spacePerCard - cardWidth;
        }

        marginLeft = Math.max(marginLeft, -140);
        marginLeft = Math.min(marginLeft, 5);

        const centerIndex = (count - 1) / 2;
        const angleStep = count > 1 ? maxAngle / (count / 2) : 0;

        cards.each((index, element) => {
            if (element.classList.contains('dragging')) return;

            const style = element.style;

            style.marginLeft = index > 0 ? `${marginLeft}px` : '0px';
            style.zIndex = index + 1;
            style.bottom = '0px';

            const distFromCenter = index - centerIndex;
            if (maxAngle === 0) {
                style.transform = 'none';
            } else {
                const rotation = distFromCenter * angleStep;
                const yOffset = Math.abs(distFromCenter) * 5;
                style.transform = `rotate(${rotation}deg) translateY(${yOffset}px)`;
            }
        });
    }

    static async useItem(item, event) {
        const hasActions = this.itemHasActions(item);
        const safeEvent = event || {
            preventDefault: () => { },
            stopPropagation: () => { },
            shiftKey: false,
            ctrlKey: false,
            altKey: false,
            currentTarget: null
        };

        if (!hasActions && item.type !== 'weapon') {
            this.sendToChat(item);
            return;
        }

        try {
            if (item.roll) return await item.roll(safeEvent);
            if (item.use) {
                return await item.use(safeEvent);
            }
        } catch (e) {
            console.error("QuickItems | Roll Error:", e);
            this.sendToChat(item);
        }
    }

    static async sendToChat(item) {
        const speaker = ChatMessage.getSpeaker({ actor: item.actor });
        if (typeof item.displayCard === 'function') {
            return item.displayCard({ speaker });
        }
        item.toChat?.();
    }
}