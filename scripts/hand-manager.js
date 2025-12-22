import { SmoothDnD, CardSmoothDnD } from './dnd.js';
import { injectStyles } from './styles.js';

/**
 * Daggerheart Card Hand Manager
 * Handles UI creation, state management, and interaction logic.
 */
export class HandManager {
    static MODULE_NAME = 'happytreedice-daggerheart-card-hand';

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

    // Цвета для доменов (подложки названий)
    static DOMAIN_COLORS = {
        blade: '#a31e21',    // Red
        bone: '#5e5e5e',     // Grey
        codex: '#d4a017',    // Gold/Yellow
        grace: '#c23b8f',    // Pink/Magenta
        midnight: '#1a1a2e', // Dark Blue
        sage: '#2e8b57',     // Green
        splendor: '#00bcd4', // Cyan/Teal
        valor: '#e67e22',    // Orange
        arcana: '#4b0082',   // Purple
        default: '#3d3d3d'   // Dark Grey fallback
    };

    static init() {
        console.log('Quick Items Daggerheart | Init Manager');
        injectStyles();
    }

    static registerSettings() {
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

    static loadTranslations() {
        // Placeholder for future translation logic
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

    // --- UI ---

    static createHandPanel() {
        // Optimization: Use cached selector if available
        if (this._$panel || document.getElementById('daggerheart-hand')) {
            this._$panel = $('#daggerheart-hand');
            this._$container = this._$panel.find('.dh-cards-container');
            return;
        }

        const dragTitle = this.translate("TOOLTIPS.DRAG");

        const html = `
            <div id="daggerheart-hand">
                <div class="hand-wrapper">
                    <div class="hand-background-plate" id="dh-hand-drag-target">
                        <div class="drag-handle-area" title="${dragTitle}"></div>
                    </div>
                    
                    <div class="dh-cards-container">
                        <div class="no-cards">${this.translate('NO_ACTOR')}</div>
                    </div>
                </div>
            </div>
        `;

        $('body').append(html);

        // Cache references immediately
        this._$panel = $('#daggerheart-hand');
        this._$container = this._$panel.find('.dh-cards-container');

        this.applyStyles();

        this._dndInstance = new SmoothDnD('#daggerheart-hand', '#dh-hand-drag-target', (newLeft) => {
            this.savePosition(newLeft);
        });
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

        const scale = game.settings.get(this.MODULE_NAME, this.SETTING_SCALE);
        const width = Math.max(600, game.settings.get(this.MODULE_NAME, this.SETTING_WIDTH));
        const $wrapper = this._$panel.find('.hand-wrapper');

        $wrapper.css({
            'transform': `scale(${scale})`,
            'transform-origin': 'bottom center',
            'width': `${width}px`
        });

        this.applyCardFanLayout();
    }

    static async savePosition(left) {
        await game.user.setFlag(this.MODULE_NAME, 'handPosition', { left });
    }

    static restorePosition() {
        const pos = game.user.getFlag(this.MODULE_NAME, 'handPosition');
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

        const $container = this._$container;
        $container.empty();

        const controlled = canvas.tokens?.controlled || [];
        let actor = controlled.length > 0 ? controlled[0].actor : game.user.character;
        this._currentActor = actor;

        if (!actor) {
            $container.append(`<div class="no-cards">${this.translate('NO_ACTOR')}</div>`);
            return;
        }

        const allItems = actor.items ? Array.from(actor.items) : [];
        const showEquippedOnly = game.settings.get(this.MODULE_NAME, this.SETTING_FILTER_EQUIPPED);

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

        const fragment = document.createDocumentFragment();
        cards.forEach(item => {
            const el = this.createCardElement(item);
            fragment.appendChild(el[0]);
        });

        $container.append(fragment);
        this.applyCardFanLayout();
    }

    static createCardElement(item) {
        const img = item.img || 'icons/svg/item-bag.svg';
        const desc = item.system.description?.value || item.system.description || "";

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = desc;
        let plainDesc = tempDiv.textContent || tempDiv.innerText || "";

        let fontSize = 24;
        const textLength = plainDesc.length;
        if (textLength > 160) {
            const ratio = (textLength / 160) / 10;
            fontSize = 18 - Math.round(18 * ratio);
        }

        let domainKey = "default";
        if (item.system.domain) {
            domainKey = item.system.domain.toLowerCase();
        } else if (item.type === 'class') {
            domainKey = item.name.toLowerCase();
        }

        // Выбираем цвет для подложки
        const domainColor = this.DOMAIN_COLORS[domainKey] || this.DOMAIN_COLORS.default;

        const bannerSrc = `modules/happytreedice-daggerheart-card-hand/assets/imgs/${domainKey}/banner.avif`;
        const stressSrc = `modules/happytreedice-daggerheart-card-hand/assets/imgs/default/stress-cost.avif`;

        const level = item.system.level || "";
        const recallCost = item.system.recallCost;
        const stressCost = item.system.stress;

        let costValue = '';
        if (recallCost !== null && recallCost !== undefined && recallCost !== 0) {
            costValue = recallCost;
        } else if (stressCost !== null && stressCost !== undefined && stressCost !== 0) {
            costValue = stressCost;
        }

        const showStress = costValue !== '';

        const html = `
            <div class="dh-card" data-item-id="${item.id}" data-type="${item.type}">
                <div class="dh-card-scaler">
                    ${level ? `<img class="card-banner_image" src="${bannerSrc}"><div class="card-level">${level}</div>` : ''}
                    ${showStress ? `<img class="stress_image" src="${stressSrc}"><div class="stress_text">${costValue}</div>` : ''}
                    <div class="card-image-container">
                        <img class="card-main-image" src="${img}" draggable="false">
                    </div>
                    <div class="divider-container">
                         <div class="title-bg" style="background-color: ${domainColor};"></div>
                         <p class="title">${item.name}</p>
                    </div>
                    <div class="card-text-content">
                        <div class="description" style="font-size: ${fontSize}px;">${plainDesc}</div>
                    </div>
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

        const maxAngle = game.settings.get(this.MODULE_NAME, this.SETTING_ARC_ANGLE);
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