/**
 * State - Global state variables
 */

// Session state
export let currentSession = null;
export let sessions = [];
export let isStreaming = false;
export let eventSource = null;
export let menuSessionId = null;      // 当前显示菜单的 session
export let renamingSessionId = null;  // 当前正在重命名的 session
export let confirmCallback = null;    // 确认弹窗的回调
export let attachedImages = [];       // 粘贴的图片数组 {id, dataUrl, mimeType}

// Split panel state
export let splitMode = null;          // null | 'vertical' | 'horizontal'
export let panelSizes = { panel1: 35, panel2: 65 };  // 百分比 (chat 35% / mockcraft 65%)

// Theme and UI state
export let currentTheme = localStorage.getItem('code-theme') || 'default';
export let hideToolsCalls = localStorage.getItem('hide-tools-calls') === 'true';
export let sidebarCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';

// Streaming state
export let streamingBlocks = [];  // Array of {type: 'thinking'|'output'|'tools', content: string|object}
export let currentBlockType = null;

// Tool call state
export let toolCalls = [];      // Array of tool call info

// Menu position cache
export let menuPosition = { top: 0, left: 0 };

// Setter functions for state modification
export function setCurrentSession(value) { currentSession = value; }
export function setSessions(value) { sessions = value; }
export function setIsStreaming(value) { isStreaming = value; }
export function setEventSource(value) { eventSource = value; }
export function setMenuSessionId(value) { menuSessionId = value; }
export function setRenamingSessionId(value) { renamingSessionId = value; }
export function setConfirmCallback(value) { confirmCallback = value; }
export function setAttachedImages(value) { attachedImages = value; }
export function setSplitMode(value) { splitMode = value; }
export function setPanelSizes(value) { panelSizes = value; }
export function setCurrentTheme(value) { currentTheme = value; }
export function setHideToolsCalls(value) { hideToolsCalls = value; }
export function setSidebarCollapsed(value) { sidebarCollapsed = value; }
export function setStreamingBlocks(value) { streamingBlocks = value; }
export function setCurrentBlockType(value) { currentBlockType = value; }
export function setToolCalls(value) { toolCalls = value; }
export function setMenuPosition(value) { menuPosition = value; }
