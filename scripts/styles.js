/**
 * Injects CSS styles dynamically into the document head.
 * Converted from quick-items-daggerheart.css
 */
export const injectStyles = () => {
  const cssId = 'daggerheart-hand-styles';
  if (document.getElementById(cssId)) return;

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

  #daggerheart-hand.hidden {
    display: none !important;
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

  #daggerheart-hand.collapsed .hand-wrapper {
    height: 0;
  }

  #daggerheart-hand.collapsed .hand-background-plate {
    display: none;
  }

  .dh-card {
    position: relative;
    width: 160px;
    height: 220px;
    margin: 0;
    transform-origin: center bottom;
    flex-shrink: 0;
    cursor: grab;
    pointer-events: all;
    background: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
    transition: transform 0.1s ease-out;
    overflow: visible;
    user-select: none;
  }

  .dh-card-scaler {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 320px;
    height: 440px;

    transform: scale(0.5);
    transform-origin: bottom left;

    background: #fff;
    border: 4px solid #d3d3d3;
    color: #000;
    display: flex;
    flex-direction: column;

    border-radius: 24px;
    overflow: hidden;
    box-shadow: -4px 4px 20px rgba(0, 0, 0, 0.6);

    transition: transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.6s, border-color 0.6s;
  }

  .dh-card-scaler * {
    font-family: var(--dh-font-body);
  }

  .dh-card:hover {
    z-index: 1000 !important;
  }

  .dh-card:hover .dh-card-scaler {
    transform: translateY(-50px) scale(0.75);
    box-shadow: 0 40px 80px rgba(0, 0, 0, 0.8);
    border-color: #afb0d9;
  }

  .dh-card-scaler .card-level {
    font-size: 23.8px;
    top: 2%;
    left: 4%;
    width: 20%;
    color: #fff;
    text-align: center;
    margin: 0;
    user-select: none;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, .3333333333));
    position: absolute;
    z-index: 10;
    font-family: var(--dh-font-header);
    font-weight: 800;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    pointer-events: none;
  }

  .dh-card-scaler .card-banner_image {
    left: 5%;
    top: -15px;
    box-sizing: border-box;
    width: 52px;
    position: absolute;
    height: auto;
    object-fit: scale-down;
    border-radius: 0;
    margin: 0 10px auto 0;
    float: left;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, .2));
    z-index: 10;
  }

  .dh-card-scaler .stress_image {
    position: absolute;
    width: 32px;
    top: 5%;
    right: 5%;
    z-index: 2;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, .333));
  }

  .dh-card-scaler .stress_text {
    position: absolute;
    font-family: var(--dh-font-header);
    top: 5%;
    right: 5.5%;
    width: 24px;
    text-align: left;
    font-size: 22px;
    color: #fff;
    z-index: 11;
    margin: 0;
    user-select: none;
    pointer-events: none;
  }

  .dh-card-scaler .card-image-container {
    width: 100%;
    height: 220px;
    overflow: hidden;
    position: relative;
    z-index: 1;
    border-bottom: none;
  }

  .dh-card-scaler .card-main-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: top center;
    background: #000;
  }

  .dh-card-scaler .divider-container {
    position: relative;
    width: 100%;
    height: 0;
    z-index: 7;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .dh-card-scaler .title-bg {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translate(-50%, -50%) skewX(-15deg);
    width: 105%;
    height: 42px;
    
    border: 2px solid rgba(255, 255, 255, 0.4);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.6);
    
    z-index: 7;
  }

  .dh-card-scaler .title {
    position: absolute;
    left: 50%;
    top: 15px; 
    transform: translate(-50%, -50%);
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

  .dh-card-scaler .card-text-content {
    flex-grow: 1;
    font-weight: 500;
    font-size: 12.41px;
    box-sizing: border-box;
    padding: 24px 21.37px 21.37px; 
    width: 100%;
    z-index: 6;
    min-height: 237.46px;
    position: relative;
    background: #fff;
    display: flex;
    flex-direction: column;
  }

  .dh-card-scaler .description {
    margin-top: 10%;
    color: #000;
    line-height: 1.3;
    overflow: hidden;
  }

  .drag-preview,
  .dragging {
    cursor: grabbing !important;
    opacity: 0.9 !important;
    transition: none !important;
    z-index: 9999 !important;
  }

  body.dragging-active {
    user-select: none !important;
    -webkit-user-select: none !important;
    cursor: grabbing !important;
  }

  .no-cards {
    color: var(--dh-text);
    opacity: 0.5;
    align-self: center;
    font-style: italic;
    margin-bottom: 80px;
    pointer-events: all;
  }
  `;

  const style = document.createElement('style');
  style.id = cssId;
  style.appendChild(document.createTextNode(cssContent));
  document.head.appendChild(style);
  console.log('Quick Items Daggerheart | Styles injected');
};