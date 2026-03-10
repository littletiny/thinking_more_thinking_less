/**
 * Theme - Theme management
 */

import { elements } from '../app.js';
import { currentTheme } from '../state.js';
import { setCurrentTheme } from '../state.js';
import { CODE_THEMES } from '../config.js';
import { showToast } from '../utils/helpers.js';

export function initTheme() {
    // Apply saved theme
    applyTheme(currentTheme);
    
    // Render theme list
    renderThemeList();
    
    // Bind theme events
    elements.themeToggleBtn.addEventListener('click', showThemeDialog);
    elements.themeCancel.addEventListener('click', hideThemeDialog);
    elements.themeOverlay.addEventListener('click', (e) => {
        if (e.target === elements.themeOverlay) hideThemeDialog();
    });
}

export function applyTheme(themeId) {
    setCurrentTheme(themeId);
    localStorage.setItem('code-theme', themeId);
    
    // Update stylesheet href
    let link = document.getElementById('hljs-theme');
    if (!link) {
        link = document.createElement('link');
        link.id = 'hljs-theme';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    
    if (themeId === 'default') {
        link.href = '/static/highlight.default.min.css';
    } else {
        link.href = '/static/highlight.' + themeId + '.min.css';
    }
    
    // Update theme preview in button
    const theme = CODE_THEMES.find(t => t.id === themeId);
    if (theme) {
        elements.themeToggleBtn.style.background = theme.bg;
        elements.themeToggleBtn.style.color = theme.fg;
        // Update code block background CSS variable
        document.documentElement.style.setProperty('--code-bg', theme.bg);
    }
}

export function renderThemeList() {
    elements.themeList.innerHTML = CODE_THEMES.map(theme => `
        <div class="theme-option ${theme.id === currentTheme ? 'active' : ''}" data-theme="${theme.id}">
            <div class="theme-preview" style="background: ${theme.bg}; color: ${theme.fg};">Aa</div>
            <span class="theme-name">${theme.name}</span>
            <span class="theme-check">✓</span>
        </div>
    `).join('');
    
    // Bind click events
    elements.themeList.querySelectorAll('.theme-option').forEach(el => {
        el.addEventListener('click', () => {
            const themeId = el.dataset.theme;
            applyTheme(themeId);
            renderThemeList();
            hideThemeDialog();
            showToast('主题已切换: ' + CODE_THEMES.find(t => t.id === themeId).name);
        });
    });
}

export function showThemeDialog() {
    renderThemeList();
    elements.themeOverlay.classList.add('open');
}

export function hideThemeDialog() {
    elements.themeOverlay.classList.remove('open');
}
