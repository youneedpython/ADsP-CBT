const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positive = value => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value));

// expected maps registered rounds to the question numbers in their files.
export function validateTopics(data, expected) {
  const errors = [];
  const keys = (value, allowed, label) => {
    if (!object(value)) { errors.push(`${label}: 객체 형식 필요`); return false; }
    for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${label}: 정의하지 않은 항목 ${key}`);
    return true;
  };
  if (!keys(data, ['formatVersion', 'topics', 'questions'], 'topics.json')) return errors;
  if (data.formatVersion !== 1) errors.push('topics.json: formatVersion은 1 필요');
  const ids = new Set(), used = new Set();
  if (!Array.isArray(data.topics)) errors.push('topics.json: topics 배열 필요');
  else for (const topic of data.topics) {
    if (!keys(topic, ['id', 'name', 'subject'], '주제')) continue;
    if (typeof topic.id !== 'string' || !/^T\d{3}$/.test(topic.id)) errors.push('주제 ID 형식 오류');
    if (ids.has(topic.id)) errors.push('주제 ID 중복');
    ids.add(topic.id);
    if (typeof topic.name !== 'string' || !topic.name.trim()) errors.push('주제 빈 이름');
    if (!Number.isInteger(topic.subject) || ![1, 2, 3].includes(topic.subject)) errors.push('주제 과목 값 오류');
  }
  if (!object(data.questions)) errors.push('topics.json: questions 객체 필요');
  else {
    for (const [round, questions] of Object.entries(data.questions)) {
      if (!positive(round)) errors.push(`주제 회차 ${round}: 양의 정수 필요`);
      if (expected && !Object.hasOwn(expected, round)) errors.push(`주제 회차 ${round}: 등록되지 않은 회차`);
      if (!object(questions)) { errors.push(`주제 회차 ${round}: 문항 객체 필요`); continue; }
      for (const [number, id] of Object.entries(questions)) {
        if (!positive(number)) errors.push(`주제 회차 ${round} 문항 ${number}: 양의 정수 필요`);
        if (expected && !expected[round]?.includes(Number(number))) errors.push(`주제 회차 ${round} 문항 ${number}: 없는 문항`);
        if (typeof id !== 'string' || !ids.has(id)) errors.push(`주제 회차 ${round} 문항 ${number}: 목록에 없는 주제 ID`);
        used.add(id);
      }
    }
    if (expected) for (const [round, numbers] of Object.entries(expected)) {
      if (!object(data.questions[round])) errors.push(`주제 회차 ${round}: 회차 누락 / 형식 오류`);
      for (const number of numbers) {
        if (!object(data.questions[round]) || !Object.hasOwn(data.questions[round], number)) errors.push(`주제 회차 ${round} 문항 ${number}: 주제 누락`);
      }
    }
  }
  for (const id of ids) if (!used.has(id)) errors.push(`어느 문항에도 쓰이지 않는 주제 ${id}`);
  return errors;
}
