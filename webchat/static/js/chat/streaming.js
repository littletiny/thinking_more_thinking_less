/**
 * Streaming - Streaming message handling
 */

import { elements } from '../app.js';
import { streamingBlocks, currentBlockType } from '../state.js';
import { setStreamingBlocks, setCurrentBlockType, setToolCalls } from '../state.js';
import { escapeHtml, scrollToBottom } from '../utils/helpers.js';
import { renderMarkdown, applySyntaxHighlight, renderMermaidDiagrams } from '../utils/markdown.js';
import { renderThinkingBlock, renderToolsBlock } from './blocks.js';

export function updateStreamingBlocks() {
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
            return '<div class="message-block markdown">' + renderMarkdown(block.content) + '</div>';
        }
        return '<div class="message-block streaming-output">' + escapeHtml(block.content) + '</div>';
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

export function appendStreamingChunk(chunk, type = 'output') {
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
            setCurrentBlockType(type);
        }
    } else {
        // Create new block
        streamingBlocks.push({ type, content: chunk });
        setCurrentBlockType(type);
    }
    updateStreamingBlocks();
}

export function parseContentToBlocks(content) {
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
    
    const result = blocks.length > 0 ? blocks : [{ type: 'output', content: content }];
    console.log('[parseContentToBlocks] Input length:', content?.length, 'Output blocks:', result.length);
    return result;
}

export function finalizeStreamingMessage() {
    const container = document.querySelector('.message.assistant:last-child .streaming-blocks');
    if (!container) return;
    
    // Build the full content for copy functionality
    let fullContent = '';
    streamingBlocks.forEach(block => {
        if (block.type === 'thinking') {
            fullContent += '<think>\n' + block.content + '\n</think>\n\n';
        } else if (block.type === 'output') {
            fullContent += block.content;
        }
    });
    
    // Replace streaming blocks with final rendered blocks
    const finalHtml = streamingBlocks.map(block => {
        if (block.type === 'thinking') {
            return renderThinkingBlock(block.content, false);
        }
        if (block.type === 'tools') {
            return renderToolsBlock(block.content);
        }
        // Final render with markdown
        return '<div class="message-block markdown">' + renderMarkdown(block.content) + '</div>';
    }).join('');
    
    // Add copy button
    const copyBtnHtml = `
        <div class="message-actions">
            <button class="message-action-btn copy-btn" data-content="${escapeForDataAttr(fullContent.trim())}" title="复制">
                Copy
            </button>
        </div>
    `;
    
    container.innerHTML = finalHtml + copyBtnHtml;
    container.classList.remove('streaming-blocks');
    
    // Re-attach click handlers for thinking blocks
    container.querySelectorAll('.thinking-header').forEach(header => {
        header.addEventListener('click', () => {
            const block = header.closest('.thinking-block');
            block.classList.toggle('collapsed');
        });
    });
    
    // Add click handler for copy button - use dynamic import to avoid circular dependency
    container.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const { handleCopyMessage } = await import('./renderer.js');
            handleCopyMessage(e);
        });
    });
    
    // Render mermaid diagrams
    renderMermaidDiagrams();
    
    // Reset tool call state
    setToolCalls([]);
    
    // Apply syntax highlighting
    applySyntaxHighlight(container);
    
    // Reset streaming state
    setStreamingBlocks([]);
    setCurrentBlockType(null);
}

// Escape text for use in HTML data attribute
function escapeForDataAttr(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '&#10;')
        .replace(/\r/g, '&#13;');
}

// Listen for tools-updated event from tools.js (avoids circular dependency)
window.addEventListener('tools-updated', () => {
    updateStreamingBlocks();
});
