import { HandManager } from './hand-manager.js';
import { registerHooks } from './hooks.js';

/**
 * Main Entry Point
 */
Hooks.once('init', () => {
    HandManager.init();
    registerHooks();
});