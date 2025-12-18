/**
 * Script Generator for Dashboard
 *
 * This utility generates the loader script that users copy from their dashboard.
 *
 * Usage in dashboard:
 * ```typescript
 * import { generateWidgetScript } from '@creastat/assistant-widget/generator';
 *
 * const script = generateWidgetScript({
 *   siteToken: user.siteToken,
 *   theme: user.preferences.theme,
 *   customColors: user.preferences.customColors,
 *   title: user.preferences.title,
 *   placeholder: user.preferences.placeholder,
 * });
 * ```
 */

export interface WidgetScriptConfig {
  siteToken: string;
  theme?: 'brown' | 'dark' | 'light' | 'yellow' | 'red' | 'green' | 'blue' | 'custom';
  customColors?: {
    primary?: string;
    background?: string;
    textLight?: string;
  } | null;
  title?: string;
  placeholder?: string;
  lang?: 'ru' | 'en';
  cdnUrl?: string;
  serverUrl?: string;
}

/**
 * Generate the loader script for embedding in user's website
 */
export function generateWidgetScript(config: WidgetScriptConfig): string {
  const {
    siteToken,
    theme = 'brown',
    customColors = null,
    title = 'Chat Support',
    placeholder = 'Type your message...',
    lang = 'en',
    cdnUrl = 'https://cdn.creastat.com/assistant-widget/v2/embed.js',
    serverUrl = 'wss://api.creastat.com/ws',
  } = config;

  // Format custom colors for script
  const customColorsStr = customColors
    ? JSON.stringify(customColors, null, 2).split('\n').map((line, i) =>
        i === 0 ? line : `    ${line}`
      ).join('\n')
    : 'null';

  return `<!-- Creastat Chat Widget -->
<script>
(function() {
  var config = {
    cdnUrl: '${cdnUrl}',
    siteToken: '${siteToken}',
    theme: '${theme}',
    customColors: ${customColorsStr},
    serverUrl: '${serverUrl}',
    title: '${title}',
    placeholder: '${placeholder}',
    lang: '${lang}'
  };

  window.IOChat = window.IOChat || function() {
    (window.IOChat.q = window.IOChat.q || []).push(arguments);
  };
  window.IOChat.l = +new Date();
  window.IOChat.config = config;

  var script = document.createElement('script');
  script.async = true;
  script.src = config.cdnUrl;
  script.onerror = function() {
    console.error('Failed to load Creastat Chat Widget');
  };

  var firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(script, firstScript);
})();
</script>`;
}

/**
 * Generate a minified version of the loader script
 */
export function generateWidgetScriptMinified(config: WidgetScriptConfig): string {
  const {
    siteToken,
    theme = 'brown',
    customColors = null,
    title = 'Chat Support',
    placeholder = 'Type your message...',
    lang = 'en',
    cdnUrl = 'https://cdn.creastat.com/assistant-widget/v2/embed.js',
    serverUrl = 'wss://bot.creastat.com/ws',
  } = config;

  const customColorsStr = customColors ? JSON.stringify(customColors) : 'null';

  return `<script>(function(){var c={cdnUrl:'${cdnUrl}',siteToken:'${siteToken}',theme:'${theme}',customColors:${customColorsStr},serverUrl:'${serverUrl}',title:'${title}',placeholder:'${placeholder}',lang:'${lang}'};window.IOChat=window.IOChat||function(){(window.IOChat.q=window.IOChat.q || []).push(arguments)};window.IOChat.l=+new Date();window.IOChat.config=c;var s=document.createElement('script');s.async=true;s.src=c.cdnUrl;s.onerror=function(){console.error('Failed to load Creastat Chat Widget')};var f=document.getElementsByTagName('script')[0];f.parentNode.insertBefore(s,f)})();</script>`;
}

/**
 * Example usage for testing
 */
export const exampleScript = generateWidgetScript({
  siteToken: 'site_abc123xyz',
  theme: 'brown',
  customColors: null,
  title: 'Customer Support',
  placeholder: 'How can we help you?',
});

export const exampleCustomColorScript = generateWidgetScript({
  siteToken: 'site_abc123xyz',
  theme: 'custom',
  customColors: {
    primary: '#FF00FF',
    background: '#000000',
    textLight: '#FFFFFF',
  },
  title: 'Custom Support',
  placeholder: 'Ask us anything...',
});
