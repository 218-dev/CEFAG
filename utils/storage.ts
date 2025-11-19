const API_BASE = '/api';

export const initDB = async (): Promise<any> => {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('DB health check failed');
    return {};
  } catch (e) {
    throw e;
  }
};

export const saveData = async (storeName: string, data: any, onStatusChange?: (status: 'saving' | 'saved' | 'error') => void) => {
  try {
    if (onStatusChange) onStatusChange('saving');
    const res = await fetch(`${API_BASE}/${storeName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Array.isArray(data) ? data : [])
    });
    if (!res.ok) throw new Error('Save failed');
    if (onStatusChange) onStatusChange('saved');
  } catch (e) {
    if (onStatusChange) onStatusChange('error');
  }
};

export const loadData = async <T>(storeName: string, defaultValue: T): Promise<T> => {
  try {
    const res = await fetch(`${API_BASE}/${storeName}`);
    if (!res.ok) return defaultValue;
    const json = await res.json();
    if (Array.isArray(json) && json.length === 0) return defaultValue;
    return json as T;
  } catch (e) {
    return defaultValue;
  }
};

export const createBackup = async (): Promise<string> => {
  const res = await fetch(`${API_BASE}/backup`);
  if (!res.ok) return JSON.stringify({});
  const data = await res.json();
  return JSON.stringify(data);
};

export const restoreBackup = async (jsonString: string): Promise<boolean> => {
  try {
    const payload = JSON.parse(jsonString);
    const res = await fetch(`${API_BASE}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};
