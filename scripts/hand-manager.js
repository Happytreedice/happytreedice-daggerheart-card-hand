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
                [this.SETTING_WIDTH]: 800
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

        // Открыть описание предмета по ПКМ (контекстное меню) — как при выборе "Редактировать"
        $el.on('contextmenu', async (ev) => {
            try {
                ev.preventDefault();
                ev.stopPropagation();

                // Если это реальный документ Item (Foundry), попробуем открыть его лист
                if (item && typeof item.sheet === 'object' && typeof item.sheet.render === 'function') {
                    item.sheet.render(true);
                    return;
                }

                // Если предмет привязан к актору и документ можно получить через actor.items
                if (item && item.actor && item.actor.items && typeof item.actor.items.get === 'function') {
                    const found = item.actor.items.get(item.id);
                    if (found && typeof found.sheet === 'object' && typeof found.sheet.render === 'function') {
                        found.sheet.render(true);
                        return;
                    }
                }

                // Для синтетических карточек (например, атака противника) показываем простое модальное окно с описанием
                const title = item?.name || "Item";
                const desc = HandManager.formatDescription(item?.system?.description?.value || item?.system?.description || '');
                const content = `<div class="dh-item-sheet-preview">${desc}</div>`;

                // Используем Foundry Dialog, если доступен
                if (typeof Dialog === 'function') {
                    new Dialog({
                        title,
                        content,
                        buttons: { close: { label: game.i18n?.localize?.('Close') || 'Close' } },
                        default: 'close'
                    }).render(true);
                } else {
                    alert(`${title}\n\n${desc.replace(/<[^>]*>?/gm, '')}`);
                }

            } catch (err) {
                console.error('QuickItems | Failed to open item sheet on context menu', err);
            }
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