// Import styles
import '../themes/default/styles.css';

// React wrapper for vanilla ChatWidget
export { ChatWidgetWrapper } from './components/ChatWidgetWrapper';
export type { ChatWidgetWrapperProps } from './components/ChatWidgetWrapper';

// Alias for better DX (ChatWidget is more intuitive than ChatWidgetWrapper in React)
export { ChatWidgetWrapper as ChatWidget } from './components/ChatWidgetWrapper';
export type { ChatWidgetWrapperProps as ChatWidgetProps } from './components/ChatWidgetWrapper';
