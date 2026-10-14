export type MarkedQuestions = Record<string, string>;
export function validMarked(value: unknown): value is MarkedQuestions {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.entries(value).every(([key, time]) => /^[1-9]\d*:[1-9]\d*$/.test(key)
      && key.split(':').every(part => Number.isSafeInteger(Number(part)))
      && typeof time === 'string' && time.trim() !== '' && Number.isFinite(Date.parse(time)));
}
