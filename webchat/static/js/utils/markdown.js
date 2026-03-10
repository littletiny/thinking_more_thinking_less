/**
 * Markdown - Markdown rendering utilities
 */

import { escapeHtml } from './helpers.js';

export function renderMarkdown(text) {
    if (!text) return '';
    
    // Configure marked options
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
        sanitize: false
    });
    
    // Custom renderer to ensure proper code block handling
    const renderer = new marked.Renderer();
    // marked v9.1.6 uses (code, language, escaped) parameters
    renderer.code = function(code, language) {
        const lang = language || '';
        if (lang === 'mermaid') {
            return '<pre><code class="language-mermaid">' + escapeHtml(code) + '</code></pre>';
        }
        // Return code block with language class for highlight.js
        return '<pre><code class="language-' + lang + '">' + escapeHtml(code) + '</code></pre>';
    };
    
    return marked.parse(text, { renderer });
}

// Apply syntax highlighting to container
export function applySyntaxHighlight(container) {
    if (typeof hljs === 'undefined') return;
    
    container.querySelectorAll('pre code:not(.hljs):not(.language-mermaid)').forEach((block) => {
        const langMatch = block.className.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : null;
        const code = block.textContent;
        
        if (!code.trim()) return;
        
        try {
            let result;
            if (lang && hljs.getLanguage && hljs.getLanguage(lang)) {
                result = hljs.highlight(code, { language: lang, ignoreIllegals: true });
            } else {
                result = hljs.highlightAuto(code);
            }
            block.innerHTML = result.value;
            block.classList.add('hljs');
        } catch (e) {
            console.warn('Highlight failed for', lang, e.message);
        }
    });
}

// Render mermaid diagrams in the messages
export function renderMermaidDiagrams() {
    // Find all mermaid code blocks that haven't been rendered yet
    document.querySelectorAll('pre code.language-mermaid').forEach((block) => {
        if (block.dataset.rendered === 'true') return;
        
        const pre = block.parentElement;
        const container = document.createElement('div');
        container.className = 'mermaid';
        container.textContent = block.textContent;
        
        // Replace pre with mermaid div
        pre.parentNode.replaceChild(container, pre);
        
        block.dataset.rendered = 'true';
    });
    
    // Run mermaid
    try {
        mermaid.run({
            querySelector: '.mermaid:not([data-processed])'
        });
    } catch (e) {
        console.error('Mermaid render error:', e);
    }
}
