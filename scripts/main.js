import { registerHooks } from './hooks.js';
import '../templates/default/default-template.js';
/**
 * Main Entry Point
 */
Hooks.once('init', () => {
    registerHooks();
});