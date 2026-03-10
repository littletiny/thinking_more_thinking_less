/**
 * Blocks - Message block rendering (shared between streaming and tools)
 * Extracted to avoid circular dependencies
 */

import { escapeHtml } from '../utils/helpers.js';
import { hideToolsCalls } from '../state.js';

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
                ${displayText ? `<span class="tool-tag-args">(${escapeHtml(displayText)}${isTruncated ? '...' : ''})</span>` : ''}
                <span class="tool-tag-status">${statusIcon}</span>
            </span>
        `;
    }).join('');
    
    return `<span class="tools-inline">${toolCallsHtml}</span>`;
}
