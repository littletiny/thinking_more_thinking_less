/**
 * Chat - Chat core functionality
 */

import { elements } from '../app.js';
import { currentSession, isStreaming, sessions, attachedImages } from '../state.js';
import { setIsStreaming } from '../state.js';
import { apiGet, apiPost } from '../api.js';
import { showToast, updateSendButton } from '../utils/helpers.js';
import { addMessage, renderMessages } from './renderer.js';
import { appendStreamingChunk, finalizeStreamingMessage } from './streaming.js';
import { handleEvent, updateInputStatus } from './tools.js';
import { clearAttachedImages, buildMessageContent } from './images.js';
import { loadSessions } from '../sessions/manager.js';
import { renderSessionList } from '../sessions/renderer.js';
import { API_BASE } from '../config.js';

export async function sendMessage() {
    if (isStreaming) return;
    
    // 构建消息内容（支持多模态）
    const messageContent = buildMessageContent();
    
    // 检查是否有内容
    const hasText = typeof messageContent === 'string' ? messageContent.trim() : messageContent.length > 0;
    if (!hasText) return;
    
    if (!currentSession) {
        showToast('Please select or create a session first', 'warning');
        return;
    }
    
    // 如果 session 不是 active，自动激活它
    if (currentSession.status !== 'active') {
        try {
            await apiPost('/api/sessions/' + currentSession.id + '/unarchive');
            currentSession.status = 'active';
            currentSession.last_accessed_at = new Date().toISOString();
            renderSessionList();
        } catch (err) {
            showToast('Failed to activate session');
            return;
        }
    }
    
    // Clear input and images
    elements.messageInput.value = '';
    elements.messageInput.style.height = 'auto';
    
    // 准备显示的消息（简化版本用于本地显示）
    let displayMessage;
    if (typeof messageContent === 'string') {
        displayMessage = messageContent;
    } else {
        // 构建显示文本
        const texts = [];
        const imageCount = messageContent.filter(p => p.type === 'image_url').length;
        messageContent.forEach(p => {
            if (p.type === 'text') texts.push(p.text);
        });
        displayMessage = texts.join(' ');
        if (imageCount > 0) {
            displayMessage += (displayMessage ? '\n' : '') + '[' + imageCount + ' image' + (imageCount > 1 ? 's' : '') + ']';
        }
    }
    
    // Clear attached images after building display message
    clearAttachedImages();
    
    // Add user message
    addMessage('user', displayMessage);
    
    // Add placeholder for assistant
    addMessage('assistant', '', true);
    
    setIsStreaming(true);
    updateSendButton();
    updateInputStatus();
    
    try {
        await streamChat(messageContent);
    } catch (err) {
        appendStreamingChunk('Error: ' + err.message, 'output');
        finalizeStreamingMessage();
    } finally {
        setIsStreaming(false);
        updateSendButton();
        updateInputStatus();
        
        // Update session in list (timestamp changed)
        loadSessions();
    }
}

export async function streamChat(message) {
    const sessionId = currentSession.id;
    
    return new Promise((resolve, reject) => {
        // Use fetch with ReadableStream for SSE
        fetch(API_BASE + '/api/sessions/' + sessionId + '/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),  // message 可以是字符串或数组
        }).then(response => {
            if (!response.ok) {
                reject(new Error('HTTP ' + response.status));
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
                                    appendStreamingChunk('Error: ' + data.error, 'output');
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

export async function loadConversation(session) {
    try {
        const data = await apiGet('/api/sessions/' + session.id + '/messages');
        const messages = data.messages || [];
        
        console.log('[loadConversation] Loaded', messages.length, 'messages');
        
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

export function updateChatTitle() {
    elements.chatTitle.textContent = currentSession 
        ? currentSession.title 
        : 'Zettel WebChat';
}
