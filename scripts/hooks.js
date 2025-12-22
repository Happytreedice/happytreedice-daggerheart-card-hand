import { HandManager } from './hand-manager.js';

/**
 * Registers all Foundry VTT Hooks.
 * Separated from main logic for cleaner architecture.
 */
export function registerHooks() {
    Hooks.once('i18nInit', () => {
        HandManager.registerSettings();
    });

    Hooks.once('ready', () => {
        HandManager.createHandPanel();
        setupRuntimeHooks();
        HandManager.restorePosition();

        if (canvas.tokens?.controlled.length) {
            HandManager.refreshHand();
        }
    });
}

function setupRuntimeHooks() {
    Hooks.on("controlToken", () => HandManager.refreshHand());

    // Add Toggle Button to Token Controls
    Hooks.on("getSceneControlButtons", controls => {
        controls.tokens.tools.myTool = {
            name: "myTool",
            title: "MyTool.Title",
            icon: "fa-solid fa-wrench",
            order: Object.keys(controls.tokens.tools).length,
            button: true,
            onChange: () => {
                const existing = foundry.applications.instances.get("happytreedice-daggerheart-card-hand");
                if (existing) existing.close();
                else new MyTool().render({ force: true });
            }
        };
    });

    Hooks.on("updateActor", (actor) => {
        if (HandManager._currentActor && actor.id === HandManager._currentActor.id) {
            // Using debounced refresh for performance
            HandManager.refreshHandDebounced();
        }
    });

    const refreshIfCurrent = (item) => {
        if (item.parent?.id === HandManager._currentActor?.id) {
            HandManager.refreshHandDebounced();
        }
    };

    Hooks.on("createItem", refreshIfCurrent);
    Hooks.on("deleteItem", refreshIfCurrent);
    Hooks.on("updateItem", refreshIfCurrent);

    Hooks.on("dropCanvasData", (canvas, data) => {
        if (data.type !== "Item" || !data.uuid) return;
        fromUuid(data.uuid).then(item => {
            if (!item) return;
            if (HandManager._currentActor && item.parent?.id === HandManager._currentActor.id) {
                HandManager.useItem(item);
            }
        });
    });
}