import { registerTemplate } from '../../scripts/registry.js';
import { HandManager } from '../../scripts/hand-manager.js';

/**
 * Standard Daggerheart Template.
 * Replicates the official Daggerheart card layout using the Foundryborne
 * system fonts (Cinzel Decorative / Cinzel / Montserrat) and its domain assets.
 */

// Цвет текста типа карты в гексагоне полосы (сама полоса окрашена в ассете домена)
const DOMAIN_TEXT_COLORS = {
  bone: '#000',
  splendor: '#000',
  default: '#fff'
};

// Домены, для которых есть собственные ассеты (banner.avif / strip.avif)
const ASSET_DOMAINS = new Set(['arcana', 'blade', 'bone', 'codex', 'dread', 'grace', 'midnight', 'sage', 'splendor', 'valor']);

const ASSET_ROOT = 'modules/happytreedice-daggerheart-card-hand/templates/default/assets/imgs';

const cssId = 'daggerheart-hand-styles';

const cssContent = `
  #daggerheart-hand {
    --dh-bg: #15131b;
    --dh-surface: #1f1b2a;
    --dh-panel: #2b2536;
    --dh-border: #3b3248;
    --dh-text: #f5f5f7;
    --dh-accent: #f3c267;

    /* Foundryborne system fonts (loaded globally by the daggerheart system).
       The var() indirection picks up the system's own definitions on 2.4.x+. */
    --dh-card-font-title: var(--dh-font-subtitle, 'Cinzel', serif);
    --dh-card-font-deco: var(--dh-font-title, 'Cinzel Decorative', serif);
    --dh-card-font-body: var(--dh-font-body, 'Montserrat', sans-serif);

    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);

    width: auto;
    height: 0;

    z-index: 20;
    font-family: var(--dh-card-font-body);
    display: flex;
    justify-content: center;
    align-items: flex-end;
    pointer-events: none;
  }

  .hand-wrapper {
    position: relative;
    height: 250px;
    pointer-events: none;
    transition: width 0.2s ease;
    display: flex;
    justify-content: center;
    align-items: flex-end;
  }

  .hand-background-plate {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 192px;

    background: rgba(20, 20, 25, 0.95);
    border-top: 2px solid var(--dh-border);
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.8);

    z-index: 0;
    pointer-events: all;
  }

  .drag-handle-area {
    width: 100%;
    height: 100%;
    cursor: grab;
  }

  .drag-handle-area:active {
    cursor: grabbing;
  }

  .dh-cards-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    padding-bottom: 15px;
    overflow: visible;
    z-index: 1;
    pointer-events: none;
  }

  /* --- Official-style card ------------------------------------------- */

  #daggerheart-hand .dh-card-scaler {
    border: 1px solid #b9b2a4;
    border-radius: 18px;
    background: #fdfbf4;
    box-shadow: -4px 4px 20px rgba(0, 0, 0, 0.6);
  }

  #daggerheart-hand .dh-card-scaler * {
    font-family: var(--dh-card-font-body);
  }

  /* Card art fills the upper half */
  .dhc-art-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 51%;
    overflow: hidden;
    z-index: 1;
    pointer-events: none;
    background: #000;
  }

  .dhc-art {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
  }

  /* Level banner (domain pennant, icon baked into the asset) */
  .dhc-banner {
    position: absolute;
    top: -6px;
    left: 16px;
    width: 58px;
    z-index: 10;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
    pointer-events: none;
  }

  .dhc-level {
    position: absolute;
    top: 8px;
    left: 16px;
    width: 58px;
    text-align: center;
    font-family: var(--dh-card-font-title);
    font-weight: 700;
    font-size: 26px;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
    z-index: 11;
    margin: 0;
    user-select: none;
    pointer-events: none;
  }

  /* Recall cost badge (top-right) */
  .dhc-recall {
    position: absolute;
    top: 10px;
    right: 12px;
    width: 42px;
    z-index: 10;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
    pointer-events: none;
  }

  .dhc-recall-text {
    position: absolute;
    top: 10px;
    right: 12px;
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--dh-card-font-title);
    font-weight: 700;
    font-size: 21px;
    color: #fff;
    text-shadow: 0 0 4px #000, 0 0 8px #000;
    z-index: 11;
    margin: 0;
    user-select: none;
    pointer-events: none;
  }

  /* Gold divider strip with the domain-colored hexagon (official style) */
  .dhc-strip-wrap {
    position: absolute;
    top: 51%;
    left: 0;
    width: 100%;
    transform: translateY(-50%);
    z-index: 8;
    pointer-events: none;
  }

  .dhc-strip {
    display: block;
    width: 100%;
    height: auto;
  }

  .dhc-type {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 32%;
    text-align: center;
    font-family: var(--dh-card-font-title);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    line-height: 1;
    color: #fff;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    z-index: 9;
  }

  .dhc-type.dhc-type-long {
    font-size: 9px;
    letter-spacing: 0.2px;
  }

  .dhc-type.dhc-type-xlong {
    font-size: 8px;
    letter-spacing: 0;
  }

  /* Lower half: title + rules text */
  .dhc-body {
    position: absolute;
    top: 51%;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 6;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    padding: 20px 18px 14px;
    background:
      linear-gradient(180deg, rgba(253, 251, 244, 0) 0%, rgba(253, 251, 244, 0) 60%, rgba(240, 234, 218, 0.6) 100%),
      #fdfbf4;
    border-radius: 0 0 17px 17px;
  }

  .dhc-title {
    font-family: var(--dh-card-font-title);
    font-weight: 700;
    text-transform: uppercase;
    font-size: 24px;
    line-height: 1.05;
    text-align: center;
    color: #231f20;
    margin: 0 0 8px 0;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .dhc-text {
    flex: 1;
    color: #231f20;
    line-height: 1.3;
    text-align: center;
    overflow: hidden;
  }

  .dhc-text p { margin: 0 0 5px 0; }
  .dhc-text ul, .dhc-text ol { margin: 0; padding-left: 16px; text-align: left; }

  /* Weapon damage block */
  .damage-info {
    position: relative;
    z-index: 7;
    color: #231f20;
    padding: 0 0 6px 0;
    font-size: 19px;
    font-weight: 700;
    font-family: var(--dh-card-font-title);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    border-bottom: 2px solid #d9d2c0;
    margin-bottom: 8px;
  }

  .damage-info + .dhc-text {
    margin-top: 0;
  }

  .damage-labels {
    font-family: var(--dh-card-font-body);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    color: #6b6357;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }

  .damage-range {
    font-family: var(--dh-card-font-body);
    font-size: 11px;
    font-weight: 600;
    color: #46413a;
    margin-top: 3px;
  }
`;

