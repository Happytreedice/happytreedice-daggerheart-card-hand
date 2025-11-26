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
    static _dndInstance = null; // Экземпляр SmoothDnD для панели

    static init() {
        console.log('Quick Items Daggerheart | Init');

        Hooks.once('i18nInit', () => {
            this.registerSettings();
        });
        
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
        // Загрузка первичных переводов, если нужно, но полагаемся на i18n
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

    static setupHooks() {
        Hooks.on("controlToken", () => this.refreshHand());

        Hooks.on("updateActor", (actor) => {
            if (this._currentActor && actor.id === this._currentActor.id) this.refreshHand();
        });

        Hooks.on("createItem", (item) => { if (item.parent?.id === this._currentActor?.id) this.refreshHand(); });
        Hooks.on("deleteItem", (item) => { if (item.parent?.id === this._currentActor?.id) this.refreshHand(); });
        Hooks.on("updateItem", (item) => { if (item.parent?.id === this._currentActor?.id) this.refreshHand(); });

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

        const dragTitle = this.translate("TOOLTIPS.DRAG");
        const toggleTitle = this.translate("TOOLTIPS.TOGGLE");

        const html = `
            <div id="daggerheart-hand">
                <div class="hand-wrapper">
                    <div class="hand-background-plate" id="dh-hand-drag-target">
                        <div class="drag-handle-area" title="${dragTitle}"></div>
                    </div>
                    
                    <div class="dh-cards-container">
                        <div class="no-cards">${this.translate('NO_ACTOR')}</div>
                    </div>
                    
                    <!-- Кнопка сворачивания -->
                    <div class="hand-toggle-tab" title="${toggleTitle}">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
            </div>
        `;

        $('body').append(html);
        const $panel = $('#daggerheart-hand');

        this.applyStyles();

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

        // Инициализация перетаскивания панели
        this._dndInstance = new SmoothDnD('#daggerheart-hand', '#dh-hand-drag-target', (newLeft) => {
            this.savePosition(newLeft);
        });
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

    static async savePosition(left) {
        await game.user.setFlag(this.MODULE_NAME, 'handPosition', { left });
    }

    static restorePosition() {
        const pos = game.user.getFlag(this.MODULE_NAME, 'handPosition');
        if (pos && pos.left !== undefined) {
            const $panel = $('#daggerheart-hand');
            $panel.css({
                left: `${pos.left}px`,
                transform: 'translateX(0)',
                bottom: '0px'
            });

            if (this._dndInstance) {
                this._dndInstance.updatePosition(pos.left);
            }
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

        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = desc;
        let plainDesc = tempDiv.textContent || tempDiv.innerText || "";
        if (plainDesc.length > 160) plainDesc = plainDesc.substring(0, 160) + "...";

        let domainKey = "default";
        if (item.system.domain) {
            domainKey = item.system.domain.toLowerCase();
        } else if (item.type === 'class') {
            domainKey = item.name.toLowerCase();
        }

        // Strip image acts as the divider
        const stripSrc = `modules/happytreedice-daggerheart-card-hand/assets/imgs/${domainKey}/strip.avif`;
        const bannerSrc = `modules/happytreedice-daggerheart-card-hand/assets/imgs/${domainKey}/banner.avif`;
        const stressSrc = `modules/happytreedice-daggerheart-card-hand/assets/imgs/default/stress-cost.avif`;

        // Level
        const level = item.system.level || "";

        // Recall Cost / Stress
        const recallCost = item.system.recallCost;
        const stressCost = item.system.stress;
        // Check specifically for null/undefined to allow 0 if that's a valid cost in DH
        let costValue = '';
        if (recallCost !== null && recallCost !== undefined && recallCost !== 0) {
            costValue = recallCost;
        } else if (stressCost !== null && stressCost !== undefined && stressCost !== 0) {
            costValue = stressCost;
        }

        const showStress = costValue !== '';

        // HTML Structure
        const html = `
            <div class="dh-card" data-item-id="${item.id}" data-type="${item.type}">
                <div class="dh-card-scaler">
                    ${level ? `<img class="card-banner_image" src="${bannerSrc}"><div class="card-level">${level}</div>` : ''}
                    ${showStress ? `<img class="stress_image" src="${stressSrc}"><div class="stress_text">${costValue}</div>` : ''}
                    <div class="card-image-container">
                        <img class="card-main-image" src="${img}" draggable="false">
                    </div>
                    <div class="divider-container">
                         <img class="divider" src="${stripSrc}" onerror="this.style.display='none'">
                         <p class="title">${item.name}</p>
                    </div>
                    <div class="card-text-content">
                        <div class="description">${plainDesc}</div>
                    </div>
                </div>
            </div>
        `;

        const $el = $(html);

        // Инициализируем новую логику плавного перетаскивания для карты
        // Мы передаем callback, который сработает если карту "вытянули" вверх (попытка использования)
        new CardSmoothDnD($el[0], () => {
            this.useItem(item);
        }, () => {
            // Callback при завершении перетаскивания (возврат в руку), чтобы обновить веер
            this.applyCardFanLayout();
        });

        // Клик всё ещё работает, если перетаскивание не произошло
        // $el.on('click', (event) => {
        //     // CardSmoothDnD предотвратит клик если было движение,
        //     // но на всякий случай оставим вызов здесь, если событие не было перехвачено.
        //     this.useItem(item, event);
        // });

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
            // Если карта сейчас перетаскивается, мы не трогаем её стили (она управляется CardSmoothDnD)
            if (element.classList.contains('dragging')) return;

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

/**
 * Класс перетаскивания самой панели (влево-вправо).
 * Ограничивает движение по оси Y.
 */
class SmoothDnD {
    constructor(elementSelector, handleSelector, onSavePosition) {
        this.el = document.querySelector(elementSelector);
        this.handle = this.el.querySelector(handleSelector);
        this.onSavePosition = onSavePosition;

        this.isDragging = false;
        this.startX = 0;
        this.initialLeft = 0;
        this.currentX = 0;

        this.onDragStart = this.onDragStart.bind(this);
        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);

        this.init();
    }

    init() {
        if (!this.handle) return;
        this.handle.addEventListener('mousedown', this.onDragStart);
        this.handle.addEventListener('touchstart', this.onDragStart, { passive: false });
    }

    updatePosition(left) {
        this.initialLeft = left;
    }

    onDragStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;
        this.isDragging = true;
        this.startX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;

        const style = window.getComputedStyle(this.el);
        this.initialLeft = parseFloat(style.left) || 0;

        this.el.classList.add('dragging');
        document.body.style.cursor = "grabbing";
        document.body.classList.add('dragging-active');

        document.addEventListener('mousemove', this.onDragMove);
        document.addEventListener('mouseup', this.onDragEnd);
        document.addEventListener('touchmove', this.onDragMove, { passive: false });
        document.addEventListener('touchend', this.onDragEnd);
    }

    onDragMove(e) {
        if (!this.isDragging) return;
        if (e.type === 'touchmove') e.preventDefault();

        const clientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        const dx = clientX - this.startX;

        // Блокируем Y, меняем только X
        this.el.style.transform = `translate3d(calc(-50% + ${dx}px), 0, 0)`;
        this.currentX = dx;
    }

    onDragEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.el.classList.remove('dragging');
        document.body.style.cursor = "default";
        document.body.classList.remove('dragging-active');

        let finalLeft = this.initialLeft + this.currentX;
        const panelWidth = this.el.offsetWidth;
        const maxLeft = window.innerWidth - (panelWidth / 4);

        this.el.style.left = `${finalLeft}px`;
        this.el.style.transform = `translateX(-50%)`;

        if (this.onSavePosition) {
            this.onSavePosition(finalLeft);
        }

        document.removeEventListener('mousemove', this.onDragMove);
        document.removeEventListener('mouseup', this.onDragEnd);
        document.removeEventListener('touchmove', this.onDragMove);
        document.removeEventListener('touchend', this.onDragEnd);
    }
}

/**
 * НОВЫЙ КЛАСС: Плавное перетаскивание карт.
 * Заменяет HTML5 Drag API.
 */
class CardSmoothDnD {
    constructor(element, onDropToPlay, onReturnToHand) {
        this.el = element;
        this.onDropToPlay = onDropToPlay;
        this.onReturnToHand = onReturnToHand;

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;

        // Храним исходное смещение в веере
        this.initialTransform = '';

        this.startClientX = 0;
        this.startClientY = 0;

        this.onDragStart = this.onDragStart.bind(this);
        this.onDragMove = this.onDragMove.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);

        this.init();
    }

    init() {
        this.el.addEventListener('mousedown', this.onDragStart);
        this.el.addEventListener('touchstart', this.onDragStart, { passive: false });
    }

    onDragStart(e) {
        if (e.type === 'mousedown' && e.button !== 0) return;

        // Предотвращаем конфликт с кликом для использования (если это просто клик, mouseup сработает быстро)
        // Но здесь мы не preventDefault, чтобы клик мог пройти, если движения не было.

        this.isDragging = true;

        if (e.type === 'touchstart') {
            this.startClientX = e.touches[0].clientX;
            this.startClientY = e.touches[0].clientY;
        } else {
            this.startClientX = e.clientX;
            this.startClientY = e.clientY;
        }

        // Запоминаем текущий стиль, чтобы вернуть если что
        this.initialTransform = this.el.style.transform;

        // Включаем стили перетаскивания
        this.el.classList.add('dragging');
        document.body.style.cursor = "grabbing";
        document.body.classList.add('dragging-active');

        // Добавляем звук (опционально, если есть доступ к методу класса, но тут мы изолированы. 
        // Можно передать callback, но пока опустим)

        document.addEventListener('mousemove', this.onDragMove);
        document.addEventListener('mouseup', this.onDragEnd);
        document.addEventListener('touchmove', this.onDragMove, { passive: false });
        document.addEventListener('touchend', this.onDragEnd);
    }

    onDragMove(e) {
        if (!this.isDragging) return;

        // Для карт можно предотвратить дефолт, чтобы не скроллило страницу на мобилках
        if (e.type === 'touchmove') e.preventDefault();

        let clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const dx = clientX - this.startClientX;
        const dy = clientY - this.startClientY;

        // ЛОГИКА: Мы хотим, чтобы карта следовала за мышью, но начинала движение 
        // из своего положения в веере. 
        // Самый простой способ: мы заменяем transform веера на transform движения.
        // Чтобы это выглядело красиво, мы убираем поворот (rotate 0) и немного увеличиваем (scale 1.1).

        // transform: translate(${dx}px, ${dy}px)
        // Но нам нужно учесть, что начальная позиция была смещена через margin-left в потоке + transform.
        // Здесь мы просто накладываем смещение относительно точки старта.

        // Важно: так как margin-left остается, элемент сдвигается от своего места в потоке.
        // Если у элемента был transform: rotate(...), мы его перезаписываем.
        // Это может вызвать визуальный "скачок" поворота, но это нормально для эффекта "взял карту".

        this.el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(0deg) scale(1.1)`;
        this.el.style.zIndex = 9999; // Поверх всего
    }

    onDragEnd(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        document.body.style.cursor = "default";
        document.body.classList.remove('dragging-active');
        this.el.classList.remove('dragging');
        this.el.style.zIndex = '';

        document.removeEventListener('mousemove', this.onDragMove);
        document.removeEventListener('mouseup', this.onDragEnd);
        document.removeEventListener('touchmove', this.onDragMove);
        document.removeEventListener('touchend', this.onDragEnd);

        // Определяем, куда бросили.
        // Считаем дельту от старта.
        let clientY;
        if (e.type === 'touchend') {
            clientY = e.changedTouches[0].clientY;
        } else {
            clientY = e.clientY;
        }

        const totalDy = clientY - this.startClientY;

        // Если карту потянули вверх более чем на 100px - считаем это использованием ("бросок на стол")
        if (totalDy < -100) {
            if (this.onDropToPlay) this.onDropToPlay();
            // Сбрасываем стиль, чтобы она вернулась визуально, или можно оставить анимацию улетания
            this.el.style.transform = '';
            if (this.onReturnToHand) this.onReturnToHand();
        } else {
            // Если просто немного подвигали - возвращаем в руку
            this.el.style.transform = ''; // Сброс трансформа, чтобы CSS/JS веера подхватил
            if (this.onReturnToHand) this.onReturnToHand();
        }
    }
}

Hooks.once('init', () => {
    QuickItemsDaggerheart.init();
});