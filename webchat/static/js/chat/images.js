/**
 * Images - Image paste handling
 */

import { elements } from '../app.js';
import { attachedImages } from '../state.js';
import { setAttachedImages } from '../state.js';
import { updateSendButton, showToast } from '../utils/helpers.js';

export function handlePaste(e) {
    console.log('[Paste] Event triggered', e);
    
    const clipboardData = e.clipboardData || e.originalEvent?.clipboardData || window.clipboardData;
    if (!clipboardData) {
        console.log('[Paste] No clipboard data available');
        return;
    }
    
    console.log('[Paste] Clipboard data:', {
        items: clipboardData.items ? clipboardData.items.length : 0,
        files: clipboardData.files ? clipboardData.files.length : 0,
        types: clipboardData.types ? [...clipboardData.types] : []
    });
    
    let hasImage = false;
    
    // 优先使用 items (现代浏览器)
    if (clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
            const item = clipboardData.items[i];
            console.log('[Paste] Item ' + i + ': type=' + item.type + ', kind=' + item.kind);
            
            if (item.type.startsWith('image/') || item.kind === 'file') {
                hasImage = true;
                e.preventDefault();
                
                const blob = item.getAsFile();
                const mimeType = item.type || 'image/png';
                console.log('[Paste] Got file:', blob, 'mimeType:', mimeType);
                
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        console.log('[Paste] FileReader loaded, dataUrl length:', event.target.result.length);
                        const dataUrl = event.target.result;
                        addAttachedImage(dataUrl, mimeType);
                    };
                    reader.onerror = (err) => {
                        console.error('[Paste] FileReader error:', err);
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    }
    
    // 备用：使用 files (某些浏览器/场景)
    if (!hasImage && clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
            const file = clipboardData.files[i];
            console.log('[Paste] File ' + i + ':', file.name, file.type);
            
            if (file.type.startsWith('image/')) {
                hasImage = true;
                e.preventDefault();
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    console.log('[Paste] FileReader loaded (from files)');
                    const dataUrl = event.target.result;
                    addAttachedImage(dataUrl, file.type);
                };
                reader.onerror = (err) => {
                    console.error('[Paste] FileReader error:', err);
                };
                reader.readAsDataURL(file);
            }
        }
    }
    
    console.log('[Paste] hasImage:', hasImage);
    // 如果没有图片，让默认粘贴行为继续（粘贴文本）
}

export function addAttachedImage(dataUrl, mimeType) {
    console.log('[addAttachedImage] Adding image, mimeType:', mimeType, 'dataUrl length:', dataUrl.length);
    const id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    attachedImages.push({ id, dataUrl, mimeType });
    console.log('[addAttachedImage] attachedImages count:', attachedImages.length);
    renderImageAttachments();
    updateSendButton();
}

export function removeAttachedImage(id) {
    const newImages = attachedImages.filter(img => img.id !== id);
    setAttachedImages(newImages);
    renderImageAttachments();
    updateSendButton();
}

export function renderImageAttachments() {
    console.log('[renderImageAttachments] Rendering, count:', attachedImages.length);
    if (attachedImages.length === 0) {
        elements.imageAttachments.innerHTML = '';
        return;
    }
    
    const html = attachedImages.map(img => `
        <div class="image-preview" data-id="${img.id}">
            <img src="${img.dataUrl}" alt="Attached image">
            <button class="remove-btn" data-img-id="${img.id}">×</button>
        </div>
    `).join('');
    
    console.log('[renderImageAttachments] HTML length:', html.length);
    elements.imageAttachments.innerHTML = html;
    
    // Add event listeners to remove buttons
    elements.imageAttachments.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.dataset.imgId;
            removeAttachedImage(id);
        });
    });
}

export function clearAttachedImages() {
    setAttachedImages([]);
    renderImageAttachments();
}

export function buildMessageContent() {
    // 构建消息内容，支持多模态
    // 返回: 字符串 或 内容部件数组
    const text = elements.messageInput.value.trim();
    
    if (attachedImages.length === 0) {
        // 只有文本
        return text;
    }
    
    // 构建多模态内容
    const content = [];
    
    if (text) {
        content.push({ type: 'text', text });
    }
    
    attachedImages.forEach(img => {
        content.push({
            type: 'image_url',
            image_url: { url: img.dataUrl }
        });
    });
    
    return content;
}
