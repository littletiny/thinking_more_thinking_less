/**
 * Zettel WebChat - Frontend
 * 
 * Features:
 * - Session management (list, create, close)
 * - Streaming chat via SSE
 * - Mobile responsive
 * - Auto-save to conversations/
 */

const API_BASE = '';

// State
let currentSession = null;
let sessions = [];
let isStreaming = false;
let eventSource = null;
let menuSessionId = null;      // 当前显示菜单的 session
let renamingSessionId = null;  // 当前正在重命名的 session
let confirmCallback = null;    // 确认弹窗的回调

// Theme definitions
const CODE_THEMES = [
    { id: 'default', name: 'Default', bg: '#f6f6f7', fg: '#444' },
    { id: 'github', name: 'GitHub Light', bg: '#ffffff', fg: '#24292e' },
    { id: 'github-dark', name: 'GitHub Dark', bg: '#0d1117', fg: '#c9d1d9' },
    { id: 'atom-one-light', name: 'Atom One Light', bg: '#fafafa', fg: '#383a42' },
    { id: 'atom-one-dark', name: 'Atom One Dark', bg: '#282c34', fg: '#abb2bf' },
    { id: 'monokai', name: 'Monokai', bg: '#272822', fg: '#f8f8f2' },
    { id: 'vs2015', name: 'VS 2015', bg: '#1e1e1e', fg: '#dcdcdc' },
];

let currentTheme = localStorage.getItem('code-theme') || 'default';
let hideToolsCalls = localStorage.getItem('hide-tools-calls') === 'true';

