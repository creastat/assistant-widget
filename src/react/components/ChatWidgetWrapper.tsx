import { useEffect, useRef } from 'react';
import { ChatWidget, type ChatWidgetConfig } from '../../core';
import { DefaultTheme, ThemeVariant, ThemeColorPalette } from '../../themes/default';

export interface ChatWidgetWrapperProps extends Omit<ChatWidgetConfig, 'container'> {
  theme?: 'default';
  variant?: ThemeVariant;
  customColors?: ThemeColorPalette;
  className?: string;
}

/**
 * React wrapper for vanilla ChatWidget
 * This is just a thin layer that mounts the headless widget
 */
export function ChatWidgetWrapper({
  theme = 'default',
  variant,
  customColors,
  className = '',
  title,
  placeholder,
  lang,
  ...config
}: ChatWidgetWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<ChatWidget | null>(null);

  // Handle critical config changes (requires re-instantiation)
  useEffect(() => {
    if (!containerRef.current) return;

    // Create theme instance
    const themeInstance = new DefaultTheme({ 
      title, 
      placeholder,
      variant,
      customColors,
      lang,
    });

    // Create widget instance
    const widget = new ChatWidget(
      {
        ...config,
        title,
        placeholder,
        lang,
        container: containerRef.current,
      },
      themeInstance
    );

    widgetRef.current = widget;

    // Cleanup on unmount
    return () => {
      widget.destroy();
      widgetRef.current = null;
    };
  }, [config.serverUrl, config.siteToken]);

  // Handle dynamic property updates (re-uses existing instance)
  useEffect(() => {
    if (widgetRef.current) {
      widgetRef.current.updateConfig({
        title,
        placeholder,
        lang,
        variant,
        customColors,
      });
    }
  }, [title, placeholder, lang, variant, customColors]);


  return <div ref={containerRef} className={`assistant-widget-container ${className}`.trim()} />;
}
