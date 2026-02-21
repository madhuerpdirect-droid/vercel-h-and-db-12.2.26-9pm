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

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.load();
      if (!this.users.length) {
        this.users = [...INITIAL_USERS];
        this.saveLocal();
      }
    } catch {
      this.users = [...INITIAL_USERS];
    }
  }

  private deserialize(parsed: any) {
    if (!parsed) return;

    this.users = parsed.users || [];
    this.chits = (parsed.chits || []).map((c: any) => ({ ...c, status: c.status || ChitStatus.ACTIVE }));
    this.members = parsed.members || [];
    this.memberships = parsed.memberships || [];
    this.installments = parsed.installments || [];
    this.allotments = parsed.allotments || [];
    this.payments = parsed.payments || [];
    this.paymentRequests = parsed.paymentRequests || [];
    this.settings = parsed.settings || INITIAL_MASTER_SETTINGS;
    this.lastUpdated = parsed.lastUpdated || new Date(0).toISOString();
  }

  private load() {
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
    this.lastUpdated = new Date().toISOString();
    localStorage.setItem('mi_chit_db', this.getSerializedData());
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

  markDirty() {
    this.isDirty = true;
    this.saveLocal();
  }

  // ---------------- GETTERS ----------------

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

  // ---------------- MEMBER ----------------

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

  // ---------------- CHIT ----------------

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

  // ---------------- MEMBERSHIP ----------------

  addMembership(membership: GroupMembership) {
    this.memberships.push(membership);

    const chit = this.chits.find(c => c.chitGroupId === membership.chitGroupId);
    if (chit) {
      for (let i = 1; i <= chit.totalMonths; i++) {
        const date = new Date(chit.startMonth);
        date.setMonth(date.getMonth() + i - 1);
        this.installments.push({
          scheduleId: `s_${membership.groupMembershipId}_${i}`,
          chitGroupId: membership.chitGroupId,
          memberId: membership.memberId,
          monthNo: i,
          dueDate: date.toISOString().split('T')[0],
          dueAmount: chit.monthlyInstallmentRegular,
          paidAmount: 0,
          status: PaymentStatus.PENDING,
          isPrizeMonth: false
        });
      }
    }

    this.markDirty();
  }

  // ---------------- PAYMENT ----------------

  addPayment(payment: Payment) {
    this.payments.push(payment);

    const schedule = this.installments.find(s =>
      s.chitGroupId === payment.chitGroupId &&
      s.memberId === payment.memberId &&
      s.monthNo === payment.monthNo
    );

    if (schedule) {
      schedule.paidAmount += payment.paidAmount;
      schedule.paidDate = payment.paymentDate;
      schedule.status =
        schedule.paidAmount >= schedule.dueAmount
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;
    }

    this.markDirty();
  }
}

/* =====================================================
   SINGLETON EXPORT SECTION (IMPORTANT FOR BUILD FIX)
===================================================== */

let dbInstance: DB | null = null;

function createDBInstance(): DB {
  if (!dbInstance) {
    dbInstance = new DB();
  }
  return dbInstance;
}

// Named export (if ever needed)
export function getDB() {
  return createDBInstance();
}

// Default export (what your frontend uses)
const db = createDBInstance();
export default db;
