import { HashRouter, Navigate, Route, Routes } from 'react-router';
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
export default function App() {
  const [store] = useState(() => createRecordStore());
  return <RecordStoreContext.Provider value={store}><HashRouter><AppShell>{props => <Routes>
    <Route path="/" element={<HomePage {...props} />} />
    <Route path="/rounds" element={<RoundList {...props} />} />
    <Route path="/rounds/:round" element={<RoundInfoPage {...props} />} />
    <Route path="/rounds/:round/practice" element={<PracticePage {...props} />} />
    <Route path="/rounds/:round/exam" element={<ExamPage {...props} />} />
    <Route path="/rounds/:round/result" element={<ResultPage {...props} />} />
    <Route path="/rounds/:round/review" element={<ReviewPage {...props} />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>}</AppShell></HashRouter></RecordStoreContext.Provider>;
}
