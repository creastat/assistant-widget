# Chat Widget

A production-ready, headless chat widget library built with vanilla TypeScript core and React components.

## Features

- 🎯 **Headless Architecture** - Fully customizable, framework-agnostic core
- 🔌 **WebSocket Real-time** - Bi-directional streaming communication
- ⚛️ **React Components** - Ready-to-use React wrapper components
- 🎨 **Themed UI** - Beautiful default theme included
- 📝 **Markdown Support** - Rich text rendering with marked.js
- 🔄 **Auto-reconnect** - Smart reconnection handling
- 📦 **TypeScript** - Full type safety
- 🎯 **Modern Stack** - React 19, Tailwind CSS v4, Vite

## Installation

```bash
npm install @creastat/assistant-widget
# or
bun add @creastat/assistant-widget
```

## Quick Start

### React Component

```tsx
import { ChatWidget } from '@creastat/assistant-widget/react';

function App() {
  return (
    <ChatWidget
      serverUrl="ws://localhost:8080/ws"
      siteToken="your-site-token"
      title="IO Assistant"
      placeholder="Type a message..."
      theme="default"
      debug={true}
      onClose={() => console.log('Widget closed')}
    />
  );
}
```


### Vanilla JavaScript

```ts
import { ChatService } from '@creastat/assistant-widget';

const chat = new ChatService(
  {
    serverUrl: 'ws://localhost:8080/ws',
    debug: true,
  },
  (event) => {
    console.log('Chat event:', event);
  }
);

// Connect
await chat.connect();

// Send message
await chat.sendMessage('Hello, AI!');

// Disconnect
chat.disconnect();
```

## API Reference

### ChatWidget Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `config` | `ChatConfig` | required | WebSocket configuration |
| `autoConnect` | `boolean` | `true` | Auto-connect on mount |
| `title` | `string` | `'Chat'` | Widget title |
| `placeholder` | `string` | `'Type a message...'` | Input placeholder |
| `theme` | `string` | `'default'` | UI theme |
| `className` | `string` | `''` | Additional CSS classes |
| `onClose` | `() => void` | - | Close handler |

### ChatConfig

```ts
interface ChatConfig {
  serverUrl: string;              // WebSocket URL
  sessionId?: string;             // Optional session ID
  authToken?: string;             // Optional auth token
  reconnect?: boolean;            // Enable auto-reconnect (default: true)
  reconnectInterval?: number;     // Reconnect delay in ms (default: 3000)
  maxReconnectAttempts?: number;  // Max reconnect attempts (default: 5)
  debug?: boolean;                // Enable debug logs (default: false)
}
```


### Message Interface

```ts
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'audio' | 'control' | 'break' | 'error' | 'status';
  metadata?: Record<string, unknown>;
}
```

## Theming

The widget includes a beautiful default theme. It features:

- Brown gradient background (`#7d5c59` to `#6d5654`)
- Glass-morphism effects
- Smooth animations
- Responsive design
- Dark theme optimized

### Custom Theme

You can create your own theme by extending the CSS:

```css
@theme {
  --color-primary: #your-color;
  --radius-widget: 1rem;
  /* ... other variables */
}

.theme-custom {
  .chat-header {
    background: linear-gradient(135deg, #your-colors);
  }
  /* ... other styles */
}
```

## WebSocket Protocol

The widget uses a structured JSON protocol over WebSocket for all non-binary communication.

### Client-to-Server types
- `input.text`: Plain text user message
- `input.audio`: Binary audio stream control
- `input.end`: End of audio input signal
- `control.config`: Update session configuration

### Server-to-Client types
- `stream.llm`: Partial LLM response chunks
- `stream.stt`: Real-time transcription results
- `response.start` / `response.end`: Response lifecycle events
- `status`: Interaction status updates (thinking, searching, etc.)
- `service.message`: System notifications
- `error`: Error messages
- `audio`: Base64 encoded audio chunks (when not using binary stream)

## Development

```bash
# Install dependencies
bun install

# Build library
bun run build

# Watch mode
bun run dev

# Type check
bun run type-check

# Run demo
bun run dev:demo
```

## Demo Pages

The widget includes three demo pages to help you get started:

1. **React Demo** (`/`) - Full-featured React demo with component examples
   - Shows React wrapper usage with `ChatWidget` component
   - Interactive controls and live widget
   - Access: Run `bun run dev:demo` and visit `http://localhost:5173`

2. **Vanilla JS Demo** (`/demo/vanilla.html`) - Pure vanilla JavaScript implementation
   - Shows core `ChatWidget` class usage
   - Headless `ChatService` examples
   - Interactive initialization and controls
   - Access: `http://localhost:5173/demo/vanilla.html`

3. **CDN Embed Example** (`/demo/embed.html`) - Simplest integration method
   - Shows CDN/script tag usage with `embed.js`
   - Interactive script generator with compression
   - Copy-paste ready code
   - Access: `http://localhost:5173/demo/embed.html`

## Project Structure

```
assistant-widget/
├── src/
│   ├── core/              # Headless Core (Vanilla TS)
│   │   ├── services/      # Business logic & API
│   │   ├── store/         # State management
│   │   ├── types/         # Type definitions
│   │   ├── ui/            # UI Controller logic
│   │   └── utils/         # Helpers & Audio logic
│   ├── react/             # React Wrapper
│   │   └── components/    # React-specific components
│   ├── themes/            # UI Themes & Templates
│   │   └── default/       # Default Theme
│   ├── generator.ts       # Dashboard script generator
│   ├── embed.ts           # CDN/Embed entry point
│   └── index.ts           # Main library entry
├── demo/                  # Demo applications
├── dist/                  # Compiled assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari 14+

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines first.

## Credits

Built by Creastat team with ❤️
