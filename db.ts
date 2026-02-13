import {
  User, UserRole, ChitGroup, Member, GroupMembership,
  InstallmentSchedule, Allotment, Payment, PaymentRequest,
  MasterSettings, ChitStatus, PaymentStatus
} from './types';

const INITIAL_USERS: User[] = [
  { userId: 'u1', name: 'Admin User', role: UserRole.ADMIN, username: 'admin', passwordHash: 'xdr5tgb', isActive: true },
];

const INITIAL_MASTER_SETTINGS: MasterSettings = {
  mastersPasswordHash: 'xdr5tgb',
  lateFeeRules: {},
  receiptTemplateConfig: {},
  appUrl: '',
  whatsappConfig: {}
};

class DB {

  private users: User[] = [];
  private chits: ChitGroup[] = [];
  private members: Member[] = [];
  private memberships: GroupMembership[] = [];
  private installments: InstallmentSchedule[] = [];
  private allotments: Allotment[] = [];
  private payments: Payment[] = [];
  private paymentRequests: PaymentRequest[] = [];
  private settings: MasterSettings = INITIAL_MASTER_SETTINGS;
  private lastUpdated: string = new Date(0).toISOString();

  private isDirty = false;
  private isSyncing = false;
  private onDirtyChange?: (dirty: boolean) => void;
  private onSyncChange?: (syncing: boolean) => void;

  constructor() {
    this.init();
  }

  private init() {
    this.loadLocal();
    if (!this.users.length) {
      this.users = [...INITIAL_USERS];
      this.saveLocal();
    }
  }

  /* ---------------- LISTENERS ---------------- */

  setDirtyListener(cb: (dirty: boolean) => void) { this.onDirtyChange = cb; }
  setSyncListener(cb: (syncing: boolean) => void) { this.onSyncChange = cb; }

  getDirtyStatus = () => this.isDirty;
  getSyncStatus = () => this.isSyncing;

  /* ---------------- LOCAL STORAGE ---------------- */

  private getSerialized() {
    return {
      users: this.users,
      chits: this.chits,
      members: this.members,
      memberships: this.memberships,
      installments: this.installments,
      allotments: this.allotments,
      payments: this.payments,
      paymentRequests: this.paymentRequests,
      settings: this.settings,
      lastUpdated: this.lastUpdated
    };
  }

  private saveLocal() {
    this.lastUpdated = new Date().toISOString();
    localStorage.setItem('mi_chit_db', JSON.stringify(this.getSerialized()));
  }

  private loadLocal() {
    const raw = localStorage.getItem('mi_chit_db');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      this.deserialize(data);
    } catch {}
  }

  private deserialize(data: any) {
    this.users = data.users || [];
    this.chits = data.chits || [];
    this.members = data.members || [];
    this.memberships = data.memberships || [];
    this.installments = data.installments || [];
    this.allotments = data.allotments || [];
    this.payments = data.payments || [];
    this.paymentRequests = data.paymentRequests || [];
    this.settings = data.settings || INITIAL_MASTER_SETTINGS;
    this.lastUpdated = data.lastUpdated || new Date(0).toISOString();
  }

  /* ---------------- CLOUD SYNC (API BASED) ---------------- */

  async syncWithCloud(): Promise<boolean> {
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    this.onSyncChange?.(true);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.getSerialized())
      });

      if (!response.ok) throw new Error('Sync failed');

      this.isDirty = false;
      this.onDirtyChange?.(false);
      localStorage.setItem('mi_chit_last_sync', new Date().toISOString());
      return true;
    } catch (e) {
      console.error('Sync failed', e);
      return false;
    } finally {
      this.isSyncing = false;
      this.onSyncChange?.(false);
    }
  }

  async loadCloudData(): Promise<boolean> {
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    this.onSyncChange?.(true);

    try {
      const response = await fetch('/api/sync');
      if (!response.ok) throw new Error();

      const result = await response.json();
      if (!result.data) return false;

      const online = result.data;
      const localRaw = localStorage.getItem('mi_chit_db');
      const local = localRaw ? JSON.parse(localRaw) : null;

      const onlineTime = new Date(online.lastUpdated || 0).getTime();
      const localTime = new Date(local?.lastUpdated || 0).getTime();

      if (onlineTime > localTime || !local) {
        this.deserialize(online);
        this.saveLocal();
      }

      return true;
    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      this.onSyncChange?.(false);
    }
  }

  private markDirty() {
    this.isDirty = true;
    this.saveLocal();
    this.onDirtyChange?.(true);
    setTimeout(() => this.syncWithCloud(), 2000);
  }

  /* ---------------- BASIC OPERATIONS ---------------- */

  getUsers = () => this.users;
  getChits = () => this.chits;
  getMembers = () => this.members;
  getMemberships = () => this.memberships;
  getInstallments = () => this.installments;
  getAllotments = () => this.allotments;
  getPayments = () => this.payments;
  getPaymentRequests = () => this.paymentRequests;
  getSettings = () => this.settings;

  addMember(member: Member) {
    this.members.push(member);
    this.markDirty();
  }

  addChit(chit: ChitGroup) {
    this.chits.push(chit);
    this.markDirty();
  }

  addPayment(payment: Payment) {
    this.payments.push(payment);
    this.markDirty();
  }

  updateSettings(data: Partial<MasterSettings>) {
    this.settings = { ...this.settings, ...data };
    this.markDirty();
  }
}

export const db = new DB();
