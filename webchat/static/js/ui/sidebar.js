/**
 * Sidebar - Sidebar functionality
 */

import { elements } from '../app.js';
import { sidebarCollapsed } from '../state.js';
import { setSidebarCollapsed } from '../state.js';

export function openSidebar() {
    elements.sidebar.classList.add('open');
    elements.sidebarOverlay.classList.add('open');
}

export function closeSidebar() {
    elements.sidebar.classList.remove('open');
    elements.sidebarOverlay.classList.remove('open');
}

export function toggleSidebar() {
    setSidebarCollapsed(!sidebarCollapsed);
    localStorage.setItem('sidebar-collapsed', sidebarCollapsed);
    updateSidebarState();
}

export function updateSidebarState() {
    if (sidebarCollapsed) {
        elements.sidebar.classList.add('collapsed');
        elements.sidebarToggleBtn.innerHTML = '📁';
        elements.sidebarToggleBtn.title = '展开会话列表';
    } else {
        elements.sidebar.classList.remove('collapsed');
        elements.sidebarToggleBtn.innerHTML = '📂';
        elements.sidebarToggleBtn.title = '收起会话列表';
    }
}
