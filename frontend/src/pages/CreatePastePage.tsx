import { useState } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useCreatePaste, type UploadProgress } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Copy, Check, ExternalLink, Loader2, FileText, X, Clock, Link2, Shield, LogOut, Sparkles, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../config/pasteLimits';
import { isValidPasteId } from '../utils/pasteIds';
import { normalizeBackendError } from '../utils/backendError';
import UploadProgressStatus from '../components/UploadProgressStatus';

export default function CreatePastePage() {
  const { identity, clear } = useInternetIdentity();
  const { isFetching: actorFetching } = useActor();
  const isAuthenticated = !!identity;

  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expirationType, setExpirationType] = useState('24hours');
  const [error, setError] = useState('');
  const [isAuthError, setIsAuthError] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number>(0);

  const createPasteMutation = useCreatePaste();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    // Validate each file size
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      setError(`Some files exceed the ${MAX_FILE_SIZE_MB}MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setFiles(selectedFiles);
    setError('');
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsAuthError(false);

    console.log('[CreatePastePage] Form submitted');

    // Prevent double submission
    const now = Date.now();
    if (now - lastSubmittedAt < 2000) {
      console.log('[CreatePastePage] Prevented double submission');
      return;
    }
    setLastSubmittedAt(now);

    if (!message.trim() && files.length === 0) {
      console.log('[CreatePastePage] Validation failed: no message or files');
      setError('Please enter a message or select at least one file');
      return;
    }

    // Guard: actor must be fully initialized before attempting upload
    if (actorFetching) {
      console.log('[CreatePastePage] Actor is still initializing, aborting submit');
      setError('Connection is still initializing. Please wait a moment and try again.');
      return;
    }

    console.log('[CreatePastePage] Starting paste creation mutation');

    try {
      const finalPassword = isAuthenticated && password.trim() ? password.trim() : null;
      
      console.log('[CreatePastePage] Calling mutateAsync with:', {
        messageLength: message.trim().length,
        fileCount: files.length,
        expirationType,
        hasPassword: !!finalPassword,
      });

      const pasteId = await createPasteMutation.mutateAsync({
        message: message.trim(),
        files,
        expirationType,
        password: finalPassword,
        onProgress: setUploadProgress,
      });

      console.log('[CreatePastePage] Mutation completed, received paste ID:', pasteId);
      console.log('[CreatePastePage] Paste ID type:', typeof pasteId);
      console.log('[CreatePastePage] Paste ID length:', pasteId?.length);

      if (!pasteId) {
        console.error('[CreatePastePage] Paste ID is empty/null/undefined');
        throw new Error('Empty paste ID received from backend');
      }

      if (!isValidPasteId(pasteId)) {
        console.error('[CreatePastePage] Invalid paste ID format:', pasteId);
        throw new Error('Invalid paste ID received from backend');
      }

      console.log('[CreatePastePage] Paste ID validation passed');

      const url = `${window.location.origin}${window.location.pathname}#/${pasteId}`;
      console.log('[CreatePastePage] Constructed share URL:', url);
      
      setShareUrl(url);
      setMessage('');
      setFiles([]);
      setPassword('');
      setUploadProgress(null);
      
      console.log('[CreatePastePage] State updated, showing success toast');
      toast.success('Paste created successfully!');
    } catch (err: any) {
      console.error('[CreatePastePage] Error caught in handleSubmit:', err);
      console.error('[CreatePastePage] Error type:', typeof err);
      console.error('[CreatePastePage] Error message:', err?.message);
      console.error('[CreatePastePage] Error stack:', err?.stack);
      console.error('[CreatePastePage] Full error object:', err);
      
      const { message: errorMsg, isAuthRelated } = normalizeBackendError(err);
      console.log('[CreatePastePage] Normalized error:', { errorMsg, isAuthRelated });
      
      setError(errorMsg);
      setIsAuthError(isAuthRelated);
      setUploadProgress(null);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenUrl = () => {
    window.open(shareUrl, '_blank');
  };

  const handleCreateAnother = () => {
    setShareUrl('');
    setCopied(false);
  };

  const handleLogout = async () => {
    await clear();
    toast.success('Logged out successfully');
  };

  const isUploading = createPasteMutation.isPending;
  // Disable submit while actor is initializing (e.g. after login) to prevent using wrong actor
  const isActorReady = !actorFetching;

  if (shareUrl) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="app-card-elevated">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Paste Created!</CardTitle>
            <CardDescription>
              Share this link with anyone. {isAuthenticated ? 'You can manage it from your History page.' : 'Login to manage your pastes.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg break-all text-sm font-mono">
              {shareUrl}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={handleCopyUrl}
                className="flex-1 gap-2"
                variant={copied ? 'secondary' : 'default'}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                onClick={handleOpenUrl}
                variant="outline"
                className="flex-1 gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Button>
            </div>
            <Button
              onClick={handleCreateAnother}
              variant="ghost"
              className="w-full"
            >
              Create Another Paste
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="app-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Create Paste</CardTitle>
              <CardDescription>
                Share text and files with an expiration time
              </CardDescription>
            </div>
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Premium Features Banner */}
            {!isAuthenticated && (
              <Alert className="bg-accent/5 border-accent/20">
                <Sparkles className="h-4 w-4 text-accent" />
                <AlertDescription className="text-sm">
                  <strong>Login to unlock:</strong> Extend expiration, edit pastes, delete anytime, password protection, and view history
                </AlertDescription>
              </Alert>
            )}

            {/* Actor initializing notice */}
            {actorFetching && (
              <Alert className="bg-muted border-border">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Establishing secure connection{isAuthenticated ? ' with your identity' : ''}…
                </AlertDescription>
              </Alert>
            )}

            {/* Message Input */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={6}
                className="resize-none"
                disabled={isUploading}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="files">Files (Optional, {MAX_FILE_SIZE_MB}MB per file)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="files"
                  type="file"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  multiple
                  className="cursor-pointer"
                />
              </div>
              {files.length > 0 && (
                <div className="space-y-2 mt-3">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Password Protection (Authenticated Users Only) */}
            {isAuthenticated && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" />
                  <Label htmlFor="password">Password Protection (Optional)</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password to protect this paste"
                    disabled={isUploading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isUploading}
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Expiration Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="expiration">Expiration Time</Label>
              </div>
              <Select
                value={expirationType}
                onValueChange={setExpirationType}
                disabled={isUploading}
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

            {/* Upload Progress */}
            {uploadProgress && (
              <UploadProgressStatus
                currentFile={uploadProgress.currentFile}
                totalFiles={uploadProgress.totalFiles}
                filename={uploadProgress.filename}
                percentage={uploadProgress.percentage}
              />
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="flex items-start gap-2">
                  <div className="flex-1">{error}</div>
                  {!isAuthError && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setError('')}
                      className="shrink-0 h-auto p-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={isUploading || !isActorReady || (!message.trim() && files.length === 0)}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress ? 'Uploading...' : 'Creating...'}
                </>
              ) : actorFetching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Create Paste
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
