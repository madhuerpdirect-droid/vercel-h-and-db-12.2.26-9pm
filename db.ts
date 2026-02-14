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

  setDirtyListener(cb: (d: boolean) => void) {
    this.onDirtyChange = cb;
  }

  setSyncListener(cb: (s: boolean) => void) {
    this.onSyncChange = cb;
  }

  private load() {
    const data = localStorage.getItem('mi_chit_db');
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      this.deserialize(parsed);
    } catch {}
  }

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
    this.lastUpdated = parsed.lastUpdated || new Date(0).toISOString();
  }

  private serialize() {
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

  private saveLocal() {
    localStorage.setItem('mi_chit_db', JSON.stringify(this.serialize()));
  }

  markDirty() {
    this.isDirty = true;
    this.saveLocal();
    this.onDirtyChange?.(true);
  }

  async syncWithCloud(): Promise<boolean> {
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    this.onSyncChange?.(true);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.serialize())
      });

      if (!response.ok) throw new Error();

      this.isDirty = false;
      this.onDirtyChange?.(false);
      return true;

    } catch {
      return false;
    } finally {
      this.isSyncing = false;
      this.onSyncChange?.(false);
    }
  }

  async loadCloudData(): Promise<boolean> {
    try {
      const response = await fetch('/api/sync');
      if (!response.ok) return false;

      const result = await response.json();
      if (!result.data) return false;

      this.deserialize(result.data);
      this.saveLocal();
      return true;

    } catch {
      return false;
    }
  }

  getChits = () => this.chits;
  addChit(chit: ChitGroup) {
    this.chits.push(chit);
    this.markDirty();
  }
}

export const db = new DB();
