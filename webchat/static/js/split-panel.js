/**
 * Split Panel - Split panel functionality
 */

import { elements } from './app.js';
import { splitMode, panelSizes } from './state.js';
import { setSplitMode, setPanelSizes } from './state.js';
import { showToast } from './utils/helpers.js';

export function initSplitPanel() {
    elements.splitVerticalBtn?.addEventListener('click', () => toggleSplit('vertical'));
    elements.splitHorizontalBtn?.addEventListener('click', () => toggleSplit('horizontal'));
    elements.closeSplitBtn?.addEventListener('click', () => toggleSplit(null));
    elements.renderHtmlBtn?.addEventListener('click', renderHtml);
    elements.clearHtmlBtn?.addEventListener('click', clearHtml);
    elements.refreshHtmlBtn?.addEventListener('click', refreshHtml);
    
    // Setup divider drag
    setupDividerDrag();
}

export function toggleSplit(mode) {
    if (splitMode === mode) {
        // 如果点击的是当前模式，关闭分屏
        mode = null;
    }
    
    setSplitMode(mode);
    
    // 更新按钮状态
    if (elements.splitVerticalBtn) elements.splitVerticalBtn.style.display = mode ? 'none' : 'inline-flex';
    if (elements.splitHorizontalBtn) elements.splitHorizontalBtn.style.display = mode ? 'none' : 'inline-flex';
    if (elements.closeSplitBtn) elements.closeSplitBtn.style.display = mode ? 'inline-flex' : 'none';
    
    // 更新容器样式
    if (elements.mainContainer) elements.mainContainer.className = 'main-container';
    
    if (mode === 'vertical') {
        if (elements.mainContainer) elements.mainContainer.classList.add('split-vertical');
        if (elements.mockcraftPanel) elements.mockcraftPanel.style.display = 'flex';
        if (elements.panelDivider) elements.panelDivider.style.display = 'block';
        
        // 设置默认大小
        if (elements.chatPanel) elements.chatPanel.style.flex = '0 0 ' + panelSizes.panel1 + '%';
        if (elements.mockcraftPanel) elements.mockcraftPanel.style.flex = '0 0 ' + panelSizes.panel2 + '%';
    } else if (mode === 'horizontal') {
        if (elements.mainContainer) elements.mainContainer.classList.add('split-horizontal');
        if (elements.mockcraftPanel) elements.mockcraftPanel.style.display = 'flex';
        if (elements.panelDivider) elements.panelDivider.style.display = 'block';
        
        // 设置默认大小
        if (elements.chatPanel) elements.chatPanel.style.flex = '0 0 ' + panelSizes.panel1 + '%';
        if (elements.mockcraftPanel) elements.mockcraftPanel.style.flex = '0 0 ' + panelSizes.panel2 + '%';
    } else {
        // 关闭分屏
        if (elements.mockcraftPanel) elements.mockcraftPanel.style.display = 'none';
        if (elements.panelDivider) elements.panelDivider.style.display = 'none';
        if (elements.chatPanel) elements.chatPanel.style.flex = '1';
        if (elements.mockcraftPanel) elements.mockcraftPanel.style.flex = '1';
    }
    
    showToast(mode ? ('已' + (mode === 'vertical' ? '垂直' : '水平') + '分屏') : '已关闭分屏');
}

function setupDividerDrag() {
    let isDragging = false;
    let startPos = 0;
    let startSize = 50;
    
    if (!elements.panelDivider) return;
    
    elements.panelDivider.addEventListener('mousedown', (e) => {
        if (!splitMode) return;
        isDragging = true;
        startPos = splitMode === 'vertical' ? e.clientX : e.clientY;
        
        // 计算当前面板大小
        const containerRect = elements.mainContainer.getBoundingClientRect();
        const chatRect = elements.chatPanel.getBoundingClientRect();
        startSize = splitMode === 'vertical' 
            ? (chatRect.width / containerRect.width) * 100
            : (chatRect.height / containerRect.height) * 100;
        
        document.body.style.cursor = splitMode === 'vertical' ? 'col-resize' : 'row-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !splitMode) return;
        
        const containerRect = elements.mainContainer.getBoundingClientRect();
        const currentPos = splitMode === 'vertical' ? e.clientX : e.clientY;
        const delta = currentPos - startPos;
        const deltaPercent = splitMode === 'vertical'
            ? (delta / containerRect.width) * 100
            : (delta / containerRect.height) * 100;
        
        let newSize = Math.max(20, Math.min(80, startSize + deltaPercent));
        setPanelSizes({ panel1: newSize, panel2: 100 - newSize });
        
        elements.chatPanel.style.flex = '0 0 ' + newSize + '%';
        elements.mockcraftPanel.style.flex = '0 0 ' + (100 - newSize) + '%';
    });
    
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
        }
    });
}

export function renderHtml() {
    if (!elements.htmlInput || !elements.htmlPreviewContent) return;
    
    const html = elements.htmlInput.value.trim();
    if (!html) {
        showToast('请输入 HTML 代码');
        return;
    }
    
    // 创建完整的 HTML 文档
    const fullHtml = html.includes('<!DOCTYPE') || html.includes('<html')
        ? html
        : '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;padding:20px;}</style></head><body>' + html + '</body></html>';
    
    // 使用 blob URL 创建 iframe src
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    elements.htmlPreviewContent.innerHTML = '<iframe class="html-preview-frame" src="' + url + '" sandbox="allow-scripts"></iframe>';
    showToast('HTML 已渲染');
}

export function clearHtml() {
    if (!elements.htmlInput || !elements.htmlPreviewContent) return;
    
    elements.htmlInput.value = '';
    elements.htmlPreviewContent.innerHTML = `
        <div class="html-preview-placeholder">
            <div class="icon">🌐</div>
            <h3>HTML Preview</h3>
            <p>在下方输入 HTML 代码或从对话中加载</p>
        </div>
    `;
    showToast('已清空');
}

export function refreshHtml() {
    if (!elements.htmlPreviewContent) return;
    
    const iframe = elements.htmlPreviewContent.querySelector('iframe');
    if (iframe) {
        iframe.src = iframe.src;
        showToast('已刷新');
    } else {
        renderHtml();
    }
}

// 从 AI 消息中提取 HTML 代码并加载到预览面板
export function loadHtmlFromMessage(htmlContent) {
    // 确保分屏是打开的
    if (!splitMode) {
        toggleSplit('vertical');
    }
    
    elements.htmlInput.value = htmlContent;
    renderHtml();
}
