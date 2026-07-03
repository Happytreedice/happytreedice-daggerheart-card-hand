import { registerHooks } from './hooks.js';
import { MODULE_ID, TemplateRegistry, registerTemplate, unregisterTemplate, getTemplate, getTemplateChoices } from './registry.js';
import { HandManager } from './hand-manager.js';
import '../templates/default/default-template.js';
import '../templates/improved/improved-template.js';

/**
 * Main Entry Point
 */
Hooks.once('init', () => {
    // Public API for external template modules.
    // A dependent module declares this module in its manifest "relationships.requires"
    // and registers its template via the hook or this API (see README).
    const module = game.modules.get(MODULE_ID);
    if (module) {
        module.api = {
            registerTemplate,
            unregisterTemplate,
            getTemplate,
            getTemplateChoices,
            TemplateRegistry,
            HandManager
        };
    }

    registerHooks();
});
