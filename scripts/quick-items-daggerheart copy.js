/**
 * Daggerheart Card Hand
 * Hand management with dynamic fanning, resizing, and system integration.
 */
class QuickItemsDaggerheart {
    static MODULE_NAME = 'happytreedice-daggerheart-card-hand';

    // Настройки
    static SETTING_ARC_ANGLE = 'arcAngle';
    static SETTING_FILTER_EQUIPPED = 'filterEquipped';
    static SETTING_SCALE = 'handScale';
    static SETTING_WIDTH = 'handWidthPx';

    static _currentActor = null;
    static _isCollapsed = false;

    static init() {
        console.log('Quick Items Daggerheart | Init');

        this.registerSettings();
        this.loadTranslations();

        Hooks.once('ready', () => {
            this.createHandPanel();
            this.setupHooks();
            this.restorePosition();

            if (canvas.tokens?.controlled.length) {
                this.refreshHand();
            }
        });
    }

    static registerSettings() {
        game.settings.register(this.MODULE_NAME, this.SETTING_ARC_ANGLE, {
            name: "Угол арки карт",
            hint: "Максимальный угол наклона веера. 0 = прямая линия.",
            scope: "client",
            config: true,
            type: Number,
            default: 10,
            range: { min: 0, max: 45, step: 1 },
            onChange: () => this.applyCardFanLayout()
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_FILTER_EQUIPPED, {
            name: "Показывать только экипированное",
            hint: "Скрывает предметы, которые не экипированы.",
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
            onChange: () => this.refreshHand()
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_SCALE, {
            name: "Масштаб интерфейса",
            hint: "Множитель размера модуля (0.5 - 2.0).",
            scope: "client",
            config: true,
            type: Number,
            default: 1.0,
            range: { min: 0.5, max: 2.0, step: 0.1 },
            onChange: () => this.applyStyles()
        });

        game.settings.register(this.MODULE_NAME, this.SETTING_WIDTH, {
            name: "Ширина панели (px)",
            hint: "Фиксированная ширина панели карт (минимум 600).",
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
        this.i18n = {
            TITLE: "Hand",
            NO_ACTOR: "Нет актера",
            NO_ITEMS: "Пусто",
            TOGGLE_TOOL: "Карты Daggerheart"
        };
    }

    static translate(key) {
        return this.i18n[key] || key;
    }

    static itemHasActions(item) {
        const actions = item.system?.actions;
        if (!actions) return false;
        if (typeof actions.size === 'number') return actions.size > 0;
        if (typeof actions === 'object') return Object.keys(actions).length > 0;
        return false;
    }

    static setupHooks() {
        Hooks.on("controlToken", () => this.refreshHand());

        Hooks.on("updateActor", (actor) => {
            if (this._currentActor && actor.id === this._currentActor.id) this.refreshHand();
        });

        Hooks.on("createItem", (item) => { if (item.parent?.id === this._currentActor?.id) this.refreshHand(); });
        Hooks.on("deleteItem", (item) => { if (item.parent?.id === this._currentActor?.id) this.refreshHand(); });
        Hooks.on("updateItem", (item) => { if (item.parent?.id === this._currentActor?.id) this.refreshHand(); });

        // Scene Controls
        Hooks.on("getSceneControlButtons", (controls) => {
            const tokenTools = controls.find(c => c.name === "token");
            if (tokenTools) {
                tokenTools.tools.push({
                    name: "daggerheart-hand-toggle",
                    title: this.translate("TOGGLE_TOOL"),
                    icon: "fas fa-cards",
                    toggle: true,
                    active: !$('#daggerheart-hand').hasClass('hidden'),
                    onClick: (toggled) => {
                        const panel = $('#daggerheart-hand');
                        if (toggled) {
                            panel.removeClass('hidden');
                            this.refreshHand();
                        } else {
                            panel.addClass('hidden');
                        }
                    },
                    button: true
                });
            }
        });

        Hooks.on("dropCanvasData", (canvas, data) => {
            if (data.type !== "Item" || !data.uuid) return;
            fromUuid(data.uuid).then(item => {
                if (!item) return;
                if (this._currentActor && item.parent?.id === this._currentActor.id) {
                    this.useItem(item);
                }
            });
        });
    }

    static playSound(soundPath) {
        const AudioHelper = foundry.audio.AudioHelper ?? AudioHelper;
        if (AudioHelper) {
            AudioHelper.play({ src: soundPath, volume: 0.8, loop: false }, true);
        }
    }

    // --- UI ---

    static createHandPanel() {
        if ($('#daggerheart-hand').length) return;

        const html = `
            <div id="daggerheart-hand">
                <div class="hand-wrapper">
                    <div class="hand-background-plate">
                        <div class="drag-handle-area" title="Перетащить (X)"></div>
                    </div>
                    
                    <div class="dh-cards-container">
                        <div class="no-cards">${this.translate('NO_ACTOR')}</div>
                    </div>
                    
                    <!-- Кнопка сворачивания (справа сверху) -->
                    <div class="hand-toggle-tab" title="Свернуть/Развернуть">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
            </div>
        `;

        $('body').append(html);
        const $panel = $('#daggerheart-hand');

        this.applyStyles();

        // Toggle Logic
        $panel.find('.hand-toggle-tab').click(() => {
            this._isCollapsed = !this._isCollapsed;
            const $container = $panel.find('.dh-cards-container');
            const $bg = $panel.find('.hand-background-plate');
            const $icon = $panel.find('.hand-toggle-tab i');

            if (this._isCollapsed) {
                $container.fadeOut(200);
                $bg.fadeOut(200);
                $panel.addClass('collapsed');
                $icon.removeClass('fa-chevron-down').addClass('fa-expand');
            } else {
                $panel.removeClass('collapsed');
                $container.fadeIn(200, () => this.applyCardFanLayout());
                $bg.fadeIn(200);
                $icon.removeClass('fa-expand').addClass('fa-chevron-down');
            }
        });

        this.initSmoothDrag($panel);
    }

    static applyStyles() {
        const scale = game.settings.get(this.MODULE_NAME, this.SETTING_SCALE);
        const width = Math.max(600, game.settings.get(this.MODULE_NAME, this.SETTING_WIDTH));

        const $panel = $('#daggerheart-hand');
        const $wrapper = $panel.find('.hand-wrapper');

        $wrapper.css({
            'transform': `scale(${scale})`,
            'transform-origin': 'bottom center'
        });

        $wrapper.css('width', `${width}px`);

        this.applyCardFanLayout();
    }

    static initSmoothDrag($element) {
        const $handle = $element.find('.hand-background-plate');
        let isDragging = false;
        let startX = 0;
        let initialLeft = 0;
        let currentTranslateX = 0;

        $handle.on('mousedown', (e) => {
            if (e.button !== 0) return;
            if ($(e.target).closest('.dh-card').length) return;

            isDragging = true;
            startX = e.clientX;

            const style = window.getComputedStyle($element[0]);
            initialLeft = parseFloat(style.left);

            $element.css('transform', 'none');
            $('body').addClass('dh-dragging');
            $handle.css('cursor', 'grabbing');
        });

        $(document).on('mousemove', (e) => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            $element.css('transform', `translate3d(${deltaX}px, 0, 0)`);
            currentTranslateX = deltaX;
        });

        $(document).on('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;

            $('body').removeClass('dh-dragging');
            $handle.css('cursor', 'default');

            let finalLeft = initialLeft + currentTranslateX;
            const panelWidth = $element.outerWidth();
            const maxLeft = window.innerWidth - (panelWidth / 2);
            finalLeft = Math.max(-(panelWidth / 2), Math.min(finalLeft, maxLeft));

            $element.css({
                left: `${finalLeft}px`,
                transform: 'translateX(-50%)'
            });

            this.savePosition(finalLeft);
            $element.css('transform', 'translateX(0)');
        });
    }

    static async savePosition(left) {
        await game.user.setFlag(this.MODULE_NAME, 'handPosition', { left });
    }

    static restorePosition() {
        const pos = game.user.getFlag(this.MODULE_NAME, 'handPosition');
        if (pos && pos.left !== undefined) {
            $('#daggerheart-hand').css({
                left: `${pos.left}px`,
                transform: 'translateX(0)',
                bottom: '0px'
            });
        }
    }

    // --- Content ---

    static refreshHand() {
        const $container = $('#daggerheart-hand .dh-cards-container');
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
                if (item.system?.hasOwnProperty('equipped') && !item.system.equipped) return false;
            }

            if (isDomain && item.system?.inVault) return false;

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

        cards.forEach(item => {
            const el = this.createCardElement(item);
            $container.append(el);
        });

        this.applyCardFanLayout();
    }

    static createCardElement(item) {
        const img = item.img || 'icons/svg/item-bag.svg';
        const desc = item.system.description?.value || item.system.description || "";
        const plainDesc = $(`<div>${desc}</div>`).text().trim().substring(0, 160) + (desc.length > 160 ? "..." : "");

        const dragData = { type: "Item", uuid: item.uuid, data: item.toObject() };

        // Логика бейджей (Domain Cards)
        let badgesHtml = '';
        if (item.type === 'domainCard') {
            const cost = item.system.recallCost || 0;
            const domainKey = item.system.domain;
            // Попытка получить иконку домена из конфига системы
            const domainConfig = CONFIG.DH?.DOMAIN?.domains?.[domainKey];
            const domainIconSrc = domainConfig?.src || 'icons/svg/item-bag.svg';

            badgesHtml = `
                <div class="badges-container">
                    <div class="card-badge recall-badge" title="Recall Cost">
                        <span class="value">${cost}</span>
                        <i class="fa-solid fa-bolt"></i>
                    </div>
                    <div class="card-badge domain-badge" title="Domain: ${domainConfig?.label || domainKey}">
                         <img src="${domainIconSrc}" class="domain-icon">
                    </div>
                </div>
            `;
        }

        const html = `
            <div class="dh-card" data-item-id="${item.id}" draggable="true">
                ${badgesHtml}
                <img class="card-image" src="${img}" draggable="false">
                <div class="card-body">
                    <div class="card-title">${item.name}</div>
                    <div class="card-desc">${plainDesc}</div>
                </div>
            </div>
        `;

        const $el = $(html);

        // --- ВИЗУАЛИЗАЦИЯ ПЕРЕТАСКИВАНИЯ (КЛОН) ---
        $el[0].addEventListener('dragstart', (ev) => {
            this.playSound('modules/happytreedice-daggerheart-card-hand/sounds/Card_Transition_Out.ogg');
            ev.dataTransfer.setData("text/plain", JSON.stringify(dragData));
            ev.dataTransfer.effectAllowed = "copy";

            // Создаем точную копию карты для "призрака"
            const clone = $el[0].cloneNode(true);

            // Настраиваем стили клона, чтобы он был видимым, но не влиял на лейаут
            clone.style.position = "absolute";
            clone.style.top = "-1000px"; // Спрятать за границами, пока браузер делает снимок
            clone.style.left = "-1000px";
            clone.style.width = "160px";
            clone.style.height = "220px";
            clone.style.transform = "none"; // Убираем поворот веера
            clone.style.zIndex = "99999";
            clone.style.opacity = "1"; // Полная непрозрачность для картинки
            clone.classList.remove('dragging'); // Убираем класс прозрачности, если есть

            document.body.appendChild(clone);

            // Устанавливаем клон как картинку перетаскивания
            // (центрируем курсор: 80px по X, 110px по Y)
            ev.dataTransfer.setDragImage(clone, 80, 110);

            // Удаляем клон сразу после того, как браузер "сфотографировал" его
            setTimeout(() => {
                document.body.removeChild(clone);
            }, 0);

            // Делаем оригинальную карту в руке полупрозрачной
            $el.addClass('dragging');
        });

        $el[0].addEventListener('dragend', () => {
            $el.removeClass('dragging');
        });

        $el.on('click', (event) => this.useItem(item, event));

        return $el;
    }

    static applyCardFanLayout() {
        const $container = $('#daggerheart-hand .dh-cards-container');
        const cards = $container.children('.dh-card');
        const count = cards.length;
        if (count === 0) return;

        const maxAngle = game.settings.get(this.MODULE_NAME, this.SETTING_ARC_ANGLE);
        const wrapperWidth = $('#daggerheart-hand .hand-wrapper').width();
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

        cards.each((index, element) => {
            if (index > 0) {
                $(element).css('margin-left', `${marginLeft}px`);
            } else {
                $(element).css('margin-left', '0px');
            }

            const centerIndex = (count - 1) / 2;
            const distFromCenter = index - centerIndex;

            if (maxAngle === 0) {
                $(element).css({
                    'transform': 'none',
                    'z-index': index + 1,
                    'bottom': '0px'
                });
            } else {
                const angleStep = maxAngle / (count > 1 ? (count / 2) : 1);
                const rotation = distFromCenter * angleStep;
                const yOffset = Math.abs(distFromCenter) * 5;

                $(element).css({
                    'transform': `rotate(${rotation}deg) translateY(${yOffset}px)`,
                    'z-index': index + 1,
                    'bottom': '0px'
                });
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

Hooks.once('init', () => {
    QuickItemsDaggerheart.init();
});