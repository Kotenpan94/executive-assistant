// Talks to the dev extraction server (server/). The API key lives there, never in the app.

import type { DocumentPickerAsset } from 'expo-document-picker';
import Constants from 'expo-constants';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import type { ExtractionResult, ExtractRequest, ExtractResponse, UploadKind } from '../types/extraction';

const SERVER_PORT = 8787;
const TIMEOUT_MS = 150_000; // long documents can take a while to read

/**
 * Where the extraction server is. Set EXPO_PUBLIC_EXTRACT_URL to override.
 * Otherwise it's assumed to run on the same machine as the Expo dev server.
 */
export function extractServerUrl(): string {
  const override = process.env.EXPO_PUBLIC_EXTRACT_URL;
  if (override) return override.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
  }
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost ?? 'localhost'}:${SERVER_PORT}`;
}

const EXTENSION_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  txt: 'text/plain',
  md: 'text/plain',
};

export function mimeTypeOf(asset: DocumentPickerAsset): string {
  if (asset.mimeType) return asset.mimeType;
  const ext = asset.name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TYPES[ext] ?? 'application/octet-stream';
}

function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(',');
  return value.startsWith('data:') && comma !== -1 ? value.slice(comma + 1) : value;
}

async function readAsBase64(asset: DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    if (asset.base64) return stripDataUrlPrefix(asset.base64);
    if (asset.file) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(asset.file as Blob);
      });
      return stripDataUrlPrefix(dataUrl);
    }
    throw new Error("Couldn't open that file.");
  }
  return new File(asset.uri).base64();
}

function localDateString(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export async function extractDocument(
  asset: DocumentPickerAsset,
  kind: UploadKind,
  knownClasses: string[],
  now: Date,
): Promise<ExtractionResult> {
  let base64: string;
  try {
    base64 = await readAsBase64(asset);
  } catch {
    throw new Error("Couldn't open that file. Try choosing it again.");
  }

  const body: ExtractRequest = {
    fileName: asset.name,
    mimeType: mimeTypeOf(asset),
    base64,
    kind,
    today: localDateString(now),
    knownClasses,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${extractServerUrl()}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      controller.signal.aborted
        ? 'Reading this file took too long. Try a shorter document, or just the schedule pages.'
        : `Couldn't reach the reading service at ${extractServerUrl()}. Is the dev server running?`,
    );
  } finally {
    clearTimeout(timer);
  }

  let data: ExtractResponse;
  try {
    data = (await res.json()) as ExtractResponse;
  } catch {
    throw new Error('Got an unexpected answer from the reading service. Try again in a moment.');
  }
  if (!data.ok) throw new Error(data.error);
  return data.result;
}
