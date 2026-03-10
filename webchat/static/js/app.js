/**
 * Zettel WebChat - Frontend
 * 
 * Features:
 * - Session management (list, create, close)
 * - Streaming chat via SSE
 * - Mobile responsive
 * - Auto-save to conversations/
 */

// ============== Imports ==============

// Config
import { API_BASE, CODE_THEMES } from './config.js';

// State (exported for other modules)
export {
    currentSession, sessions, isStreaming, eventSource,
    menuSessionId, renamingSessionId, confirmCallback, attachedImages,
    splitMode, panelSizes, currentTheme, hideToolsCalls, sidebarCollapsed,
    streamingBlocks, currentBlockType, toolCalls, menuPosition
} from './state.js';

// Utils
import { showToast, autoResizeTextarea, updateSendButton, scrollToBottom } from './utils/helpers.js';
import { renderMarkdown, applySyntaxHighlight, renderMermaidDiagrams } from './utils/markdown.js';

// UI Components
import { showConfirm, hideConfirm, onConfirmOk, onConfirmCancel } from './ui/components.js';
import { openSidebar, closeSidebar, toggleSidebar, updateSidebarState } from './ui/sidebar.js';
import { toggleSessionMenu, renderSessionMenu, handleMenuAction, confirmMenuRename, cancelMenuRename } from './ui/session-menu.js';
import { initTheme, applyTheme, renderThemeList, showThemeDialog, hideThemeDialog } from './ui/theme.js';

// Sessions
import { loadSessions, createSession, closeSession, archiveSession, unarchiveSession, deleteSession, renameSession, toggleInactiveView, updateSessionTitle, selectSession, openSessionChat } from './sessions/manager.js';

// Expose globals for non-module scripts (mockcraft.js)
window.API_BASE = API_BASE;
window.showToast = showToast;
import { renderSessionList, renderSessionGroup } from './sessions/renderer.js';

// Chat
import { sendMessage, streamChat, loadConversation, updateChatTitle } from './chat/index.js';
import { renderMessages, addMessage, renderUserContent, handleCopyMessage, parseThinkingFromContent, renderBlock, renderMessageContent } from './chat/renderer.js';
import { updateStreamingBlocks, appendStreamingChunk, parseContentToBlocks, finalizeStreamingMessage } from './chat/streaming.js';
import { handleEvent, updateToolsBlock, renderThinkingBlock, renderToolsBlock, getToolIcon, initToolsToggle, toggleToolsVisibility, updateToolsToggleButton, updateInputStatus } from './chat/tools.js';
import { handlePaste, addAttachedImage, removeAttachedImage, renderImageAttachments, clearAttachedImages, buildMessageContent } from './chat/images.js';

// Split Panel
import { initSplitPanel, toggleSplit, renderHtml, clearHtml, refreshHtml, loadHtmlFromMessage } from './split-panel.js';

// ============== DOM Elements ==============

