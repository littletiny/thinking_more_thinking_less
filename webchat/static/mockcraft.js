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
    isLoading: false,
    pages: [],           // 页面列表
    currentPageIndex: 0, // 当前播放页面索引
    isPlaying: false,    // 是否正在播放
    playInterval: null   // 播放定时器
};

let prototypeMenuVisible = false;  // 菜单显示状态
let isCreatingPrototype = false;   // 正在新建原型状态
let renamingPrototypeId = null;    // 正在重命名的原型ID
let draggedPageIndex = null;       // 拖拽中的页面索引

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
    console.log('[loadPrototypes] called, sessionId:', sessionId);
    try {
        const url = sessionId 
            ? `/api/mockcraft/prototypes?session_id=${sessionId}`
            : '/api/mockcraft/prototypes';
        console.log('[loadPrototypes] fetching:', url);
        const data = await mockcraftApiGet(url);
        console.log('[loadPrototypes] got data:', data);
        MockCraftState.prototypes = data.prototypes || [];
        console.log('[loadPrototypes] set prototypes:', MockCraftState.prototypes.length);
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
        
        // iframe加载完成后，如果有页面，自动切换到当前页面
        iframe.onload = () => {
            setTimeout(() => {
                updatePreviewForCurrentPage();
            }, 100);
        };
        
        return data.html;
    } catch (err) {
        showToast(`Failed to render prototype: ${err.message}`);
        throw err;
    }
}

