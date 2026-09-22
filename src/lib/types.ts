export type TabId =
  | "dashboard"
  | "mempelai"
  | "budget"
  | "seserahan"
  | "vendors"
  | "administrasi"
  | "undangan"
  | "timeline"
  | "rundown";

export type BrideProfile = {
  fullName: string;
  nickname: string;
  father: string;
  mother: string;
  phone: string;
  address: string;
};

export type BudgetItem = {
  id: string;
  category: string;
  item: string;
  estimated: number;
  actual: number;
  status: string;
};

export type SeserahanItem = {
  id: string;
  title: string;
  cost: number;
  ready: boolean;
  link?: string;
  section?: SeserahanSection;
};

export type SeserahanSection = "mahar" | "cppToCpw" | "cpwToCpp";

export type Vendor = {
  id: string;
  category: string;
  name: string;
  price: number;
  status: string;
  contact: string;
  notes: string;
};

export type AdminDoc = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
};

export type Guest = {
  id: string;
  name: string;
  side: string;
  category: string;
  pax: number;
  sent: boolean;
  status: string;
  isVip: boolean;
};

export type ChecklistItem = {
  id: string;
  timeframe: string;
  task: string;
  done: boolean;
};

export type RundownItem = {
  id: string;
  time: string;
  activity: string;
  pic: string;
};

export type CommitteeMember = {
  id: string;
  role: string;
  name: string;
  uniformGiven: boolean;
};

export type WeddingState = {
  dataVersion: number;
  weddingDate: string;
  akadTime: string;
  resepsiTime: string;
  weddingVenue: string;
  weddingTheme: string;
  totalBudget: number;
  brideData: {
    cpp: BrideProfile;
    cpw: BrideProfile;
  };
  budgetList: BudgetItem[];
  maharItems: SeserahanItem[];
  seserahanCppToCpw: SeserahanItem[];
  seserahanCpwToCpp: SeserahanItem[];
  vendors: Vendor[];
  adminDocs: AdminDoc[];
  guests: Guest[];
  checklist: ChecklistItem[];
  rundownList: RundownItem[];
  committeeList: CommitteeMember[];
};
