import { useDownloads } from '../components/DownloadsContext';
import { DownloadLink, downloadTypes, downloadLabels, downloadDescriptions, PdfActions, subjectTypes, subjectLabels, subjectDescriptions } from '../components/DownloadLinks';
import { LoadingState, type PageProps } from '../components/LoadingState';
export function DownloadsPage({ state, retry }: PageProps) {
  const downloads = useDownloads();
  const subjects = downloads.state.status === 'success' ? downloads.state.data.subjects ?? [] : [];
  return <><h1 className="page-title">PDF 자료</h1><p className="page-lead">화면에서 바로 보거나 내려받아 인쇄하세요. 복원 문제라 실제 시험과 다를 수 있습니다.</p>
    {downloads.state.status === 'error' ? <div role="alert" className="state-panel"><p>PDF 목록을 불러오지 못했습니다.</p><button onClick={downloads.retry}>다시 시도</button></div>
      : downloads.state.status === 'loading' ? <p role="status" className="state-panel">PDF 목록을 불러오는 중입니다.</p>
      : <>
      {!!subjects.length && <section><h2>과목별 공부 자료</h2><div className="download-descriptions">{subjectTypes.map(type => <p key={type}><strong>{subjectLabels[type]}</strong>: {subjectDescriptions[type]}</p>)}</div><ul className="download-list">{subjects.map(subject => <li className="overview-panel download-row" key={subject.id}><div><h3>{subject.label}</h3><span>{subject.name}</span></div><div className="download-actions">{subjectTypes.map(type => subject[type] && <div className="pdf-group" key={type}><strong>{subjectLabels[type]}{type === 'solutions' && ` · ${subject.questionCount}문항`}</strong><PdfActions file={subject[type]} name={`${subject.label} ${subjectLabels[type]}`} filename={`ADsP_${subject.label.replace(/\s+/g, '_')}_${subjectLabels[type].replace(/\s/g, '')}.pdf`} /></div>)}</div></li>)}</ul></section>}
      <section><h2>회차별 문제지</h2><div className="download-descriptions">{downloadTypes.map(type => <p key={type}><strong>{downloadLabels[type]}</strong>: {downloadDescriptions[type]}</p>)}</div>
      {state.status !== 'success' ? <LoadingState state={state} retry={retry} />
      : state.rounds.length === 0 ? <p role="status" className="state-panel">아직 등록된 회차가 없습니다.</p>
      : <ul className="download-list">{[...state.rounds].sort((a, b) => b.round - a.round).map(round => <li className="overview-panel download-row" key={round.round}><div><h3>{round.round}회</h3><span>{round.year}년</span></div><div className="download-actions">{downloadTypes.map(type => {
        const file = downloads.state.status === 'success' ? downloads.state.data.rounds[round.round]?.[type] : undefined;
        return file ? <DownloadLink key={type} round={round.round} type={type} file={file} /> : <span key={type}>{downloadLabels[type]} PDF · 준비 중</span>;
      })}</div></li>)}</ul>}</section></>}
  </>;
}
