export class Database {
  private data: any;
  private isSyncing = false;
  private isDirty = false;
  private onSyncChange?: (syncing: boolean) => void;
  private onDirtyChange?: (dirty: boolean) => void;

  constructor() {
    const existing = localStorage.getItem('mi_chit_db');
    this.data = existing ? JSON.parse(existing) : {
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

    localStorage.setItem('mi_chit_db', JSON.stringify(this.data));
  }

  // ---------------- STATUS ----------------

  getDirtyStatus() {
    return this.isDirty;
  }

  getSyncStatus() {
    return this.isSyncing;
  }

  setSyncListener(cb: (v: boolean) => void) {
    this.onSyncChange = cb;
  }

  setDirtyListener(cb: (v: boolean) => void) {
    this.onDirtyChange = cb;
  }

  // ---------------- BASIC GETTERS ----------------

  getUsers = () => this.data.users;
  getChits = () => this.data.chits;
  getMembers = () => this.data.members;
  getMemberships = () => this.data.memberships;
  getInstallments = () => this.data.installments;
  getAllotments = () => this.data.allotments;
  getPayments = () => this.data.payments;
  getPaymentRequests = () => this.data.paymentRequests;
  getSettings = () => this.data.settings;

  // ---------------- SAVE ----------------

  private saveLocal() {
    this.data.lastUpdated = new Date().toISOString();
    localStorage.setItem('mi_chit_db', JSON.stringify(this.data));
  }

  markDirty() {
    this.isDirty = true;
    this.saveLocal();
    if (this.onDirtyChange) this.onDirtyChange(true);
    setTimeout(() => this.syncWithCloud(), 1500);
  }

  async syncWithCloud(): Promise<boolean> {
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    if (this.onSyncChange) this.onSyncChange(true);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      });

      if (!response.ok) throw new Error();

      this.isDirty = false;
      if (this.onDirtyChange) this.onDirtyChange(false);

      return true;
    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      if (this.onSyncChange) this.onSyncChange(false);
    }
  }

  async loadCloudData(): Promise<boolean> {
    try {
      const response = await fetch('/api/sync');
      if (!response.ok) return false;

      const result = await response.json();
      if (!result.data) return false;

      const online = result.data;
      const localTime = new Date(this.data.lastUpdated).getTime();
      const onlineTime = new Date(online.lastUpdated).getTime();

      if (onlineTime > localTime) {
        this.data = online;
        this.saveLocal();
      }

      return true;
    } catch {
      return false;
    }
  }
}

export const db = new Database();
