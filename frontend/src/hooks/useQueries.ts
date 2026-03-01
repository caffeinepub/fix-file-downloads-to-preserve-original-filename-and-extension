import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { PasteChunk, FileChunk } from '../backend';
import { ExternalBlob } from '../backend';

export interface UploadProgress {
  currentFile: number;
  totalFiles: number;
  filename: string;
  percentage: number;
}

interface CreatePasteParams {
  message: string;
  files: File[];
  expirationType: string;
  password: string | null;
  onProgress?: (progress: UploadProgress) => void;
}

export interface PasteError {
  type: 'expired' | 'not-found' | 'error';
  message: string;
  pasteId?: string;
}

export function useCreatePaste() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ message, files, expirationType, password, onProgress }: CreatePasteParams) => {
      console.log('[useCreatePaste] Starting paste creation with params:', {
        messageLength: message.trim().length,
        fileCount: files.length,
        expirationType,
        hasPassword: !!password,
      });

      if (isFetching) {
        console.error('[useCreatePaste] Actor is still initializing (isFetching=true)');
        throw new Error('Please wait while the connection is being established, then try again.');
      }

      if (!actor) {
        console.error('[useCreatePaste] Actor not available');
        throw new Error('Actor not available');
      }

      const chunks: PasteChunk[] = [];

      if (message.trim()) {
        console.log('[useCreatePaste] Adding text chunk');
        chunks.push({
          __kind__: 'text',
          text: message.trim(),
        });
      }

      if (files.length > 0) {
        console.log('[useCreatePaste] Processing files:', files.map(f => ({ name: f.name, size: f.size })));
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          console.log(`[useCreatePaste] Processing file ${i + 1}/${files.length}: ${file.name}`);
          
          if (onProgress) {
            onProgress({
              currentFile: i + 1,
              totalFiles: files.length,
              filename: file.name,
              percentage: 0,
            });
          }

          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
            if (onProgress) {
              onProgress({
                currentFile: i + 1,
                totalFiles: files.length,
                filename: file.name,
                percentage,
              });
            }
          });

          console.log(`[useCreatePaste] Calling saveFile for: ${file.name}`);
          const fileChunk = await actor.saveFile(blob, file.name, file.type || null);
          console.log(`[useCreatePaste] File saved successfully: ${file.name}`);
          
          chunks.push({
            __kind__: 'file',
            file: fileChunk,
          });
        }
      }

      console.log('[useCreatePaste] Calling createPaste with chunks:', chunks.length);
      const pasteId = await actor.createPaste(chunks, expirationType, password);
      console.log('[useCreatePaste] Backend returned paste ID:', pasteId, 'Type:', typeof pasteId);
      console.log('[useCreatePaste] Verifying paste was stored by calling getPaste...');
      
      // Verify the paste was stored correctly
      try {
        const verifyPaste = await actor.getPaste(pasteId, password);
        if (verifyPaste === null) {
          console.error('[useCreatePaste] CRITICAL: Paste verification failed - getPaste returned null for ID:', pasteId);
          console.error('[useCreatePaste] This indicates the paste was not stored in the backend pasteMap');
        } else {
          console.log('[useCreatePaste] Paste verification successful - paste exists in backend');
        }
      } catch (verifyError) {
        console.error('[useCreatePaste] Paste verification error:', verifyError);
      }
      
      return pasteId;
    },
    onSuccess: (pasteId) => {
      console.log('[useCreatePaste] onSuccess called with paste ID:', pasteId);
      console.log('[useCreatePaste] Paste ID type:', typeof pasteId);
      console.log('[useCreatePaste] Paste ID length:', pasteId?.length);
      console.log('[useCreatePaste] Paste ID value (stringified):', JSON.stringify(pasteId));
      
      queryClient.invalidateQueries({ queryKey: ['pasteHistory'] });
      console.log('[useCreatePaste] Query cache invalidated');
    },
    onError: (error: any) => {
      console.error('[useCreatePaste] onError called');
      console.error('[useCreatePaste] Error object:', error);
      console.error('[useCreatePaste] Error type:', typeof error);
      console.error('[useCreatePaste] Error message:', error?.message);
      console.error('[useCreatePaste] Error cause:', error?.cause);
      console.error('[useCreatePaste] Error stack:', error?.stack);
      
      // Check if it's a network error
      if (!error) {
        console.error('[useCreatePaste] Error is null/undefined - possible network failure');
      } else if (error.message) {
        console.error('[useCreatePaste] Error has message property:', error.message);
      } else {
        console.error('[useCreatePaste] Error has no message property - stringified:', JSON.stringify(error));
      }
      
      // Log the full error structure
      try {
        console.error('[useCreatePaste] Full error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      } catch (e) {
        console.error('[useCreatePaste] Could not stringify error:', e);
      }
    },
  });
}

