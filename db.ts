export class Database {
  private isSyncing = false;
  private isDirty = false;
  private onSyncChange?: (syncing: boolean) => void;
  private onDirtyChange?: (dirty: boolean) => void;

  constructor() {
    this.loadFromLocal();
  }

  setSyncListener(callback: (syncing: boolean) => void) {
    this.onSyncChange = callback;
  }

  setDirtyListener(callback: (dirty: boolean) => void) {
    this.onDirtyChange = callback;
  }

  private loadFromLocal() {
    const data = localStorage.getItem('mi_chit_db');

    if (!data) {
      const initial = {
        users: [],
        chits: [],
        members: [],
        memberships: [],
        installments: [],
        allotments: [],
        payments: [],
        paymentRequests: [],
        settings: {},
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem('mi_chit_db', JSON.stringify(initial));
    }
  }

  private getSerializedData(): string {
    return localStorage.getItem('mi_chit_db') || '{}';
  }

  private deserialize(data: any) {
    localStorage.setItem('mi_chit_db', JSON.stringify(data));
  }

  markDirty() {
    this.isDirty = true;
    if (this.onDirtyChange) this.onDirtyChange(true);
  }

  async syncWithCloud(): Promise<boolean> {
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    if (this.onSyncChange) this.onSyncChange(true);

    try {
      const data = JSON.parse(this.getSerializedData());

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Sync failed');

      this.isDirty = false;
      if (this.onDirtyChange) this.onDirtyChange(false);

      localStorage.setItem('mi_chit_last_sync', new Date().toISOString());
      return true;

    } catch (error) {
      console.error("Sync failed:", error);
      return false;
    } finally {
      this.isSyncing = false;
      if (this.onSyncChange) this.onSyncChange(false);
    }
  }

  async loadCloudData(): Promise<boolean> {
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    if (this.onSyncChange) this.onSyncChange(true);

    try {
      const response = await fetch('/api/sync');

      if (!response.ok) throw new Error("Cloud fetch failed");

      const result = await response.json();
      const onlineData = result.data;

      if (!onlineData) return false;

      const localDataRaw = localStorage.getItem('mi_chit_db');
      const localData = localDataRaw ? JSON.parse(localDataRaw) : null;

      const onlineTime = new Date(onlineData.lastUpdated || 0).getTime();
      const localTime = new Date(localData?.lastUpdated || 0).getTime();

      if (onlineTime > localTime || !localData) {
        this.deserialize(onlineData);
        this.isDirty = false;
        if (this.onDirtyChange) this.onDirtyChange(false);
        return true;
      }

      return false;

    } catch (e) {
      console.warn("Cloud load failed:", e);
      return false;
    } finally {
      this.isSyncing = false;
      if (this.onSyncChange) this.onSyncChange(false);
    }
  }
}

export const db = new Database();
