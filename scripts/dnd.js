/**
 * Класс перетаскивания панели (влево-вправо).
 * Ограничивает движение по оси Y.
 */
export class SmoothDnD {
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
        // Optimization: use window.innerWidth directly instead of querying if possible
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
 * Класс плавного перетаскивания карт.
 * Заменяет HTML5 Drag API.
 */
export class CardSmoothDnD {
    constructor(element, onDropToPlay, onReturnToHand) {
        this.el = element;
        this.onDropToPlay = onDropToPlay;
        this.onReturnToHand = onReturnToHand;

        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.startClientX = 0;
        this.startClientY = 0;
        this.initialTransform = '';

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

        this.isDragging = true;

        if (e.type === 'touchstart') {
            this.startClientX = e.touches[0].clientX;
            this.startClientY = e.touches[0].clientY;
        } else {
            this.startClientX = e.clientX;
            this.startClientY = e.clientY;
        }

        this.initialTransform = this.el.style.transform;

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

        // Optimization: Use translate3d for hardware acceleration
        this.el.style.transform = `translate3d(${dx}px, ${dy}px, 0) rotate(0deg) scale(1.1)`;
        this.el.style.zIndex = 9999;
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

        let clientY;
        if (e.type === 'touchend') {
            clientY = e.changedTouches[0].clientY;
        } else {
            clientY = e.clientY;
        }

        const totalDy = clientY - this.startClientY;

        // Если карту потянули вверх более чем на 100px - считаем это использованием
        if (totalDy < -100) {
            if (this.onDropToPlay) this.onDropToPlay();
            this.el.style.transform = '';
            if (this.onReturnToHand) this.onReturnToHand();
        } else {
            this.el.style.transform = '';
            if (this.onReturnToHand) this.onReturnToHand();
        }
    }
}