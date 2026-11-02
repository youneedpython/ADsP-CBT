import { createContext, useContext } from 'react';
import { exams } from '../domain/exams';
export const ExamContext = createContext(exams[0]);
export const useExam = () => useContext(ExamContext);
