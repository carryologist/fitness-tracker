export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('theme') || 'system';
        let resolved = 'light';
        
        if (theme === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } else if (theme === 'dark') {
          resolved = 'dark';
        }
        
        document.documentElement.classList.add(resolved);
      } catch (e) {
        // Fallback to light theme
        document.documentElement.classList.add('light');
      }
    })()
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}