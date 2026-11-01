import type { DownloadFile, DownloadType } from '../data/loadDownloads';
import { useDownloads } from './DownloadsContext';
export const downloadTypes = ['type1', 'type2'] as const;
export const downloadLabels = { type1: '풀이용', type2: '해설용' };
export const downloadDescriptions = { type1: '문제와 보기, 정답·해설은 맨 뒤', type2: '문제마다 정답과 자세한 풀이' };
export const subjectTypes = ['summary', 'solutions'] as const;
export const subjectLabels = { summary: '쉬운 설명', solutions: '풀이 모음' };
export const subjectDescriptions = { summary: '개념을 쉽게 풀어 쓴 핵심 정리', solutions: '기출 문제를 주제 순서로 모은 자세한 풀이, 문항마다 출처 회차 표시' };
export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
export function DownloadLink({ round, type, file }: { round: number; type: DownloadType; file: DownloadFile }) {
  const label = downloadLabels[type];
  return <div className="pdf-group"><strong>{label} PDF</strong><PdfActions file={file} name={`${round}회 ${label}`} filename={`ADsP_${round}회_${label}.pdf`} /></div>;
}
export function PdfActions({ file, name, filename }: { file: DownloadFile; name: string; filename: string }) {
  const href = `${import.meta.env.BASE_URL}${file.file}`, size = formatFileSize(file.bytes);
  return <div className="pdf-buttons"><a className="button secondary" href={href} target="_blank" rel="noopener" aria-label={`${name} PDF 새 탭에서 보기`}>보기 <span aria-hidden="true">↗</span></a><a className="button secondary" href={href} download={filename} aria-label={`${name} PDF 내려받기, ${size}`}>내려받기 <small>{size}</small></a></div>;
}
export function RoundDownloads({ round }: { round: number }) {
  const { state } = useDownloads();
  const files = state.status === 'success' ? state.data.rounds[round] : undefined;
  if (!files || !downloadTypes.some(type => files[type])) return null;
  return <section className="overview-panel round-downloads"><h2>PDF 자료</h2><div className="download-actions">{downloadTypes.map(type => files[type] && <div key={type}><strong>{downloadLabels[type]} PDF</strong><p>{downloadDescriptions[type]}</p><PdfActions file={files[type]} name={`${round}회 ${downloadLabels[type]}`} filename={`ADsP_${round}회_${downloadLabels[type]}.pdf`} /></div>)}</div></section>;
}
