/**
 * Chat Renderer - Message rendering functions
 */

import { elements } from '../app.js';
import { currentSession, hideToolsCalls } from '../state.js';
import { escapeHtml, escapeForDataAttr, scrollToBottom, showToast } from '../utils/helpers.js';
import { renderMarkdown, applySyntaxHighlight, renderMermaidDiagrams } from '../utils/markdown.js';
import { parseContentToBlocks } from './streaming.js';
import { renderThinkingBlock, renderToolsBlock } from './blocks.js';
import { streamingBlocks, currentBlockType, toolCalls } from '../state.js';
import { setStreamingBlocks, setCurrentBlockType, setToolCalls } from '../state.js';

export function parseThinkingFromContent(content) {
    // Parse <think>...</think> tags from content
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
        const thinking = thinkMatch[1].trim();
        const output = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
        return { thinking, output, hasThinking: true };
    }
    return { thinking: null, output: content, hasThinking: false };
}

export function renderBlock(block, isStreaming = false) {
    if (block.type === 'thinking') {
        return renderThinkingBlock(block.content, isStreaming);
    }
    if (block.type === 'tools') {
        console.log('[renderBlock] Rendering tools block, hideToolsCalls:', hideToolsCalls);
        return renderToolsBlock(block.content);
    }
    return '<div class="message-block markdown">' + renderMarkdown(block.content) + '</div>';
}

export function renderMessageContent(blocks, isStreaming = false) {
    if (blocks.length === 0) return '';
    return blocks.map(b => renderBlock(b, isStreaming)).join('');
}

export function renderMessages(messages = []) {
    console.log('[renderMessages] Rendering', messages.length, 'messages, hideToolsCalls:', hideToolsCalls);
    
    if (!currentSession) {
        console.log('[renderMessages] No current session');
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
        console.log('[renderMessages] No messages');
        elements.messages.innerHTML = `
            <div class="empty-state">
                <div class="logo">💬</div>
                <h2>New Conversation</h2>
                <p>Send a message to start</p>
            </div>
        `;
        return;
    }
    
    elements.messages.innerHTML = messages.map((msg, index) => {
        const originalContent = escapeForDataAttr(msg.content);
        const copyBtnHtml = `
            <div class="message-actions">
                <button class="message-action-btn copy-btn" data-content="${originalContent}" title="复制">
                    Copy
                </button>
            </div>
        `;
        
        if (msg.role === 'assistant') {
            const blocks = parseContentToBlocks(msg.content);
            
            let html = '<div class="avatar">AI</div>';
            html += '<div class="content">';
            html += renderMessageContent(blocks, false);
            html += copyBtnHtml;
            html += '</div>';
            
            return '<div class="message ' + msg.role + '" data-index="' + index + '">' + html + '</div>';
        }
        
        return `
            <div class="message ${msg.role}" data-index="${index}">
                <div class="avatar">${msg.role === 'user' ? 'U' : 'AI'}</div>
                <div class="content markdown">
                    ${renderMarkdown(msg.content)}
                    ${copyBtnHtml}
                </div>
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
    
    // Add click handlers for copy buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', handleCopyMessage);
    });
    
    // Render mermaid diagrams
    renderMermaidDiagrams();
    
    // Apply syntax highlighting to all code blocks
    applySyntaxHighlight(elements.messages);
    
    scrollToBottom();
}

// Copy message content to clipboard
export async function handleCopyMessage(e) {
    const btn = e.currentTarget;
    const content = btn.dataset.content;
    
    try {
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(content);
        } else {
            // Fallback for non-HTTPS or unsupported browsers
            fallbackCopyTextToClipboard(content);
        }
        
        // Update button to show copied state
        btn.classList.add('copied');
        btn.textContent = 'Copied';
        
        showToast('已复制到剪贴板');
        
        // Reset after 2 seconds
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = 'Copy';
        }, 2000);
    } catch (err) {
        showToast('复制失败，请手动复制');
        console.error('Copy failed:', err);
    }
}

// Fallback copy method using textarea
function fallbackCopyTextToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    
    textarea.focus();
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('execCommand copy failed');
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

export function renderUserContent(content) {
    // 渲染用户消息内容，支持多模态（文本 + 图片）
    // content 可以是字符串或包含图片标记的字符串
    if (!content) return '<div class="message-block markdown"></div>';
    
    // 检查是否包含图片标记 [N image(s)]
    const imageMatch = content.match(/\[(\d+) image(s?)\]$/);
    if (imageMatch) {
        // 分离文本和图片标记
        const textPart = content.substring(0, content.length - imageMatch[0].length).trim();
        const imageCount = parseInt(imageMatch[1]);
        
        let html = '';
        if (textPart) {
            html += '<div class="message-block markdown">' + renderMarkdown(textPart) + '</div>';
        }
        
        // 添加图片占位符（实际图片在服务器端处理）
        html += '<div class="user-images-placeholder" style="margin-top: 8px; color: var(--text-secondary); font-size: 13px;">📷 ' + imageCount + ' image' + (imageCount > 1 ? 's' : '') + ' attached</div>';
        
        return html;
    }
    
    // 纯文本
    return '<div class="message-block markdown">' + renderMarkdown(content) + '</div>';
}

export function addMessage(role, content, isStreamingFlag = false) {
    // Remove empty state if exists
    if (elements.messages.querySelector('.empty-state')) {
        elements.messages.innerHTML = '';
    }
    
    // Reset streaming state
    setStreamingBlocks([]);
    setCurrentBlockType(null);
    setToolCalls([]);
    
    const messageEl = document.createElement('div');
    messageEl.className = 'message ' + role;
    
    let html = '<div class="avatar">' + (role === 'user' ? 'U' : 'AI') + '</div>';
    html += '<div class="content ' + (isStreamingFlag ? 'streaming-container' : '') + '">';
    
    if (isStreamingFlag && role === 'assistant') {
        // Streaming placeholder - content will be added dynamically
        html += '<div class="streaming-blocks"></div>';
    } else {
        // Non-streaming: parse and render blocks
        if (role === 'assistant') {
            const blocks = parseContentToBlocks(content);
            html += renderMessageContent(blocks, false);
        } else {
            // 用户消息使用多模态渲染
            html += renderUserContent(content);
        }
        
        // Add copy button for non-streaming messages
        const copyBtnHtml = `
            <div class="message-actions">
                <button class="message-action-btn copy-btn" data-content="${escapeForDataAttr(content)}" title="复制">
                    Copy
                </button>
            </div>
        `;
        html += copyBtnHtml;
    }
    
    html += '</div>';
    
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
    
    // Add click handler for copy button
    messageEl.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', handleCopyMessage);
    });
}
