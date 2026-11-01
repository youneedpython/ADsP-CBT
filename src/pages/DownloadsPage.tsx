import { useSearchParams } from 'react-router';
import type { CSSProperties } from 'react';
import type { SubjectDownload } from '../data/loadDownloads';
import { useDownloads } from '../components/DownloadsContext';
import { DownloadLink, downloadTypes, downloadLabels, PdfItem, subjectTypes, subjectLabels } from '../components/DownloadLinks';
import { LoadingState, type PageProps } from '../components/LoadingState';

function SubjectCards({ subjects }: { subjects: SubjectDownload[] }) {
  const whole = subjects.filter(s => s.chapter === undefined).sort((a, b) => a.subject - b.subject);
  const chapterSubjects = [...new Set(subjects.filter(s => s.chapter !== undefined).map(s => s.subject))].sort((a, b) => a - b);
  const groups = [whole, ...chapterSubjects.map(id => subjects.filter(s => s.subject === id && s.chapter !== undefined).sort((a, b) => a.chapter! - b.chapter!))].filter(g => g.length);
  return groups.map(group => <section className="pdf-section" key={group[0].id}>
    <h2>{group[0].chapter === undefined ? group.map(s => `${s.subject}과목`).join(' · ') : `${group[0].subject}과목`}{group[0].chapter !== undefined && <small>{group[0].subjectName} · {group.length}개 장</small>}</h2>
    <ul className="download-list" style={{ '--pdf-columns': Math.min(3, group.length) } as CSSProperties}>{group.map(subject => {
      const name = `${subject.subject}과목${subject.chapter === undefined ? '' : ` ${subject.chapter}장`}`;
      return <li className="overview-panel pdf-card" key={subject.id}><header><h3>{subject.chapter === undefined ? `${subject.subject}과목` : `${subject.chapter}장`}</h3><span>{subject.name}</span></header>
        {subjectTypes.map(type => subject[type] && <PdfItem key={type} kind={type} label={subjectLabels[type]} file={subject[type]} name={`${name} ${subjectLabels[type]}`} filename={`ADsP_${name.replace(/\s/g, '_')}_${subjectLabels[type].replace(/\s/g, '')}.pdf`} questionCount={type === 'solutions' ? subject.questionCount : undefined} />)}</li>;
    })}</ul>
  </section>);
}
export function DownloadsPage({ state, retry }: PageProps) {
  const downloads = useDownloads();
  const [params, setParams] = useSearchParams();
  const subjects = downloads.state.status === 'success' ? downloads.state.data.subjects ?? [] : [];
  const rounds = !subjects.length || params.get('tab') === 'rounds';
  function select(rounds: boolean) {
    const next = new URLSearchParams(params);
    if (rounds) next.set('tab', 'rounds'); else next.delete('tab');
    setParams(next);
  }
  return <><h1 className="page-title">PDF 자료</h1><p className="page-lead">화면에서 바로 보거나 내려받아 인쇄하세요. 복원 문제라 실제 시험과 다를 수 있습니다.</p>
    {downloads.state.status === 'error' ? <div role="alert" className="state-panel"><p>PDF 목록을 불러오지 못했습니다.</p><button onClick={downloads.retry}>다시 시도</button></div>
      : downloads.state.status === 'loading' ? <p role="status" className="state-panel">PDF 목록을 불러오는 중입니다.</p>
      : <>
        {!!subjects.length && <div role="tablist" aria-label="PDF 자료 종류" className="pdf-tabs">{['과목별 공부 자료', '회차별 문제지'].map((label, i) => <button key={label} role="tab" id={`pdf-tab-${i}`} aria-controls={`pdf-panel-${i}`} aria-selected={rounds === !!i} tabIndex={rounds === !!i ? 0 : -1} onClick={() => select(!!i)} onKeyDown={event => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault(); select(!rounds);
            document.getElementById(`pdf-tab-${i === 0 ? 1 : 0}`)?.focus();
          }
        }}>{label}</button>)}</div>}
        <div role={subjects.length ? 'tabpanel' : undefined} id={`pdf-panel-${rounds ? 1 : 0}`} aria-labelledby={subjects.length ? `pdf-tab-${rounds ? 1 : 0}` : undefined} tabIndex={subjects.length ? 0 : undefined}>
          {!rounds ? <SubjectCards subjects={subjects} /> : <section className="pdf-section"><h2 className={subjects.length ? 'sr-only' : undefined}>회차별 문제지</h2><p>풀이용은 정답·해설이 맨 뒤에, 해설용은 문제마다 정답과 자세한 풀이가 있습니다.</p>
            {state.status !== 'success' ? <LoadingState state={state} retry={retry} /> : state.rounds.length === 0 ? <p role="status" className="state-panel">아직 등록된 회차가 없습니다.</p> : <ul className="download-list">{[...state.rounds].sort((a, b) => b.round - a.round).map(round => <li className="overview-panel pdf-card" key={round.round}><header><h3>{round.round}회</h3><span>{round.year}년</span></header>{downloadTypes.map(type => {
              const file = downloads.state.status === 'success' ? downloads.state.data.rounds[round.round]?.[type] : undefined;
              return file ? <DownloadLink key={type} round={round.round} type={type} file={file} /> : <div className="pdf-pending" key={type}>{downloadLabels[type]} PDF · 준비 중</div>;
            })}</li>)}</ul>}
          </section>}
        </div>
      </>}
  </>;
}
