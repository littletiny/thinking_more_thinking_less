/**
 * Helpers - Utility functions
 */

import { elements } from '../app.js';
import { isStreaming, attachedImages } from '../state.js';

export function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
}

export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape text for use in HTML data attribute
export function escapeForDataAttr(text) {
    // Replace special characters and newlines for safe HTML attribute usage
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '&#10;')
        .replace(/\r/g, '&#13;');
}

export function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

export function updateSendButton() {
    const hasText = elements.messageInput.value.trim().length > 0;
    const hasImages = attachedImages.length > 0;
    
    if (isStreaming) {
        // Show stop button
        elements.sendBtn.innerHTML = '◼';
        elements.sendBtn.classList.add('stop-btn');
        elements.sendBtn.disabled = false;
        elements.sendBtn.title = 'Stop generation';
    } else {
        // Show send button
        elements.sendBtn.innerHTML = '➤';
        elements.sendBtn.classList.remove('stop-btn');
        elements.sendBtn.disabled = (!hasText && !hasImages);
        elements.sendBtn.title = 'Send message';
    }
}

export function autoResizeTextarea() {
    const el = elements.messageInput;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}
