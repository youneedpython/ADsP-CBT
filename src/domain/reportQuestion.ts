export function reportQuestionUrl(round: number, question: number): string {
  const title = `[${round}회 ${question}번] 문제 오류 신고`;
  const body = `회차: ${round}회\n문항: ${question}번\n\n어떤 점이 틀렸는지 적어 주세요.`;
  return `https://github.com/youneedpython/ADsP-CBT/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
