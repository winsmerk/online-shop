export interface OwnedRecord {
  id: string;
  user_id: string;
}

export function assertOwned<T extends OwnedRecord>(record: T | null, userId: string, resource = "资源"): T {
  if (!record || record.user_id !== userId) throw new Error(`${resource}不存在或无权访问`);
  return record;
}

