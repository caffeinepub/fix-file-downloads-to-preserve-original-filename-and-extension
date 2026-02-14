import { useGetPaste } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Loader2, Clock } from 'lucide-react';
import ErrorState from '../components/ErrorState';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { computeDownloadFilename, downloadExternalBlob } from '../utils/fileDownload';
import { useState } from 'react';
import { isValidPasteId } from '../utils/pasteIds';
import { formatRemainingTime } from '../utils/formatRemainingTime';

interface PasteViewPageProps {
  pasteId: string;
}

export default function PasteViewPage({ pasteId }: PasteViewPageProps) {
  // Always call hooks at the top level - validate after
  const { data: pasteData, isLoading, error, refetch } = useGetPaste(pasteId);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const handleDownload = async (
    blob: ExternalBlob,
    filename: string | undefined,
    contentType: string | undefined,
    index: number
  ) => {
    try {
      setDownloadingIndex(index);
      
      // Compute the proper download filename with extension
      const downloadFilename = computeDownloadFilename(filename, contentType, index);
      
      // Download using blob bytes and Object URL
      await downloadExternalBlob(blob, downloadFilename, contentType);
      
      toast.success('Download started');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download file');
    } finally {
      setDownloadingIndex(null);
    }
  };

  // Validate paste ID after hooks are called
  if (!isValidPasteId(pasteId)) {
    return <ErrorState type="not-found" />;
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    const errorMessage = error.message || '';
    
    // Distinguish between different error types
    if (errorMessage.includes('expired')) {
      return <ErrorState type="expired" />;
    } else if (
      errorMessage.includes('does not exist') || 
      errorMessage.includes('has been deleted') ||
      errorMessage.includes('Invalid paste ID')
    ) {
      return <ErrorState type="not-found" />;
    } else {
      // Network/initialization/environment errors - show actionable error with retry
      return (
        <ErrorState 
          type="error" 
          message={errorMessage}
          onRetry={() => refetch()}
        />
      );
    }
  }

  if (!pasteData) {
    return <ErrorState type="not-found" />;
  }

  const { chunks, remainingTime } = pasteData;
  const textChunks = chunks.filter(c => c.type === 'text');
  const fileChunks = chunks.filter(c => c.type === 'file');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Shared Paste</CardTitle>
              <CardDescription>View and download shared content</CardDescription>
            </div>
            {remainingTime > 0n && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expires in {formatRemainingTime(remainingTime)}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {textChunks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Message</h3>
              <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap break-words">
                {textChunks[0].content}
              </div>
            </div>
          )}

          {textChunks.length > 0 && fileChunks.length > 0 && <Separator />}

          {fileChunks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Files ({fileChunks.length})
              </h3>
              <div className="space-y-2">
                {fileChunks.map((chunk, index) => {
                  // Display filename with fallback for older pastes
                  const displayName = chunk.filename || `Unknown filename (file-${index + 1})`;
                  const isDownloading = downloadingIndex === index;
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{displayName}</span>
                      </div>
                      <Button
                        onClick={() => handleDownload(chunk.blob, chunk.filename, chunk.contentType, index)}
                        variant="outline"
                        size="sm"
                        className="gap-2 shrink-0"
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