function addPostMessageBridge(html) {
    // 如果HTML没有postMessage监听，添加一个
    const bridgeScript = `
<script>
(function() {
    // 页面状态管理
    window.mockcraftPageState = {
        currentPageId: null,
        currentPageIndex: 0,
        pages: []
    };
    
    // 初始化时解析页面
    function initPages() {
        // 优先检查 data-page 标记的元素
        const pageElements = document.querySelectorAll('[data-page], [id^="page"], section[id]');
        window.mockcraftPageState.pages = Array.from(pageElements).map((el, idx) => ({
            id: el.id || el.dataset.page || 'page_' + idx,
            element: el
        }));
    }
    
    // 显示指定页面
    function showPage(pageIdOrIndex) {
        const pages = window.mockcraftPageState.pages;
        let targetPage = null;
        
        if (typeof pageIdOrIndex === 'number') {
            targetPage = pages[pageIdOrIndex];
        } else {
            targetPage = pages.find(p => p.id === pageIdOrIndex);
        }
        
        if (!targetPage) return;
        
        // 隐藏所有页面
        pages.forEach(p => {
            if (p.element) {
                p.element.style.display = 'none';
            }
        });
        
        // 显示目标页面
        if (targetPage.element) {
            targetPage.element.style.display = 'block';
            window.mockcraftPageState.currentPageId = targetPage.id;
            window.mockcraftPageState.currentPageIndex = pages.indexOf(targetPage);
        }
    }
    
    // 如果没有 data-page 或 id，将整体作为一个页面
    function ensurePageVisibility() {
        const hasPageMarkers = document.querySelector('[data-page], [id^="page"]');
        if (!hasPageMarkers) {
            // 没有页面标记，整体显示
            return;
        }
        
        initPages();
        // 默认显示第一页
        if (window.mockcraftPageState.pages.length > 0) {
            showPage(0);
        }
    }
    
    // 监听来自父窗口的消息
    window.addEventListener('message', function(e) {
        if (e.data?.type === 'mockcraft_goto_page') {
            if (typeof e.data.pageIndex === 'number') {
                showPage(e.data.pageIndex);
            } else if (e.data.pageId) {
                showPage(e.data.pageId);
            }
        }
    });
    
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
    
    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensurePageVisibility);
    } else {
        ensurePageVisibility();
    }
})();
<\/script>`;
    
    // 总是添加桥接脚本
    if (html.includes('</body>')) {
        html = html.replace('</body>', bridgeScript + '</body>');
    } else {
        html += bridgeScript;
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
    
    // 注：重命名功能现在通过页面编排面板的操作按钮处理
    
    console.log('[renderPrototypeList] prototypes count:', MockCraftState.prototypes.length);
    if (MockCraftState.prototypes.length === 0) {
        console.log('[renderPrototypeList] no prototypes');
        listEl.innerHTML = `
            <div class="prototype-placeholder">
                <p>暂无原型</p>
                <p class="hint">在对话中生成原型</p>
            </div>
        `;
        return;
    }
    
    console.log('[renderPrototypeList] rendering', MockCraftState.prototypes.length, 'prototypes');
    listEl.innerHTML = MockCraftState.prototypes.map(proto => `
        <div class="prototype-item ${MockCraftState.currentPrototype?.id === proto.id ? 'active' : ''}" 
             data-id="${proto.id}">
            <span class="name">${escapeHtml(proto.name)}</span>
        </div>
    `).join('');
    console.log('[renderPrototypeList] rendered');
    
    // 添加点击事件 - 选中后自动打开操作面板
    listEl.querySelectorAll('.prototype-item').forEach(item => {
        item.addEventListener('click', () => {
            selectPrototype(item.dataset.id);
        });
    });
}

async function selectPrototype(protoId) {
    console.log('[selectPrototype] Starting for protoId:', protoId);
    try {
        const data = await getPrototype(protoId);
        console.log('[selectPrototype] got data:', data ? 'yes' : 'no', 'prototype:', data?.prototype?.id, 'html_content length:', data?.html_content?.length);
        
        MockCraftState.currentPrototype = data.prototype;
        MockCraftState.currentState = data.prototype.current_state || {};
        
        // 初始化页面编排 - 注意: html_content 在 data 根级别，不在 prototype 里
        initPagesForPrototype({
            ...data.prototype,
            html_content: data.html_content
        });
        
        console.log('[selectPrototype] init done, pages:', MockCraftState.pages.length);
        
        renderPrototypeList();
        
        try {
            await renderPrototypePreview(protoId);
        } catch (previewErr) {
            console.error('[selectPrototype] renderPrototypePreview failed:', previewErr);
        }
        
        // 使用新的页面编排替代交互控制
        renderPageOrchestration();
        
        // 自动打开分屏显示 MockCraft 面板
        console.log('[selectPrototype] calling openMockCraftPanel...');
        openMockCraftPanel();
        
        // 延迟确保渲染
        setTimeout(() => {
            console.log('[selectPrototype] delayed render check');
            // 确保面板显示
            openMockCraftPanel();
            // 确保页面编排渲染
            renderPageOrchestration();
        }, 100);
        
        console.log('[selectPrototype] all done');
        
    } catch (err) {
        console.error('[selectPrototype] Failed:', err);
    }
}

/**
 * 打开 MockCraft 面板
 */
function openMockCraftPanel() {
    console.log('[openMockCraftPanel] Starting...');
    
    const mainContainer = document.getElementById('mainContainer');
    const mockcraftPanel = document.getElementById('mockcraftPanel');
    const panelDivider = document.getElementById('panelDivider');
    const chatPanel = document.getElementById('chatPanel');
    
    console.log('[openMockCraftPanel] Elements:', {
        mainContainer: !!mainContainer,
        mockcraftPanel: !!mockcraftPanel,
        panelDivider: !!panelDivider,
        chatPanel: !!chatPanel
    });
    
    if (!mainContainer || !mockcraftPanel) {
        console.error('[openMockCraftPanel] Missing required elements!');
        return;
    }
    
    // 删除内联的 display: none 样式
    mockcraftPanel.removeAttribute('style');
    
    // 确保主容器是 flex 布局
    mainContainer.style.display = 'flex';
    mainContainer.style.flexDirection = 'row';
    
    // 添加垂直分屏样式
    mainContainer.classList.remove('split-horizontal');
    mainContainer.classList.add('split-vertical');
    console.log('[openMockCraftPanel] Added split-vertical class, mainContainer display:', mainContainer.style.display);
    
    // 显示面板
    mockcraftPanel.style.display = 'flex';
    mockcraftPanel.style.flex = '0 0 50%';
    mockcraftPanel.style.minWidth = '0';
    mockcraftPanel.style.minHeight = '0';
    mockcraftPanel.style.overflow = 'hidden';
    console.log('[openMockCraftPanel] Set mockcraftPanel display to flex, current:', mockcraftPanel.style.display);
    
    if (panelDivider) {
        panelDivider.style.display = 'block';
        panelDivider.style.width = '4px';
        console.log('[openMockCraftPanel] Set panelDivider display to block');
    }
    
    // 设置大小 (50/50)
    if (chatPanel) {
        chatPanel.style.flex = '0 0 50%';
        chatPanel.style.minWidth = '0';
        chatPanel.style.minHeight = '0';
        chatPanel.style.overflow = 'hidden';
        console.log('[openMockCraftPanel] Set chatPanel flex to 50%');
    }
    
    // 更新分屏按钮状态
    const splitVerticalBtn = document.getElementById('splitVerticalBtn');
    const splitHorizontalBtn = document.getElementById('splitHorizontalBtn');
    const closeSplitBtn = document.getElementById('closeSplitBtn');
    
    if (splitVerticalBtn) splitVerticalBtn.style.display = 'none';
    if (splitHorizontalBtn) splitHorizontalBtn.style.display = 'none';
    if (closeSplitBtn) closeSplitBtn.style.display = 'inline-flex';
    
    // 重新加载所有原型
    loadPrototypes();
    
    console.log('[openMockCraftPanel] Done!');
    
    // 诊断：检查元素尺寸
    setTimeout(() => {
        const rect = mockcraftPanel.getBoundingClientRect();
        console.log('[openMockCraftPanel] Panel dimensions:', {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            visible: rect.width > 0 && rect.height > 0
        });
        
        // 检查内部元素
        const placeholder = document.getElementById('mockcraftPlaceholder');
        const iframe = document.getElementById('mockcraftPreviewFrame');
        const previewContainer = document.getElementById('mockcraftPreviewContainer');
        
        if (placeholder) {
            const phRect = placeholder.getBoundingClientRect();
            console.log('[openMockCraftPanel] Placeholder:', {
                width: phRect.width,
                height: phRect.height,
                display: getComputedStyle(placeholder).display,
                visibility: getComputedStyle(placeholder).visibility
            });
        }
        
        if (previewContainer) {
            const pcRect = previewContainer.getBoundingClientRect();
            console.log('[openMockCraftPanel] PreviewContainer:', {
                width: pcRect.width,
                height: pcRect.height
            });
        }
        
        // 确保交互控制区域显示
        const interactionSection = document.getElementById('interactionSection');
        const interactionControls = document.getElementById('interactionControls');
        if (interactionSection) {
            interactionSection.style.display = 'block';
            console.log('[openMockCraftPanel] Set interactionSection display to block');
        }
        if (interactionControls && MockCraftState.pages && MockCraftState.pages.length > 0) {
            // 如果有页面但没有内容，重新渲染
            if (!interactionControls.innerHTML.trim() || interactionControls.innerHTML.includes('没有可编排的页面')) {
                console.log('[openMockCraftPanel] Re-rendering page orchestration');
                renderPageOrchestration();
            }
        }
        
        // 修复预览区域高度 - 不要覆盖 iframe/placeholder 的显示状态，让 renderPrototypePreview 控制
        const previewSection = mockcraftPanel.querySelector('.mockcraft-preview-section');
        if (previewSection) {
            previewSection.style.flex = '1';
            previewSection.style.minHeight = '300px';
            previewSection.style.display = 'flex';
            previewSection.style.flexDirection = 'column';
        }
        
        const previewCont = document.getElementById('mockcraftPreviewContainer');
        if (previewCont) {
            previewCont.style.flex = '1';
            previewCont.style.minHeight = '200px';
        }
        
        // 检查面板的计算样式
        const panelStyle = getComputedStyle(mockcraftPanel);
        console.log('[openMockCraftPanel] Panel computed style:', {
            display: panelStyle.display,
            visibility: panelStyle.visibility,
            opacity: panelStyle.opacity,
            zIndex: panelStyle.zIndex,
            overflow: panelStyle.overflow,
            position: panelStyle.position
        });
    }, 200);
}

function clearPreview() {
    MockCraftState.currentPrototype = null;
    MockCraftState.currentState = {};
    MockCraftState.pages = [];
    MockCraftState.currentPageIndex = 0;
    MockCraftState.isPlaying = false;
    
    // 清除定时器
    if (MockCraftState.playInterval) {
        clearInterval(MockCraftState.playInterval);
        MockCraftState.playInterval = null;
    }
    
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
    console.log('[initMockCraft] starting...');
    // 加载所有原型（不限定 session）
    loadPrototypes();
    console.log('[initMockCraft] finished');
    
    // 刷新按钮
    document.getElementById('refreshMockcraftBtn')?.addEventListener('click', () => {
        loadPrototypes();
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
    const importBtn = document.getElementById('importHtmlBtn');
    console.log('[initMockCraft] importHtmlBtn:', !!importBtn);
    importBtn?.addEventListener('click', () => {
        console.log('[initMockCraft] importHtmlBtn clicked');
        showImportHtmlDialog();
    });
    
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
            showRenamePrototypeForm(protoId);
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

function showRenamePrototypeForm(protoId) {
    renamingPrototypeId = protoId;
    renderPrototypeList();
}

async function confirmRenamePrototype(protoId, newName) {
    newName = newName.trim();
    if (!newName) {
        cancelRenamePrototype();
        return;
    }
    
    const proto = MockCraftState.prototypes.find(p => p.id === protoId);
    if (!proto || newName === proto.name) {
        cancelRenamePrototype();
        return;
    }
    
    renamingPrototypeId = null;
    
    try {
        await updatePrototype(protoId, { name: newName });
        showToast('已重命名');
    } catch (err) {
        showToast(`重命名失败: ${err.message}`);
    }
}

function cancelRenamePrototype() {
    renamingPrototypeId = null;
    renderPrototypeList();
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

// ============== Page Orchestration Functions ==============

/**
 * 从HTML内容中解析页面
 * 支持以下方式定义页面:
 * 1. <!-- page: 页面名称 --> 注释标记
 * 2. <section data-page="页面名称"> 元素标记
 * 3. <div class="page" id="pageX"> 自动检测
 */
function parsePagesFromHtml(html) {
    console.log('[parsePagesFromHtml] html length:', html?.length);
    const pages = [];
    
    // 方法1: 检查 <!-- page: 名称 --> 注释
    const pageCommentRegex = /<!--\s*page:\s*([^>]+)-->/gi;
    let match;
    while ((match = pageCommentRegex.exec(html)) !== null) {
        console.log('[parsePagesFromHtml] found comment page:', match[1].trim());
        pages.push({
            id: `page_${pages.length}`,
            name: match[1].trim(),
            type: 'comment'
        });
    }
    
    // 方法2: 检查 data-page 属性
    if (pages.length === 0) {
        const dataPageRegex = /data-page=["']([^"']+)["']/gi;
        while ((match = dataPageRegex.exec(html)) !== null) {
            console.log('[parsePagesFromHtml] found data-page:', match[1].trim());
            // 去重
            if (!pages.find(p => p.name === match[1].trim())) {
                pages.push({
                    id: `page_${pages.length}`,
                    name: match[1].trim(),
                    type: 'data-page'
                });
            }
        }
    }
    
    // 方法3: 检查 section id 或 class 包含 page
    if (pages.length === 0) {
        const sectionRegex = /<section[^>]*id=["']([^"']*page[^"']*)["'][^>]*>/gi;
        while ((match = sectionRegex.exec(html)) !== null) {
            console.log('[parsePagesFromHtml] found section page:', match[1].trim());
            pages.push({
                id: match[1].trim(),
                name: match[1].trim().replace(/page[_-]?/i, '页面 '),
                type: 'section'
            });
        }
    }
    
    // 方法4: 检查 h1-h6 标题作为页面 - 修复以支持多行
    if (pages.length === 0) {
        // 使用更宽松的匹配来支持多行标题
        const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
        let count = 0;
        while ((match = headingRegex.exec(html)) !== null && count < 10) {
            // 清理标题内容（移除HTML标签）
            const cleanName = match[1].replace(/<[^>]+>/g, '').trim();
            console.log('[parsePagesFromHtml] found heading page:', cleanName);
            if (cleanName) {
                pages.push({
                    id: `page_${count}`,
                    name: cleanName,
                    type: 'heading'
                });
                count++;
            }
        }
    }
    
    // 如果还没有页面，整个HTML作为一个页面
    if (pages.length === 0) {
        pages.push({
            id: 'page_0',
            name: '默认页面',
            type: 'default'
        });
    }
    
    console.log('[parsePagesFromHtml] total pages:', pages.length);
    return pages;
}

/**
 * 渲染页面编排列表
 */
function renderPageOrchestration() {
    const container = document.getElementById('interactionControls');
    const section = document.getElementById('interactionSection');
    
    console.log('[renderPageOrchestration] container:', !!container, 'section:', !!section, 'pages:', MockCraftState.pages?.length);
    
    if (!container || !section) {
        console.error('[renderPageOrchestration] missing elements!', {container: !!container, section: !!section});
        return;
    }
    
    // 保存当前输入值（如果存在）
    const intervalInput = document.getElementById('playIntervalInput');
    const loopCheckbox = document.getElementById('loopPlayback');
    const savedInterval = intervalInput?.value || '2';
    const savedLoop = loopCheckbox?.checked || false;
    
    // 每次都显示区域
    section.style.display = 'block';
    
    const isPlaying = MockCraftState.isPlaying;
    const currentIndex = MockCraftState.currentPageIndex;
    const pages = MockCraftState.pages;
    const currentProto = MockCraftState.currentPrototype;
    
    console.log('[renderPageOrchestration] currentProto:', currentProto?.name);
    
    // 功能按钮（重命名、删除当前原型）
    let actionButtonsHtml = '';
    console.log('[renderPageOrchestration] currentProto for buttons:', currentProto?.id, currentProto?.name);
    if (currentProto) {
        actionButtonsHtml = `
            <div class="proto-actions">
                <button class="proto-action-btn" onclick="MockCraft.showRenameDialog()">✏️ 重命名当前</button>
                <button class="proto-action-btn danger" onclick="MockCraft.showDeleteDialog()">🗑️ 删除当前</button>
            </div>
        `;
        console.log('[renderPageOrchestration] actionButtonsHtml generated');
    } else {
        console.log('[renderPageOrchestration] no currentProto, skipping action buttons');
    }
    
    // 如果没有页面（原型），显示提示
    if (!pages || pages.length === 0) {
        console.log('[renderPageOrchestration] no pages');
        container.innerHTML = `
            <div class="page-orchestration">
                ${actionButtonsHtml}
                <p style="color: var(--text-secondary); font-size: 13px; padding: 12px;">没有可播放的页面（原型）</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="page-orchestration">
            
            <!-- 播放控制栏（合并间隔和循环设置） -->
            <div class="playback-controls">
                <button class="playback-btn ${isPlaying ? 'active' : ''}" id="playPauseBtn" title="${isPlaying ? '暂停' : '播放'}">
                    ${isPlaying ? '⏸️' : '▶️'}
                </button>
                <button class="playback-btn" id="prevPageBtn" title="上一页">⏮️</button>
                <button class="playback-btn" id="nextPageBtn" title="下一页">⏭️</button>
                <span class="page-indicator">${currentIndex + 1} / ${pages.length}</span>
                <div class="playback-options">
                    <label class="playback-option">
                        <input type="number" id="playIntervalInput" min="1" max="60" value="2" title="间隔秒数">
                        <span>s</span>
                    </label>
                    <label class="playback-option checkbox" title="循环播放">
                        <input type="checkbox" id="loopPlayback">
                        <span>循环</span>
                    </label>
                </div>
            </div>
            
            <!-- 页面列表 -->
            <div class="page-list" id="pageList">
    `;
    
    pages.forEach((page, index) => {
        const isActive = index === currentIndex;
        const isPlayingThis = isPlaying && isActive;
        html += `
            <div class="page-item ${isActive ? 'active' : ''} ${isPlayingThis ? 'playing' : ''}" 
                 data-index="${index}" 
                 draggable="true"
                 title="拖拽排序点击切换页面">
                <span class="page-drag-handle">☰</span>
                <span class="page-number">${index + 1}</span>
                <span class="page-name">${escapeHtml(page.name)}</span>
                <span class="page-type">📄</span>
                ${isActive ? '<span class="page-status">●</span>' : ''}
            </div>
        `;
    });
    
    html += `
            </div>
            
            <!-- 功能按钮 -->
            ${actionButtonsHtml}
        </div>
    `;
    
    container.innerHTML = html;
    
    // 恢复保存的值
    const newIntervalInput = document.getElementById('playIntervalInput');
    const newLoopCheckbox = document.getElementById('loopPlayback');
    if (newIntervalInput) newIntervalInput.value = savedInterval;
    if (newLoopCheckbox) newLoopCheckbox.checked = savedLoop;
    
    // 绑定事件
    console.log('[renderPageOrchestration] About to bind events...');
    try {
        bindPageOrchestrationEvents();
        console.log('[renderPageOrchestration] Events bound successfully');
    } catch (err) {
        console.error('[renderPageOrchestration] Error binding events:', err);
    }

/**
 * 获取页面类型图标
 */
function getPageTypeIcon(type) {
    const icons = {
        'comment': '📝',
        'data-page': '📄',
        'section': '📖',
        'heading': '📓',
        'default': '📄'
    };
    return icons[type] || '📄';
}

/**
 * 绑定页面编排事件
 */
function bindPageOrchestrationEvents() {
    console.log('[bindPageOrchestrationEvents] Binding events...');
    
    // 播放/暂停
    const playPauseBtn = document.getElementById('playPauseBtn');
    console.log('[bindPageOrchestrationEvents] playPauseBtn:', !!playPauseBtn);
    playPauseBtn?.addEventListener('click', () => {
        console.log('[bindPageOrchestrationEvents] playPauseBtn clicked');
        togglePlayback();
    });
    
    // 上一页/下一页
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    console.log('[bindPageOrchestrationEvents] prevPageBtn:', !!prevPageBtn, 'nextPageBtn:', !!nextPageBtn);
    
    prevPageBtn?.addEventListener('click', () => {
        console.log('[bindPageOrchestrationEvents] prevPageBtn clicked');
        navigatePage(-1);
    });
    nextPageBtn?.addEventListener('click', () => {
        console.log('[bindPageOrchestrationEvents] nextPageBtn clicked');
        navigatePage(1);
    });
    
    // 注：播放间隔和循环设置在 renderPageOrchestration 中处理，这里不需要重复设置
    
    // 页面列表拖拽
    const pageList = document.getElementById('pageList');
    console.log('[bindPageOrchestrationEvents] pageList:', !!pageList, 'items:', pageList?.querySelectorAll('.page-item').length);
    if (pageList) {
        pageList.querySelectorAll('.page-item').forEach((item, idx) => {
            // 点击切换页面
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.page-drag-handle')) {
                    const index = parseInt(item.dataset.index);
                    goToPage(index);
                }
            });
            
            // 拖拽开始
            item.addEventListener('dragstart', (e) => {
                console.log('[dragstart] item index:', item.dataset.index);
                draggedPageIndex = parseInt(item.dataset.index);
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            // 拖拽结束
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedPageIndex = null;
                // 重新渲染以刷新页面编号
                renderPageOrchestration();
            });
            
            // 拖拽经过
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (draggedPageIndex === null) return;
                
                const targetIndex = parseInt(item.dataset.index);
                if (draggedPageIndex !== targetIndex) {
                    item.classList.add('drag-over');
                }
            });
            
            // 离开拖拽区域
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            // 放置
            item.addEventListener('drop', (e) => {
                console.log('[drop] on item index:', item.dataset.index, 'draggedPageIndex:', draggedPageIndex);
                e.preventDefault();
                item.classList.remove('drag-over');
                
                if (draggedPageIndex === null) {
                    console.log('[drop] draggedPageIndex is null, returning');
                    return;
                }
                
                const targetIndex = parseInt(item.dataset.index);
                if (draggedPageIndex !== targetIndex) {
                    console.log('[drop] reordering from', draggedPageIndex, 'to', targetIndex);
                    reorderPages(draggedPageIndex, targetIndex);
                }
            });
        });
    }
}

/**
 * 重新排序页面（原型）
 */
function reorderPages(fromIndex, toIndex) {
    const prototypes = MockCraftState.prototypes;
    const [movedProto] = prototypes.splice(fromIndex, 1);
    prototypes.splice(toIndex, 0, movedProto);
    
    // 同步更新页面列表
    MockCraftState.pages = prototypes.map((proto, index) => ({
        id: proto.id,
        name: proto.name,
        type: 'prototype',
        protoIndex: index
    }));
    
    // 更新当前页面索引
    if (MockCraftState.currentPageIndex === fromIndex) {
        MockCraftState.currentPageIndex = toIndex;
    } else if (fromIndex < MockCraftState.currentPageIndex && toIndex >= MockCraftState.currentPageIndex) {
        MockCraftState.currentPageIndex--;
    } else if (fromIndex > MockCraftState.currentPageIndex && toIndex <= MockCraftState.currentPageIndex) {
        MockCraftState.currentPageIndex++;
    }
    
    renderPageOrchestration();
    renderPrototypeList(); // 同步更新左侧原型列表
    showToast(`已移动到位置 ${toIndex + 1}`);
}

/**
 * 切换播放/暂停
 */
function togglePlayback() {
    console.log('[togglePlayback] called, current isPlaying:', MockCraftState.isPlaying, 'pages:', MockCraftState.pages.length);
    if (MockCraftState.isPlaying) {
        stopPlayback();
    } else {
        startPlayback();
    }
}

/**
 * 开始播放
 */
function startPlayback() {
    console.log('[startPlayback] called, pages:', MockCraftState.pages.length);
    if (MockCraftState.pages.length === 0) {
        console.log('[startPlayback] no pages, returning');
        return;
    }
    
    MockCraftState.isPlaying = true;
    console.log('[startPlayback] set isPlaying to true, re-rendering');
    renderPageOrchestration();
    
    const interval = parseInt(document.getElementById('playIntervalInput')?.value || '2');
    const loop = document.getElementById('loopPlayback')?.checked ?? false;
    
    // 立即切换到当前页面
    updatePreviewForCurrentPage();
    
    MockCraftState.playInterval = setInterval(() => {
        let nextIndex = MockCraftState.currentPageIndex + 1;
        
        if (nextIndex >= MockCraftState.pages.length) {
            if (loop) {
                nextIndex = 0;
            } else {
                stopPlayback();
                return;
            }
        }
        
        goToPage(nextIndex);
    }, interval * 1000);
    
    showToast('开始播放');
}

/**
 * 停止播放
 */
function stopPlayback() {
    MockCraftState.isPlaying = false;
    if (MockCraftState.playInterval) {
        clearInterval(MockCraftState.playInterval);
        MockCraftState.playInterval = null;
    }
    renderPageOrchestration();
    showToast('已暂停');
}

/**
 * 导航到指定页面（切换原型）
 */
function goToPage(index) {
    if (index < 0 || index >= MockCraftState.pages.length) return;
    
    const page = MockCraftState.pages[index];
    if (!page) return;
    
    console.log('[goToPage] navigating to page:', index, 'proto:', page.name);
    
    MockCraftState.currentPageIndex = index;
    
    // 如果切换到不同的原型，加载该原型
    if (MockCraftState.currentPrototype?.id !== page.id) {
        selectPrototype(page.id);
    } else {
        // 同一个原型，只更新显示
        renderPageOrchestration();
    }
}

/**
 * 相对导航
 */
function navigatePage(delta) {
    const newIndex = MockCraftState.currentPageIndex + delta;
    if (newIndex >= 0 && newIndex < MockCraftState.pages.length) {
        goToPage(newIndex);
    }
}

/**
 * 根据当前页面更新预览
 */
function updatePreviewForCurrentPage() {
    if (!MockCraftState.currentPrototype) return;
    
    const page = MockCraftState.pages[MockCraftState.currentPageIndex];
    if (!page) return;
    
    // 通过 postMessage 通知 iframe 切换页面
    const iframe = document.getElementById('mockcraftPreviewFrame');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'mockcraft_goto_page',
            pageId: page.id,
            pageIndex: MockCraftState.currentPageIndex
        }, '*');
    }
    
    // 同时更新状态
    MockCraftState.currentState = {
        ...MockCraftState.currentState,
        currentPage: page.id,
        currentPageIndex: MockCraftState.currentPageIndex
    };
}

