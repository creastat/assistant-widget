import { useState } from 'react';
import { ChatWidget } from '../src/react';
import { ThemeVariant } from '../src/themes/default';

export function App() {
  const [showWidget, setShowWidget] = useState(true);
  const [variant, setVariant] = useState<ThemeVariant | 'custom'>('brown');
  const [customPrimary, setCustomPrimary] = useState('#FF00FF');
  const [customBg, setCustomBg] = useState('#000000');
  const [lang, setLang] = useState<'en' | 'ru'>('en');

  const variants: (ThemeVariant | 'custom')[] = [
    'brown', 'dark', 'light', 'yellow', 'red', 'green', 'blue', 'purple', 'custom'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-slate-900">
              Chat Widget Demo
            </h1>
            <div className="flex gap-4">
              <a
                href="/demo/vanilla.html"
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                View Vanilla JS Demo →
              </a>
              <a
                href="/demo/embed.html"
                className="px-4 py-2 bg-white text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                View Embed Demo →
              </a>
            </div>
          </div>
          <p className="text-lg text-slate-600">
            Creastat headless chat widget with React components
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Features */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Features</h2>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span>Headless architecture - fully customizable</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span>WebSocket-based real-time communication</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span>Streaming message support</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span>Markdown rendering for rich content</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span>Automatic reconnection handling</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span>TypeScript support</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✓</span>
                <span>Themed UI with Variants</span>
              </li>
            </ul>
          </div>

          {/* Demo Controls */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Controls</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Visibility</label>
                <button
                  onClick={() => setShowWidget(!showWidget)}
                  className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                >
                  {showWidget ? 'Hide Widget' : 'Show Widget'}
                </button>
              </div>

               <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Theme Variant</label>
                <div className="flex flex-wrap gap-2">
                  {variants.map(v => (
                    <button
                      key={v}
                      onClick={() => setVariant(v)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                        variant === v 
                          ? 'bg-blue-100 text-blue-800 border-blue-200' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value as 'en' | 'ru')}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="en">English</option>
                  <option value="ru">Russian</option>
                </select>
              </div>

              {variant === 'custom' && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3">
                   <h3 className="font-semibold text-sm">Custom Colors</h3>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">Primary</label>
                       <input 
                          type="color" 
                          value={customPrimary}
                          onChange={(e) => setCustomPrimary(e.target.value)}
                          className="h-8 w-full rounded cursor-pointer"
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-500 mb-1">Background</label>
                       <input 
                          type="color" 
                          value={customBg}
                          onChange={(e) => setCustomBg(e.target.value)}
                          className="h-8 w-full rounded cursor-pointer"
                       />
                     </div>
                   </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-900">
                  <strong>Note:</strong> Requires WebSocket server at <code className="bg-amber-100 px-2 py-1 rounded">ws://localhost:8080/ws</code>
                </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      {showWidget && (
        <ChatWidget
          serverUrl={import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws'}
          siteToken={import.meta.env.VITE_SITE_TOKEN || 'example_12345'}
          debug={true}
          reconnect={true}
          title="IO Assistant"
          placeholder={lang === 'ru' ? 'Наш сайт умеет говорить, просто спроси...' : 'Our site can speak, just ask...'}
          lang={lang}
          theme="default"
          variant={variant as ThemeVariant}
          customColors={variant === 'custom' ? {
             primary: customPrimary,
             background: customBg,
             textLight: customBg === '#ffffff' ? '#000000' : '#ffffff', // Simple contrast logic
          } : undefined}
          onClose={() => setShowWidget(false)}
        />
      )}
    </div>
  );
}