// DOM Elements
const elements = {
    sidebar: document.getElementById('sidebar'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    sessionList: document.getElementById('sessionList'),
    newChatBtn: document.getElementById('newChatBtn'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    chatTitle: document.getElementById('chatTitle'),
    messages: document.getElementById('messages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    inputStatus: document.getElementById('inputStatus'),
    toast: document.getElementById('toast'),
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
};

// ============== API Functions ==============

async function apiGet(url) {
    const res = await fetch(`${API_BASE}${url}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function apiPost(url, data = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiDelete(url) {
    const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

async function apiPut(url, data = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// ============== Session Management ==============

async function loadSessions() {
    try {
        const data = await apiGet('/api/sessions');
        sessions = data.sessions || [];
        renderSessionList();
    } catch (err) {
        showToast(`Failed to load sessions: ${err.message}`);
    }
}

async function createSession() {
    try {
        const data = await apiPost('/api/sessions');
        const session = data.session;
        sessions.unshift(session);
        renderSessionList();
        selectSession(session.id);
        showToast('New session created');
    } catch (err) {
        showToast(`Failed to create session: ${err.message}`);
    }
}

async function closeSession(sessionId) {
    try {
        await apiDelete(`/api/sessions/${sessionId}`);
        sessions = sessions.filter(s => s.id !== sessionId);
        
        if (currentSession?.id === sessionId) {
            currentSession = null;
            renderMessages();
            updateChatTitle();
        }
        
        menuSessionId = null;
        renderSessionList();
        showToast('Session closed');
    } catch (err) {
        showToast(`Failed to close: ${err.message}`);
    }
}

async function archiveSession(sessionId) {
    try {
        await apiPost(`/api/sessions/${sessionId}/archive`);
        await loadSessions();
        if (currentSession?.id === sessionId) {
            currentSession = sessions.find(s => s.id === sessionId) || null;
        }
        menuSessionId = null;
        renderSessionList();
        showToast('Session archived');
    } catch (err) {
        showToast(`Failed to archive: ${err.message}`);
    }
}

async function unarchiveSession(sessionId) {
    try {
        await apiPost(`/api/sessions/${sessionId}/unarchive`);
        await loadSessions();
        menuSessionId = null;
        renderSessionList();
        showToast('Session unarchived');
    } catch (err) {
        showToast(`Failed to unarchive: ${err.message}`);
    }
}

async function deleteSession(sessionId) {
    try {
        await apiPost(`/api/sessions/${sessionId}/delete`);
        sessions = sessions.filter(s => s.id !== sessionId);
        
        if (currentSession?.id === sessionId) {
            currentSession = null;
            renderMessages();
            updateChatTitle();
        }
        
        menuSessionId = null;
        renderSessionList();
        showToast('Session deleted');
    } catch (err) {
        showToast(`Failed to delete: ${err.message}`);
    }
}

async function renameSession(sessionId, newTitle) {
    if (!newTitle.trim()) return;
    
    try {
        await apiPut(`/api/sessions/${sessionId}/title`, { title: newTitle.trim() });
        
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
        showToast(`Failed to rename: ${err.message}`);
    }
}

async function toggleInactiveView() {
    const btn = document.getElementById('toggleArchivedBtn');
    const showingAll = btn.dataset.showing === 'true';
    
    try {
        // showingAll=true 时，点击后隐藏 inactive (archived/closed)
        // showingAll=false 时，点击后显示全部
        const data = await apiGet(`/api/sessions?hide_inactive=${showingAll}`);
        sessions = data.sessions || [];
        renderSessionList();
        
        btn.dataset.showing = !showingAll;
        btn.textContent = !showingAll ? 'Hide Archived & Closed' : 'Show All';
    } catch (err) {
        showToast(`Failed to load sessions: ${err.message}`);
    }
}

async function updateSessionTitle(sessionId, title) {
    try {
        await apiPut(`/api/sessions/${sessionId}/title`, { title });
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            session.title = title;
            renderSessionList();
            if (currentSession?.id === sessionId) {
                updateChatTitle();
            }
        }
    } catch (err) {
        showToast(`Failed to update title: ${err.message}`);
    }
}

function selectSession(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    currentSession = session;
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

// ============== UI Rendering ==============

function renderSessionList() {
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

function renderSessionGroup(label, sessionList, isArchived = false, isClosed = false) {
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

function renderSessionMenu(session, isRenaming) {
    const style = `style="top: ${menuPosition.top}px; left: ${menuPosition.left}px;"`;
    
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
    items += `<button class="session-menu-item" data-action="open" data-session-id="${session.id}">💬 Open Chat</button>`;
    
    // Rename
    items += `<button class="session-menu-item" data-action="rename" data-session-id="${session.id}">✏️ Rename</button>`;
    
    // Separator
    items += '<div class="session-menu-separator"></div>';
    
    // Status-specific actions
    if (isArchived) {
        items += `<button class="session-menu-item" data-action="unarchive" data-session-id="${session.id}">📂 Unarchive</button>`;
    } else if (!isClosed) {
        items += `<button class="session-menu-item" data-action="archive" data-session-id="${session.id}">📦 Archive</button>`;
        items += `<button class="session-menu-item" data-action="close" data-session-id="${session.id}">🚪 Close</button>`;
    }
    
    // Delete
    items += `<button class="session-menu-item danger" data-action="delete" data-session-id="${session.id}">🗑️ Delete</button>`;
    
    return `<div class="session-menu" ${style} onclick="event.stopPropagation()">${items}</div>`;
}

let menuPosition = { top: 0, left: 0 };  // 菜单位置缓存

function toggleSessionMenu(sessionId, element) {
    if (menuSessionId === sessionId) {
        // Close menu
        menuSessionId = null;
        renamingSessionId = null;
        renderSessionList();
    } else {
        // Calculate menu position
        const rect = element.getBoundingClientRect();
        const sidebarWidth = document.querySelector('.sidebar').offsetWidth;
        menuPosition = {
            top: rect.top,
            left: sidebarWidth - 5
        };
        
        // Open menu for this session
        menuSessionId = sessionId;
        renamingSessionId = null;
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

// 打开 session 聊天（不自动激活，只切换视图）
async function openSessionChat(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // 注意：不在这里自动激活，只在发送消息时激活
    menuSessionId = null;
    selectSession(sessionId);
}

async function handleMenuAction(sessionId, action) {
    switch (action) {
        case 'open':
            menuSessionId = null;
            openSessionChat(sessionId);
            break;
        case 'rename':
            renamingSessionId = sessionId;
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
            menuSessionId = null;
            archiveSession(sessionId);
            break;
        case 'unarchive':
            menuSessionId = null;
            unarchiveSession(sessionId);
            break;
        case 'close':
            showConfirm({
                title: 'Close Session?',
                message: 'This session will be moved to the Closed section. You can still view it later.',
                okText: 'Close',
                okClass: 'primary',
                onOk: () => {
                    menuSessionId = null;
                    closeSession(sessionId);
                }
            });
            break;
        case 'delete':
            showConfirm({
                title: 'Delete Forever?',
                message: `Are you sure you want to delete "${getSessionTitle(sessionId)}"? This action cannot be undone.`,
                okText: 'Delete',
                okClass: 'danger',
                onOk: () => {
                    menuSessionId = null;
                    deleteSession(sessionId);
                }
            });
            break;
    }
}

function getSessionTitle(sessionId) {
    const session = sessions.find(s => s.id === sessionId);
    return session ? session.title : 'this session';
}

async function confirmMenuRename(sessionId, newTitle) {
    newTitle = newTitle.trim();
    if (!newTitle) return;
    
    renamingSessionId = null;
    await renameSession(sessionId, newTitle);
}

function cancelMenuRename() {
    renamingSessionId = null;
    renderSessionList();
}

// ============== Confirm Dialog ==============

function showConfirm({ title, message, okText, okClass, onOk }) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmOk.textContent = okText;
    elements.confirmOk.className = okClass;
    
    confirmCallback = onOk;
    elements.confirmOverlay.classList.add('open');
}

function hideConfirm() {
    elements.confirmOverlay.classList.remove('open');
    confirmCallback = null;
}

function onConfirmOk() {
    if (confirmCallback) {
        confirmCallback();
    }
    hideConfirm();
}

function onConfirmCancel() {
    hideConfirm();
}

function updateChatTitle() {
    elements.chatTitle.textContent = currentSession 
        ? escapeHtml(currentSession.title) 
        : 'Zettel WebChat';
}

function parseThinkingFromContent(content) {
    // Parse <think>...</think> tags from content
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
        const thinking = thinkMatch[1].trim();
        const output = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        return { thinking, output, hasThinking: true };
    }
    return { thinking: null, output: content, hasThinking: false };
}

// Global state for streaming message blocks
let streamingBlocks = [];  // Array of {type: 'thinking'|'output'|'tools', content: string|object}
let currentBlockType = null;

// Tool call state
let toolCalls = [];      // Array of tool call info

function parseContentToBlocks(content) {
    // Parse content into alternating thinking/output blocks
    const blocks = [];
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let lastIndex = 0;
    let match;
    
    while ((match = thinkRegex.exec(content)) !== null) {
        // Add output block before this thinking (if any)
        if (match.index > lastIndex) {
            const output = content.slice(lastIndex, match.index).trim();
            if (output) {
                blocks.push({ type: 'output', content: output });
            }
        }
        // Add thinking block
        const thinking = match[1].trim();
        if (thinking) {
            blocks.push({ type: 'thinking', content: thinking });
        }
        lastIndex = match.index + match[0].length;
    }
    
    // Add remaining output (if any)
    if (lastIndex < content.length) {
        const output = content.slice(lastIndex).trim();
        if (output) {
            blocks.push({ type: 'output', content: output });
        }
    }
    
    return blocks.length > 0 ? blocks : [{ type: 'output', content: content }];
}

function renderBlock(block, isStreaming = false) {
    if (block.type === 'thinking') {
        return renderThinkingBlock(block.content, isStreaming);
    }
    if (block.type === 'tools') {
        return renderToolsBlock(block.content);
    }
    return `<div class="message-block markdown">${renderMarkdown(block.content)}</div>`;
}

function renderMessageContent(blocks, isStreaming = false) {
    if (blocks.length === 0) return '';
    return blocks.map(b => renderBlock(b, isStreaming)).join('');
}

function renderMessages(messages = []) {
    if (!currentSession) {
        elements.messages.innerHTML = `
            <div class="empty-state">
                <div class="logo">📝</div>
                <h2>Welcome to Zettel WebChat</h2>
                <p>Start a new conversation or select an existing one</p>
            </div>
        `;
        return;
    }
    
    if (messages.length === 0) {
        elements.messages.innerHTML = `
            <div class="empty-state">
                <div class="logo">💬</div>
                <h2>New Conversation</h2>
                <p>Send a message to start</p>
            </div>
        `;
        return;
    }
    
    elements.messages.innerHTML = messages.map(msg => {
        if (msg.role === 'assistant') {
            const blocks = parseContentToBlocks(msg.content);
            
            let html = `<div class="avatar">AI</div>`;
            html += `<div class="content">`;
            html += renderMessageContent(blocks, false);
            html += `</div>`;
            
            return `<div class="message ${msg.role}">${html}</div>`;
        }
        
        return `
            <div class="message ${msg.role}">
                <div class="avatar">${msg.role === 'user' ? 'U' : 'AI'}</div>
                <div class="content markdown">${renderMarkdown(msg.content)}</div>
            </div>
        `;
    }).join('');
    
    // Add click handlers for thinking headers
    document.querySelectorAll('.thinking-header').forEach(header => {
        header.addEventListener('click', () => {
            const block = header.closest('.thinking-block');
            block.classList.toggle('collapsed');
        });
    });
    
    // Render mermaid diagrams
    renderMermaidDiagrams();
    
    // Apply syntax highlighting to all code blocks
    applySyntaxHighlight(elements.messages);
    
    scrollToBottom();
}

function addMessage(role, content, isStreaming = false) {
    // Remove empty state if exists
    if (elements.messages.querySelector('.empty-state')) {
        elements.messages.innerHTML = '';
    }
    
    // Reset streaming state
    streamingBlocks = [];
    currentBlockType = null;
    toolCalls = [];
    
    const messageEl = document.createElement('div');
    messageEl.className = `message ${role}`;
    
    let html = `<div class="avatar">${role === 'user' ? 'U' : 'AI'}</div>`;
    html += `<div class="content ${isStreaming ? 'streaming-container' : ''}">`;
    
    if (isStreaming && role === 'assistant') {
        // Streaming placeholder - content will be added dynamically
        html += `<div class="streaming-blocks"></div>`;
    } else {
        // Non-streaming: parse and render blocks
        if (role === 'assistant') {
            const blocks = parseContentToBlocks(content);
            html += renderMessageContent(blocks, false);
        } else {
            html += `<div class="message-block markdown">${renderMarkdown(content)}</div>`;
        }
    }
    
    html += `</div>`;
    
    messageEl.innerHTML = html;
    elements.messages.appendChild(messageEl);
    scrollToBottom();
    
    // Add click handlers for thinking headers
    messageEl.querySelectorAll('.thinking-header').forEach(header => {
        header.addEventListener('click', () => {
            const block = header.closest('.thinking-block');
            block.classList.toggle('collapsed');
        });
    });
}

function updateStreamingBlocks() {
    // Update the DOM to match streamingBlocks
    // 先尝试找 streaming-blocks 容器（流式传输中）
    let container = document.querySelector('.message.assistant:last-child .streaming-blocks');
    let isFinalized = false;
    
    // 如果没找到，尝试找普通 content 容器（已 finalize）
    if (!container) {
        container = document.querySelector('.message.assistant:last-child .content');
        isFinalized = true;
    }
    
    // 如果连 content 容器都没有，放弃
    if (!container) {
        return;
    }
    
    // Build HTML from blocks
    const html = streamingBlocks.map((block, index) => {
        const isLast = index === streamingBlocks.length - 1;
        if (block.type === 'thinking') {
            return renderThinkingBlock(block.content, isLast && !isFinalized);
        }
        if (block.type === 'tools') {
            return renderToolsBlock(block.content);
        }
        // For output block: streaming 时用 escapeHtml，finalized 时用 markdown
        if (isFinalized) {
            return `<div class="message-block markdown">${renderMarkdown(block.content)}</div>`;
        }
        return `<div class="message-block streaming-output">${escapeHtml(block.content)}</div>`;
    }).join('');
    
    if (isFinalized) {
        // 已 finalize：重建整个 content（但不移除 streaming-blocks 类，因为已经没有这个类了）
        container.innerHTML = html;
        // Apply syntax highlighting
        applySyntaxHighlight(container);
    } else {
        // 流式传输中：正常更新
        container.innerHTML = html;
        
        // Auto-scroll thinking content if streaming
        const thinkingContent = container.querySelector('.thinking-content.streaming');
        if (thinkingContent) {
            thinkingContent.scrollTop = thinkingContent.scrollHeight;
        }
    }
    
    scrollToBottom();
    
    // Re-attach click handlers
    container.querySelectorAll('.thinking-header').forEach(header => {
        header.addEventListener('click', () => {
            const block = header.closest('.thinking-block');
            block.classList.toggle('collapsed');
        });
    });
}

function appendStreamingChunk(chunk, type = 'output') {
    // Append chunk to current block or create new block
    // 注意：tools 类型的 block 是特殊的，它的 content 是数组，不能直接追加字符串
    if (currentBlockType === type && streamingBlocks.length > 0) {
        const lastBlock = streamingBlocks[streamingBlocks.length - 1];
        // 只有 thinking 和 output 类型可以直接追加内容
        if (lastBlock.type === 'thinking' || lastBlock.type === 'output') {
            lastBlock.content += chunk;
        } else {
            // 对于 tools 类型或其他类型，创建新 block
            streamingBlocks.push({ type, content: chunk });
            currentBlockType = type;
        }
    } else {
        // Create new block
        streamingBlocks.push({ type, content: chunk });
        currentBlockType = type;
    }
    updateStreamingBlocks();
}

function handleEvent(event) {
    // 处理 ACP 事件 (tool_call, tool_result)
    if (!event || !event.type) return;
    
    switch (event.type) {
        case 'tool_call':
            if (!event.data) return;
            // 检查是否已存在相同 id 的工具调用
            const existingIndex = toolCalls.findIndex(t => t.id === event.data.id);
            if (existingIndex >= 0) {
                // 已存在，更新参数（如果新参数更长）
                if (event.data.arguments && event.data.arguments.length > (toolCalls[existingIndex].arguments?.length || 0)) {
                    toolCalls[existingIndex].arguments = event.data.arguments;
                }
            } else {
                // 不存在，添加新的
                toolCalls.push({
                    id: event.data.id || 'unknown',
                    name: event.data.name || 'unknown',
                    arguments: event.data.arguments || '{}',
                    status: 'running',
                    result: null
                });
            }
            updateToolsBlock();
            updateInputStatus();
            break;
            
        case 'tool_result':
            if (!event.data || !event.data.id) {
                return;
            }
            const tc = toolCalls.find(t => t.id === event.data.id);
            if (tc) {
                tc.status = event.data.status || 'completed';
                if (event.data.result !== undefined) {
                    tc.result = event.data.result;
                }
                // 更新参数（流式累积）
                if (event.data.arguments) {
                    // 如果新参数更长，说明是累积内容
                    if (!tc.arguments || event.data.arguments.length > tc.arguments.length) {
                        tc.arguments = event.data.arguments;
                    }
                }
                updateToolsBlock();
                updateInputStatus();
            }
            break;
    }
}

function updateToolsBlock() {
    // 更新工具块显示
    if (toolCalls.length === 0) {
        const toolsBlockIndex = streamingBlocks.findIndex(b => b.type === 'tools');
        if (toolsBlockIndex >= 0) {
            streamingBlocks.splice(toolsBlockIndex, 1);
            updateStreamingBlocks();
        }
        return;
    }
    
    const toolCallsCopy = [...toolCalls];
    const toolsBlockIndex = streamingBlocks.findIndex(b => b.type === 'tools');
    
    if (toolsBlockIndex >= 0) {
        streamingBlocks[toolsBlockIndex] = { type: 'tools', content: toolCallsCopy };
    } else {
        const outputIndex = streamingBlocks.findIndex(b => b.type === 'output');
        if (outputIndex >= 0) {
            streamingBlocks.splice(outputIndex, 0, { type: 'tools', content: toolCallsCopy });
        } else {
            streamingBlocks.push({ type: 'tools', content: toolCallsCopy });
        }
    }
    
    updateStreamingBlocks();
}

function renderThinkingBlock(thinking, isStreaming = false) {
    const icon = isStreaming ? '💭' : '✓';
    const label = isStreaming ? 'Thinking' : 'Thought';
    // Thinking 内容始终是纯文本，不使用 markdown 渲染（避免 ** 等被解析）
    const contentHtml = escapeHtml(thinking);
    return `
        <div class="thinking-block ${isStreaming ? '' : 'collapsed'}">
            <div class="thinking-header">
                <span class="icon">${icon}</span>
                <span class="label">${label}</span>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="thinking-content markdown ${isStreaming ? 'streaming' : ''}">${contentHtml}</div>
        </div>
    `;
}

function renderToolsBlock(toolCalls) {
    // 渲染工具调用块 - 简洁风格: ToolName (args) status
    if (hideToolsCalls) {
        return '';
    }
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
        return '';
    }
    
    // 去重：同一个 id 只保留最后一个（最新的状态）
    const uniqueToolCalls = [];
    const seenIds = new Set();
    // 从后往前遍历，这样最新的会覆盖旧的
    for (let i = toolCalls.length - 1; i >= 0; i--) {
        const tc = toolCalls[i];
        if (!seenIds.has(tc.id)) {
            seenIds.add(tc.id);
            uniqueToolCalls.unshift(tc); // 保持原始顺序
        }
    }
    
    const toolCallsHtml = uniqueToolCalls.map(tc => {
        const name = tc.name || 'unknown';
        const status = tc.status || 'unknown';
        const statusIcon = status === 'running' ? '⏳' :
                          status === 'completed' ? '✓' : '✗';
        
        // 提取参数显示
        let argsDisplay = '';
        let fullArgs = ''; // 用于 tooltip
        if (tc.arguments && tc.arguments !== '{}') {
            try {
                // 尝试解析 JSON
                const args = JSON.parse(tc.arguments);
                // 提取常见字段
                const cmd = args.command || args.path || args.file || args.input || 
                           args.url || args.query || Object.values(args)[0];
                if (cmd) {
                    argsDisplay = String(cmd);
                    fullArgs = JSON.stringify(args, null, 2); // 完整的参数用于 tooltip
                }
            } catch {
                // 不是 JSON，直接使用
                argsDisplay = String(tc.arguments);
                fullArgs = argsDisplay;
            }
        }
        
        // 截断显示（但保留完整内容用于 tooltip）
        const displayText = argsDisplay.slice(0, 60);
        const isTruncated = argsDisplay.length > 60;
        
        // 格式: ToolName (args) status
        // 对 tooltip 中的参数进行 HTML 转义（防止引号破坏属性）
        const tooltipArgs = escapeHtml(fullArgs.substring(0, 200));
        return `
            <span class="tool-tag ${status}" title="${name}: ${tooltipArgs} - ${status}">
                <span class="tool-tag-name">${name}</span>
                ${displayText ? `<span class="tool-tag-args">(${escapeHtml(displayText)}${isTruncated ? '...' : ''})</span>` : ''}
                <span class="tool-tag-status">${statusIcon}</span>
            </span>
        `;
    }).join('');
    
    return `<span class="tools-inline">${toolCallsHtml}</span>`;
}

function getToolIcon(toolName) {
    // 根据工具名返回图标// 
    const icons = {
        'shell': '🔲',
        'bash': '🔲',
        'read_file': '📄',
        'read': '📄',
        'write_file': '📝',
        'write': '📝',
        'search': '🔍',
        'grep': '🔎',
        'fetch': '🌐',
        'web_search': '🔎',
        'edit': '✏️',
        'delete': '🗑️',
        'move': '📦',
        'execute': '▶️',
        'think': '💭',
        'switch_mode': '🔄',
        'other': '🔧',
    };
    // 尝试精确匹配
    if (icons[toolName]) return icons[toolName];
    // 尝试部分匹配
    for (const [key, icon] of Object.entries(icons)) {
        if (toolName.toLowerCase().includes(key)) return icon;
    }
    return '🔧';
}

// Render mermaid diagrams in the messages
function renderMermaidDiagrams() {
    // Find all mermaid code blocks that haven't been rendered yet
    document.querySelectorAll('pre code.language-mermaid').forEach((block) => {
        if (block.dataset.rendered === 'true') return;
        
        const pre = block.parentElement;
        const container = document.createElement('div');
        container.className = 'mermaid';
        container.textContent = block.textContent;
        
        // Replace pre with mermaid div
        pre.parentNode.replaceChild(container, pre);
        
        block.dataset.rendered = 'true';
    });
    
    // Run mermaid
    try {
        mermaid.run({
            querySelector: '.mermaid:not([data-processed])'
        });
    } catch (e) {
        console.error('Mermaid render error:', e);
    }
}

function finalizeStreamingMessage() {
    const container = document.querySelector('.message.assistant:last-child .streaming-blocks');
    if (!container) return;
    
    // Replace streaming blocks with final rendered blocks
    const finalHtml = streamingBlocks.map(block => {
        if (block.type === 'thinking') {
            return renderThinkingBlock(block.content, false);
        }
        if (block.type === 'tools') {
            return renderToolsBlock(block.content);
        }
        // Final render with markdown
        return `<div class="message-block markdown">${renderMarkdown(block.content)}</div>`;
    }).join('');
    
    container.innerHTML = finalHtml;
    container.classList.remove('streaming-blocks');
    
    // Re-attach click handlers for thinking blocks
    container.querySelectorAll('.thinking-header').forEach(header => {
        header.addEventListener('click', () => {
            const block = header.closest('.thinking-block');
            block.classList.toggle('collapsed');
        });
    });
    
    // Render mermaid diagrams
    renderMermaidDiagrams();
    
    // Reset tool call state
    toolCalls = [];
    
    // Apply syntax highlighting
    applySyntaxHighlight(container);
    
    // Reset streaming state
    streamingBlocks = [];
    currentBlockType = null;
}

// ============== Chat ==============

async function sendMessage() {
    if (isStreaming) return;
    
    const message = elements.messageInput.value.trim();
    if (!message) return;
    
    if (!currentSession) {
        showToast('Please select or create a session first', 'warning');
        return;
    }
    
    // 如果 session 不是 active，自动激活它
    if (currentSession.status !== 'active') {
        try {
            await apiPost(`/api/sessions/${currentSession.id}/unarchive`);
            currentSession.status = 'active';
            currentSession.last_accessed_at = new Date().toISOString();
            renderSessionList();
        } catch (err) {
            showToast('Failed to activate session');
            return;
        }
    }
    
    // Clear input
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    
    // Add user message
    addMessage('user', message);
    
    // Add placeholder for assistant
    addMessage('assistant', '', true);
    
    isStreaming = true;
    updateSendButton();
    updateInputStatus();
    
    try {
        await streamChat(message);
    } catch (err) {
        appendStreamingChunk(`Error: ${err.message}`, 'output');
        finalizeStreamingMessage();
    } finally {
        isStreaming = false;
        updateSendButton();
        updateInputStatus();
        
        // Update session in list (timestamp changed)
        loadSessions();
    }
}

async function streamChat(message) {
    const sessionId = currentSession.id;
    
    return new Promise((resolve, reject) => {
        // Use fetch with ReadableStream for SSE
        fetch(`${API_BASE}/api/sessions/${sessionId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        }).then(response => {
            if (!response.ok) {
                reject(new Error(`HTTP ${response.status}`));
                return;
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            function read() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        finalizeStreamingMessage();
                        resolve();
                        return;
                    }
                    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                
                                if (data.type === 'chunk') {
                                    appendStreamingChunk(data.content, 'output');
                                } else if (data.type === 'thinking') {
                                    appendStreamingChunk(data.content, 'thinking');
                                } else if (data.type === 'event') {
                                    // 处理 ACP 事件 (tool_call, step_begin, etc.)
                                    handleEvent(data.event);
                                } else if (data.type === 'done') {
                                    finalizeStreamingMessage();
                                    resolve();
                                    return;
                                } else if (data.type === 'error') {
                                    appendStreamingChunk(`Error: ${data.error}`, 'output');
                                    finalizeStreamingMessage();
                                    reject(new Error(data.error));
                                    return;
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        }
                    }
                    
                    read();
                }).catch(err => {
                    reject(err);
                });
            }
            
            read();
        }).catch(reject);
    });
}

