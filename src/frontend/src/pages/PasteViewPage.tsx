import { useGetPaste, useIsPasteOwner, useGetRemainingTime, PasteError } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Clock, Crown } from 'lucide-react';
import { formatRemainingTime } from '../utils/formatRemainingTime';
import { downloadExternalBlob, computeDownloadFilename } from '../utils/fileDownload';
import { toast } from 'sonner';
import ErrorState from '../components/ErrorState';

interface PasteViewPageProps {
  pasteId: string;
}

function isPasteError(error: unknown): error is PasteError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    'message' in error &&
    typeof (error as any).type === 'string' &&
    ['expired', 'not-found', 'error'].includes((error as any).type)
  );
}

export default function PasteViewPage({ pasteId }: PasteViewPageProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: paste, isLoading, error, refetch } = useGetPaste(pasteId);
  const { data: isOwner, isLoading: isOwnerLoading } = useIsPasteOwner(pasteId);
  const { data: remainingTimeNs } = useGetRemainingTime(pasteId);

  const showOwnerBadge = isAuthenticated && isOwner && !isOwnerLoading;

  const handleDownload = async (fileChunk: any, index: number) => {
    try {
      const filename = computeDownloadFilename(
        fileChunk.filename,
        fileChunk.contentType,
        index
      );
      
      await downloadExternalBlob(
        fileChunk.data,
        filename,
        fileChunk.contentType || undefined
      );
      
      toast.success('Download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download file');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="app-card">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    // Check if error is a PasteError with type information
    if (isPasteError(error)) {
      if (error.type === 'expired') {
        return (
          <div className="max-w-4xl mx-auto">
            <ErrorState
              type="expired"
              onRetry={() => refetch()}
              retryLabel="Retry Loading Paste"
            />
          </div>
        );
      }
      
      if (error.type === 'not-found') {
        return (
          <div className="max-w-4xl mx-auto">
            <ErrorState
              type="not-found"
            />
          </div>
        );
      }
      
      // Generic error with PasteError structure
      return (
        <div className="max-w-4xl mx-auto">
          <ErrorState
            type="error"
            onRetry={() => refetch()}
            details={error.message}
            retryLabel="Retry Loading Paste"
          />
        </div>
      );
    }
    
    // Handle standard Error objects
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          type="error"
          onRetry={() => refetch()}
          details={errorMessage}
          retryLabel="Retry Loading Paste"
        />
      </div>
    );
  }

  if (!paste) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          type="not-found"
        />
      </div>
    );
  }

  const textChunks = paste.items.filter(item => item.__kind__ === 'text');
  const fileChunks = paste.items.filter(item => item.__kind__ === 'file');
  const remainingTime = remainingTimeNs ? formatRemainingTime(remainingTimeNs) : 'Loading...';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="app-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Shared Content</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expires in {remainingTime}</span>
              </div>
            </div>
            {showOwnerBadge && (
              <Badge variant="secondary" className="gap-1 self-start">
                <Crown className="h-3 w-3" />
                Your Paste
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Text Content */}
          {textChunks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
              <div className="p-4 bg-muted rounded-lg">
                <pre className="whitespace-pre-wrap break-words text-sm font-mono">
                  {textChunks.map(chunk => chunk.text).join('\n\n')}
                </pre>
              </div>
            </div>
          )}

          {/* Files Section */}
          {fileChunks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Files ({fileChunks.length})
              </h3>
              <div className="space-y-2">
                {fileChunks.map((chunk, index) => {
                  const fileChunk = chunk.file;
                  return (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {fileChunk.filename}
                          </p>
                          {fileChunk.contentType && (
                            <p className="text-xs text-muted-foreground">
                              {fileChunk.contentType}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(fileChunk, index)}
                        className="gap-2 shrink-0 w-full sm:w-auto"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Login Prompt for Anonymous Users */}
          {!isAuthenticated && (
            <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
              <p className="text-sm text-center text-muted-foreground">
                <strong>Want to manage your pastes?</strong> Login to extend expiration, edit, delete, or add password protection.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
