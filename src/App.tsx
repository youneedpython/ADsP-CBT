import { MockPage } from './pages/MockPage';
import { exams, examAtPath } from './domain/exams';
import { ExamContext } from './components/ExamContext';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router';
import { AppShell } from './components/AppShell';
import { RoundList } from './pages/RoundList';
import { ReviewPage } from './pages/ReviewPage';
import { PracticePage } from './pages/PracticePage';
import { useState } from 'react';
import { createRecordStore } from './storage/records';
import { RecordStoreContext } from './storage/RecordStoreContext';
import { ExamPage } from './pages/ExamPage';
import { ResultPage } from './pages/ResultPage';
import { HomePage } from './pages/HomePage';
import { RoundInfoPage } from './pages/RoundInfoPage';
import { SetsPage } from './pages/SetsPage';
import { TopicsProvider } from './components/TopicsContext';
import { DownloadsProvider } from './components/DownloadsContext';
import { DownloadsPage } from './pages/DownloadsPage';
import { NotesPage } from './pages/NotesPage';
import { ExamHub } from './pages/ExamHub';
function LegacyRoute() {
  const { pathname, search } = useLocation();
  const legacy = /^\/(rounds|sets|downloads|notes)(\/|$)/.test(pathname);
  return <Navigate to={legacy ? `/adsp${pathname}${search}` : examAtPath(pathname)?.path ? examAtPath(pathname)!.path : '/'} replace />;
}
export default function App() {
  return <HashRouter><ExamApp /></HashRouter>;
}
function ExamApp() {
  const { pathname } = useLocation();
  const exam = examAtPath(pathname) ?? exams[0];
  const [stores] = useState(() => Object.fromEntries(exams.map(e => [e.id, createRecordStore(undefined, e)])));
  const store = stores[exam.id];
  return <ExamContext.Provider value={exam}><RecordStoreContext.Provider value={store}><DownloadsProvider key={exam.id}><AppShell key={exam.id}>{props => <TopicsProvider summaries={props.state.status === 'success' ? props.state.rounds : []}><Routes>
    <Route path="/" element={<ExamHub {...props} stores={stores} />} />
    <Route path="/adsp/mock/*" element={<MockPage {...props} />} />
    <Route path="/sqld/mock/*" element={<MockPage {...props} />} />
    <Route path="/adsp" element={<HomePage {...props} />} />
    <Route path="/adsp/notes/:id" element={<NotesPage />} />
    <Route path="/adsp/downloads" element={<DownloadsPage {...props} />} />
    <Route path="/adsp/rounds" element={<RoundList {...props} />} />
    <Route path="/adsp/sets/*" element={<SetsPage {...props} />} />
    <Route path="/adsp/rounds/:round" element={<RoundInfoPage {...props} />} />
    <Route path="/adsp/rounds/:round/practice" element={<PracticePage {...props} />} />
    <Route path="/adsp/rounds/:round/exam" element={<ExamPage {...props} />} />
    <Route path="/adsp/rounds/:round/result" element={<ResultPage {...props} />} />
    <Route path="/adsp/rounds/:round/review" element={<ReviewPage {...props} />} />
    <Route path="/sqld/downloads" element={<DownloadsPage {...props} />} />
    <Route path="/sqld" element={<HomePage {...props} />} />
    <Route path="/sqld/sets/*" element={<SetsPage {...props} />} />
    <Route path="/sqld/rounds" element={<RoundList {...props} />} />
    <Route path="/sqld/rounds/:round" element={<RoundInfoPage {...props} />} />
    <Route path="/sqld/rounds/:round/practice" element={<PracticePage {...props} />} />
    <Route path="/sqld/rounds/:round/exam" element={<ExamPage {...props} />} />
    <Route path="/sqld/rounds/:round/result" element={<ResultPage {...props} />} />
    <Route path="/sqld/rounds/:round/review" element={<ReviewPage {...props} />} />
    <Route path="*" element={<LegacyRoute />} />
  </Routes></TopicsProvider>}</AppShell></DownloadsProvider></RecordStoreContext.Provider></ExamContext.Provider>;
}
