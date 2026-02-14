import { AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  type: 'not-found' | 'expired' | 'error';
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ type, message, onRetry }: ErrorStateProps) {
  const getContent = () => {
    switch (type) {
      case 'expired':
        return {
          icon: <Clock className="h-12 w-12 text-muted-foreground" />,
          title: 'Link Expired',
          description: message || 'Link expired — contact the sender to resend the content.',
          showRetry: false,
        };
      case 'not-found':
        return {
          icon: <AlertCircle className="h-12 w-12 text-muted-foreground" />,
          title: 'Not Found',
          description: message || 'This paste does not exist or has been deleted.',
          showRetry: false,
        };
      default:
        return {
          icon: <AlertCircle className="h-12 w-12 text-destructive" />,
          title: 'Error',
          description: message || 'An error occurred while loading this paste. This may be due to a network issue or initialization problem.',
          showRetry: true,
        };
    }
  };

  const content = getContent();

  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="flex flex-col items-center text-center space-y-6">
        <img
          src="/assets/generated/upload-illustration.dim_1200x600.png"
          alt="Error illustration"
          className="w-full max-w-md opacity-60"
        />
        <div className="space-y-4">
          {content.icon}
          <h2 className="text-2xl font-bold text-foreground mt-4">{content.title}</h2>
          <p className="text-muted-foreground max-w-md">{content.description}</p>
          
          {content.showRetry && onRetry && (
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={onRetry} variant="default" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
