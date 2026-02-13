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
    this.load();
    if (!this.users.length) {
      this.users = [...INITIAL_USERS];
      this.saveLocal();
    }
  }

  // ------------------------
  // LISTENERS
  // ------------------------

  setDirtyListener(listener: (dirty: boolean) => void) {
    this.onDirtyChange = listener;
  }

  setSyncListener(listener: (syncing: boolean) => void) {
    this.onSyncChange = listener;
  }

  getDirtyStatus = () => this.isDirty;
  getSyncStatus = () => this.isSyncing;

  // ------------------------
  // LOCAL STORAGE
  // ------------------------

  private deserialize(parsed: any) {
    this.users = parsed.users || [];
    this.chits = parsed.chits || [];
    this.members = parsed.members || [];
    this.memberships = parsed.memberships || [];
    this.installments = parsed.installments || [];
    this.allotments = parsed.allotments || [];
    this.payments = parsed.payments || [];
    this.paymentRequests = parsed.paymentRequests || [];
    this.settings = parsed.settings || INITIAL_MASTER_SETTINGS;
    this.lastUpdated = parsed.lastUpdated || new Date().toISOString();
  }

  private getSerializedData() {
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
      lastUpdated: new Date().toISOString()
    };
  }

  load() {
    const data = localStorage.getItem('mi_chit_db');
    if (data) {
      this.deserialize(JSON.parse(data));
    }
  }

  saveLocal() {
    localStorage.setItem('mi_chit_db', JSON.stringify(this.getSerializedData()));
  }

  markDirty() {
    this.isDirty = true;
    this.saveLocal();
    this.onDirtyChange?.(true);

    setTimeout(() => {
      this.syncWithCloud();
    }, 2000);
  }

  // ------------------------
  // 🔥 CLOUD SYNC (FIXED)
  // ------------------------

  async syncWithCloud(): Promise<boolean> {
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    this.onSyncChange?.(true);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.getSerializedData())
      });

      if (!response.ok) throw new Error('Sync failed');

      this.isDirty = false;
      this.onDirtyChange?.(false);
      return true;

    } catch (err) {
      console.error("Sync failed:", err);
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
      if (!response.ok) throw new Error('Cloud load failed');

      const result = await response.json();
      if (!result.data) return false;

      this.deserialize(result.data);
      this.saveLocal();
      this.isDirty = false;
      this.onDirtyChange?.(false);
      return true;

    } catch (err) {
      console.error("Cloud load failed:", err);
      return false;

    } finally {
      this.isSyncing = false;
      this.onSyncChange?.(false);
    }
  }

  // ------------------------
  // GETTERS
  // ------------------------

  getUsers = () => this.users;
  getChits = () => this.chits;
  getMembers = () => this.members;
  getMemberships = () => this.memberships;
  getInstallments = () => this.installments;
  getAllotments = () => this.allotments;
  getPayments = () => this.payments;
  getPaymentRequests = () => this.paymentRequests;
  getSettings = () => this.settings;

  // ------------------------
  // BASIC OPERATIONS
  // ------------------------

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
