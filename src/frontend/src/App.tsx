import { useState, useEffect } from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import CreatePastePage from './pages/CreatePastePage';
import PasteViewPage from './pages/PasteViewPage';
import AppLayout from './components/AppLayout';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [currentRoute, setCurrentRoute] = useState<{ path: string; params?: Record<string, string> }>({
    path: '/',
  });

  useEffect(() => {
    const handleRouteChange = () => {
      const hash = window.location.hash.slice(1) || '/';
      const [path, queryString] = hash.split('?');
      
      // Parse route params for /p/:id pattern
      const pasteMatch = path.match(/^\/p\/(.+)$/);
      if (pasteMatch) {
        setCurrentRoute({ path: '/p/:id', params: { id: pasteMatch[1] } });
      } else {
        setCurrentRoute({ path });
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
