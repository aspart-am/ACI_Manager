import {
  users, type User, type InsertUser,
  associates, type Associate, type InsertAssociate,
  expenses, type Expense, type InsertExpense,
  revenues, type Revenue, type InsertRevenue,
  rcpMeetings, type RcpMeeting, type InsertRcpMeeting,
  rcpAttendance, type RcpAttendance, type InsertRcpAttendance,
  projects, type Project, type InsertProject,
  projectAssignments, type ProjectAssignment, type InsertProjectAssignment,
  settings, type Setting, type InsertSetting
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Associate methods
  getAssociates(): Promise<Associate[]>;
  getAssociate(id: number): Promise<Associate | undefined>;
  createAssociate(associate: InsertAssociate): Promise<Associate>;
  updateAssociate(id: number, associate: Partial<InsertAssociate>): Promise<Associate | undefined>;
  deleteAssociate(id: number): Promise<boolean>;
  
  // Expense methods
  getExpenses(): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Revenue methods
  getRevenues(): Promise<Revenue[]>;
  getRevenue(id: number): Promise<Revenue | undefined>;
  createRevenue(revenue: InsertRevenue): Promise<Revenue>;
  updateRevenue(id: number, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined>;
  deleteRevenue(id: number): Promise<boolean>;
  
  // RCP Meeting methods
  getRcpMeetings(): Promise<RcpMeeting[]>;
  getRcpMeeting(id: number): Promise<RcpMeeting | undefined>;
  createRcpMeeting(meeting: InsertRcpMeeting): Promise<RcpMeeting>;
  
  // RCP Attendance methods
  getRcpAttendances(rcpId: number): Promise<RcpAttendance[]>;
  createRcpAttendance(attendance: InsertRcpAttendance): Promise<RcpAttendance>;
  updateRcpAttendance(id: number, attended: boolean): Promise<RcpAttendance | undefined>;
  
  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  
  // Project Assignment methods
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  updateProjectAssignment(id: number, contribution: number): Promise<ProjectAssignment | undefined>;
  
  // Settings methods
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: string): Promise<Setting | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private associates: Map<number, Associate>;
  private expenses: Map<number, Expense>;
  private revenues: Map<number, Revenue>;
  private rcpMeetings: Map<number, RcpMeeting>;
  private rcpAttendances: Map<number, RcpAttendance>;
  private projects: Map<number, Project>;
  private projectAssignments: Map<number, ProjectAssignment>;
  private settings: Map<number, Setting>;
  private settingKeys: Map<string, number>;
  
  private userCurrentId: number;
  private associateCurrentId: number;
  private expenseCurrentId: number;
  private revenueCurrentId: number;
  private rcpMeetingCurrentId: number;
  private rcpAttendanceCurrentId: number;
  private projectCurrentId: number;
  private projectAssignmentCurrentId: number;
  private settingCurrentId: number;

  constructor() {
    this.users = new Map();
    this.associates = new Map();
    this.expenses = new Map();
    this.revenues = new Map();
    this.rcpMeetings = new Map();
    this.rcpAttendances = new Map();
    this.projects = new Map();
    this.projectAssignments = new Map();
    this.settings = new Map();
    this.settingKeys = new Map();
    
    this.userCurrentId = 1;
    this.associateCurrentId = 1;
    this.expenseCurrentId = 1;
    this.revenueCurrentId = 1;
    this.rcpMeetingCurrentId = 1;
    this.rcpAttendanceCurrentId = 1;
    this.projectCurrentId = 1;
    this.projectAssignmentCurrentId = 1;
    this.settingCurrentId = 1;
    
    // Initialize default settings
    this.initializeDefaultSettings();
    // Initialize default data for demo
    this.initializeDemoData();
  }
  
  // Initialize default settings
  private initializeDefaultSettings() {
    const defaultSettings: InsertSetting[] = [
      {
        key: "aci_manager_weight",
        value: "1.5",
        category: "distribution",
        description: "Weight factor for managers in ACI distribution"
      },
      {
        key: "rcp_attendance_weight",
        value: "0.8",
        category: "distribution",
        description: "Weight factor for RCP meeting attendance in ACI distribution"
      },
      {
        key: "project_contribution_weight",
        value: "1.2",
        category: "distribution",
        description: "Weight factor for project contributions in ACI distribution"
      }
    ];
    
    defaultSettings.forEach(setting => {
      this.createSetting(setting);
    });
  }
  
  // Initialize demo data
  private initializeDemoData() {
    // Demo associates
    const demoAssociates: InsertAssociate[] = [
      {
        name: "Dr. Rousseau",
        profession: "Médecin généraliste",
        isManager: true,
        joinDate: new Date("2020-01-01"),
        patientCount: 980,
        participationWeight: 1.5
      },
      {
        name: "Dr. Martin",
        profession: "Médecin généraliste",
        isManager: false,
        joinDate: new Date("2020-03-15"),
        patientCount: 850,
        participationWeight: 1.0
      },
      {
        name: "Mme. Dupont",
        profession: "Infirmière",
        isManager: false,
        joinDate: new Date("2021-06-01"),
        patientCount: 0,
        participationWeight: 1.0
      },
      {
        name: "M. Bernard",
        profession: "Kinésithérapeute",
        isManager: true,
        joinDate: new Date("2022-01-15"),
        patientCount: 0,
        participationWeight: 1.3
      }
    ];
    
    demoAssociates.forEach(associate => {
      this.createAssociate(associate);
    });
    
    // Demo revenues
    const demoRevenues: InsertRevenue[] = [
      {
        source: "CPAM",
        description: "1er versement ACI",
        amount: 19125,
        date: new Date("2024-01-15"),
        category: "ACI"
      },
      {
        source: "CPAM",
        description: "2ème versement ACI",
        amount: 19125,
        date: new Date("2024-04-15"),
        category: "ACI"
      },
      {
        source: "CPAM",
        description: "3ème versement ACI",
        amount: 19125,
        date: new Date("2024-07-15"),
        category: "ACI"
      },
      {
        source: "ARS",
        description: "Subvention projet prévention",
        amount: 7500,
        date: new Date("2024-02-10"),
        category: "Subvention"
      }
    ];
    
    demoRevenues.forEach(revenue => {
      this.createRevenue(revenue);
    });
    
    // Demo expenses
    const demoExpenses: InsertExpense[] = [
      {
        category: "Loyer",
        description: "Loyer mensuel",
        amount: 2500,
        date: new Date("2024-01-01"),
        isRecurring: true,
        frequency: "monthly"
      },
      {
        category: "Électricité",
        description: "Facture électricité",
        amount: 350,
        date: new Date("2024-01-15"),
        isRecurring: true,
        frequency: "monthly"
      },
      {
        category: "Matériel médical",
        description: "Achat matériel de diagnostic",
        amount: 1200,
        date: new Date("2024-03-10"),
        isRecurring: false
      },
      {
        category: "Logiciel",
        description: "Abonnement logiciel de gestion",
        amount: 180,
        date: new Date("2024-01-05"),
        isRecurring: true,
        frequency: "monthly"
      }
    ];
    
    demoExpenses.forEach(expense => {
      this.createExpense(expense);
    });
    
    // Demo RCP meetings
    const demoRcpMeetings: InsertRcpMeeting[] = [
      {
        date: new Date("2024-01-10"),
        title: "RCP Mensuelle Janvier",
        description: "Réunion mensuelle de coordination pluriprofessionnelle"
      },
      {
        date: new Date("2024-02-14"),
        title: "RCP Mensuelle Février",
        description: "Réunion mensuelle de coordination pluriprofessionnelle"
      },
      {
        date: new Date("2024-03-13"),
        title: "RCP Mensuelle Mars",
        description: "Réunion mensuelle de coordination pluriprofessionnelle"
      }
    ];
    
    demoRcpMeetings.forEach(meeting => {
      this.createRcpMeeting(meeting);
    });
    
    // Demo Projects
    const demoProjects: InsertProject[] = [
      {
        title: "Prévention Diabète",
        description: "Projet de prévention du diabète pour les patients à risque",
        startDate: new Date("2024-02-01"),
        endDate: new Date("2024-08-31"),
        status: "active",
        weight: 1.5
      },
      {
        title: "Téléconsultation",
        description: "Mise en place d'un système de téléconsultation",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2024-06-30"),
        status: "active",
        weight: 1.2
      }
    ];
    
    demoProjects.forEach(project => {
      this.createProject(project);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Associate methods
  async getAssociates(): Promise<Associate[]> {
    return Array.from(this.associates.values());
  }
  
  async getAssociate(id: number): Promise<Associate | undefined> {
    return this.associates.get(id);
  }
  
  async createAssociate(insertAssociate: InsertAssociate): Promise<Associate> {
    const id = this.associateCurrentId++;
    const associate: Associate = { ...insertAssociate, id };
    this.associates.set(id, associate);
    return associate;
  }
  
  async updateAssociate(id: number, associate: Partial<InsertAssociate>): Promise<Associate | undefined> {
    const existingAssociate = this.associates.get(id);
    if (!existingAssociate) return undefined;
    
    const updatedAssociate = { ...existingAssociate, ...associate };
    this.associates.set(id, updatedAssociate);
    return updatedAssociate;
  }
  
  async deleteAssociate(id: number): Promise<boolean> {
    return this.associates.delete(id);
  }
  
  // Expense methods
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }
  
  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const id = this.expenseCurrentId++;
    const expense: Expense = { ...insertExpense, id };
    this.expenses.set(id, expense);
    return expense;
  }
  
  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const existingExpense = this.expenses.get(id);
    if (!existingExpense) return undefined;
    
    const updatedExpense = { ...existingExpense, ...expense };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }
  
  // Revenue methods
  async getRevenues(): Promise<Revenue[]> {
    return Array.from(this.revenues.values());
  }
  
  async getRevenue(id: number): Promise<Revenue | undefined> {
    return this.revenues.get(id);
  }
  
  async createRevenue(insertRevenue: InsertRevenue): Promise<Revenue> {
    const id = this.revenueCurrentId++;
    const revenue: Revenue = { ...insertRevenue, id };
    this.revenues.set(id, revenue);
    return revenue;
  }
  
  async updateRevenue(id: number, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined> {
    const existingRevenue = this.revenues.get(id);
    if (!existingRevenue) return undefined;
    
    const updatedRevenue = { ...existingRevenue, ...revenue };
    this.revenues.set(id, updatedRevenue);
    return updatedRevenue;
  }
  
  async deleteRevenue(id: number): Promise<boolean> {
    return this.revenues.delete(id);
  }
  
  // RCP Meeting methods
  async getRcpMeetings(): Promise<RcpMeeting[]> {
    return Array.from(this.rcpMeetings.values());
  }
  
  async getRcpMeeting(id: number): Promise<RcpMeeting | undefined> {
    return this.rcpMeetings.get(id);
  }
  
  async createRcpMeeting(insertRcpMeeting: InsertRcpMeeting): Promise<RcpMeeting> {
    const id = this.rcpMeetingCurrentId++;
    const rcpMeeting: RcpMeeting = { ...insertRcpMeeting, id };
    this.rcpMeetings.set(id, rcpMeeting);
    return rcpMeeting;
  }
  
  // RCP Attendance methods
  async getRcpAttendances(rcpId: number): Promise<RcpAttendance[]> {
    return Array.from(this.rcpAttendances.values()).filter(a => a.rcpId === rcpId);
  }
  
  async createRcpAttendance(insertRcpAttendance: InsertRcpAttendance): Promise<RcpAttendance> {
    const id = this.rcpAttendanceCurrentId++;
    const rcpAttendance: RcpAttendance = { ...insertRcpAttendance, id };
    this.rcpAttendances.set(id, rcpAttendance);
    return rcpAttendance;
  }
  
  async updateRcpAttendance(id: number, attended: boolean): Promise<RcpAttendance | undefined> {
    const existingAttendance = this.rcpAttendances.get(id);
    if (!existingAttendance) return undefined;
    
    const updatedAttendance = { ...existingAttendance, attended };
    this.rcpAttendances.set(id, updatedAttendance);
    return updatedAttendance;
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectCurrentId++;
    const project: Project = { ...insertProject, id };
    this.projects.set(id, project);
    return project;
  }
  
  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) return undefined;
    
    const updatedProject = { ...existingProject, ...project };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  // Project Assignment methods
  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values()).filter(a => a.projectId === projectId);
  }
  
  async createProjectAssignment(insertProjectAssignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const id = this.projectAssignmentCurrentId++;
    const projectAssignment: ProjectAssignment = { ...insertProjectAssignment, id };
    this.projectAssignments.set(id, projectAssignment);
    return projectAssignment;
  }
  
  async updateProjectAssignment(id: number, contribution: number): Promise<ProjectAssignment | undefined> {
    const existingAssignment = this.projectAssignments.get(id);
    if (!existingAssignment) return undefined;
    
    const updatedAssignment = { ...existingAssignment, contribution };
    this.projectAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }
  
  // Settings methods
  async getSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }
  
  async getSetting(key: string): Promise<Setting | undefined> {
    const id = this.settingKeys.get(key);
    if (!id) return undefined;
    return this.settings.get(id);
  }
  
  async createSetting(insertSetting: InsertSetting): Promise<Setting> {
    const id = this.settingCurrentId++;
    const setting: Setting = { ...insertSetting, id };
    this.settings.set(id, setting);
    this.settingKeys.set(setting.key, id);
    return setting;
  }
  
  async updateSetting(key: string, value: string): Promise<Setting | undefined> {
    const id = this.settingKeys.get(key);
    if (!id) return undefined;
    
    const existingSetting = this.settings.get(id);
    if (!existingSetting) return undefined;
    
    const updatedSetting = { ...existingSetting, value };
    this.settings.set(id, updatedSetting);
    return updatedSetting;
  }
}

export const storage = new MemStorage();