export function useGetPaste(pasteId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['paste', pasteId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      console.log('[useGetPaste] Fetching paste with ID:', pasteId);
      console.log('[useGetPaste] Paste ID type:', typeof pasteId);
      console.log('[useGetPaste] Paste ID length:', pasteId.length);
      
      const paste = await actor.getPaste(pasteId, null);
      
      console.log('[useGetPaste] Backend response:', paste === null ? 'null' : 'paste object');
      
      // If paste is null, determine if it's expired or not found
      if (paste === null) {
        console.log('[useGetPaste] Paste is null, checking remaining time to determine reason...');
        try {
          const remainingTime = await actor.getRemainingTime(pasteId);
          console.log('[useGetPaste] Remaining time:', remainingTime.toString());
          
          // If remainingTime is 0, the paste exists but is expired
          if (remainingTime === BigInt(0)) {
            console.log('[useGetPaste] Paste is expired (remainingTime = 0)');
            const error: PasteError = {
              type: 'expired',
              message: 'Paste has expired',
              pasteId,
            };
            throw error;
          }
          
          // If remainingTime is > 0 but paste is null, it might be password protected
          // or there's another access issue - treat as not found for now
          console.log('[useGetPaste] Paste not found but remainingTime > 0 - possible password protection or access issue');
          const error: PasteError = {
            type: 'not-found',
            message: `Paste not found or access denied. Backend returned null for paste ID: ${pasteId}`,
            pasteId,
          };
          throw error;
        } catch (err: any) {
          // If it's already a PasteError, rethrow it
          if (err.type) {
            throw err;
          }
          
          // If getRemainingTime fails, the paste truly doesn't exist
          console.log('[useGetPaste] getRemainingTime failed - paste does not exist in backend');
          console.error('[useGetPaste] getRemainingTime error:', err);
          const error: PasteError = {
            type: 'not-found',
            message: `Paste does not exist in backend storage. Attempted ID: ${pasteId}. Backend error: ${err.message || 'Unknown'}`,
            pasteId,
          };
          throw error;
        }
      }
      
      console.log('[useGetPaste] Successfully retrieved paste');
      return paste;
    },
    enabled: !!actor && !isFetching && !!pasteId,
    retry: false,
  });
}

export function useIsPasteOwner(pasteId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['pasteOwner', pasteId],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isPasteOwner(pasteId);
    },
    enabled: !!actor && !isFetching && !!pasteId,
  });
}

export function useGetPassword(pasteId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['pastePassword', pasteId],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getPassword(pasteId);
      } catch (err) {
        console.error('[useGetPassword] Error fetching password:', err);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!pasteId,
    retry: false,
  });
}

export function useExtendExpiration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pasteId, newExpirationType }: { pasteId: string; newExpirationType: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.extendExpiration(pasteId, newExpirationType, null);
    },
    onSuccess: (_, { pasteId }) => {
      queryClient.invalidateQueries({ queryKey: ['paste', pasteId] });
      queryClient.invalidateQueries({ queryKey: ['remainingTime', pasteId] });
      queryClient.invalidateQueries({ queryKey: ['pasteHistory'] });
    },
  });
}

export function useEditPaste() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pasteId, newChunks }: { pasteId: string; newChunks: PasteChunk[] }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.editPaste(pasteId, newChunks);
    },
    onSuccess: (_, { pasteId }) => {
      queryClient.invalidateQueries({ queryKey: ['paste', pasteId] });
      queryClient.invalidateQueries({ queryKey: ['pasteHistory'] });
    },
  });
}

export function useDeletePaste() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pasteId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deletePaste(pasteId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pasteHistory'] });
    },
  });
}

export function useGetRemainingTime(pasteId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['remainingTime', pasteId],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getRemainingTime(pasteId);
    },
    enabled: !!actor && !isFetching && !!pasteId,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile({ name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetPasteHistory() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['pasteHistory'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPasteHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveFile() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ blob, filename, contentType }: { blob: ExternalBlob; filename: string; contentType: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveFile(blob, filename, contentType);
    },
  });
}