async function loadConversation(session) {
    try {
        const data = await apiGet(`/api/sessions/${session.id}/messages`);
        const messages = data.messages || [];
        
        if (messages.length > 0) {
            renderMessages(messages);
        } else {
            renderMessages([]);
        }
    } catch (err) {
        console.error('Failed to load conversation:', err);
        renderMessages([]);
    }
}

// ============== Markdown Rendering ==============

function renderMarkdown(text) {
    if (!text) return '';
    
    // Configure marked options
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        sanitize: false
    });
    
    // Custom renderer to ensure proper code block handling
    const renderer = new marked.Renderer();
    // marked v9.1.6 uses (code, language, escaped) parameters
    renderer.code = function(code, language) {
        const lang = language || '';
        if (lang === 'mermaid') {
            return `<pre><code class="language-mermaid">${escapeHtml(code)}</code></pre>`;
        }
        // Return code block with language class for highlight.js
        return `<pre><code class="language-${lang}">${escapeHtml(code)}</code></pre>`;
    };
    
    return marked.parse(text, { renderer });
}

// Apply syntax highlighting to container
function applySyntaxHighlight(container) {
    if (typeof hljs === 'undefined') return;
    
    container.querySelectorAll('pre code:not(.hljs):not(.language-mermaid)').forEach((block) => {
        const langMatch = block.className.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : null;
        const code = block.textContent;
        
        if (!code.trim()) return;
        
        try {
            let result;
            if (lang && hljs.getLanguage && hljs.getLanguage(lang)) {
                result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
            } else {
                result = hljs.highlightAuto(code);
            }
            block.innerHTML = result.value;
            block.classList.add('hljs');
        } catch (e) {
            console.warn('Highlight failed for', lang, e.message);
        }
    });
}

