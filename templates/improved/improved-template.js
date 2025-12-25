import { registerTemplate } from '../../scripts/registry.js';
import { HandManager } from '../../scripts/hand-manager.js';
/**
 * Standard Daggerheart Template.
 * Handles HTML generation for the Hand Panel and individual Cards.
 */
// Цвета для доменов (подложки названий)
const DOMAIN_COLORS = {
  blade: '#a31e21',    // Red
  bone: '#5e5e5e',     // Grey
  codex: '#00bcd4',    // Cyan/Teal
  grace: '#c23b8f',    // Pink/Magenta
  midnight: '#1a1a2e', // Dark Blue
  sage: '#2e8b57',     // Green
  splendor: '#d4a017', // Gold/Yellow
  valor: '#e67e22',    // Orange
  arcana: '#4b0082',   // Purple
  default: '#3d3d3d'   // Dark Grey fallback
};
const cssId = 'daggerheart-hand-styles';

const cssContent = `
  #daggerheart-hand {
    --dh-bg: #15131b;
    --dh-surface: #1f1b2a;
    --dh-panel: #2b2536;
    --dh-border: #3b3248;
    --dh-text: #f5f5f7;
    --dh-accent: #f2c24b;

    --dh-font-header: "Modesto Condensed", "Signika", sans-serif;
    --dh-font-body: "Signika", sans-serif;

    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);

    width: auto;
    height: 0;

    z-index: 20;
    font-family: var(--dh-font-body);
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

  .damage-info {
    position: relative;
    z-index: 7;
    background: transparent;
    color: #333;
    padding: 0 0 8px 0;
    font-size: 14px;
    font-weight: 800;
    font-family: var(--dh-font-header);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0px;
    width: 100%;
    box-sizing: border-box;
    border-bottom: 2px solid #eee;
    margin-bottom: 8px;
    margin-top: 4px; /* Clear the title */
  }

  .damage-info + .description {
    margin-top: 0 !important;
  }

  .damage-labels {
    font-size: 15px;
    text-transform: uppercase;
    color: #666;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }
  .damage-range {
    font-size: 14px;
    color: #222;
    margin-top: 6px;
    font-weight: 700;
  }
  /* Improved card layout styles (no global positioning override) */

  /* The card image is the background anchored to the top and fills width */
  .dh-card-scaler .card-image-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    overflow: hidden;
    z-index: 1;
    pointer-events: none;
  }

  .dh-card-scaler .card-main-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    display: block;
    pointer-events: none;
  }

  /* Text content is anchored to the bottom and will expand upwards, overlapping the image */
  .dh-card-scaler .card-text-content {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 6;
    box-sizing: border-box;
    padding: 0;
    background: rgba(255,255,255,0.98);
    display: flex;
    flex-direction: column;
    justify-content: center; /* center vertically when there's spare space */
    align-items: stretch;
    min-height: 30%;
    max-height: 100%;
    overflow: visible;
  }

  .dh-card-scaler .card-text-content {
    justify-content: flex-start;
    padding-top: 0px; /* push title a bit down from the top of the text block */
    padding-bottom: 8px;
    min-height: 184px;
    max-height: 425px;
  }

  /* Make the divider/title layout flow with the text block (no absolute positioning that pins to the whole card) */
  .dh-card-scaler .divider-container {
    position: relative;
    width: 100%;
    height: fit-content;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 7;
    top: -12px;
  }

  /* Title background: draw a colored layer under the divider image.
     We use CSS variables assigned on the element to supply the divider
     image URL and the domain color. The pseudo-element (::before)
     renders the divider image above the color layer, so transparent
     parts of the image show the domain color beneath. */
  .dh-card-scaler .title-bg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 100%;
    height: 42px;
    border: none;
    box-shadow: none;
    z-index: 7;
    background: none;
  }

  .dh-card-scaler .title-bg::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: var(--divider-url);
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    z-index: 2; /* above the color layer, below the text */
    pointer-events: none;
  }

  .dh-card-scaler .title-bg-inner {
    position: absolute;
    top: 30%;
    left: 30%;
    width: 40%;
    height: 52%;
    clip-path: polygon(15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%, 0% 50%);
    background-color: var(--domain-color, transparent);
    z-index: 1; /* sits under the divider image */
  }

  .dh-card-scaler .card-title {
    position: relative;
    top: 0;
    transform: none;
    left: 0;
    width: 100%;
    font-family: var(--dh-font-header);
    font-weight: 800;
    text-transform: uppercase;
    font-size: 24px;
    padding-top: 2px;
    line-height: 1;
    text-align: center;
    color: #000;
    text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8);
    margin: 0;
    z-index: 8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dh-card-scaler .card-type {
    position: relative;
    top: 0;
    transform: none;
    left: 0;
    width: 120px;
    font-family: var(--dh-font-header);
    font-weight: 800;
    text-transform: uppercase;
    font-size: 14px;
    padding-top: 3px;
    line-height: 1;
    text-align: center;
    color: #fff;
    text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8);
    margin: 0;
    z-index: 8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dh-card-scaler .domain-card-type {
    position: relative;
    top: 0;
    transform: none;
    left: 0;
    width: 90%;
    font-family: var(--dh-font-header);
    font-weight: 800;
    text-transform: uppercase;
    font-size: 28px;
    line-height: 1;
    text-align: center;
    color: #fff;
    text-shadow: 0 2px 3px rgba(0, 0, 0, 0.8);
    margin: 0;
    z-index: 8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dh-card-scaler .description {
    margin-top: 0px;
    color: #000;
    line-height: 1.3;
    overflow: visible;
    max-width: 100%;
    word-break: break-word;
    font-size: 12px;
    padding: 0 12px;
  }

  .dh-card-scaler {
    border: none;
    border-radius: 16px;
    background: none;
    }
  `;

