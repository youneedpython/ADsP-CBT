import { createContext, useContext } from 'react';
import { createRecordStore } from './records';

export const RecordStoreContext = createContext<ReturnType<typeof createRecordStore> | null>(null);
export function useRecordStore() {
  const store = useContext(RecordStoreContext);
  if (!store) throw new Error('Record store provider is missing');
  return store;
}
