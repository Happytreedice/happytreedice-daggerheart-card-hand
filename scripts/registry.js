/**
 * Central registry for Card Templates.
 * Allows multiple templates to register themselves dynamically,
 * including templates provided by external modules.
 */
export const MODULE_ID = 'happytreedice-daggerheart-card-hand';

/** Hook fired once during "i18nInit" so external modules can register their templates. */
export const REGISTER_HOOK = `${MODULE_ID}.registerTemplates`;

export const TemplateRegistry = new Map();

/**
 * Registers a new card template.
 * External modules should either listen to the `<MODULE_ID>.registerTemplates` hook
 * (recommended, fired before settings are registered) or call
 * `game.modules.get('happytreedice-daggerheart-card-hand').api.registerTemplate(...)`
 * at any later point — the settings dropdown is updated dynamically.
 *
 * @param {Object} template - The template object.
 * @param {string} template.id - Unique identifier.
 * @param {string} template.name - Display name (may be an i18n key).
 * @param {Function} template.renderCard - (item) => HTML string for a single card.
 * @param {Function} [template.renderPanel] - (options) => HTML string for the hand panel.
 *        Optional: when omitted, the default panel markup is used.
 * @param {Function} [template.attachStyles] - Called when the template becomes active;
 *        should inject its <style> element (and remove competing template styles).
 * @param {Function} [template.detachStyles] - Called when the template is deactivated.
 * @returns {boolean} true when registered successfully.
 */
export function registerTemplate(template) {
    if (!template?.id || typeof template.renderCard !== 'function') {
        console.error(`${MODULE_ID} | Cannot register template: "id" and "renderCard" are required`, template);
        return false;
    }
    if (TemplateRegistry.has(template.id)) {
        console.warn(`${MODULE_ID} | Template "${template.id}" is already registered, overwriting.`);
    }
    TemplateRegistry.set(template.id, template);
    _syncSettingChoices();
    console.log(`${MODULE_ID} | Registered template: ${template.id}`);
    return true;
}

/**
 * Removes a template from the registry (external modules may call this on teardown).
 * @param {string} id
 */
export function unregisterTemplate(id) {
    if (id === 'default') return false; // The fallback template must always exist
    const removed = TemplateRegistry.delete(id);
    if (removed) _syncSettingChoices();
    return removed;
}

/**
 * Retrieves a registered template by ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getTemplate(id) {
    return TemplateRegistry.get(id);
}

/**
 * Returns an object of all registered templates for settings choices.
 * Format: { id: localizedName, ... }
 */
export function getTemplateChoices() {
    const choices = {};
    for (const [id, template] of TemplateRegistry) {
        choices[id] = game?.i18n?.localize?.(template.name) ?? template.name;
    }
    return choices;
}

/**
 * Keeps the settings dropdown in sync when templates are (un)registered
 * after the settings were already registered.
 */
function _syncSettingChoices() {
    try {
        const key = `${MODULE_ID}.cardTemplate`;
        const setting = game?.settings?.settings?.get?.(key);
        if (setting) setting.choices = getTemplateChoices();
    } catch (e) {
        /* settings not initialized yet — choices are read at registration time */
    }
}
