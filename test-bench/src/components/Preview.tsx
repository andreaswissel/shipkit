"use client";

import { useEffect, useRef, useState } from "react";

interface PreviewProps {
  code: string;
  componentName: string;
}

const PREVIEW_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0a;
      color: #ededed;
      min-height: 100vh;
    }
    #root { padding: 20px; }
    #error {
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid #ef4444;
      border-radius: 8px;
      color: #ef4444;
      font-family: monospace;
      white-space: pre-wrap;
      display: none;
    }
  </style>
</head>
<body>
  <div id="error"></div>
  <div id="root"></div>
  <script>
    window.onerror = function(msg, url, line, col, error) {
      showError(msg + ' at line ' + line);
      return true;
    };
    
    function showError(message) {
      const el = document.getElementById('error');
      el.textContent = message;
      el.style.display = 'block';
      document.getElementById('root').style.display = 'none';
    }
    
    function clearError() {
      document.getElementById('error').style.display = 'none';
      document.getElementById('root').style.display = 'block';
    }
    
    // Component library for generated code to use
    window.Components = {
      Button: function Button(props) {
        const { children, variant = 'primary', size = 'md', loading, disabled, onClick, style } = props;
        const baseStyles = {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          fontWeight: 500,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.6 : 1,
          transition: 'all 0.2s ease',
          border: 'none',
          outline: 'none',
        };
        const variants = {
          primary: { backgroundColor: '#3b82f6', color: '#fff' },
          secondary: { backgroundColor: '#333', color: '#fff' },
          outline: { backgroundColor: 'transparent', color: '#3b82f6', border: '1px solid #3b82f6' },
          ghost: { backgroundColor: 'transparent', color: '#888' },
        };
        const sizes = {
          sm: { padding: '6px 12px', fontSize: '14px' },
          md: { padding: '10px 20px', fontSize: '16px' },
          lg: { padding: '14px 28px', fontSize: '18px' },
        };
        return React.createElement('button', {
          onClick: onClick,
          disabled: disabled || loading,
          style: { ...baseStyles, ...variants[variant], ...sizes[size], ...style }
        }, loading ? React.createElement('span', {
          style: { width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', marginRight: 8, animation: 'spin 1s linear infinite' }
        }) : null, children);
      },
      
      Card: function Card(props) {
        const { children, variant = 'default', padding = 'md', style } = props;
        const baseStyles = { borderRadius: '12px', backgroundColor: '#1a1a1a', overflow: 'hidden' };
        const variants = {
          default: {},
          elevated: { boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' },
          outlined: { border: '1px solid #333', backgroundColor: 'transparent' },
        };
        const paddings = { none: { padding: 0 }, sm: { padding: '12px' }, md: { padding: '20px' }, lg: { padding: '32px' } };
        return React.createElement('div', {
          style: { ...baseStyles, ...variants[variant], ...paddings[padding], ...style }
        }, children);
      },
      
      Input: function Input(props) {
        const { label, error, helperText, value, onChange, placeholder, style } = props;
        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          label && React.createElement('label', { style: { fontSize: '14px', fontWeight: 500, color: '#ededed' } }, label),
          React.createElement('input', {
            value: value,
            onChange: onChange,
            placeholder: placeholder,
            style: {
              padding: '10px 14px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid ' + (error ? '#ef4444' : '#333'),
              backgroundColor: '#0a0a0a',
              color: '#ededed',
              outline: 'none',
              ...style
            }
          }),
          (error || helperText) && React.createElement('span', {
            style: { fontSize: '12px', color: error ? '#ef4444' : '#888' }
          }, error || helperText)
        );
      },
      
      Textarea: function Textarea(props) {
        const { label, error, helperText, value, onChange, placeholder, style } = props;
        return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          label && React.createElement('label', { style: { fontSize: '14px', fontWeight: 500, color: '#ededed' } }, label),
          React.createElement('textarea', {
            value: value,
            onChange: onChange,
            placeholder: placeholder,
            style: {
              padding: '10px 14px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '1px solid ' + (error ? '#ef4444' : '#333'),
              backgroundColor: '#0a0a0a',
              color: '#ededed',
              outline: 'none',
              resize: 'vertical',
              minHeight: '100px',
              fontFamily: 'inherit',
              ...style
            }
          }),
          (error || helperText) && React.createElement('span', {
            style: { fontSize: '12px', color: error ? '#ef4444' : '#888' }
          }, error || helperText)
        );
      },
      
      Modal: function Modal(props) {
        const { children, open, onClose, title, size = 'md' } = props;
        if (!open) return null;
        const sizes = {
          sm: { maxWidth: '400px' },
          md: { maxWidth: '600px' },
          lg: { maxWidth: '800px' },
          full: { maxWidth: 'calc(100vw - 40px)' }
        };
        return React.createElement('div', {
          onClick: function(e) { if (e.target === e.currentTarget) onClose && onClose(); },
          style: {
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 1000,
            padding: '20px'
          }
        }, React.createElement('div', {
          style: {
            width: '100%',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            ...sizes[size]
          }
        },
          title && React.createElement('div', {
            style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #333' }
          },
            React.createElement('h2', { style: { fontSize: '18px', fontWeight: 600, color: '#ededed', margin: 0 } }, title),
            React.createElement('button', {
              onClick: onClose,
              style: { background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '24px', lineHeight: 1, padding: '4px' }
            }, '×')
          ),
          React.createElement('div', { style: { padding: '20px' } }, children)
        ));
      }
    };
    
    window.addEventListener('message', function(event) {
      if (event.data.type === 'render') {
        clearError();
        try {
          let code = event.data.code;
          
          // Remove all import statements
          code = code.replace(/import\\s+.*?from\\s+["'][^"']+["'];?\\n?/g, '');
          code = code.replace(/import\\s+["'][^"']+["'];?\\n?/g, '');
          
          // Remove "use client" directive
          code = code.replace(/["']use client["'];?\\s*/g, '');
          
          // Add React hooks and Components to scope
          const preamble = [
            'const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer, Fragment } = React;',
            'const { Button, Card, Input, Textarea, Modal } = window.Components;'
          ].join('\\n');
          code = preamble + '\\n' + code;
          
          // Transform default exports
          code = code.replace(/export\\s+default\\s+(function|class)\\s+(\\w+)/g, 'const $2 = $1 $2'.replace('$1 $1', '$1'));
          code = code.replace(/export\\s+default\\s+(\\w+);?/g, '');
          
          // Transform named exports
          code = code.replace(/export\\s+(function|const)\\s+(\\w+)/g, 'const $2 = $1 $2'.replace('$1 $1', '$1'));
          code = code.replace(/export\\s*\\{[^}]*\\};?/g, '');
          
          // Add render call at the end
          const componentName = event.data.componentName;
          code += '\\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(' + componentName + '));';
          
          // Compile with Babel
          const transformed = Babel.transform(code, { 
            presets: ['react'],
            filename: 'component.jsx'
          }).code;
          
          // Execute
          eval(transformed);
        } catch (err) {
          showError(err.message);
        }
      }
    });
  </script>
  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</body>
</html>
`;

export function Preview({ code, componentName }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded || !iframeRef.current?.contentWindow || !code) return;

    iframeRef.current.contentWindow.postMessage(
      { type: "render", code, componentName },
      "*"
    );
  }, [code, componentName, loaded]);

  const handleLoad = () => {
    setLoaded(true);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: "400px",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #333",
        backgroundColor: "#0a0a0a",
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={PREVIEW_HTML}
        onLoad={handleLoad}
        sandbox="allow-scripts"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          minHeight: "400px",
        }}
        title="Component Preview"
      />
    </div>
  );
}

export type { PreviewProps };
