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
    this.loadCloudData().catch(() => {});
  }

  /* ================= INITIALIZATION ================= */

  private init() {
    this.loadLocal();

    if (!this.users.length) {
      this.users = [...INITIAL_USERS];
      this.saveLocal();
    }
  }

  private loadLocal() {
    if (typeof window === 'undefined') return;

    const data = localStorage.getItem('mi_chit_db');
    if (data) {
      try {
        this.deserialize(JSON.parse(data));
      } catch {
        console.warn("Local data corrupted");
      }
    }
  }

  private saveLocal() {
    if (typeof window === 'undefined') return;

    this.lastUpdated = new Date().toISOString();
    localStorage.setItem('mi_chit_db', this.getSerializedData());
  }

  private deserialize(parsed: any) {
    if (!parsed) return;

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

  public getSerializedData() {
    return JSON.stringify({
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
    });
  }

  /* ================= SYNC ================= */

  setDirtyListener(listener: (dirty: boolean) => void) {
    this.onDirtyChange = listener;
  }

  setSyncListener(listener: (syncing: boolean) => void) {
    this.onSyncChange = listener;
  }

  markDirty() {
    this.isDirty = true;
    this.saveLocal();
    this.onDirtyChange?.(true);

    setTimeout(() => {
      this.syncWithCloud();
    }, 1500);
  }

  async save(): Promise<boolean> {
    this.saveLocal();
    return await this.syncWithCloud();
  }

  async syncWithCloud(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!navigator.onLine) return false;

    this.isSyncing = true;
    this.onSyncChange?.(true);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: this.getSerializedData()
      });

      if (!response.ok) throw new Error("Sync failed");

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
    if (typeof window === 'undefined') return false;
    if (!navigator.onLine) return false;

    try {
      const response = await fetch('/api/sync');
      if (!response.ok) return false;

      const result = await response.json();
      if (!result?.data) return false;

      const onlineData = result.data;

      const localRaw = localStorage.getItem('mi_chit_db');
      const localData = localRaw ? JSON.parse(localRaw) : null;

      const onlineTime = new Date(onlineData.lastUpdated || 0).getTime();
      const localTime = new Date(localData?.lastUpdated || 0).getTime();

      if (!localData || onlineTime > localTime) {
        this.deserialize(onlineData);
        this.saveLocal();
        this.onDirtyChange?.(false);
        return true;
      }

      return false;

    } catch (err) {
      console.warn("Cloud load failed:", err);
      return false;
    }
  }

  /* ================= GETTERS ================= */

  getUsers = () => this.users;
  getChits = () => this.chits;
  getMembers = () => this.members;
  getMemberships = () => this.memberships;
  getInstallments = () => this.installments;
  getAllotments = () => this.allotments;
  getPayments = () => this.payments;
  getPaymentRequests = () => this.paymentRequests;
  getSettings = () => this.settings;
  getDirtyStatus = () => this.isDirty;
  getSyncStatus = () => this.isSyncing;

  /* ================= CRUD ================= */

  addMember(member: Member) {
    this.members.push(member);
    this.markDirty();
  }

  updateMember(memberId: string, data: Partial<Member>) {
    const idx = this.members.findIndex(m => m.memberId === memberId);
    if (idx !== -1) {
      this.members[idx] = { ...this.members[idx], ...data };
      this.markDirty();
    }
  }

  addChit(chit: ChitGroup) {
    this.chits.push(chit);
    this.markDirty();
  }

  updateChit(chitGroupId: string, data: Partial<ChitGroup>) {
    const idx = this.chits.findIndex(c => c.chitGroupId === chitGroupId);
    if (idx !== -1) {
      this.chits[idx] = { ...this.chits[idx], ...data };
      this.markDirty();
    }
  }

  addMembership(membership: GroupMembership) {
    this.memberships.push(membership);
    this.markDirty();
  }

  addPayment(payment: Payment) {
    this.payments.push(payment);
    this.markDirty();
  }
}

/* ================= SINGLETON ================= */

let dbInstance: DB | null = null;

function createDBInstance(): DB {
  if (!dbInstance) {
    dbInstance = new DB();
  }
  return dbInstance;
}

export function getDB() {
  return createDBInstance();
}

const db = createDBInstance();
export default db;

// 🔥 DEBUG ONLY – REMOVE LATER
if (typeof window !== 'undefined') {
  (window as any).db = db;
}
