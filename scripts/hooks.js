import { HandManager } from './hand-manager.js';
import { MODULE_ID, REGISTER_HOOK } from './registry.js';

/**
 * Registers all Foundry VTT Hooks.
 * Separated from main logic for cleaner architecture.
 */
export function registerHooks() {
    Hooks.once('i18nInit', () => {
        // Let external modules register their card templates before the
        // settings dropdown is built. Listeners must be attached during "init".
        const api = game.modules.get(MODULE_ID)?.api;
        Hooks.callAll(REGISTER_HOOK, api);

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
    Hooks.on('controlToken', () => HandManager.refreshHandDebounced());

    Hooks.on('updateActor', (actor) => {
        if (HandManager._currentActor && actor.id === HandManager._currentActor.id) {
            HandManager.refreshHandDebounced();
        }
    });

    const refreshIfCurrent = (item) => {
        if (item.parent?.id === HandManager._currentActor?.id) {
            HandManager.refreshHandDebounced();
        }
    };

    Hooks.on('createItem', refreshIfCurrent);
    Hooks.on('deleteItem', refreshIfCurrent);
    Hooks.on('updateItem', refreshIfCurrent);

    Hooks.on('dropCanvasData', (canvas, data) => {
        if (data.type !== 'Item' || !data.uuid) return;
        fromUuid(data.uuid).then(item => {
            if (!item) return;
            if (HandManager._currentActor && item.parent?.id === HandManager._currentActor.id) {
                HandManager.useItem(item);
            }
        });
    });
}
