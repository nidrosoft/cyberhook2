"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UseFileUploadOptions {
  onSuccess?: (storageUrl: string) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(options?: UseFileUploadOptions) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setProgress(10);

    try {
      // Step 1: Get a short-lived upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      setProgress(30);

      // Step 2: Upload the file to the URL
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`);
      }

      const { storageId } = await result.json();
      setProgress(80);

      // Step 3: Get the serving URL
      // Convex storage URLs follow the pattern: https://<deployment>.convex.cloud/api/storage/<storageId>
      // We store the storageId and resolve the URL when needed, but for imageUrl fields
      // we need the full URL. Use the upload response directly.
      const servingUrl = `${new URL(uploadUrl).origin}/api/storage/${storageId}`;
      
      setProgress(100);
      options?.onSuccess?.(servingUrl);
      return servingUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      options?.onError?.(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { upload, isUploading, progress };
}
