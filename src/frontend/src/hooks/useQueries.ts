import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { ExternalBlob, type PasteChunk, type PasteChunkType } from '../backend';
import { isValidPasteId, normalizePasteId } from '../utils/pasteIds';

export interface UploadProgress {
  currentFile: number;
  totalFiles: number;
  filename: string;
  percentage: number;
  stage: 'preparing' | 'uploading' | 'creating';
}

export function useCreatePaste() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      message,
      files,
      expirationType,
      onProgress,
    }: {
      message: string;
      files: File[];
      expirationType: string;
      onProgress?: (progress: UploadProgress) => void;
    }) => {
      if (!actor) throw new Error('Actor not available');

      const chunks: PasteChunk[] = [];

      // Add text message if provided
      if (message.trim()) {
        chunks.push({
          __kind__: 'text',
          text: message.trim(),
        });
      }

      // Add files with original filename and MIME type
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Show preparing state before reading file
        if (onProgress) {
          onProgress({
            currentFile: i + 1,
            totalFiles: files.length,
            filename: file.name,
            percentage: 0,
            stage: 'preparing',
          });
        }
        
        // Read file into memory
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Create blob with upload progress tracking
        let blob = ExternalBlob.fromBytes(uint8Array);
        
        if (onProgress) {
          blob = blob.withUploadProgress((percentage) => {
            onProgress({
              currentFile: i + 1,
              totalFiles: files.length,
              filename: file.name,
              percentage: Math.round(percentage),
              stage: 'uploading',
            });
          });
        }
        
        // Save file to backend with original filename and content type
        const savedFileChunk = await actor.saveFile(
          blob,
          file.name,
          file.type || null
        );
        
        chunks.push({
          __kind__: 'file',
          file: savedFileChunk,
        });
      }

      // Notify that we're creating the paste
      if (onProgress) {
        onProgress({
          currentFile: files.length,
          totalFiles: files.length,
          filename: '',
          percentage: 100,
          stage: 'creating',
        });
      }

      // Create paste
      const pasteId = await actor.createPaste(chunks, expirationType);
      
      // Validate returned paste ID
      if (!isValidPasteId(pasteId)) {
        throw new Error('Invalid paste ID returned from backend');
      }
      
      return pasteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pastes'] });
    },
  });
}

export function useGetPaste(pasteId: string) {
  const { actor, isFetching: actorFetching } = useActor();
  
  // Normalize the paste ID (trim whitespace, already decoded by extractPasteIdFromRoute)
  const normalizedPasteId = normalizePasteId(pasteId);

  return useQuery({
    queryKey: ['paste', normalizedPasteId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      // Validate paste ID before making the call
      if (!isValidPasteId(normalizedPasteId)) {
        throw new Error('Invalid paste ID');
      }

      // Backend's getPasteChunksWithTypes and getRemainingTime handle legacy ID resolution internally
      const chunksWithTypes = await actor.getPasteChunksWithTypes(normalizedPasteId);
      const remainingTime = await actor.getRemainingTime(normalizedPasteId);

      const chunks = chunksWithTypes.map(([chunk, type]) => {
        if (type === 'text' && chunk.__kind__ === 'text') {
          return {
            type: 'text' as const,
            content: chunk.text,
          };
        } else if (type === 'file' && chunk.__kind__ === 'file') {
          return {
            type: 'file' as const,
            blob: chunk.file.data,
            filename: chunk.file.filename,
            contentType: chunk.file.contentType,
          };
        }
        throw new Error('Invalid chunk type');
      });

      return { chunks, remainingTime };
    },
    enabled: !!actor && !actorFetching && isValidPasteId(normalizedPasteId),
    retry: false,
  });
}
