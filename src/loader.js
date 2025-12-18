/**
 * Creastat Chat Widget Loader
 * Google Analytics-style async loader
 *
 * This file serves as a template for generating user-specific loader scripts
 * in the dashboard. Replace CDN_URL, SITE_TOKEN, and THEME with actual values.
 */

(function() {
  // Configuration (will be replaced by dashboard)
  var config = {
    cdnUrl: 'CDN_URL', // e.g., 'https://cdn.creastat.com/assistant-widget/v1/embed.js'
    siteToken: 'SITE_TOKEN', // User's unique site token
    theme: 'THEME', // Theme variant (brown, dark, light, yellow, red, green, blue, custom)
    customColors: CUSTOM_COLORS, // Custom colors object or null
    serverUrl: 'SERVER_URL', // WebSocket server URL
    title: 'TITLE', // Chat widget title
    placeholder: 'PLACEHOLDER' // Input placeholder text
  };

  // Queue for commands before widget loads
  window.IOChat = window.IOChat || function() {
    (window.IOChat.q = window.IOChat.q || []).push(arguments);
  };
  window.IOChat.l = +new Date();

  // Store config for widget initialization
  window.IOChat.config = config;

  // Load the widget script asynchronously
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = config.cdnUrl;

  // Error handling
  script.onerror = function() {
    console.error('Failed to load Creastat Chat Widget');
  };

  // Insert script into DOM
  var firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode.insertBefore(script, firstScript);
})();