// ============== UI Helpers ==============

function scrollToBottom() {
    elements.messages.scrollTop = elements.messages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

function updateSendButton() {
    elements.sendBtn.disabled = !elements.messageInput.value.trim() || isStreaming;
}

function updateInputStatus() {
    // 更新输入框下方的状态显示
    if (!isStreaming) {
        elements.inputStatus.innerHTML = '';
        return;
    }
    
    if (toolCalls.length === 0) {
        elements.inputStatus.innerHTML = '<span class="spinner"></span> Thinking...';
        return;
    }
    
    // 显示正在运行的工具调用
    const runningTools = toolCalls.filter(tc => tc.status === 'running');
    if (runningTools.length === 0) {
        elements.inputStatus.innerHTML = '<span class="spinner"></span> Processing...';
        return;
    }
    
    const toolsHtml = runningTools.map(tc => {
        let argsPreview = '';
        if (tc.arguments && tc.arguments !== '{}') {
            try {
                const args = JSON.parse(tc.arguments);
                const cmd = args.command || args.path || Object.values(args)[0];
                if (cmd) argsPreview = String(cmd).slice(0, 30);
            } catch {
                argsPreview = String(tc.arguments).slice(0, 30);
            }
        }
        return `<span class="tool-indicator running"><span class="spinner"></span> ${tc.name}${argsPreview ? ` (${escapeHtml(argsPreview)}...)` : ''}</span>`;
    }).join('');
    
    elements.inputStatus.innerHTML = toolsHtml;
}

function openSidebar() {
    elements.sidebar.classList.add('open');
    elements.sidebarOverlay.classList.add('open');
}

function closeSidebar() {
    elements.sidebar.classList.remove('open');
    elements.sidebarOverlay.classList.remove('open');
}

function autoResizeTextarea() {
    const el = elements.messageInput;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

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
        menuSessionId = null;
        renamingSessionId = null;
        renderSessionList();
    }
});

