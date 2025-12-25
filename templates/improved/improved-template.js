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
  codex: '#d4a017',    // Gold/Yellow
  grace: '#c23b8f',    // Pink/Magenta
  midnight: '#1a1a2e', // Dark Blue
  sage: '#2e8b57',     // Green
  splendor: '#00bcd4', // Cyan/Teal
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
    font-size: 16px;
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
    margin-top: 30px; /* Clear the title */
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
    padding: 24px 21.37px 21.37px;
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
    max-height: 350px;
  }

  /* Make the divider/title layout flow with the text block (no absolute positioning that pins to the whole card) */
  .dh-card-scaler .divider-container {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 7;
  }

  .dh-card-scaler .title-bg {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) skewX(-15deg);
    width: 120%;
    height: 42px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.6);
    z-index: 7;
  }

  .dh-card-scaler .title {
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
    margin-top: 24px;
    color: #000;
    line-height: 1.3;
    overflow: visible;
    max-width: 100%;
    word-break: break-word;
    font-size: 12px;
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
    let fontSize = 16;
    const textLength = plainDesc.length;
    if (textLength > 320) {
      const ratio = (textLength / 320)/10;
      fontSize = Math.round(fontSize - (ratio * fontSize));
    }
    fontSize = Math.max(fontSize, 12); // Минимальный размер шрифта 12px

    // Определение домена
    let domainKey = "default";
    if (item.system.domain) {
      domainKey = item.system.domain.toLowerCase();
    } else if (item.type === 'class') {
      domainKey = item.name.toLowerCase();
    }

    const domainColor = DOMAIN_COLORS[domainKey] || DOMAIN_COLORS.default;

    const bannerSrc = `modules/happytreedice-daggerheart-card-hand/templates/default/assets/imgs/${domainKey}/banner.avif`;
    const stressSrc = `modules/happytreedice-daggerheart-card-hand/templates/default/assets/imgs/default/stress-cost.avif`;

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

    if (item.type === 'weapon') {
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


    // HTML Шаблон
    const html = `
              ${level ? `<img class="card-banner_image" src="${bannerSrc}"><div class="card-level">${level}</div>` : ''}
              ${showStress ? `<img class="stress_image" src="${stressSrc}"><div class="stress_text">${costValue}</div>` : ''}
                <div class="card-image-container">
                  <img class="card-main-image" src="${img}" draggable="false">
                </div>
                <div class="card-text-content">
                    <div class="divider-container">
                      <div class="title-bg" style="background-color: ${domainColor};"></div>
                      <p class="title">${item.name}</p>
                    </div>
                    ${damageHtml}
                    <div class="description" style="font-size: ${fontSize}px;">${plainDesc}</div>
                </div>
                    `;
    return html;
  }
};
registerTemplate(ImprovedTemplate);