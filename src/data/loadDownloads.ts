export type DownloadType = 'type1' | 'type2';
export type DownloadFile = { file: string; bytes: number };
export type DownloadsData = { formatVersion: 1; rounds: Record<string, Partial<Record<DownloadType, DownloadFile>>> };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
export function isDownloadsData(v: unknown): v is DownloadsData {
  if (!object(v) || !keys(v, ['formatVersion', 'rounds']) || v.formatVersion !== 1 || !object(v.rounds)) return false;
  return Object.entries(v.rounds).every(([round, files]) => /^[1-9]\d*$/.test(round) && Number.isSafeInteger(Number(round))
    && object(files) && keys(files, ['type1', 'type2']) && Object.values(files).every(f => object(f)
      && keys(f, ['file', 'bytes']) && typeof f.file === 'string' && /^pdf\/[A-Za-z0-9_-]+\.pdf$/.test(f.file)
      && Number.isSafeInteger(f.bytes) && (f.bytes as number) > 0));
}
export async function loadDownloads(signal?: AbortSignal): Promise<DownloadsData> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/downloads.json`, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('PDF 목록 HTTP 오류');
  const data: unknown = await response.json();
  if (!isDownloadsData(data)) throw new Error('PDF 목록 형식 오류');
  return data;
}
