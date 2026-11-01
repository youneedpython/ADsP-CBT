import type { NotesData } from '../data/loadNotes';
export const notesFixture = (): NotesData => ({ formatVersion: 1, id: '1', subject: 1, title: '개발용 표본', pdf: 'pdf/sample.pdf', units: [
  { number: 1, title: '첫 단원', ref: '1장 1절', topics: ['T101'], blocks: [
    { type: 'heading', text: '소제목' }, { type: 'subheading', text: '작은 제목' },
    { type: 'paragraph', text: '**굵은 글** <img src=x> *그대로*' },
    { type: 'list', items: [{ text: '바깥', items: [{ text: '안쪽' }] }] },
    { type: 'table', head: ['열'], rows: [['칸']] },
    { type: 'box', style: 'note', blocks: [{ type: 'paragraph', text: '참고 글' }] },
    { type: 'box', style: 'exam', title: '시험 상자', blocks: [{ type: 'list', items: [{ text: '시험 글' }] }] },
    { type: 'figure', src: 'notes/1/sample.png', width: 100, height: 50, alt: '표본 그림', caption: '그림 설명' },
  ] }, { number: 2, title: '다음 단원', ref: '1장 2절', topics: [], blocks: [{ type: 'paragraph', text: '다음 글' }] },
] });
