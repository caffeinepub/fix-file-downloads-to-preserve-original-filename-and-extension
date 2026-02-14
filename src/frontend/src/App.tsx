import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import CreatePastePage from './pages/CreatePastePage';
import PasteViewPage from './pages/PasteViewPage';
import AppLayout from './components/AppLayout';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { extractPasteIdFromRoute } from './utils/pasteIds';

function App() {
  const [currentRoute, setCurrentRoute] = useState<{ path: string; params?: Record<string, string> }>({
    path: '/',
  });

  useEffect(() => {
    const handleRouteChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      
      // Split hash to separate path from query string
      const [pathPart] = hash.split('?');
      
      // Parse route params for /p/:id pattern
      const pasteMatch = pathPart.match(/^\/p\/(.+)$/);
      if (pasteMatch) {
        // Extract and normalize the paste ID from the raw segment
        const rawSegment = pasteMatch[1];
        const normalizedId = extractPasteIdFromRoute(rawSegment);
        
        if (normalizedId) {
          setCurrentRoute({ path: '/p/:id', params: { id: normalizedId } });
        } else {
          // If extraction results in empty string, default to create page
          setCurrentRoute({ path: '/' });
        }
      } else {
        setCurrentRoute({ path: pathPart });
      }
    };

    handleRouteChange();
    window.addEventListener('hashchange', handleRouteChange);
    return () => window.removeEventListener('hashchange', handleRouteChange);
  }, []);

  const renderPage = () => {
    if (currentRoute.path === '/p/:id' && currentRoute.params?.id) {
      return <PasteViewPage pasteId={currentRoute.params.id} />;
    }
    return <CreatePastePage />;
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppLayout currentPath={currentRoute.path}>
        {renderPage()}
      </AppLayout>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
