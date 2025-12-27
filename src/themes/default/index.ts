export interface ThemeColorPalette {
  primary?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  border?: string;
  accentIcon?: string;
  overlay?: string;
  glass?: string;
  textLight?: string;
  textMuted?: string;
}

export type ThemeVariant = 'brown' | 'dark' | 'light' | 'yellow' | 'red' | 'green' | 'blue' | 'purple' | 'custom';

export interface DefaultThemeConfig {
  title?: string;
  placeholder?: string;
  showClose?: boolean;
  variant?: ThemeVariant;
  customColors?: ThemeColorPalette;
  lang?: 'ru' | 'en';
}

import { ChatWidgetTheme } from '../../core/ui/ChatWidget';
import { ChatState, WidgetState } from '../../core/types';
import { renderUnified } from './template';

export class DefaultTheme implements ChatWidgetTheme {
  private config!: Required<DefaultThemeConfig>;
  private customColors?: ThemeColorPalette;

  constructor(config: DefaultThemeConfig = {}) {
    this.updateConfig(config);
  }

  updateConfig(config: DefaultThemeConfig): void {
    const lang = config.lang || this.config?.lang || 'en';
    const defaults = {
      en: {
        title: 'Chat',
        placeholder: 'Type a message...',
      },
      ru: {
        title: 'Чат',
        placeholder: 'Введите сообщение...',
      }
    };

    const t = defaults[lang as keyof typeof defaults] || defaults.en;

    this.config = {
      title: config.title || t.title,
      placeholder: config.placeholder || t.placeholder,
      showClose: config.showClose !== false,
      variant: config.variant || (this.config?.variant || 'brown'),
      customColors: config.customColors || (this.config?.customColors || {}),
      lang: lang as 'ru' | 'en',
    };
    this.customColors = this.config.customColors;
  }

  setLanguage(lang: 'ru' | 'en'): void {
    this.updateConfig({ lang });
  }

  render(state: WidgetState, chatState: ChatState, hasInput: boolean): string {
    // We can inject styles inline if needed, or rely on the class
    // But since `render` returns a string, we might need to wrap the whole thing or return a style attribute
    // The `renderUnified` likely returns the HTML string.
    
    // We can inject a style block or style attribute on the root div if we want specific overrides.
    // However, the current `renderUnified` template wraps everything in `.assistant-widget-content`.
    // The root element is created by `ChatWidget` core, which adds the class from `getClassName`.
    // We might need to handle custom CSS variables by returning them in a style attribute if the core supports it,
    // OR we inject a <style> tag in the template.
    
    // Let's modify renderUnified to accept style overrides or we handle it here.
    // Actually, `renderUnified` returns the inner HTML usually? No, it returns the content.
    // Let's check `ChatWidget` core if possible, or just inject a style tag.
    
    const customColors = this.customColors;
    const styleTag = this.config.variant === 'custom' && customColors
      ? `<style>
         .theme-default.theme-variant-custom {
           ${Object.entries(this.mapColorsToVars(customColors)).map(([k, v]) => `${k}: ${v};`).join('\n')}
           ${customColors.background ? `background: ${customColors.background} !important;` : ''}
         }
         </style>`
      : '';

    return styleTag + renderUnified(state, chatState, this.config, hasInput);
  }

  getClassName(): string {
    return `theme-default theme-variant-${this.config.variant}`;
  }

  getCSSPath(): string | undefined {
    return undefined;
  }

  private mapColorsToVars(colors: ThemeColorPalette): Record<string, string> {
    const vars: Record<string, string> = {};
    if (colors.primary) vars['--theme-primary'] = colors.primary;
    if (colors.background) vars['--theme-background'] = colors.background;
    if (colors.foreground) vars['--theme-foreground'] = colors.foreground;
    if (colors.muted) vars['--theme-muted'] = colors.muted;
    if (colors.border) vars['--theme-border'] = colors.border;
    if (colors.accentIcon) vars['--theme-accent-icon'] = colors.accentIcon;
    if (colors.overlay) vars['--theme-overlay'] = colors.overlay;
    if (colors.glass) vars['--theme-glass'] = colors.glass;
    if (colors.textLight) vars['--theme-text-light'] = colors.textLight;
    if (colors.textMuted) vars['--theme-text-muted'] = colors.textMuted;
    return vars;
  }
}
