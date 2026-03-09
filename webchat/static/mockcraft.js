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
        <div class="prototype-item ${MockCraftState.currentPrototype?.id === proto.id ? 'active' : ''}" 
             data-id="${proto.id}">
            <span class="name">${escapeHtml(proto.name)}</span>
            <span class="version">v${proto.version}</span>
        </div>
    `).join('');
    
    // 添加点击事件
    listEl.querySelectorAll('.prototype-item').forEach(item => {
        item.addEventListener('click', () => {
            selectPrototype(item.dataset.id);
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
        
        // 更新版本显示
        const versionEl = document.getElementById('previewVersion');
        if (versionEl) {
            versionEl.textContent = `v${data.prototype.version}`;
        }
        
        // 显示操作按钮
        document.getElementById('forkPrototypeBtn').style.display = 'inline-block';
        document.getElementById('deletePrototypeBtn').style.display = 'inline-block';
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
    
    document.getElementById('previewVersion').textContent = '';
    document.getElementById('forkPrototypeBtn').style.display = 'none';
    document.getElementById('deletePrototypeBtn').style.display = 'none';
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
        const name = prompt('原型名称:');
        if (!name) return;
        
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
        
        createPrototype(name, html);
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
    document.getElementById('importHtmlBtn')?.addEventListener('click', () => {
        const html = prompt('粘贴HTML代码:');
        if (!html) return;
        
        const name = prompt('原型名称:', '导入的原型');
        if (!name) return;
        
        createPrototype(name, html);
    });
    
    // Fork按钮
    document.getElementById('forkPrototypeBtn')?.addEventListener('click', async () => {
        if (!MockCraftState.currentPrototype) return;
        
        const proto = MockCraftState.currentPrototype;
        const newName = prompt('新版本名称:', `${proto.name} (新版本)`);
        if (!newName) return;
        
        try {
            await updatePrototype(proto.id, { name: newName });
        } catch (err) {
            console.error('Failed to fork prototype:', err);
        }
    });
    
    // 删除按钮
    document.getElementById('deletePrototypeBtn')?.addEventListener('click', async () => {
        if (!MockCraftState.currentPrototype) return;
        
        if (confirm(`确定要删除 "${MockCraftState.currentPrototype.name}" 吗?`)) {
            await deletePrototype(MockCraftState.currentPrototype.id);
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
