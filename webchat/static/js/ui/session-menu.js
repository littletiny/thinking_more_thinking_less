/**
 * Session Menu - Session menu interactions
 */

import { elements } from '../app.js';
import { 
    menuSessionId, 
    renamingSessionId, 
    menuPosition, 
    sessions 
} from '../state.js';
import { 
    setMenuSessionId, 
    setRenamingSessionId, 
    setMenuPosition 
} from '../state.js';
import { escapeHtml } from '../utils/helpers.js';
import { renderSessionList } from '../sessions/renderer.js';
import { showConfirm } from './components.js';
import { 
    openSessionChat, 
    archiveSession, 
    unarchiveSession, 
    closeSession, 
    deleteSession, 
    renameSession 
} from '../sessions/manager.js';

export function toggleSessionMenu(sessionId, element) {
    if (menuSessionId === sessionId) {
        // Close menu
        setMenuSessionId(null);
        setRenamingSessionId(null);
        renderSessionList();
    } else {
        // Calculate menu position
        const rect = element.getBoundingClientRect();
        const sidebarWidth = document.querySelector('.sidebar').offsetWidth;
        setMenuPosition({
            top: rect.top,
            left: sidebarWidth - 5
        });
        
        // Open menu for this session
        setMenuSessionId(sessionId);
        setRenamingSessionId(null);
        renderSessionList();
        
        // Ensure menu is visible in viewport
        setTimeout(() => {
            const menu = document.querySelector('.session-menu');
            if (menu) {
                const menuRect = menu.getBoundingClientRect();
                if (menuRect.bottom > window.innerHeight) {
                    // Menu goes off screen, position above
                    menu.style.top = (window.innerHeight - menuRect.height - 10) + 'px';
                }
            }
        }, 0);
    }
}

export function renderSessionMenu(session, isRenaming) {
    const style = 'style="top: ' + menuPosition.top + 'px; left: ' + menuPosition.left + 'px;"';
    
    if (isRenaming) {
        return `
            <div class="session-menu" ${style} onclick="event.stopPropagation()">
                <div class="menu-rename" data-session-id="${session.id}">
                    <input type="text" value="${escapeHtml(session.title)}" maxlength="50" autofocus>
                    <div class="menu-rename-btns">
                        <button class="save">Save</button>
                        <button class="cancel">Cancel</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    const isClosed = session.status === 'closed';
    const isArchived = session.status === 'archived';
    
    let items = '';
    
    // Open
    items += '<button class="session-menu-item" data-action="open" data-session-id="' + session.id + '">💬 Open Chat</button>';
    
    // Rename
    items += '<button class="session-menu-item" data-action="rename" data-session-id="' + session.id + '">✏️ Rename</button>';
    
    // Separator
    items += '<div class="session-menu-separator"></div>';
    
    // Status-specific actions
    if (isArchived) {
        items += '<button class="session-menu-item" data-action="unarchive" data-session-id="' + session.id + '">📂 Unarchive</button>';
    } else if (!isClosed) {
        items += '<button class="session-menu-item" data-action="archive" data-session-id="' + session.id + '">📦 Archive</button>';
        items += '<button class="session-menu-item" data-action="close" data-session-id="' + session.id + '">🚪 Close</button>';
    }
    
    // Delete
    items += '<button class="session-menu-item danger" data-action="delete" data-session-id="' + session.id + '">🗑️ Delete</button>';
    
    return '<div class="session-menu" ' + style + ' onclick="event.stopPropagation()">' + items + '</div>';
}

export async function handleMenuAction(sessionId, action) {
    switch (action) {
        case 'open':
            setMenuSessionId(null);
            openSessionChat(sessionId);
            break;
        case 'rename':
            setRenamingSessionId(sessionId);
            renderSessionList();
            setTimeout(() => {
                const input = document.querySelector('.menu-rename input');
                if (input) {
                    input.select();
                    input.focus();
                }
            }, 10);
            break;
        case 'archive':
            setMenuSessionId(null);
            archiveSession(sessionId);
            break;
        case 'unarchive':
            setMenuSessionId(null);
            unarchiveSession(sessionId);
            break;
        case 'close':
            showConfirm({
                title: 'Close Session?',
                message: 'This session will be moved to the Closed section. You can still view it later.',
                okText: 'Close',
                okClass: 'primary',
                onOk: () => {
                    setMenuSessionId(null);
                    closeSession(sessionId);
                }
            });
            break;
        case 'delete':
            showConfirm({
                title: 'Delete Forever?',
                message: 'Are you sure you want to delete "' + getSessionTitle(sessionId) + '"? This action cannot be undone.',
                okText: 'Delete',
                okClass: 'danger',
                onOk: () => {
                    setMenuSessionId(null);
                    deleteSession(sessionId);
                }
            });
            break;
    }
}

export function getSessionTitle(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    return session ? session.title : 'this session';
}

export async function confirmMenuRename(sessionId, newTitle) {
    newTitle = newTitle.trim();
    if (!newTitle) return;
    
    setRenamingSessionId(null);
    await renameSession(sessionId, newTitle);
}

export function cancelMenuRename() {
    setRenamingSessionId(null);
    renderSessionList();
}
