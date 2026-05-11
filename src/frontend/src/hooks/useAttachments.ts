import { useCallback, useRef } from "react";

export interface AttachmentMetadata {
  id: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  storageHash?: string;
  previewUrl?: string;
  uploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

// Persist attachments per incident ticket in localStorage
const STORAGE_KEY = "rktr_incident_attachments";

export function loadAttachments(ticketNumber: string): AttachmentMetadata[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, AttachmentMetadata[]>;
    return all[ticketNumber] ?? [];
  } catch {
    return [];
  }
}

export function saveAttachments(
  ticketNumber: string,
  attachments: AttachmentMetadata[],
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw
      ? (JSON.parse(raw) as Record<string, AttachmentMetadata[]>)
      : {};
    all[ticketNumber] = attachments.filter((a) => !a.uploading && !a.error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function removeAttachmentFromStorage(
  ticketNumber: string,
  attachmentId: string,
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw) as Record<string, AttachmentMetadata[]>;
    all[ticketNumber] = (all[ticketNumber] ?? []).filter(
      (a) => a.id !== attachmentId,
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// Derive a deterministic pseudo-hash from file content for dedup tracking
async function deriveHash(file: File): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return crypto.randomUUID().replace(/-/g, "");
  }
}

export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/gif": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "doc",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xls",
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES[file.type]) {
    return `"${file.name}" is not a supported file type. Allowed: images, PDF, Word, Excel.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `"${file.name}" exceeds the 10 MB size limit.`;
  }
  return null;
}

export function useStorageUpload() {
  const abortRefs = useRef<Record<string, boolean>>({});

  const upload = useCallback(
    async (
      file: File,
      onProgress: (pct: number) => void,
    ): Promise<{ hash: string; previewUrl?: string }> => {
      // Simulate upload progress in 10% increments
      for (let pct = 10; pct <= 90; pct += 10) {
        if (abortRefs.current[file.name]) break;
        onProgress(pct);
        await new Promise<void>((r) => setTimeout(r, 30));
      }
      const hash = await deriveHash(file);
      onProgress(100);
      let previewUrl: string | undefined;
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }
      return { hash, previewUrl };
    },
    [],
  );

  const getUrl = useCallback(async (_hash: string): Promise<string> => {
    // Without CDN storage, URLs are session-scoped object URLs only
    return "";
  }, []);

  const cancel = useCallback((id: string) => {
    abortRefs.current[id] = true;
  }, []);

  return { upload, getUrl, cancel };
}
