/**
 * Central registry for Card Templates.
 * Allows multiple templates to register themselves dynamically.
 */
export const TemplateRegistry = new Map();

/**
 * Registers a new card template.
 * @param {Object} template - The template object.
 * @param {string} template.id - Unique identifier.
 * @param {string} template.name - Display name.
 * @param {Function} template.renderCard - Function returning HTML string for a card.
 * @param {Function} template.renderPanel - Function returning HTML string for the hand panel.
 */
export function registerTemplate(template) {
    if (!template || !template.id) {
        console.error("Quick Items Daggerheart | Cannot register template without ID:", template);
        return;
    }
    TemplateRegistry.set(template.id, template);
    console.log(`Quick Items Daggerheart | Registered template: ${template.id}`);
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
 * Format: { id: name, ... }
 */
export function getTemplateChoices() {
    const choices = {};
    for (const [id, template] of TemplateRegistry) {
        choices[id] = template.name;
    }
    return choices;
}