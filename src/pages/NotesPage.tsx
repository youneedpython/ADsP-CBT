import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { loadNotes, type NotesData, type NoteBlock, type NoteItem } from '../data/loadNotes';
import { useDownloads } from '../components/DownloadsContext';
import { useTopics } from '../components/TopicsContext';
import { FrequencyBar } from '../components/FrequencyBar';
import { PdfIcon } from '../components/DownloadLinks';
import { Modal } from '../components/Modal';
import { topicSummary } from '../domain/practiceSets';
import type { TopicsData } from '../data/types';

export function Bold({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : part)}</>;
}
function Items({ items }: { items: NoteItem[] }) {
  return <ul>{items.map((item, i) => <li key={i}><Bold text={item.text} />{item.items && <Items items={item.items} />}</li>)}</ul>;
}
export function Blocks({ blocks, prefix = 'block' }: { blocks: NoteBlock[]; prefix?: string }) {
  const [figure, setFigure] = useState<Extract<NoteBlock, { type: 'figure' }> | null>(null);
  return <>{blocks.map((b, i) => {
    const id = `${prefix}-${i}`;
    switch (b.type) {
      case 'heading': return <h3 id={id} key={id}><Bold text={b.text} /></h3>;
      case 'subheading': return <h4 key={id}><Bold text={b.text} /></h4>;
      case 'paragraph': return <p key={id}><Bold text={b.text} /></p>;
      case 'code': return <pre className="notes-code" key={id}>{b.text}</pre>;
      case 'list': return <Items key={id} items={b.items} />;
      case 'table': return <div className="notes-table" key={id}><table>{b.head && <thead><tr>{b.head.map((c, j) => <th key={j}><Bold text={c} /></th>)}</tr></thead>}<tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Bold text={c} /></td>)}</tr>)}</tbody></table></div>;
      case 'box': return <aside className={`notes-box notes-${b.style}`} key={id}>{b.title && <h3 id={id}><Bold text={b.title} /></h3>}<Blocks blocks={b.blocks} prefix={id} /></aside>;
      case 'figure': return <figure key={id}><button className="notes-figure" style={{ maxWidth: b.width / 2 }} aria-label={`${b.alt} 크게 보기`} onClick={e => { e.currentTarget.focus(); setFigure(b); }}><img src={`${import.meta.env.BASE_URL}${b.src}`} width={b.width} height={b.height} alt={b.alt} /></button>{b.caption && <figcaption>▲ <Bold text={b.caption} /></figcaption>}</figure>;
    }
  })}{figure && <Modal closeOnBackdrop label={figure.alt} close={() => setFigure(null)}><div className="notes-lightbox" onClick={() => setFigure(null)}><button>닫기</button><img onClick={e => e.stopPropagation()} src={`${import.meta.env.BASE_URL}${figure.src}`} alt={figure.alt} /></div></Modal>}</>;
}
export function NotesPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const downloads = useDownloads();
  const topicsContext = useTopics();
  const getTopics = topicsContext?.get;
  const [topics, setTopics] = useState<TopicsData | null>(null);
  const [result, setResult] = useState<{ id: string; data?: NotesData; error?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const subjects = downloads.state.status === 'success' ? (downloads.state.data.subjects ?? []).filter(s => s.notes) : [];
  const subject = subjects.find(s => s.id === id);
  useEffect(() => {
    const abort = new AbortController();
    setResult(null);
    if (subject) loadNotes(id, abort.signal).then(data => {
      if (data.subject !== subject.subject || data.chapter !== subject.chapter || data.pdf !== subject.summary?.file) throw new Error();
      if (!abort.signal.aborted) setResult({ id, data });
    }).catch(() => { if (!abort.signal.aborted) setResult({ id, error: true }); });
    return () => abort.abort();
  }, [id, subject, attempt]);
  useEffect(() => { let active = true; getTopics?.().then(t => { if (active) setTopics(t); }).catch(() => { if (active) setTopics(null); }); return () => { active = false; }; }, [getTopics]);
  const data = result?.id === id ? result.data : undefined;
  const requested = Number(params.get('unit'));
  const unit = data?.units.find(u => u.number === requested) ?? data?.units[0];
  const name = subject ? `${subject.subject}과목${subject.chapter ? ` ${subject.chapter}장` : ''}` : '';
  useEffect(() => {
    document.title = `${name ? `${name} ` : ''}핵심 요약 · ADsP 기출 복원 문제`;
    return () => { document.title = 'ADsP 기출 복원 문제'; };
  }, [name]);
  const previousUnit = useRef<{ id: string; number: number } | null>(null);
  useEffect(() => {
    if (!unit) return;
    const previous = previousUnit.current;
    previousUnit.current = { id, number: unit.number };
    if (previous && (previous.id !== id || previous.number !== unit.number)) {
      setExpanded(false);
      window.scrollTo?.(0, 0);
    }
  }, [id, unit?.number]);
  const back = <Link to="/adsp/downloads">PDF 자료로</Link>;
  if (downloads.state.status === 'error') return <div role="alert"><p>핵심 요약을 불러오지 못했습니다.</p><button onClick={downloads.retry}>다시 시도</button>{back}</div>;
  if (downloads.state.status === 'success' && !subject) return <div role="status"><p>없는 핵심 요약입니다.</p>{back}</div>;
  if (result?.id === id && result.error) return <div role="alert"><p>핵심 요약을 불러오지 못했습니다.</p><button onClick={() => setAttempt(a => a + 1)}>다시 시도</button>{back}</div>;
  if (!data || !unit || !subject) return <div role="status"><p>핵심 요약을 불러오는 중입니다.</p>{back}</div>;
  const unitLink = (number: number) => `/adsp/notes/${id}?unit=${number}`;
  return <>
    <p className="notes-breadcrumb"><Link to="/adsp/downloads">PDF 자료</Link> › 핵심 요약</p>
    <div className="notes-header"><div><h1 className="page-title">{name} {data.title}</h1><p className="page-lead">핵심 요약 · {data.units.length}단원 · {subject.summary?.pages}쪽</p></div><a className="button secondary" href={`${import.meta.env.BASE_URL}${data.pdf}`} target="_blank" rel="noopener"><PdfIcon kind="open" />PDF로 보기</a></div>
    {subjects.length > 1 && <nav className="notes-subjects" aria-label="핵심 요약 과목">{subjects.map(s => <Link className="button secondary" aria-current={s.id === id ? 'page' : undefined} key={s.id} to={`/adsp/notes/${s.id}`}>{s.subject}과목{s.chapter && ` ${s.chapter}장`}</Link>)}</nav>}
    <div className="notes-layout"><aside className="notes-toc"><h2>목차</h2><button className="notes-toc-toggle" aria-expanded={expanded} aria-controls="notes-contents" onClick={() => setExpanded(!expanded)}>목차 · {unit.number}단원 {unit.title} ▾</button><nav id="notes-contents" className={expanded ? 'expanded' : ''} aria-label="단원 목차">{data.units.map(u => <div key={u.number}><Link aria-current={u === unit ? 'page' : undefined} to={unitLink(u.number)}>{u.number}단원 {u.title}</Link>{u === unit && u.blocks.map((b, i) => (b.type === 'heading' || b.type === 'box' && b.style === 'exam' && b.title) && <button className="notes-anchor" key={i} onClick={() => { document.getElementById(`unit-${u.number}-${i}`)?.scrollIntoView({ block: 'start' }); setExpanded(false); }}><Bold text={b.type === 'box' ? b.title! : b.text} /></button>)}</div>)}</nav></aside>
      <div className="notes-body"><article className="overview-panel notes-article"><h2><span className="subject-badge">{unit.number}단원</span> {unit.title}{unit.ref && <> <small>({unit.ref})</small></>}</h2><Blocks key={`${id}-${unit.number}`} blocks={unit.blocks} prefix={`unit-${unit.number}`} />
        {topics && unit.topics.length > 0 && <section className="notes-practice"><h3>이 단원의 기출 문제 풀기</h3><p>등록된 회차에서 이 단원 주제로 나온 문제입니다. 모아 풀기의 주제별 모음으로 갑니다.</p>{unit.topics.map(topicId => {
          const topic = topics.topics.find(t => t.id === topicId);
          if (!topic) return null;
          const stats = topicSummary(topics, topicsContext?.summaries ?? [], topicId);
          return <div className="notes-topic" key={topicId}><strong>{topic.name}</strong><span><FrequencyBar rounds={stats.rounds} /> {stats.rounds.length}회 중 {stats.roundCount}회 · {stats.questionCount}문항</span><Link to={`/adsp/sets/topic/${topicId}`}>풀기 ›</Link></div>;
        })}</section>}
      </article><nav className="notes-pagination" aria-label="단원 이동">{unit.number > 1 && <Link className="button secondary" to={unitLink(unit.number - 1)}>‹ {unit.number - 1}단원 {data.units[unit.number - 2].title}</Link>}{unit.number < data.units.length && <Link className="button" to={unitLink(unit.number + 1)}>{unit.number + 1}단원 {data.units[unit.number].title} ›</Link>}</nav></div>
    </div>
  </>;
}
