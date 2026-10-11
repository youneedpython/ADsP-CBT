# ADsP 기출 복원 문제

[사이트 열기](https://youneedpython.github.io/ADsP-CBT/)

## 복원 문제 안내

공식 기출문제가 아니라 응시자의 기억으로 복원한 문제입니다. 실제 시험의 문제, 보기, 정답과 다를 수 있습니다.

## 기능

- 회차별 연습: 답을 고르면 바로 정답과 해설을 확인합니다.
- 회차별 시험: 제한 시간 90분, 제출한 뒤 한 번에 채점합니다. 시간이 끝나도 자동 제출하지 않습니다.
- 문항당 2점이며 총점 60점 이상, 모든 과목에서 40% 이상이면 합격입니다. 안 푼 문제는 틀린 것으로 채점합니다.
- 결과와 틀린 문제를 다시 볼 수 있으며 연습과 시험을 이어 풀 수 있습니다.
- 풀이 기록은 브라우저에만 저장하며 다른 기기와 공유하지 않습니다.

## 개발

Node.js 24.21.0을 사용합니다.

```sh
npm ci
npm run dev
npm run validate:data
npm test
npm run build
```

빌드 결과는 `dist/`에 생성됩니다.

## 문제 데이터

`public/data/rounds.json`은 회차 목록입니다. 각 항목은 회차 번호, 제목, 문항 수, 제한 시간과 회차 JSON 파일명을 담습니다.
`public/data/<회차>.json`은 `formatVersion: 1`, 회차 정보, 과목 목록과 문항 배열을 담습니다. 문항은 번호, 과목, 문제, 지문, 보기 4개, 정답 번호(1~4), 해설로 구성됩니다.
지문은 글, 코드, 표, 그림을 지원하며 그림은 `public/data/<회차>/`에 별도 파일로 저장합니다. 데이터 변경 후 `npm run validate:data`로 검사합니다.

문의와 문제 제기는 [이 Repository의 Issues](https://github.com/youneedpython/ADsP-CBT/issues)로 받습니다.
