/**
 * Session Renderer - Session list rendering
 */

import { elements } from '../app.js';
import { sessions, currentSession, menuSessionId, renamingSessionId } from '../state.js';
import { escapeHtml } from '../utils/helpers.js';
import { renderSessionMenu, toggleSessionMenu, handleMenuAction, confirmMenuRename, cancelMenuRename } from '../ui/session-menu.js';
import { openSessionChat } from './manager.js';

export function renderSessionList() {
    // 分离不同状态的 session
    const active = sessions.filter(s => s.status === 'active');
    const archived = sessions.filter(s => s.status === 'archived');
    const closed = sessions.filter(s => s.status === 'closed');
    
    let html = '';
    
    // Active sessions
    if (active.length > 0) {
        html += renderSessionGroup('Active', active, false);
    }
    
    // Archived sessions
    if (archived.length > 0) {
        html += renderSessionGroup('Archived', archived, true);
    }
    
    // Closed sessions (always last)
    if (closed.length > 0) {
        html += renderSessionGroup('Closed', closed, false, true);
    }
    
    if (html === '') {
        elements.sessionList.innerHTML = '<div class="empty-sessions">No conversations yet</div>';
        return;
    }
    
    elements.sessionList.innerHTML = html;
    
    // 点击 session 项 -> 直接进入聊天（自动激活如果需要）
    elements.sessionList.querySelectorAll('.session-item').forEach(el => {
        el.addEventListener('click', (e) => {
            // 如果点击的是菜单或菜单触发按钮，不处理
            if (e.target.closest('.session-menu') || e.target.closest('.session-menu-trigger')) return;
            openSessionChat(el.dataset.id);
        });
    });
    
    // 点击菜单触发按钮
    elements.sessionList.querySelectorAll('.session-menu-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sessionId = btn.dataset.sessionId;
            const el = btn.closest('.session-item');
            toggleSessionMenu(sessionId, el);
        });
    });
    
    // Add menu action handlers
    elements.sessionList.querySelectorAll('.session-menu-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sessionId = btn.dataset.sessionId;
            const action = btn.dataset.action;
            handleMenuAction(sessionId, action);
        });
    });
    
    // Add rename handlers
    elements.sessionList.querySelectorAll('.menu-rename').forEach(form => {
        const input = form.querySelector('input');
        const saveBtn = form.querySelector('.save');
        const cancelBtn = form.querySelector('.cancel');
        
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmMenuRename(form.dataset.sessionId, input.value);
            if (e.key === 'Escape') cancelMenuRename();
        });
        
        saveBtn?.addEventListener('click', () => confirmMenuRename(form.dataset.sessionId, input.value));
        cancelBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelMenuRename();
        });
    });
}

export function renderSessionGroup(label, sessionList, isArchived = false, isClosed = false) {
    const groupHtml = sessionList.map(session => {
        const hasMenu = menuSessionId === session.id;
        const isRenaming = renamingSessionId === session.id;
        const icon = isClosed ? '🔒' : isArchived ? '📦' : '💬';
        const isActiveSession = currentSession?.id === session.id;
        const triggerIcon = hasMenu ? '›' : '⋯';
        
        return `
        <div class="session-item-wrapper" style="position: relative;">
            <div class="session-item ${isActiveSession ? 'active' : ''} ${session.status}" 
                 data-id="${session.id}">
                <span class="icon">${icon}</span>
                <span class="title">${escapeHtml(session.title)}</span>
                <button class="session-menu-trigger ${hasMenu ? 'open' : ''}" data-session-id="${session.id}" onclick="event.stopPropagation()">
                    ${triggerIcon}
                </button>
            </div>
            ${hasMenu ? renderSessionMenu(session, isRenaming) : ''}
        </div>`;
    }).join('');
    
    return `
        <div class="session-group">
            <div class="session-group-label">${label}</div>
            ${groupHtml}
        </div>
    `;
}
