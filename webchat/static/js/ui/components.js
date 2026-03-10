/**
 * UI Components - UI helper components
 */

import { elements } from '../app.js';
import { confirmCallback } from '../state.js';
import { setConfirmCallback } from '../state.js';

export function showConfirm({ title, message, okText, okClass, onOk }) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmOk.textContent = okText;
    elements.confirmOk.className = okClass;
    
    setConfirmCallback(onOk);
    elements.confirmOverlay.classList.add('open');
}

export function hideConfirm() {
    elements.confirmOverlay.classList.remove('open');
    setConfirmCallback(null);
}

export function onConfirmOk() {
    if (confirmCallback) {
        confirmCallback();
    }
    hideConfirm();
}

export function onConfirmCancel() {
    hideConfirm();
}
