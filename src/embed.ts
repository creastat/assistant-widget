/**
 * CDN Embeddable Chat Widget
 * Can be loaded via <script> tag and initialized with global ChatWidget
 *
 * Usage:
 * <script src="https://cdn.example.com/assistant-widget.js"></script>
 * <script>
 *   ChatWidget.init({
 *     serverUrl: 'ws://localhost:8080/ws',
 *     siteToken: 'your-token',
 *     theme: 'default',
 *     title: 'Chat',
 *   });
 * </script>
 */

import { ChatWidget, ChatWidgetConfig } from './core/ui/ChatWidget';
import { DefaultTheme, ThemeVariant } from './themes/default';
import cssContent from './themes/default/styles.css?inline';

// Global interface for type safety
declare global {
  interface Window {
    ChatWidget: {
      init: (config: ChatWidgetConfig & {
        theme?: 'default';
        variant?: ThemeVariant;
        customColors?: Record<string, string>; // Add support for custom colors in init
      }) => ChatWidget;
      version: string;
    };
    IOChat?: {
      (command: string, ...args: unknown[]): void;
      q?: unknown[][];
      l?: number;
      config?: {
        cdnUrl: string;
        siteToken: string;
        theme?: ThemeVariant;
        customColors?: Record<string, string> | null;
        serverUrl?: string;
        title?: string;
        placeholder?: string;
        lang?: 'ru' | 'en';
      };
    };
  }
}

// Inject CSS styles into the page
function injectStyles() {
  // Check if styles are already injected
  if (document.getElementById('assistant-widget-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'assistant-widget-styles';
  style.textContent = cssContent;
  document.head.appendChild(style);
}

// Inject styles immediately
injectStyles();

// Create global ChatWidget API
window.ChatWidget = {
  /**
   * Initialize chat widget
   */
  init(config) {
    const { theme = 'default', variant, customColors, ...widgetConfig } = config;

    const themeInstance = new DefaultTheme({
      title: widgetConfig.title,
      placeholder: widgetConfig.placeholder,
      variant: variant,
      customColors: customColors,
      lang: widgetConfig.lang,
    });

    // Create widget
    const widget = new ChatWidget(widgetConfig, themeInstance);

    return widget;
  },

  /**
   * Widget version
   */
  version: '2.2.0',
};

// Auto-initialize from IOChat loader or data attributes
function autoInitialize() {
  // Check if IOChat loader is present with config
  if (window.IOChat && window.IOChat.config) {
    const config = window.IOChat.config;

    // Only auto-init if we have required fields
    if (config.siteToken && config.serverUrl) {
      const initConfig: ChatWidgetConfig & {
        variant?: ThemeVariant;
        customColors?: Record<string, string>;
      } = {
        serverUrl: config.serverUrl,
        siteToken: config.siteToken,
      };

      // Add optional fields
      if (config.theme) initConfig.variant = config.theme;
      if (config.customColors) initConfig.customColors = config.customColors;
      if (config.title) initConfig.title = config.title;
      if (config.placeholder) initConfig.placeholder = config.placeholder;
      if (config.lang) initConfig.lang = config.lang;

      window.ChatWidget.init(initConfig);
      return;
    }
  }

  // Fallback: Check for data attributes on script tag
  const script = document.querySelector('script[data-assistant-widget]');
  if (script) {
    const serverUrl = script.getAttribute('data-server-url');
    const siteToken = script.getAttribute('data-site-token');
    const variant = script.getAttribute('data-variant') as ThemeVariant;
    const title = script.getAttribute('data-title');

    // Parse custom colors if present (JSON string in data-custom-colors)
    let customColors;
    const customColorsAttr = script.getAttribute('data-custom-colors');
    if (customColorsAttr) {
      try {
        customColors = JSON.parse(customColorsAttr);
      } catch (e) {
        console.warn('Invalid JSON in data-custom-colors');
      }
    }

    if (serverUrl && siteToken) {
      window.ChatWidget.init({
        serverUrl,
        siteToken,
        variant,
        title: title || undefined,
        customColors,
        lang: (script.getAttribute('data-lang') as 'ru' | 'en') || undefined,
      });
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInitialize);
} else {
  // DOM already loaded, initialize immediately
  autoInitialize();
}

export {};
