import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useCreatePaste, type UploadProgress } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Copy, Check, ExternalLink, Loader2, FileText, X, Clock, Link2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../config/pasteLimits';
import { isValidPasteId } from '../utils/pasteIds';
import UploadProgressStatus from '../components/UploadProgressStatus';

export default function CreatePastePage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [expirationType, setExpirationType] = useState('24hours');
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const createPasteMutation = useCreatePaste();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (createPasteMutation.isPending) return; // Prevent file changes during upload
    
    const selectedFiles = Array.from(e.target.files || []);
    setError('');

    // Validate file sizes
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      setError(
        `The following files exceed the ${MAX_FILE_SIZE_MB}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`
      );
      return;
    }

    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    if (createPasteMutation.isPending) return; // Prevent file removal during upload
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!message.trim() && files.length === 0) {
      setError('Please add a message or upload at least one file.');
      return;
    }

    // Set initial preparing state immediately
    if (files.length > 0) {
      setUploadProgress({
        currentFile: 1,
        totalFiles: files.length,
        filename: files[0].name,
        percentage: 0,
        stage: 'preparing',
      });
    } else {
      // For text-only pastes, show creating state
      setUploadProgress({
        currentFile: 0,
        totalFiles: 0,
        filename: '',
        percentage: 100,
        stage: 'creating',
      });
    }

    // Allow React to render the progress UI before starting the async work
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      const pasteId = await createPasteMutation.mutateAsync({
        message: message.trim(),
        files,
        expirationType,
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
      });

      // Validate the returned paste ID
      if (!isValidPasteId(pasteId)) {
        throw new Error('Invalid paste ID returned from server');
      }

      const url = `${window.location.origin}${window.location.pathname}#/p/${pasteId}`;
      setShareUrl(url);
      toast.success('Paste created successfully!');

      // Reset form
      setMessage('');
      setFiles([]);
      setExpirationType('24hours');
      setUploadProgress(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create paste. Please try again.');
      toast.error('Failed to create paste');
      setUploadProgress(null);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) {
      toast.error('No link to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenPaste = () => {
    if (!shareUrl) {
      toast.error('No link to open');
      return;
    }

    const hashPart = shareUrl.split('#')[1];
    if (hashPart) {
      window.location.hash = hashPart;
    }
  };

  const handleCreateAnother = () => {
    setShareUrl('');
    setCopied(false);
  };

  if (shareUrl) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="app-card-elevated">
          <CardHeader>
            <CardTitle className="text-2xl">Paste Created Successfully</CardTitle>
            <CardDescription>Share this link with anyone to give them access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg break-all font-mono text-sm">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1 gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
              <Button onClick={handleOpenPaste} variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>
            </div>
            <Button onClick={handleCreateAnother} variant="secondary" className="w-full">
              Create Another Paste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Share Content Securely
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create temporary, link-based shares for text and files with automatic expiration
          </p>
        </div>

        <Card className="app-card">
          <CardContent className="pt-8">
            <div className="grid gap-6 mb-8">
              <div className="flex gap-4">
                <div className="shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Link2 className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Share via Link</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Create a unique link to share text messages and files with anyone
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Anyone with the Link Can View</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    No login required for viewers — just share the link and they're in
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 mt-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Automatic Expiration</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Content automatically expires after your chosen time period for limited-time access
                  </p>
                </div>
              </div>
            </div>
            <Alert className="bg-primary/5 border-primary/20">
              <AlertDescription className="text-center py-3">
                Please log in to create a paste. Anyone with the link will be able to view it without logging in.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isCreating = createPasteMutation.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Share Content Securely
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create temporary, link-based shares for text and files with automatic expiration
        </p>
      </div>

      <Card className="app-card">
        <CardContent className="pt-8">
          <div className="grid gap-6 pb-8 mb-8 border-b">
            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">Share via Link</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Create a unique link to share text messages and files with anyone
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">Anyone with the Link Can View</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No login required for viewers — just share the link and they're in
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 mt-1">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base">Automatic Expiration</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Content automatically expires after your chosen time period for limited-time access
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {uploadProgress && (
              <UploadProgressStatus
                currentFile={uploadProgress.currentFile}
                totalFiles={uploadProgress.totalFiles}
                filename={uploadProgress.filename}
                percentage={uploadProgress.percentage}
                stage={uploadProgress.stage}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="message" className="text-base font-semibold">Message</Label>
              <Textarea
                id="message"
                placeholder="Enter your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none"
                disabled={isCreating}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="files" className="text-base font-semibold">Files (optional)</Label>
              <div className={`border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors ${
                isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/50 cursor-pointer'
              }`}>
                <input
                  type="file"
                  id="files"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isCreating}
                />
                <label htmlFor="files" className={isCreating ? 'cursor-not-allowed' : 'cursor-pointer'}>
                  <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload files (max {MAX_FILE_SIZE_MB}MB per file)
                  </p>
                </label>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1 min-w-0">{file.name}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="shrink-0 h-8 w-8 p-0"
                          disabled={isCreating}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiration" className="text-base font-semibold">Expiration</Label>
              <Select 
                value={expirationType} 
                onValueChange={setExpirationType}
                disabled={isCreating}
              >
                <SelectTrigger id="expiration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10min">10 Minutes</SelectItem>
                  <SelectItem value="24hours">24 Hours</SelectItem>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Paste'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
