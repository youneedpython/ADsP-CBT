import { exams, type Exam } from '../domain/exams';
export type DownloadType = 'type1' | 'type2';
export type DownloadFile = { file: string; bytes: number; pages: number };
export type SubjectDownload = { id: string; subject: number; subjectName: string; chapter?: number; notes?: string; name: string; questionCount: number; summary?: DownloadFile; solutions?: DownloadFile };
export type DownloadsData = { formatVersion: 1; rounds: Record<string, Partial<Record<DownloadType, DownloadFile>>>; subjects?: SubjectDownload[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
export function isDownloadsData(v: unknown): v is DownloadsData {
  if (!object(v) || !keys(v, ['formatVersion', 'rounds', 'subjects']) || v.formatVersion !== 1 || !object(v.rounds)) return false;
  if ('subjects' in v) {
    if (!Array.isArray(v.subjects)) return false;
    const ids = new Set<string>();
    for (const s of v.subjects) {
      if (!object(s) || !keys(s, ['id', 'subject', 'subjectName', 'chapter', 'name', 'questionCount', 'summary', 'solutions', 'notes'])
        || ('notes' in s && (typeof s.notes !== 'string' || !/^notes\/[A-Za-z0-9-]+\.json$/.test(s.notes)))
        || typeof s.id !== 'string' || !/^[1-9](-[1-9])?$/.test(s.id) || ids.has(s.id)
        || s.subject !== Number(s.id[0]) || typeof s.subjectName !== 'string' || !s.subjectName.trim()
        || (s.id.includes('-') ? s.chapter !== Number(s.id[2]) : 'chapter' in s) || typeof s.name !== 'string' || !s.name.trim()
        || !Number.isSafeInteger(s.questionCount) || (s.questionCount as number) <= 0
        || !('summary' in s || 'solutions' in s)
        || ['summary', 'solutions'].some(k => k in s && !isDownloadFile(s[k]))) return false;
      ids.add(s.id);
    }
  }
  return Object.entries(v.rounds).every(([round, files]) => /^[1-9]\d*$/.test(round) && Number.isSafeInteger(Number(round))
    && object(files) && keys(files, ['type1', 'type2']) && Object.values(files).every(isDownloadFile));
}
function isDownloadFile(f: unknown): f is DownloadFile {
  return object(f) && keys(f, ['file', 'bytes', 'pages']) && typeof f.file === 'string'
    && /^pdf\/(?:sqld\/)?[A-Za-z0-9_-]+\.pdf$/.test(f.file) && Number.isSafeInteger(f.bytes) && (f.bytes as number) > 0
    && Number.isSafeInteger(f.pages) && (f.pages as number) > 0;
}
export async function loadDownloads(signal?: AbortSignal, exam: Exam = exams[0]): Promise<DownloadsData> {
  const response = await fetch(`${import.meta.env.BASE_URL}${exam.downloadsFile}`, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('PDF 목록 HTTP 오류');
  const data: unknown = await response.json();
  if (!isDownloadsData(data)) throw new Error('PDF 목록 형식 오류');
  return data;
}
