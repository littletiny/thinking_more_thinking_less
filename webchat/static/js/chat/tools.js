/**
 * Tools - Tool call display handling
 */

import { hideToolsCalls, toolCalls, streamingBlocks } from '../state.js';
import { setToolCalls, setHideToolsCalls } from '../state.js';
import { escapeHtml, showToast } from '../utils/helpers.js';
// updateStreamingBlocks is called via event to avoid circular dependency
function notifyStreamingUpdate() {
    // Dispatch custom event to notify streaming module
    window.dispatchEvent(new CustomEvent('tools-updated'));
}
import { elements } from '../app.js';
import { isStreaming } from '../state.js';

export function handleEvent(event) {
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

export function updateToolsBlock() {
    // 更新工具块显示
    if (toolCalls.length === 0) {
        const toolsBlockIndex = streamingBlocks.findIndex(b => b.type === 'tools');
        if (toolsBlockIndex >= 0) {
            streamingBlocks.splice(toolsBlockIndex, 1);
            notifyStreamingUpdate();
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
    
    notifyStreamingUpdate();
}

export function renderThinkingBlock(thinking, isStreaming = false) {
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

export function renderToolsBlock(toolCalls) {
    // 渲染工具调用块 - 简洁风格: ToolName (args) status
    console.log('[renderToolsBlock] Called, hideToolsCalls:', hideToolsCalls, 'toolCalls:', toolCalls?.length);
    if (hideToolsCalls) {
        console.log('[renderToolsBlock] Hidden, returning empty');
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
                ${displayText ? '<span class="tool-tag-args">(' + escapeHtml(displayText) + (isTruncated ? '...' : '') + ')</span>' : ''}
                <span class="tool-tag-status">${statusIcon}</span>
            </span>
        `;
    }).join('');
    
    return '<span class="tools-inline">' + toolCallsHtml + '</span>';
}

export function getToolIcon(toolName) {
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

export function updateInputStatus() {
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
        return '<span class="tool-indicator running"><span class="spinner"></span> ' + tc.name + (argsPreview ? ' (' + escapeHtml(argsPreview) + '...)' : '') + '</span>';
    }).join('');
    
    elements.inputStatus.innerHTML = toolsHtml;
}

// Import needed for toggle functions
import { currentSession } from '../state.js';
import { loadConversation } from './index.js';

export function initToolsToggle() {
    updateToolsToggleButton();
    elements.toggleToolsBtn.addEventListener('click', toggleToolsVisibility);
}

export function toggleToolsVisibility() {
    setHideToolsCalls(!hideToolsCalls);
    localStorage.setItem('hide-tools-calls', hideToolsCalls);
    updateToolsToggleButton();
    
    // 重新加载当前对话以应用更改
    if (currentSession) {
        loadConversation(currentSession);
    }
    
    showToast(hideToolsCalls ? '工具调用已隐藏' : '工具调用已显示');
}

export function updateToolsToggleButton() {
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