export const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    sessionList: document.getElementById('sessionList'),
    newChatBtn: document.getElementById('newChatBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    chatTitle: document.getElementById('chatTitle'),
    messages: document.getElementById('messages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    inputStatus: document.getElementById('inputStatus'),
    toast: document.getElementById('toast'),
    imageAttachments: document.getElementById('imageAttachments'),
    // Confirm dialog
    confirmOverlay: document.getElementById('confirmOverlay'),
    confirmTitle: document.getElementById('confirmTitle'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmCancel: document.getElementById('confirmCancel'),
    confirmOk: document.getElementById('confirmOk'),
    // Theme dialog
    themeOverlay: document.getElementById('themeOverlay'),
    themeList: document.getElementById('themeList'),
    themeCancel: document.getElementById('themeCancel'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    toggleToolsBtn: document.getElementById('toggleToolsBtn'),
    // Export button
    exportBtn: document.getElementById('exportBtn'),
    // Split panel elements
    mainContainer: document.getElementById('mainContainer'),
    chatPanel: document.getElementById('chatPanel'),
    htmlPanel: document.getElementById('mockcraftPanel'),
    mockcraftPanel: document.getElementById('mockcraftPanel'),
    panelDivider: document.getElementById('panelDivider'),
    htmlPreviewContent: document.getElementById('htmlPreviewContent'),
    htmlInput: document.getElementById('htmlInput'),
    splitVerticalBtn: document.getElementById('splitVerticalBtn'),
    splitHorizontalBtn: document.getElementById('splitHorizontalBtn'),
    closeSplitBtn: document.getElementById('closeSplitBtn'),
    renderHtmlBtn: document.getElementById('renderHtmlBtn'),
    clearHtmlBtn: document.getElementById('clearHtmlBtn'),
    refreshHtmlBtn: document.getElementById('refreshHtmlBtn'),
};

// ============== State Imports for Local Use ==============

import { currentSession, sessions, isStreaming, menuSessionId, renamingSessionId, confirmCallback, attachedImages, sidebarCollapsed, splitMode, currentTheme, hideToolsCalls, streamingBlocks, currentBlockType, toolCalls } from './state.js';
import { setMenuSessionId, setRenamingSessionId, setConfirmCallback } from './state.js';

// ============== Event Listeners ==============

elements.newChatBtn.addEventListener('click', createSession);

// Archived toggle button
document.getElementById('toggleArchivedBtn').addEventListener('click', toggleInactiveView);

// Confirm dialog buttons
elements.confirmOk.addEventListener('click', onConfirmOk);
elements.confirmCancel.addEventListener('click', onConfirmCancel);
elements.confirmOverlay.addEventListener('click', (e) => {
    if (e.target === elements.confirmOverlay) hideConfirm();
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (menuSessionId && !e.target.closest('.session-item-wrapper')) {
        setMenuSessionId(null);
        setRenamingSessionId(null);
        renderSessionList();
    }
});

elements.mobileMenuBtn.addEventListener('click', openSidebar);

elements.sidebarOverlay.addEventListener('click', closeSidebar);

elements.sidebarToggleBtn.addEventListener('click', toggleSidebar);

// Export button
elements.exportBtn.addEventListener('click', exportSession);

elements.sendBtn.addEventListener('click', sendMessage);

elements.messageInput.addEventListener('input', () => {
    updateSendButton();
    autoResizeTextarea();
});

// Command/Ctrl + Enter to send, Enter for new line
elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        sendMessage();
    }
});

// ============== Export Session Function ==============

async function exportSession() {
    if (!currentSession) {
        showToast('请先选择一个会话');
        return;
    }
    
    try {
        const response = await fetch(API_BASE + '/api/sessions/' + currentSession.id + '/export');
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }
        
        // Get the filename from Content-Disposition header
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'chat_' + currentSession.id + '.md';
        if (disposition) {
            const match = disposition.match(/filename="([^"]+)"/);
            if (match) {
                filename = match[1];
            }
        }
        
        // Get the content
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('导出成功');
    } catch (err) {
        showToast('导出失败: ' + err.message);
        console.error('Export failed:', err);
    }
}

// ============== Init ==============

async function init() {
    // Ensure button state matches default (show all)
    const btn = document.getElementById('toggleArchivedBtn');
    if (btn) {
        btn.dataset.showing = 'true';
        btn.textContent = 'Hide Archived & Closed';
    }
    
    // Initialize sidebar state
    updateSidebarState();
    
    // Initialize theme and tools toggle
    initTheme();
    initToolsToggle();
    
    // Initialize split panel
    initSplitPanel();
    
    // Initialize MockCraft
    if (window.MockCraft) {
        MockCraft.init();
    }
    
    // Setup paste handling
    if (elements.messageInput) {
        console.log('[Init] Binding paste event to messageInput');
        elements.messageInput.addEventListener('paste', handlePaste);
    } else {
        console.error('[Init] messageInput element not found!');
    }
    
    await loadSessions();
    
    // Select first active session if exists
    const activeSession = sessions.find(s => s.status === 'active');
    if (activeSession) {
        selectSession(activeSession.id);
    } else if (sessions.length === 0) {
        // No sessions, show empty state
        renderMessages([]);
    }
    
    elements.messageInput.focus();
}

init();