function attachStyles() {
  // Remove any other template styles so only the active template's styles are present
  document.querySelectorAll('[id^="' + cssId + '"]').forEach(el => el.remove());
  const id = `${cssId}-improved`;
  if (document.getElementById(id)) return;
  const style = document.createElement('style');
  style.id = id;
  style.appendChild(document.createTextNode(cssContent));
  document.head.appendChild(style);
  console.log('Quick Items Daggerheart | Styles injected (default)');
}

const ImprovedTemplate = {
  id: 'improved',
  name: 'Improved Daggerheart',
  attachStyles,

  /**
   * Генерирует HTML для панели руки.
   * @param {Object} options - Переводы и опции.
   * @param {string} options.dragTitle - Текст всплывающей подсказки для перетаскивания.
   * @param {string} options.noActorText - Текст, если актер не выбран.
   * @returns {string} HTML строка.
   */
  renderPanel: (options) => {
    const { dragTitle, noActorText } = options;
    return `
            <div id="daggerheart-hand">
                <div class="hand-wrapper">
                    <div class="hand-background-plate" id="dh-hand-drag-target">
                        <div class="drag-handle-area" title="${dragTitle}"></div>
                    </div>
                    
                    <div class="dh-cards-container">
                        <div class="no-cards">${noActorText}</div>
                    </div>
                </div>
            </div>
        `;
  },

  /**
   * Генерирует HTML для отдельной карты.
   * @param {Object} item - Объект предмета (Item) из Foundry.
   * @returns {string} HTML строка.
   */
  renderCard: (item) => {
    const img = item.img || 'icons/svg/item-bag.svg';
    const desc = item.system.description?.value || item.system.description || "";

    // Очистка и расчет текста описания — используем общий метод HandManager.formatDescription
    const tempDiv = document.createElement("div");
    const processed = HandManager.formatDescription(desc);
    tempDiv.innerHTML = processed;
    // Keep HTML (innerHTML) so formatting tags are preserved when inserted into the card
    let plainDesc = tempDiv.innerHTML || tempDiv.innerText || "";

    // Расчет размера шрифта
    // Mapping rule:
    // - textLength <= 360 => fontSize = maxFontSize
    // - textLength >= 940 => fontSize = minFontSize
    // - otherwise interpolate linearly between maxFontSize and minFontSize
    let minFontSize = 12;
    let maxFontSize = 14;
    let fontSize = maxFontSize;

    const textLength = plainDesc.length;
    if (textLength <= 360) {
      fontSize = maxFontSize;
    } else if (textLength >= 940) {
      fontSize = minFontSize;
    } else {
      const t = (textLength - 360) / (940 - 360); // 0..1
      fontSize = Math.round(maxFontSize + (minFontSize - maxFontSize) * t);
    }
    // clamp just in case
    fontSize = Math.max(minFontSize, Math.min(maxFontSize, fontSize));

    
    // Определение домена
    let domainKey = "default";
    let domainCardType = "default";
    if (item.system.domain) {
      domainKey = item.system.domain.toLowerCase();
      domainCardType = item.system.type || "ability";
    } else if (item.type === 'class') {
      domainKey = item.name.toLowerCase();
    }
    

    const domainColor = DOMAIN_COLORS[domainKey] || DOMAIN_COLORS.default;

    const bannerSrc = `modules/happytreedice-daggerheart-card-hand/templates/default/assets/imgs/${domainKey}/banner.avif`;
    const stressSrc = `modules/happytreedice-daggerheart-card-hand/templates/default/assets/imgs/default/stress-cost.avif`;

    const dividerSrc = `modules/happytreedice-daggerheart-card-hand/templates/improved/assets/imgs/domain-divider.png`;

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
    // Damage Info
    let damageHtml = "";

    console.log('Improved Template | Rendering item:', item);

    const itemType = item.type || item.system.type || "ability";
    const itemTypeLocalized = HandManager.formatItemType(itemType);

    if (itemType === 'weapon') {
      const damageFormula = HandManager._getDamageFormula(item);
      const damageLabels = HandManager._getDamageLabels(item);
      const rangeRaw = item.system?.attack?.range || item.system?.range || '';
      const rangeText = HandManager.formatRange(rangeRaw);
      if (damageFormula) {
        damageHtml = `
             <div class="damage-info">
                 <span class="damage-formula">${damageFormula}</span>
                 <span class="damage-labels">${damageLabels}</span>
                 ${rangeText ? `<span class="damage-range">${rangeText}</span>` : ''}
             </div>
         `;
      }
    }

    let domainCardTypeHtml = "";
    if (item.system.domain) {
      const domainCardTypeText = HandManager.formatDomainCardType(domainCardType);
      domainCardTypeHtml = `<p class="domain-card-type">${domainCardTypeText}</p>`;
    }
    // HTML Шаблон
    const html = `
              ${level ? `<img class="card-banner_image" src="${bannerSrc}"><div class="card-level">${level}</div>` : ''}
              ${showStress ? `<img class="stress_image" src="${stressSrc}"><div class="stress_text">${costValue}</div>` : ''}
                <div class="card-image-container">
                  <img class="card-main-image" src="${img}" draggable="false">
                </div>
                <div class="card-text-content">
                    <div class="divider-container">
                      <div class="title-bg" style="--divider-url: url('${dividerSrc}'); --domain-color: ${domainColor};"><div class="title-bg-inner"></div></div>
                      <p class="card-type">${itemTypeLocalized}</p>
                    </div>
                    <div class="card-title">${item.name}</div>
                    ${damageHtml}
                    <div class="description" style="font-size: ${fontSize}px;">
                    ${plainDesc}</div>
                </div>
                    `;
    return html;
  }
};
registerTemplate(ImprovedTemplate);