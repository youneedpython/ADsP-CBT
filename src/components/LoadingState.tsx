import type { RoundSummary } from "../data/types";
export type LoadState = { status: 'loading' | 'error' } | { status: 'success'; rounds: RoundSummary[] };
export type PageProps = { state: LoadState; retry: () => void };

export function LoadingState({ state, retry }: PageProps) {
  return state.status === 'error' ? <div role="alert" className="state-panel">
    <p>문제를 불러오지 못했습니다.</p><button onClick={retry}>다시 시도</button>
  </div> : <p role="status" className="state-panel">문제를 불러오는 중입니다.</p>;
}
