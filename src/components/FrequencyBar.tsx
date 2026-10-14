export function FrequencyBar({ rounds }: { rounds: boolean[] }) {
  return <span className="frequency-bar" role="img" aria-label={`${rounds.length}개 회차 중 ${rounds.filter(Boolean).length}회 출제`}>{rounds.map((present, index) => <i aria-hidden="true" className={present ? 'present' : ''} key={index} />)}</span>;
}
