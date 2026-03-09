/**
 * MockCraft Module - 自然语言驱动的原型生成系统
 * 
 * 功能:
 * - 原型列表管理
 * - HTML预览渲染
 * - 交互状态模拟
 * - 与Chat集成
 */

// ============== MockCraft State ==============

const MockCraftState = {
    prototypes: [],
    currentPrototype: null,
    currentState: {},
    isLoading: false
};

let prototypeMenuVisible = false;  // 菜单显示状态
let isCreatingPrototype = false;   // 正在新建原型状态

// ============== Utils ==============

function escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============== API Functions ==============

async function mockcraftApiGet(url) {
    const res = await fetch(`${API_BASE}${url}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function mockcraftApiPost(url, data = {}) {
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

async function mockcraftApiPut(url, data = {}) {
    const res = await fetch(`${API_BASE}${url}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function mockcraftApiDelete(url) {
    const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ============== Prototype Management ==============

async function loadPrototypes(sessionId = null) {
    try {
        const url = sessionId 
            ? `/api/mockcraft/prototypes?session_id=${sessionId}`
            : '/api/mockcraft/prototypes';
        const data = await mockcraftApiGet(url);
        MockCraftState.prototypes = data.prototypes || [];
        renderPrototypeList();
    } catch (err) {
        console.error('Failed to load prototypes:', err);
        showToast(`Failed to load prototypes: ${err.message}`);
    }
}

async function createPrototype(name, htmlContent, interactions = [], stateSchema = {}) {
    try {
        const data = await mockcraftApiPost('/api/mockcraft/prototypes', {
            name,
            html_content: htmlContent,
            session_id: currentSession?.id || '',
            interactions,
            state_schema: stateSchema
        });
        await loadPrototypes(currentSession?.id);
        selectPrototype(data.prototype.id);
        showToast('Prototype created');
        return data.prototype;
    } catch (err) {
        showToast(`Failed to create prototype: ${err.message}`);
        throw err;
    }
}

async function updatePrototype(protoId, updates) {
    try {
        const data = await mockcraftApiPut(`/api/mockcraft/prototypes/${protoId}`, updates);
        await loadPrototypes(currentSession?.id);
        selectPrototype(data.prototype.id);
        showToast('Prototype updated');
        return data.prototype;
    } catch (err) {
        showToast(`Failed to update prototype: ${err.message}`);
        throw err;
    }
}

async function deletePrototype(protoId) {
    try {
        await mockcraftApiDelete(`/api/mockcraft/prototypes/${protoId}`);
        if (MockCraftState.currentPrototype?.id === protoId) {
            clearPreview();
        }
        await loadPrototypes(currentSession?.id);
        showToast('Prototype deleted');
    } catch (err) {
        showToast(`Failed to delete prototype: ${err.message}`);
        throw err;
    }
}

async function getPrototype(protoId) {
    try {
        const data = await mockcraftApiGet(`/api/mockcraft/prototypes/${protoId}`);
        return data;
    } catch (err) {
        showToast(`Failed to get prototype: ${err.message}`);
        throw err;
    }
}

// ============== Rendering ==============

async function renderPrototypePreview(protoId, state = null) {
    try {
        const data = await mockcraftApiPost(`/api/mockcraft/prototypes/${protoId}/render`, {
            state
        });
        
        const iframe = document.getElementById('mockcraftPreviewFrame');
        const placeholder = document.getElementById('mockcraftPlaceholder');
        
        // 添加postMessage监听脚本
        const enhancedHtml = addPostMessageBridge(data.html);
        
        iframe.srcdoc = enhancedHtml;
        iframe.style.display = 'block';
        placeholder.style.display = 'none';
        
        return data.html;
    } catch (err) {
        showToast(`Failed to render prototype: ${err.message}`);
        throw err;
    }
}

function addPostMessageBridge(html) {
    // 如果HTML没有postMessage监听，添加一个
    if (!html.includes('mockcraft_state_change')) {
        const bridgeScript = `
<script>
(function() {
    // 监听所有交互元素的变化
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-interaction]')) {
            const interaction = e.target.dataset.interaction;
            const value = e.target.dataset.value || e.target.value || e.target.textContent;
            parent.postMessage({
                type: 'mockcraft_state_change',
                interaction: interaction,
                value: value
            }, '*');
        }
    });
    
    document.addEventListener('change', function(e) {
        if (e.target.matches('[data-state]')) {
            const stateKey = e.target.dataset.state;
            const value = e.target.value;
            parent.postMessage({
                type: 'mockcraft_state_change',
                stateKey: stateKey,
                value: value
            }, '*');
        }
    });
})();
<\/script>`;
        
        if (html.includes('</body>')) {
            html = html.replace('</body>', bridgeScript + '</body>');
        } else {
            html += bridgeScript;
        }
    }
    return html;
}

async function updatePrototypeState(protoId, stateUpdate) {
    try {
        const data = await mockcraftApiPost(`/api/mockcraft/prototypes/${protoId}/state`, {
            state: stateUpdate
        });
        MockCraftState.currentState = data.state;
        updateInteractionControls();
        return data.state;
    } catch (err) {
        console.error('Failed to update state:', err);
    }
}

// ============== UI Rendering ==============

function renderPrototypeList() {
    const listEl = document.getElementById('prototypeList');
    
    // 如果正在新建原型，显示内联表单
    if (isCreatingPrototype) {
        listEl.innerHTML = `
            <div class="prototype-item-wrapper">
                <div class="prototype-item editing">
                    <input type="text" id="newPrototypeNameInput" placeholder="输入原型名称" maxlength="50" autofocus>
                </div>
                <div class="prototype-edit-btns">
                    <button class="prototype-edit-btn save" id="saveNewPrototypeBtn">保存</button>
                    <button class="prototype-edit-btn cancel" id="cancelNewPrototypeBtn">取消</button>
                </div>
            </div>
        `;
        
        // 绑定事件
        const input = document.getElementById('newPrototypeNameInput');
        const saveBtn = document.getElementById('saveNewPrototypeBtn');
        const cancelBtn = document.getElementById('cancelNewPrototypeBtn');
        
        if (input) {
            input.focus();
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') confirmCreatePrototype(input.value);
                if (e.key === 'Escape') cancelCreatePrototype();
            });
        }
        
        saveBtn?.addEventListener('click', () => confirmCreatePrototype(input?.value || ''));
        cancelBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            cancelCreatePrototype();
        });
        
        return;
    }
    
    if (MockCraftState.prototypes.length === 0) {
        listEl.innerHTML = `
            <div class="prototype-placeholder">
                <p>暂无原型</p>
                <p class="hint">在对话中生成原型</p>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = MockCraftState.prototypes.map(proto => `
        <div class="prototype-item-wrapper" style="position: relative;">
            <div class="prototype-item ${MockCraftState.currentPrototype?.id === proto.id ? 'active' : ''}" 
                 data-id="${proto.id}">
                <span class="name">${escapeHtml(proto.name)}</span>
            </div>
            <button class="prototype-menu-trigger" data-proto-id="${proto.id}" onclick="event.stopPropagation()">⋮</button>
        </div>
    `).join('');
    
    // 添加点击事件
    listEl.querySelectorAll('.prototype-item').forEach(item => {
        item.addEventListener('click', () => {
            selectPrototype(item.dataset.id);
        });
    });
    
    // 添加菜单按钮事件
    listEl.querySelectorAll('.prototype-menu-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const protoId = btn.dataset.protoId;
            togglePrototypeMenuForItem(protoId, btn);
        });
    });
}

async function selectPrototype(protoId) {
    try {
        const data = await getPrototype(protoId);
        MockCraftState.currentPrototype = data.prototype;
        MockCraftState.currentState = data.prototype.current_state || {};
        
        renderPrototypeList();
        renderPrototypePreview(protoId);
        renderInteractionControls(data.prototype);
        
        document.getElementById('interactionSection').style.display = 'block';
        
    } catch (err) {
        console.error('Failed to select prototype:', err);
    }
}

function clearPreview() {
    MockCraftState.currentPrototype = null;
    MockCraftState.currentState = {};
    
    const iframe = document.getElementById('mockcraftPreviewFrame');
    const placeholder = document.getElementById('mockcraftPlaceholder');
    
    iframe.style.display = 'none';
    iframe.srcdoc = '';
    placeholder.style.display = 'flex';
    
    document.getElementById('interactionSection').style.display = 'none';
    document.getElementById('interactionControls').innerHTML = '';
    
    renderPrototypeList();
}

function renderInteractionControls(prototype) {
    const container = document.getElementById('interactionControls');
    const schema = prototype.state_schema || {};
    const currentState = MockCraftState.currentState || {};
    
    if (Object.keys(schema).length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">此原型没有可控制的交互状态</p>';
        return;
    }
    
    container.innerHTML = Object.entries(schema).map(([key, config]) => {
        const value = currentState[key] ?? (config?.default ?? '');
        const label = config?.label || key;
        const type = config?.type || 'string';
        const options = config?.options || [];
        
        if (type === 'select' || options.length > 0) {
            return `
                <div class="interaction-control">
                    <label>${escapeHtml(label)}</label>
                    <select data-state-key="${key}">
                        ${options.map(opt => `
                            <option value="${escapeHtml(opt)}" ${opt === value ? 'selected' : ''}>
                                ${escapeHtml(opt)}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }
        
        return `
            <div class="interaction-control">
                <label>${escapeHtml(label)}</label>
                <input type="text" 
                       data-state-key="${key}" 
                       value="${escapeHtml(String(value))}"
                       placeholder="${escapeHtml(config?.placeholder || '')}">
            </div>
        `;
    }).join('');
    
    // 添加事件监听
    container.querySelectorAll('[data-state-key]').forEach(el => {
        el.addEventListener('change', (e) => {
            const key = e.target.dataset.stateKey;
            const value = e.target.value;
            
            if (MockCraftState.currentPrototype) {
                updatePrototypeState(MockCraftState.currentPrototype.id, { [key]: value });
                // 重新渲染预览
                setTimeout(() => {
                    renderPrototypePreview(MockCraftState.currentPrototype.id, MockCraftState.currentState);
                }, 100);
            }
        });
    });
}

function updateInteractionControls() {
    if (MockCraftState.currentPrototype) {
        renderInteractionControls(MockCraftState.currentPrototype);
    }
}

// ============== Event Handlers ==============

function initMockCraft() {
    // 加载原型列表
    loadPrototypes(currentSession?.id);
    
    // 刷新按钮
    document.getElementById('refreshMockcraftBtn')?.addEventListener('click', () => {
        loadPrototypes(currentSession?.id);
    });
    
    // 新建原型按钮
    document.getElementById('newPrototypeBtn')?.addEventListener('click', () => {
        isCreatingPrototype = true;
        renderPrototypeList();
    });
    
    // 生成原型按钮
    document.getElementById('generatePrototypeBtn')?.addEventListener('click', () => {
        if (!currentSession) {
            showToast('请先选择一个会话');
            return;
        }
        // 聚焦到输入框，提示用户输入
        elements.messageInput.focus();
        elements.messageInput.value = '帮我生成一个原型：';
        elements.messageInput.setSelectionRange(elements.messageInput.value.length, elements.messageInput.value.length);
        showToast('请输入你想生成的原型描述');
    });
    
    // 导入HTML按钮
    document.getElementById('importHtmlBtn')?.addEventListener('click', showImportHtmlDialog);
    
    // 点击外部关闭菜单
    document.addEventListener('click', () => {
        if (prototypeMenuVisible) {
            closePrototypeMenu();
        }
    });
    
    // 监听来自iframe的消息
    window.addEventListener('message', handleIframeMessage);
}

function handleIframeMessage(event) {
    if (event.data?.type === 'mockcraft_state_change') {
        const { stateKey, value, interaction } = event.data;
        
        if (stateKey && MockCraftState.currentPrototype) {
            updatePrototypeState(MockCraftState.currentPrototype.id, { [stateKey]: value });
            // 重新渲染预览
            setTimeout(() => {
                renderPrototypePreview(MockCraftState.currentPrototype.id, MockCraftState.currentState);
            }, 100);
        }
    }
}

// ============== Prototype Menu Functions ==============

let currentPrototypeMenu = null;
let currentMenuProtoId = null;

function togglePrototypeMenuForItem(protoId, btnElement) {
    if (prototypeMenuVisible && currentMenuProtoId === protoId) {
        closePrototypeMenu();
        return;
    }
    
    closePrototypeMenu(); // 先关闭已有的
    
    const rect = btnElement.getBoundingClientRect();
    
    const menu = document.createElement('div');
    menu.className = 'prototype-menu';
    menu.id = 'prototypeMenu';
    
    // 菜单：重命名和删除
    menu.innerHTML = `
        <button class="prototype-menu-item" data-action="rename">重命名</button>
        <div class="prototype-menu-separator"></div>
        <button class="prototype-menu-item danger" data-action="delete">删除</button>
    `;
    
    document.body.appendChild(menu);
    
    // 计算菜单位置，确保不超出屏幕
    const menuWidth = 120; // 菜单最小宽度
    const menuHeight = 100; // 估计菜单高度（两个选项+分隔线）
    
    let left = rect.right - menuWidth;
    let top = rect.bottom + 4;
    
    // 确保不超出右边界
    if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10;
    }
    // 确保不超出左边界
    if (left < 10) {
        left = 10;
    }
    // 确保不超出底部边界
    if (top + menuHeight > window.innerHeight) {
        top = rect.top - menuHeight - 4;
    }
    
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    currentPrototypeMenu = menu;
    currentMenuProtoId = protoId;
    prototypeMenuVisible = true;
    
    // 添加事件监听
    menu.querySelectorAll('.prototype-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            handlePrototypeMenuAction(item.dataset.action, protoId);
        });
    });
}

function closePrototypeMenu() {
    if (currentPrototypeMenu) {
        currentPrototypeMenu.remove();
        currentPrototypeMenu = null;
    }
    currentMenuProtoId = null;
    prototypeMenuVisible = false;
}

function handlePrototypeMenuAction(action, protoId) {
    const proto = MockCraftState.prototypes.find(p => p.id === protoId);
    if (!proto) return;
    
    switch (action) {
        case 'rename':
            closePrototypeMenu();
            showRenamePrototypeDialog(proto);
            break;
        case 'delete':
            closePrototypeMenu();
            showDeletePrototypeConfirmForProto(proto);
            break;
    }
}

async function confirmCreatePrototype(name) {
    name = name.trim();
    if (!name) {
        cancelCreatePrototype();
        return;
    }
    
    isCreatingPrototype = false;
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: system-ui; padding: 20px; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>${escapeHtml(name)}</h1>
    <p>开始编辑你的原型...</p>
</body>
</html>`;
    
    try {
        await createPrototype(name, html);
    } catch (err) {
        showToast(`创建失败: ${err.message}`);
    }
}

function cancelCreatePrototype() {
    isCreatingPrototype = false;
    renderPrototypeList();
}

function showRenamePrototypeDialog(proto) {
    if (!proto) return;
    
    const newName = prompt('重命名原型:', proto.name);
    if (!newName || newName === proto.name) return;
    
    updatePrototype(proto.id, { name: newName.trim() })
        .then(() => showToast('已重命名'))
        .catch(err => showToast(`重命名失败: ${err.message}`));
}

function showDeletePrototypeConfirmForProto(proto) {
    if (!proto) return;
    
    // 去掉 http:// 或 https:// 前缀用于显示
    const displayName = stripUrlPrefix(proto.name);
    
    showConfirm({
        title: '删除原型',
        message: `确定要删除 "${escapeHtml(displayName)}" 吗？`,
        okText: '删除',
        okClass: 'danger',
        onOk: () => deletePrototype(proto.id)
    });
}

// 保留以下函数以兼容以前的代码（如果有）
function showDeletePrototypeConfirm() {
    const proto = MockCraftState.currentPrototype;
    if (!proto) return;
    showDeletePrototypeConfirmForProto(proto);
}

// 去掉 URL 前缀的辅助函数
function stripUrlPrefix(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/^https?:\/\//i, '');
}

// ============== Integration with Chat ==============

/**
 * 从Chat消息创建原型
 * 由AI调用，当生成HTML原型时使用
 */
async function createPrototypeFromChat(name, htmlContent, interactions = [], stateSchema = {}) {
    return createPrototype(name, htmlContent, interactions, stateSchema);
}

/**
 * 检查消息中是否包含原型生成指令
 */
function checkForPrototypeCommand(message) {
    // 检查是否是生成原型的请求
    const patterns = [
        /生成.*原型/i,
        /创建.*原型/i,
        /mockcraft/i,
        /原型.*设计/i,
    ];
    
    return patterns.some(p => p.test(message));
}

// ============== Import HTML Dialog ==============

function showImportHtmlDialog() {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.className = 'mockcraft-import-dialog';
    dialog.innerHTML = `
        <div class="mockcraft-import-overlay">
            <div class="mockcraft-import-content">
                <div class="mockcraft-import-header">
                    <h3>📥 导入 HTML</h3>
                    <button class="mockcraft-import-close">&times;</button>
                </div>
                <div class="mockcraft-import-body">
                    <div class="mockcraft-import-tabs">
                        <button class="mockcraft-import-tab active" data-tab="file">从文件加载</button>
                        <button class="mockcraft-import-tab" data-tab="paste">粘贴代码</button>
                    </div>
                    <div class="mockcraft-import-panel active" data-panel="file">
                        <div class="mockcraft-file-dropzone" id="fileDropzone">
                            <p>点击选择或拖拽 HTML 文件到此处</p>
                            <input type="file" id="htmlFileInput" accept=".html,.htm,.txt" hidden>
                        </div>
                        <div class="mockcraft-file-info" id="fileInfo" style="display: none;">
                            <span class="mockcraft-file-name"></span>
                            <button class="mockcraft-file-clear">&times;</button>
                        </div>
                    </div>
                    <div class="mockcraft-import-panel" data-panel="paste">
                        <textarea id="pasteHtmlInput" placeholder="在此粘贴 HTML 代码..." rows="10"></textarea>
                    </div>
                    <div class="mockcraft-import-name">
                        <label>原型名称:</label>
                        <input type="text" id="prototypeNameInput" placeholder="输入原型名称">
                    </div>
                </div>
                <div class="mockcraft-import-footer">
                    <button class="mockcraft-import-btn secondary" id="cancelImportBtn">取消</button>
                    <button class="mockcraft-import-btn primary" id="confirmImportBtn" disabled>导入</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // 样式
    const style = document.createElement('style');
    style.textContent = `
        .mockcraft-import-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .mockcraft-import-content {
            background: var(--bg-primary, #fff);
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .mockcraft-import-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border, #e5e5e5);
        }
        .mockcraft-import-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .mockcraft-import-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary, #6b6c7a);
        }
        .mockcraft-import-close:hover {
            color: var(--text-primary, #343541);
        }
        .mockcraft-import-body {
            padding: 20px;
            overflow-y: auto;
        }
        .mockcraft-import-tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
        }
        .mockcraft-import-tab {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--border, #e5e5e5);
            background: var(--bg-secondary, #f7f7f8);
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .mockcraft-import-tab.active {
            background: var(--primary, #10a37f);
            color: white;
            border-color: var(--primary, #10a37f);
        }
        .mockcraft-import-panel {
            display: none;
        }
        .mockcraft-import-panel.active {
            display: block;
        }
        .mockcraft-file-dropzone {
            border: 2px dashed var(--border, #e5e5e5);
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .mockcraft-file-dropzone:hover, .mockcraft-file-dropzone.dragover {
            border-color: var(--primary, #10a37f);
            background: rgba(16, 163, 127, 0.05);
        }
        .mockcraft-file-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }
        .mockcraft-file-dropzone p {
            color: var(--text-secondary, #6b6c7a);
            margin: 0;
        }
        .mockcraft-file-info {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px;
            background: var(--bg-secondary, #f7f7f8);
            border-radius: 8px;
            margin-top: 12px;
        }
        .mockcraft-file-name {
            font-weight: 500;
            color: var(--text-primary, #343541);
        }
        .mockcraft-file-clear {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: var(--text-secondary, #6b6c7a);
        }
        .mockcraft-file-clear:hover {
            color: var(--danger, #ef4444);
        }
        #pasteHtmlInput {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--border, #e5e5e5);
            border-radius: 8px;
            font-family: monospace;
            font-size: 13px;
            resize: vertical;
            min-height: 200px;
        }
        .mockcraft-import-name {
            margin-top: 16px;
        }
        .mockcraft-import-name label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            font-size: 14px;
        }
        .mockcraft-import-name input {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid var(--border, #e5e5e5);
            border-radius: 8px;
            font-size: 14px;
        }
        .mockcraft-import-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 20px;
            border-top: 1px solid var(--border, #e5e5e5);
        }
        .mockcraft-import-btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .mockcraft-import-btn.secondary {
            background: var(--bg-secondary, #f7f7f8);
            border: 1px solid var(--border, #e5e5e5);
            color: var(--text-primary, #343541);
        }
        .mockcraft-import-btn.secondary:hover {
            background: var(--border, #e5e5e5);
        }
        .mockcraft-import-btn.primary {
            background: var(--primary, #10a37f);
            border: 1px solid var(--primary, #10a37f);
            color: white;
        }
        .mockcraft-import-btn.primary:hover:not(:disabled) {
            background: var(--primary-hover, #0d8c6d);
        }
        .mockcraft-import-btn.primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
    
    // 状态
    let selectedFile = null;
    let fileContent = null;
    
    // 关闭对话框
    function closeDialog() {
        dialog.remove();
        style.remove();
    }
    
    // 更新导入按钮状态
    function updateImportButton() {
        const name = document.getElementById('prototypeNameInput').value.trim();
        const hasContent = selectedFile || document.getElementById('pasteHtmlInput').value.trim();
        document.getElementById('confirmImportBtn').disabled = !(name && hasContent);
    }
    
    // 标签切换
    dialog.querySelectorAll('.mockcraft-import-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            dialog.querySelectorAll('.mockcraft-import-tab').forEach(t => t.classList.remove('active'));
            dialog.querySelectorAll('.mockcraft-import-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            dialog.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
            updateImportButton();
        });
    });
    
    // 文件选择
    const fileInput = document.getElementById('htmlFileInput');
    const fileDropzone = document.getElementById('fileDropzone');
    const fileInfo = document.getElementById('fileInfo');
    
    fileDropzone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
    
    // 拖拽上传
    fileDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropzone.classList.add('dragover');
    });
    
    fileDropzone.addEventListener('dragleave', () => {
        fileDropzone.classList.remove('dragover');
    });
    
    fileDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // 处理文件
    function handleFile(file) {
        if (!file.name.match(/\.(html|htm|txt)$/i)) {
            showToast('请选择 .html, .htm 或 .txt 文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;
            selectedFile = file;
            fileDropzone.style.display = 'none';
            fileInfo.style.display = 'flex';
            fileInfo.querySelector('.mockcraft-file-name').textContent = `${file.name} (${formatFileSize(file.size)})`;
            updateImportButton();
        };
        reader.onerror = () => {
            showToast('文件读取失败');
        };
        reader.readAsText(file);
    }
    
    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // 清除文件
    fileInfo.querySelector('.mockcraft-file-clear').addEventListener('click', () => {
        selectedFile = null;
        fileContent = null;
        fileInput.value = '';
        fileDropzone.style.display = 'block';
        fileInfo.style.display = 'none';
        updateImportButton();
    });
    
    // 粘贴输入
    document.getElementById('pasteHtmlInput').addEventListener('input', updateImportButton);
    
    // 名称输入
    document.getElementById('prototypeNameInput').addEventListener('input', updateImportButton);
    
    // 取消按钮
    document.getElementById('cancelImportBtn').addEventListener('click', closeDialog);
    document.querySelector('.mockcraft-import-close').addEventListener('click', closeDialog);
    dialog.querySelector('.mockcraft-import-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeDialog();
    });
    
    // 导入按钮
    document.getElementById('confirmImportBtn').addEventListener('click', async () => {
        const name = document.getElementById('prototypeNameInput').value.trim();
        let html = '';
        
        // 获取当前激活的标签
        const activeTab = dialog.querySelector('.mockcraft-import-tab.active').dataset.tab;
        
        if (activeTab === 'file' && fileContent) {
            html = fileContent;
        } else if (activeTab === 'paste') {
            html = document.getElementById('pasteHtmlInput').value.trim();
        }
        
        if (!html) {
            showToast('没有可导入的内容');
            return;
        }
        
        closeDialog();
        
        try {
            await createPrototype(name, html);
            showToast('原型导入成功');
        } catch (err) {
            showToast(`导入失败: ${err.message}`);
        }
    });
    
    // 初始检查
    updateImportButton();
}

// ============== Export for Global Access ==============

window.MockCraft = {
    state: MockCraftState,
    init: initMockCraft,
    loadPrototypes,
    createPrototype,
    updatePrototype,
    deletePrototype,
    selectPrototype,
    createPrototypeFromChat,
    checkForPrototypeCommand
};