/**
 * 加载原型时初始化页面
 */
/**
 * 初始化页面编排 - 把所有原型作为页面
 */
function initPagesForPrototype(prototype) {
    console.log('[initPagesForPrototype] prototype:', prototype?.name, 'total prototypes:', MockCraftState.prototypes.length);
    
    // 将所有原型转换为页面列表
    const pages = MockCraftState.prototypes.map((proto, index) => ({
        id: proto.id,
        name: proto.name,
        type: 'prototype',
        protoIndex: index
    }));
    
    console.log('[initPagesForPrototype] created pages from prototypes:', pages.length);
    
    MockCraftState.pages = pages;
    MockCraftState.currentPageIndex = pages.findIndex(p => p.id === prototype?.id) || 0;
    MockCraftState.isPlaying = false;
    if (MockCraftState.playInterval) {
        clearInterval(MockCraftState.playInterval);
        MockCraftState.playInterval = null;
    }
}

// ============== Export for Global Access ==============

// 显示重命名对话框
function showRenameDialog() {
    const proto = MockCraftState.currentPrototype;
    if (!proto) return;
    
    const newName = prompt('重命名原型:', proto.name);
    if (newName && newName.trim() && newName.trim() !== proto.name) {
        renamePrototype(proto.id, newName.trim());
    }
}

// 显示删除对话框
function showDeleteDialog() {
    const proto = MockCraftState.currentPrototype;
    if (!proto) return;
    
    if (confirm(`确定要删除原型 "${proto.name}" 吗？`)) {
        deletePrototype(proto.id);
    }
}

window.MockCraft = {
    state: MockCraftState,
    init: initMockCraft,
    loadPrototypes,
    createPrototype,
    updatePrototype,
    deletePrototype,
    selectPrototype,
    createPrototypeFromChat,
    checkForPrototypeCommand,
    // 页面编排API
    parsePagesFromHtml,
    renderPageOrchestration,
    goToPage,
    togglePlayback,
    stopPlayback,
    openMockCraftPanel,
    showRenameDialog,
    showDeleteDialog
};
}
