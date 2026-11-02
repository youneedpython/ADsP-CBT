import type { DownloadFile, DownloadType } from '../data/loadDownloads';
import { useDownloads } from './DownloadsContext';
import { useExam } from './ExamContext';
export const downloadTypes = ['type1', 'type2'] as const;
export const downloadLabels = { type1: '풀이용', type2: '해설용' };
export const subjectTypes = ['summary', 'solutions'] as const;
export const subjectLabels = { summary: '핵심 요약', solutions: '풀이 모음' };
export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
export function DownloadLink({ round, type, file }: { round: number; type: DownloadType; file: DownloadFile }) {
  const exam = useExam();
  const label = downloadLabels[type];
  return <PdfItem kind={type} label={label} file={file} name={`${round}회 ${label}`} filename={`${exam.name}_${round}회_${label}.pdf`} />;
}
export function PdfIcon({ kind }: { kind: 'open' | 'download' | 'summary' | 'solutions' | DownloadType }) {
  const paths = { open: 'M14 3h7v7M21 3 10 14M10 3H3v18h18v-7', download: 'M12 3v12m-5-5 5 5 5-5M3 17v4h18v-4', summary: 'M5 3h15v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 14h15M8 7h8M8 11h5', solutions: 'm3 5 2 2 3-4M11 5h10M3 12l2 2 3-4M11 12h10M3 19l2 2 3-4M11 19h10', type1: 'm3 16 13-13 5 5L8 21H3v-5Zm10-10 5 5', type2: 'm3 5 2 2 3-4M11 5h10M3 12l2 2 3-4M11 12h10M3 19l2 2 3-4M11 19h10' };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[kind]} /></svg>;
}
export function PdfItem({ kind, label, file, name, filename, questionCount }: { kind: 'summary' | 'solutions' | DownloadType; label: string; file: DownloadFile; name: string; filename: string; questionCount?: number }) {
  return <div className="pdf-item"><span className={`pdf-icon pdf-icon-${kind}`}><PdfIcon kind={kind} /></span><div className="pdf-content"><div className="pdf-heading"><strong>{label}</strong><PdfActions file={file} name={name} filename={filename} /></div><small className="pdf-info">{questionCount !== undefined && <><span>{questionCount}문항</span>{' · '}</>}<span>{file.pages}쪽</span>{' · '}<span>{formatFileSize(file.bytes)}</span></small></div></div>;
}
export function PdfActions({ file, name, filename }: { file: DownloadFile; name: string; filename: string }) {
  const href = `${import.meta.env.BASE_URL}${file.file}`, size = formatFileSize(file.bytes);
  return <div className="pdf-buttons"><a className="pdf-open" href={href} target="_blank" rel="noopener" aria-label={`${name} PDF 새 탭에서 보기`}><PdfIcon kind="open" />보기</a><a className="pdf-save" href={href} download={filename} aria-label={`${name} PDF 내려받기, ${size}`}><PdfIcon kind="download" />내려받기</a></div>;
}
export function RoundDownloads({ round }: { round: number }) {
  const { state } = useDownloads();
  const files = state.status === 'success' ? state.data.rounds[round] : undefined;
  if (!files || !downloadTypes.some(type => files[type])) return null;
  return <section className="overview-panel round-downloads"><h2>PDF 자료</h2><div className="download-actions">{downloadTypes.map(type => files[type] && <DownloadLink key={type} round={round} type={type} file={files[type]} />)}</div></section>;
}
