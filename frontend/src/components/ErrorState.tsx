import { AlertCircle, RefreshCw, Clock, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ErrorStateProps {
  type: 'expired' | 'not-found' | 'error';
  pasteId?: string;
  onRetry?: () => void;
  details?: string;
  retryLabel?: string;
}

export default function ErrorState({ type, pasteId, onRetry, details, retryLabel = 'Retry' }: ErrorStateProps) {
  const config = {
    expired: {
      icon: Clock,
      title: 'Paste Expired',
      message: 'This paste has reached its expiration time and is no longer available.',
      illustration: '/assets/generated/upload-illustration.dim_1200x600.png',
    },
    'not-found': {
      icon: FileQuestion,
      title: 'Paste Not Found',
      message: 'This paste does not exist or has been removed.',
      illustration: '/assets/generated/upload-illustration.dim_1200x600.png',
    },
    error: {
      icon: AlertCircle,
      title: 'Something Went Wrong',
      message: 'We encountered an error while loading this paste.',
      illustration: '/assets/generated/upload-illustration.dim_1200x600.png',
    },
  };

  const { icon: Icon, title, message, illustration } = config[type];

  return (
    <div className="max-w-2xl mx-auto text-center space-y-6">
      <div className="relative w-full max-w-md mx-auto aspect-[2/1] mb-8">
        <img
          src={illustration}
          alt={title}
          className="w-full h-full object-contain opacity-50"
        />
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon className="h-8 w-8 text-destructive" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{message}</p>
        
        {pasteId && (
          <Alert className="text-left max-w-md mx-auto mt-4">
            <AlertDescription className="text-sm space-y-2">
              <div>
                <strong>Requested Paste ID:</strong>
                <div className="mt-1 p-2 bg-muted rounded font-mono text-xs break-all">
                  {pasteId}
                </div>
              </div>
              {details && (
                <div>
                  <strong>Additional Info:</strong>
                  <div className="mt-1 text-muted-foreground">
                    {details}
                  </div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {!pasteId && details && (
          <Alert className="text-left max-w-md mx-auto mt-4">
            <AlertDescription className="text-sm">
              <strong>Details:</strong> {details}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {onRetry && (
        <Button onClick={onRetry} className="gap-2 mt-6">
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
