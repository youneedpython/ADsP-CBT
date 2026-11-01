export type NoteItem = { text: string; items?: NoteItem[] };
export type NoteBlock = { type: 'heading' | 'subheading' | 'paragraph' | 'code'; text: string }
  | { type: 'list'; items: NoteItem[] }
  | { type: 'table'; head?: string[]; rows: string[][] }
  | { type: 'figure'; src: string; width: number; height: number; alt: string; caption?: string }
  | { type: 'box'; style: 'note' | 'exam'; title?: string; blocks: NoteBlock[] };
export type NotesData = { formatVersion: 1; id: string; subject: number; chapter?: number; title: string; pdf: string; units: { number: number; title: string; ref?: string; topics: string[]; blocks: NoteBlock[] }[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every(k => allowed.includes(k));
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const positive = (v: unknown) => Number.isSafeInteger(v) && (v as number) > 0;
function items(v: unknown, depth = 1): boolean {
  return Array.isArray(v) && v.every(i => object(i) && keys(i, ['text', 'items']) && text(i.text)
    && (!('items' in i) || depth < 2 && items(i.items, depth + 1)));
}
function block(v: unknown, id: string, inside = false): boolean {
  if (!object(v)) return false;
  if (inside && !['paragraph', 'list', 'table'].includes(v.type as string)) return false;
  switch (v.type) {
    case 'heading': case 'subheading': case 'paragraph': case 'code': return keys(v, ['type', 'text']) && text(v.text);
    case 'list': return keys(v, ['type', 'items']) && items(v.items);
    case 'table': {
      if (!keys(v, ['type', 'head', 'rows']) || !Array.isArray(v.rows) || !v.rows.length) return false;
      const width = Array.isArray(v.rows[0]) ? v.rows[0].length : 0;
      return width > 0 && v.rows.every(r => Array.isArray(r) && r.length === width && r.every(c => typeof c === 'string'))
        && (!('head' in v) || Array.isArray(v.head) && v.head.length === width && v.head.every(c => typeof c === 'string'));
    }
    case 'figure': return keys(v, ['type', 'src', 'width', 'height', 'alt', 'caption']) && typeof v.src === 'string'
      && new RegExp(`^notes/${id}/[A-Za-z0-9_-]+\\.png$`).test(v.src) && positive(v.width) && positive(v.height) && text(v.alt)
      && (!('caption' in v) || text(v.caption));
    case 'box': return keys(v, ['type', 'style', 'title', 'blocks']) && ['note', 'exam'].includes(v.style as string)
      && (!('title' in v) || text(v.title)) && Array.isArray(v.blocks) && v.blocks.length > 0 && v.blocks.every(b => block(b, id, true));
    default: return false;
  }
}
export function isNotesData(v: unknown): v is NotesData {
  if (!object(v) || !keys(v, ['formatVersion', 'id', 'subject', 'chapter', 'title', 'pdf', 'units']) || v.formatVersion !== 1
    || typeof v.id !== 'string' || !/^[1-9](-[1-9])?$/.test(v.id) || v.subject !== Number(v.id[0])
    || (v.id.includes('-') ? v.chapter !== Number(v.id[2]) : 'chapter' in v) || !text(v.title)
    || typeof v.pdf !== 'string' || !/^pdf\/[A-Za-z0-9_-]+\.pdf$/.test(v.pdf) || !Array.isArray(v.units) || !v.units.length) return false;
  return v.units.every((u, i) => object(u) && keys(u, ['number', 'title', 'ref', 'topics', 'blocks']) && u.number === i + 1
    && text(u.title) && (!('ref' in u) || text(u.ref)) && Array.isArray(u.topics) && u.topics.every(t => typeof t === 'string' && /^T\d{3}$/.test(t))
    && new Set(u.topics).size === u.topics.length && Array.isArray(u.blocks) && u.blocks.length > 0 && u.blocks.every(b => block(b, v.id as string)));
}
export async function loadNotes(id: string, signal?: AbortSignal): Promise<NotesData> {
  if (!/^[1-9](-[1-9])?$/.test(id)) throw new Error('없는 핵심 요약');
  const response = await fetch(`${import.meta.env.BASE_URL}data/notes/${id}.json`, { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error('핵심 요약 HTTP 오류');
  const data: unknown = await response.json();
  if (!isNotesData(data) || data.id !== id) throw new Error('핵심 요약 형식 오류');
  return data;
}
