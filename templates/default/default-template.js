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
  `;

const style = document.createElement('style');
style.id = cssId;
style.appendChild(document.createTextNode(cssContent));
document.head.appendChild(style);
console.log('Quick Items Daggerheart | Styles injected');

const DefaultTemplate = {
  id: 'default',
  name: 'Standard Daggerheart',

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

    // Очистка и расчет текста описания
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = desc;
    let plainDesc = tempDiv.textContent || tempDiv.innerText || "";

    // Расчет размера шрифта
    let fontSize = 18;
    const textLength = plainDesc.length;
    if (textLength > 160) {
      const ratio = (textLength / 160)/10;
      fontSize = Math.round(fontSize - (ratio * fontSize));
    }

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
      if (damageFormula) {
        damageHtml = `
             <div class="damage-info">
                 <span class="damage-formula">${damageFormula}</span>
                 <span class="damage-labels">${damageLabels}</span>
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
                <div class="divider-container">
                  <div class="title-bg" style="background-color: ${domainColor};"></div>
                  <p class="title">${item.name}</p>
                </div>
                <div class="card-text-content">
                    ${damageHtml}
                    <div class="description" style="font-size: ${fontSize}px;">${plainDesc}</div>
                </div>
                    `;
    return html;
  }
};

// Саморегистрация при импорте
registerTemplate(DefaultTemplate);