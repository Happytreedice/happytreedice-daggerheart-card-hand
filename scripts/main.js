import { registerHooks } from './hooks.js';
import '../templates/default/default-template.js';
import '../templates/improved/improved-template.js';
/**
 * Main Entry Point
 */
Hooks.once('init', () => {
    registerHooks();
});