function attachStyles() {
  // Remove any other template styles so only the active template's styles are present
  document.querySelectorAll(`[id^="${cssId}"]`).forEach(el => el.remove());
  const id = `${cssId}-default`;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.appendChild(document.createTextNode(cssContent));
  document.head.appendChild(style);
}

function detachStyles() {
  document.getElementById(`${cssId}-default`)?.remove();
}

/** Resolves the asset folder for a domain, falling back for homebrew domains. */
function assetDomain(domainKey) {
  return ASSET_DOMAINS.has(domainKey) ? domainKey : 'default';
}

const DefaultTemplate = {
  id: 'default',
  name: 'Standard Daggerheart',
  attachStyles,
  detachStyles,

  /**
   * Генерирует HTML для панели руки.
   * @param {Object} options - Переводы и опции.
   * @param {string} options.dragTitle - Текст всплывающей подсказки для перетаскивания.
   * @param {string} options.noActorText - Текст, если актер не выбран.
   * @returns {string} HTML строка.
   */
  renderPanel: (options) => HandManager.renderDefaultPanel(options),

  /**
   * Генерирует HTML для отдельной карты в официальном стиле Daggerheart.
   * @param {Object} item - Объект предмета (Item) из Foundry.
   * @returns {string} HTML строка.
   */
  renderCard: (item) => {
    const esc = HandManager.escapeHtml.bind(HandManager);
    const img = item.img || 'icons/svg/item-bag.svg';
    const desc = item.system.description?.value || item.system.description || '';

    const processed = HandManager.formatDescription(desc);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processed;
    const descHtml = tempDiv.innerHTML || '';
    const textLength = (tempDiv.textContent || '').length;

    // Автоподбор размера шрифта описания: 360 символов -> 15px, 940+ -> 11px
    const minFontSize = 11;
    const maxFontSize = 15;
    let fontSize = maxFontSize;
    if (textLength >= 940) {
      fontSize = minFontSize;
    } else if (textLength > 360) {
      const t = (textLength - 360) / (940 - 360);
      fontSize = Math.round(maxFontSize + (minFontSize - maxFontSize) * t);
    }

    // Определение домена
    let domainKey = 'default';
    if (item.system.domain) {
      domainKey = String(item.system.domain).toLowerCase();
    } else if (item.type === 'class') {
      domainKey = item.name.toLowerCase();
    }

    const domainTextColor = DOMAIN_TEXT_COLORS[domainKey] || DOMAIN_TEXT_COLORS.default;
    const assetKey = assetDomain(domainKey);

    const bannerSrc = `${ASSET_ROOT}/${assetKey}/banner.avif`;
    const stripSrc = `${ASSET_ROOT}/${assetKey}/strip.avif`;
    const recallSrc = `${ASSET_ROOT}/default/stress-cost.avif`;

    const level = item.system.level || '';
    const recallCost = item.system.recallCost;
    const stressCost = item.system.stress;

    let costValue = '';
    if (recallCost !== null && recallCost !== undefined && recallCost !== 0) {
      costValue = recallCost;
    } else if (stressCost !== null && stressCost !== undefined && stressCost !== 0) {
      costValue = stressCost;
    }
    const showCost = costValue !== '';

    // Подпись в гексагоне полосы: тип карты домена либо тип предмета
    let typeLabel;
    if (item.type === 'domainCard') {
      typeLabel = HandManager.formatDomainCardType(item.system.type || 'ability');
    } else {
      typeLabel = HandManager.formatItemType(item.type);
    }
    // Длинные локализованные подписи (например, "ЗАКЛИНАНИЕ") уменьшаем, чтобы влезли в гексагон
    const typeSizeClass = typeLabel.length > 13 ? ' dhc-type-xlong' : (typeLabel.length > 8 ? ' dhc-type-long' : '');

    // Damage Info (для оружия)
    let damageHtml = '';
    if (item.type === 'weapon') {
      const damageFormula = HandManager._getDamageFormula(item);
      const damageLabels = HandManager._getDamageLabels(item);
      const rangeRaw = item.system?.attack?.range || item.system?.range || '';
      const rangeText = HandManager.formatRange(rangeRaw);
      if (damageFormula) {
        damageHtml = `
            <div class="damage-info">
                <span class="damage-formula">${esc(damageFormula)}</span>
                ${damageLabels ? `<span class="damage-labels">${esc(damageLabels)}</span>` : ''}
                ${rangeText ? `<span class="damage-range">${esc(rangeText)}</span>` : ''}
            </div>
        `;
      }
    }

    // HTML Шаблон (официальная компоновка: арт -> золотая полоса с типом -> заголовок -> текст)
    return `
        <div class="dhc-art-container">
          <img class="dhc-art" src="${esc(img)}" draggable="false" loading="lazy">
        </div>
        ${level ? `<img class="dhc-banner" src="${bannerSrc}"><div class="dhc-level">${esc(level)}</div>` : ''}
        ${showCost ? `<img class="dhc-recall" src="${recallSrc}"><div class="dhc-recall-text">${esc(costValue)}</div>` : ''}
        <div class="dhc-strip-wrap">
          <img class="dhc-strip" src="${stripSrc}">
          <p class="dhc-type${typeSizeClass}" style="color: ${domainTextColor};">${esc(typeLabel)}</p>
        </div>
        <div class="dhc-body">
          <h3 class="dhc-title">${esc(item.name)}</h3>
          ${damageHtml}
          <div class="dhc-text" style="font-size: ${fontSize}px;">${descHtml}</div>
        </div>
    `;
  }
};

// Саморегистрация при импорте
registerTemplate(DefaultTemplate);
