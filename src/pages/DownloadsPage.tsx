import { useDownloads } from '../components/DownloadsContext';
import { DownloadLink, downloadTypes, downloadLabels, downloadDescriptions } from '../components/DownloadLinks';
import { LoadingState, type PageProps } from '../components/LoadingState';
export function DownloadsPage({ state, retry }: PageProps) {
  const downloads = useDownloads();
  return <><h1 className="page-title">PDF 내려받기</h1><p className="page-lead">인쇄해서 풀고 싶을 때 내려받으세요. 복원 문제라 실제 시험과 다를 수 있습니다.</p>
    <div className="download-descriptions">{downloadTypes.map(type => <p key={type}><strong>{downloadLabels[type]}</strong>: {downloadDescriptions[type]}</p>)}</div>
    {downloads.state.status === 'error' ? <div role="alert" className="state-panel"><p>PDF 목록을 불러오지 못했습니다.</p><button onClick={downloads.retry}>다시 시도</button></div>
      : downloads.state.status === 'loading' ? <p role="status" className="state-panel">PDF 목록을 불러오는 중입니다.</p>
      : state.status !== 'success' ? <LoadingState state={state} retry={retry} />
      : state.rounds.length === 0 ? <p role="status" className="state-panel">아직 등록된 회차가 없습니다.</p>
      : <ul className="download-list">{[...state.rounds].sort((a, b) => b.round - a.round).map(round => <li className="overview-panel download-row" key={round.round}><div><h2>{round.round}회</h2><span>{round.year}년</span></div><div className="download-actions">{downloadTypes.map(type => {
        const file = downloads.state.status === 'success' ? downloads.state.data.rounds[round.round]?.[type] : undefined;
        return file ? <DownloadLink key={type} round={round.round} type={type} file={file} /> : <span key={type}>{downloadLabels[type]} PDF · 준비 중</span>;
      })}</div></li>)}</ul>}
  </>;
}