elements.mobileMenuBtn.addEventListener('click', openSidebar);

elements.sidebarOverlay.addEventListener('click', closeSidebar);

elements.sendBtn.addEventListener('click', sendMessage);

elements.messageInput.addEventListener('input', () => {
    updateSendButton();
    autoResizeTextarea();
});

// Command/Ctrl + Enter 发送，Enter 换行
elements.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        sendMessage();
    }
});

// ============== Tools Toggle Functions ==============

function initToolsToggle() {
    updateToolsToggleButton();
    elements.toggleToolsBtn.addEventListener('click', toggleToolsVisibility);
}

function toggleToolsVisibility() {
    hideToolsCalls = !hideToolsCalls;
    localStorage.setItem('hide-tools-calls', hideToolsCalls);
    updateToolsToggleButton();
    
    // 重新加载当前对话以应用更改
    if (currentSession) {
        loadConversation(currentSession);
    }
    
    showToast(hideToolsCalls ? '工具调用已隐藏' : '工具调用已显示');
}

function updateToolsToggleButton() {
    if (hideToolsCalls) {
        elements.toggleToolsBtn.textContent = '🛠️';
        elements.toggleToolsBtn.classList.add('hidden');
        elements.toggleToolsBtn.title = '显示工具调用';
    } else {
        elements.toggleToolsBtn.textContent = '🛠️';
        elements.toggleToolsBtn.classList.remove('hidden');
        elements.toggleToolsBtn.title = '隐藏工具调用';
    }
}

// ============== Theme Functions ==============

function initTheme() {
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

function applyTheme(themeId) {
    currentTheme = themeId;
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
        link.href = `/static/highlight.${themeId}.min.css`;
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

function renderThemeList() {
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
            showToast(`主题已切换: ${CODE_THEMES.find(t => t.id === themeId).name}`);
        });
    });
}

function showThemeDialog() {
    renderThemeList();
    elements.themeOverlay.classList.add('open');
}

function hideThemeDialog() {
    elements.themeOverlay.classList.remove('open');
}

// ============== Init ==============

async function init() {
    // 确保按钮状态与默认显示一致（显示所有）
    const btn = document.getElementById('toggleArchivedBtn');
    if (btn) {
        btn.dataset.showing = 'true';
        btn.textContent = 'Hide Archived & Closed';
    }
    
    // Initialize theme and tools toggle
    initTheme();
    initToolsToggle();
    
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
