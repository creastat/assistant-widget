import { marked } from 'marked';
import type { ChatState, Message, WidgetState } from '../../core/types';

/**
 * Default theme HTML templates
 * Pure string templates for vanilla JS rendering
 */

const translations = {
  en: {
    connecting: 'Connecting...',
    disableTts: 'Disable TTS',
    enableTts: 'Enable TTS',
    clearChat: 'Clear Chat',
  },
  ru: {
    connecting: 'Подключение...',
    disableTts: 'Выключить озвучку',
    enableTts: 'Включить озвучку',
    clearChat: 'Очистить чат',
  }
};

export function renderUnified(
  widgetState: WidgetState,
  state: ChatState,
  config: { title: string; placeholder: string; showClose: boolean; lang: 'ru' | 'en' },
  hasInput: boolean
): string {
  const { messages, isConnected, isConnecting, isTyping, isRecording, ttsEnabled, error } = state;
  const lang = config.lang || 'en';
  const t = translations[lang as keyof typeof translations] || translations.en;

  // Group messages with their following status messages
  const groupedMessages = groupMessagesWithStatus(messages);

  return `<div class="assistant-widget-content"><div class="chat-header" ${widgetState === 'minimized' ? 'data-clickable="expand"' : 'data-clickable="minimize"'}><div class="chat-header-group"><span class="chat-header-title">${config.title}</span></div><div class="chat-header-actions"><div class="chat-header-icon-arrow">${iconUpArrow()}</div>${widgetState !== 'minimized' ? `<button class="chat-header-button action-tts ${ttsEnabled ? 'tts-enabled' : 'tts-disabled'} ${state.isSpeaking ? 'is-speaking' : ''}" data-action="toggle-tts" aria-label="Toggle Text-to-Speech" title="${ttsEnabled ? t.disableTts : t.enableTts}">${iconSpeaker(ttsEnabled)}</button>` : ''}${config.showClose && widgetState === 'full' ? `<button class="chat-header-button action-close" data-action="close" aria-label="${t.clearChat}">${iconClose()}</button>` : ''}</div></div><div class="chat-messages">${error ? `<div class="chat-error">${escapeHtml(error)}</div>` : ''}${groupedMessages.map((group, index) => renderMessageGroup(group, isTyping && index === groupedMessages.length - 1)).join('')}</div><div class="chat-input-container"><textarea class="chat-input" placeholder="${isConnecting ? t.connecting : config.placeholder}" ${!isConnected || isConnecting ? 'disabled' : ''} rows="1"></textarea><button class="chat-input-button ${isRecording && !hasInput ? 'recording-pulse' : ''}" data-action="primary" ${!isConnected || isConnecting ? 'disabled' : ''}>${hasInput ? iconSend() : iconMic(isRecording)}</button></div></div>`;
}

function groupMessagesWithStatus(messages: Message[]): Array<{main: Message, status?: Message}> {
  const groups: Array<{main: Message, status?: Message}> = [];

  for (const msg of messages) {
    if (msg.type === 'status') {
      const lastGroup = groups[groups.length - 1];
      // Only group if roles match (Ensures status is aligned with its related message)
      if (lastGroup && lastGroup.main.role === msg.role && lastGroup.main.type !== 'status') {
        lastGroup.status = msg;
        continue;
      }
      // If not grouping, it will fall through to push as its own group
    }

    groups.push({ main: msg });
  }

  return groups;
}

function renderMessageGroup(group: {main: Message, status?: Message}, isStreaming: boolean): string {
  const msg = group.main;
  const isStatusOnly = msg.type === 'status';
  const statusMsg = isStatusOnly ? msg : group.status;

  const isUser = msg.role === 'user';
  const isError = msg.type === 'error';

  let bubbleHtml = '';
  if (!isStatusOnly) {
    let content = isUser ? escapeHtml(msg.content) : renderMarkdown(msg.content);
    if (isStreaming && !isUser) {
      content += '<span class="typing-cursor"></span>';
    }
    const bubbleClass = isUser ? 'chat-message-bubble-user' : (isError ? 'chat-message-bubble-error' : 'chat-message-bubble-assistant');
    bubbleHtml = `<div class="chat-message-bubble ${bubbleClass}">${isUser ? `<p>${content}</p>` : `<div class="markdown-content">${content}</div>`}</div>`;
  }

  // Add status below message bubble or standalone
  let statusHtml = '';
  if (statusMsg) {
    statusHtml = `<div class="chat-message-status ${isStatusOnly ? 'chat-status-standalone' : ''}"><div class="loader-box"><div class="loader"></div></div><div class="chat-status-text">${escapeHtml(statusMsg.content)}</div></div>`;
  }

  const bubbleActions = (!isUser && !isError && !isStatusOnly) ? `<div class="chat-message-actions"><button class="chat-message-action" data-action="copy" data-content="${escapeHtml(msg.content)}">${iconCopy()}</button><button class="chat-message-action" data-action="like">${iconThumbUp()}</button><button class="chat-message-action" data-action="dislike">${iconThumbDown()}</button><button class="chat-message-action" data-action="share">${iconShare()}</button></div>` : '';

  return `<div class="chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}">${bubbleHtml}${statusHtml}${bubbleActions}</div>`;
}

function renderMarkdown(content: string): string {
  if (!content) return '';
  try {
    return marked.parse(content, { async: false }) as string;
  } catch (e) {
    console.error('Error parsing markdown:', e);
    return content;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Icons (minified)
const iconSend=()=>'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const iconMic=(r:boolean)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="${r?'currentColor':'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
const iconCopy=()=>'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
const iconThumbUp=()=>'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>';
const iconThumbDown=()=>'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>';
const iconShare=()=>'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';
const iconClose=()=>'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
const iconUpArrow=()=>'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>';
const iconSpeaker=(enabled:boolean)=>`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${enabled?'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>':'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'}</svg>`;
