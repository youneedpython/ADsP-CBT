import type { DownloadFile, DownloadType } from '../data/loadDownloads';
import { useDownloads } from './DownloadsContext';
export const downloadTypes = ['type1', 'type2'] as const;
export const downloadLabels = { type1: '풀이용', type2: '해설용' };
export const downloadDescriptions = { type1: '문제와 보기, 정답·해설은 맨 뒤', type2: '문제마다 정답 표시와 해설' };
export function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
export function DownloadLink({ round, type, file }: { round: number; type: DownloadType; file: DownloadFile }) {
  const label = downloadLabels[type], size = formatFileSize(file.bytes);
  return <a className="button secondary" href={`${import.meta.env.BASE_URL}${file.file}`} download={`ADsP_${round}회_${label}.pdf`} aria-label={`${round}회 ${label} PDF 내려받기, ${size}`}>{label} PDF <small>{size}</small></a>;
}
export function RoundDownloads({ round }: { round: number }) {
  const { state } = useDownloads();
  const files = state.status === 'success' ? state.data.rounds[round] : undefined;
  if (!files || !downloadTypes.some(type => files[type])) return null;
  return <section className="overview-panel round-downloads"><h2>PDF 내려받기</h2><div className="download-actions">{downloadTypes.map(type => files[type] && <div key={type}><DownloadLink round={round} type={type} file={files[type]} /><p>{downloadDescriptions[type]}</p></div>)}</div></section>;
}
