/**
 * Session Manager - Session management functions
 */

import { apiGet, apiPost, apiDelete, apiPut } from '../api.js';
import { 
    sessions, 
    currentSession, 
    menuSessionId 
} from '../state.js';
import { 
    setSessions, 
    setCurrentSession, 
    setMenuSessionId 
} from '../state.js';
import { showToast } from '../utils/helpers.js';
import { renderSessionList } from './renderer.js';
import { renderMessages } from '../chat/renderer.js';
import { updateChatTitle } from '../chat/index.js';
import { closeSidebar } from '../ui/sidebar.js';
import { loadConversation } from '../chat/index.js';
import { elements } from '../app.js';

export async function loadSessions() {
    try {
        const data = await apiGet('/api/sessions');
        setSessions(data.sessions || []);
        renderSessionList();
    } catch (err) {
        showToast('Failed to load sessions: ' + err.message);
    }
}

export async function createSession() {
    try {
        const data = await apiPost('/api/sessions');
        const session = data.session;
        setSessions([session, ...sessions]);
        renderSessionList();
        selectSession(session.id);
        showToast('New session created');
    } catch (err) {
        showToast('Failed to create session: ' + err.message);
    }
}

export async function closeSession(sessionId) {
    try {
        await apiDelete('/api/sessions/' + sessionId);
        setSessions(sessions.filter(s => s.id !== sessionId));
        
        if (currentSession?.id === sessionId) {
            setCurrentSession(null);
            renderMessages();
            updateChatTitle();
        }
        
        setMenuSessionId(null);
        renderSessionList();
        showToast('Session closed');
    } catch (err) {
        showToast('Failed to close: ' + err.message);
    }
}

export async function archiveSession(sessionId) {
    try {
        await apiPost('/api/sessions/' + sessionId + '/archive');
        await loadSessions();
        if (currentSession?.id === sessionId) {
            setCurrentSession(sessions.find(s => s.id === sessionId) || null);
        }
        setMenuSessionId(null);
        renderSessionList();
        showToast('Session archived');
    } catch (err) {
        showToast('Failed to archive: ' + err.message);
    }
}

export async function unarchiveSession(sessionId) {
    try {
        await apiPost('/api/sessions/' + sessionId + '/unarchive');
        await loadSessions();
        setMenuSessionId(null);
        renderSessionList();
        showToast('Session unarchived');
    } catch (err) {
        showToast('Failed to unarchive: ' + err.message);
    }
}

export async function deleteSession(sessionId) {
    try {
        await apiPost('/api/sessions/' + sessionId + '/delete');
        setSessions(sessions.filter(s => s.id !== sessionId));
        
        if (currentSession?.id === sessionId) {
            setCurrentSession(null);
            renderMessages();
            updateChatTitle();
        }
        
        setMenuSessionId(null);
        renderSessionList();
        showToast('Session deleted');
    } catch (err) {
        showToast('Failed to delete: ' + err.message);
    }
}

export async function renameSession(sessionId, newTitle) {
    if (!newTitle.trim()) return;
    
    try {
        await apiPut('/api/sessions/' + sessionId + '/title', { title: newTitle.trim() });
        
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            session.title = newTitle.trim();
        }
        
        if (currentSession?.id === sessionId) {
            currentSession.title = newTitle.trim();
            updateChatTitle();
        }
        
        renderSessionList();
        showToast('Session renamed');
    } catch (err) {
        showToast('Failed to rename: ' + err.message);
    }
}

export async function toggleInactiveView() {
    const btn = document.getElementById('toggleArchivedBtn');
    const showingAll = btn.dataset.showing === 'true';
    
    try {
        // showingAll=true 时，点击后隐藏 inactive (archived/closed)
        // showingAll=false 时，点击后显示全部
        const data = await apiGet('/api/sessions?hide_inactive=' + showingAll);
        setSessions(data.sessions || []);
        renderSessionList();
        
        btn.dataset.showing = !showingAll;
        btn.textContent = !showingAll ? 'Hide Archived & Closed' : 'Show All';
    } catch (err) {
        showToast('Failed to load sessions: ' + err.message);
    }
}

export async function updateSessionTitle(sessionId, title) {
    try {
        await apiPut('/api/sessions/' + sessionId + '/title', { title });
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            session.title = title;
            renderSessionList();
            if (currentSession?.id === sessionId) {
                updateChatTitle();
            }
        }
    } catch (err) {
        showToast('Failed to update title: ' + err.message);
    }
}

export function selectSession(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    setCurrentSession(session);
    updateChatTitle();
    renderSessionList();
    renderMessages();
    
    // Load conversation from file if exists
    loadConversation(session);
    
    // Close sidebar on mobile
    closeSidebar();
    
    // Focus input
    elements.messageInput.focus();
}

// 打开 session 聊天（不自动激活，只切换视图）
export async function openSessionChat(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // 注意：不在这里自动激活，只在发送消息时激活
    setMenuSessionId(null);
    selectSession(sessionId);
}
