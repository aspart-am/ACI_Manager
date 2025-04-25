import {
  type User, type InsertUser,
  type Associate, type InsertAssociate,
  type Expense, type InsertExpense,
  type Revenue, type InsertRevenue,
  type RcpMeeting, type InsertRcpMeeting,
  type RcpAttendance, type InsertRcpAttendance,
  type Project, type InsertProject,
  type ProjectAssignment, type InsertProjectAssignment,
  type AccessoryMission, type InsertAccessoryMission,
  type MissionAssignment, type InsertMissionAssignment,
  type Setting, type InsertSetting
} from "@shared/schema";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { query } from "./db";

// Définir __dirname pour les modules ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  updateRcpMeeting(id: number, meeting: Partial<InsertRcpMeeting>): Promise<RcpMeeting | undefined>;
  deleteRcpMeeting(id: number): Promise<boolean>;
  
  // RCP Attendance methods
  getRcpAttendances(rcpId: number): Promise<RcpAttendance[]>;
  createRcpAttendance(attendance: InsertRcpAttendance): Promise<RcpAttendance>;
  updateRcpAttendance(id: number, attended: boolean): Promise<RcpAttendance | undefined>;
  
  // Project methods
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Project Assignment methods
  getProjectAssignments(projectId: number): Promise<ProjectAssignment[]>;
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  updateProjectAssignment(id: number, contribution: number): Promise<ProjectAssignment | undefined>;
  
  // Accessory Missions methods
  getAccessoryMissions(): Promise<AccessoryMission[]>;
  getAccessoryMissionsByYear(year: number): Promise<AccessoryMission[]>;
  getAccessoryMission(id: number): Promise<AccessoryMission | undefined>;
  createAccessoryMission(mission: InsertAccessoryMission): Promise<AccessoryMission>;
  updateAccessoryMission(id: number, mission: Partial<InsertAccessoryMission>): Promise<AccessoryMission | undefined>;
  deleteAccessoryMission(id: number): Promise<boolean>;
  
  // Mission Assignment methods
  getMissionAssignments(missionId: number): Promise<MissionAssignment[]>;
  getMissionAssignment(id: number): Promise<MissionAssignment | undefined>;
  createMissionAssignment(assignment: InsertMissionAssignment): Promise<MissionAssignment>;
  updateMissionAssignment(id: number, contributionPercentage: number): Promise<MissionAssignment | undefined>;
  deleteMissionAssignment(id: number): Promise<boolean>;
  
  // Settings methods
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  createSetting(setting: InsertSetting): Promise<Setting>;
  updateSetting(key: string, value: string): Promise<Setting | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { username, password, fullName, role } = insertUser;
    const result = await query(
      'INSERT INTO users(username, password, full_name, role) VALUES($1, $2, $3, $4) RETURNING *',
      [username, password, fullName, role || 'user']
    );
    return result.rows[0];
  }

  // Associate methods
  async getAssociates(): Promise<Associate[]> {
    const result = await query('SELECT * FROM associates ORDER BY name');
    return result.rows;
  }

  async getAssociate(id: number): Promise<Associate | undefined> {
    const result = await query('SELECT * FROM associates WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createAssociate(insertAssociate: InsertAssociate): Promise<Associate> {
    const { name, profession, isManager, joinDate, patientCount, participationWeight } = insertAssociate;
    const result = await query(
      'INSERT INTO associates(name, profession, is_manager, join_date, patient_count, participation_weight) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        name, 
        profession, 
        isManager ?? false, 
        joinDate, 
        patientCount ?? null, 
        participationWeight ?? '1.0'
      ]
    );
    return result.rows[0];
  }

  async updateAssociate(id: number, associate: Partial<InsertAssociate>): Promise<Associate | undefined> {
    const current = await this.getAssociate(id);
    if (!current) return undefined;

    const { name, profession, isManager, joinDate, patientCount, participationWeight } = associate;
    
    let queryStr = 'UPDATE associates SET ';
    const values: any[] = [];
    const updates: string[] = [];
    
    if (name !== undefined) {
      values.push(name);
      updates.push(`name = $${values.length}`);
    }
    
    if (profession !== undefined) {
      values.push(profession);
      updates.push(`profession = $${values.length}`);
    }
    
    // Si le statut de gérant a changé, mettre à jour le poids de participation en conséquence
    let updatedWeight = participationWeight;
    
    // Vérifier si le statut de gérant a changé (gestion des deux formats : camelCase et snake_case)
    const currentIsManager = current.isManager || (current as any).is_manager;
    if (isManager !== undefined && isManager !== currentIsManager) {
      values.push(isManager);
      updates.push(`is_manager = $${values.length}`);
      
      // Si l'associé devient gérant, son poids de participation passe à 1.5
      // sauf si une valeur explicite a été fournie
      if (isManager === true && participationWeight === undefined) {
        // Récupération de la valeur de pondération des gérants depuis les paramètres
        const managerWeightSetting = await this.getSetting('manager_weight');
        const managerWeight = managerWeightSetting ? managerWeightSetting.value : '1.5';
        
        updatedWeight = managerWeight;
      }
      
      // Si l'associé n'est plus gérant, son poids revient à 1.0
      // sauf si une valeur explicite a été fournie
      if (isManager === false && participationWeight === undefined) {
        updatedWeight = '1.0';
      }
    }
    
    if (joinDate !== undefined) {
      values.push(joinDate);
      updates.push(`join_date = $${values.length}`);
    }
    
    if (patientCount !== undefined) {
      values.push(patientCount);
      updates.push(`patient_count = $${values.length}`);
    }
    
    // Utiliser la valeur calculée de poids si elle existe, sinon utiliser celle fournie
    if (updatedWeight !== undefined) {
      values.push(updatedWeight);
      updates.push(`participation_weight = $${values.length}`);
    } else if (participationWeight !== undefined) {
      values.push(participationWeight);
      updates.push(`participation_weight = $${values.length}`);
    }
    
    if (updates.length === 0) return current;
    
    values.push(id);
    queryStr += updates.join(', ') + ` WHERE id = $${values.length} RETURNING *`;
    
    const result = await query(queryStr, values);
    return result.rows[0];
  }

  async deleteAssociate(id: number): Promise<boolean> {
    const result = await query('DELETE FROM associates WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Expense methods
  async getExpenses(): Promise<Expense[]> {
    const result = await query('SELECT * FROM expenses ORDER BY date DESC');
    return result.rows;
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const result = await query('SELECT * FROM expenses WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const { category, description, amount, date, isRecurring, frequency } = insertExpense;
    const result = await query(
      'INSERT INTO expenses(category, description, amount, date, is_recurring, frequency) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        category,
        description,
        amount,
        date,
        isRecurring ?? false,
        frequency || null
      ]
    );
    return result.rows[0];
  }

  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const current = await this.getExpense(id);
    if (!current) return undefined;

    const { category, description, amount, date, isRecurring, frequency } = expense;
    
    let queryStr = 'UPDATE expenses SET ';
    const values: any[] = [];
    const updates: string[] = [];
    
    if (category !== undefined) {
      values.push(category);
      updates.push(`category = $${values.length}`);
    }
    
    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }
    
    if (amount !== undefined) {
      values.push(amount);
      updates.push(`amount = $${values.length}`);
    }
    
    if (date !== undefined) {
      values.push(date);
      updates.push(`date = $${values.length}`);
    }
    
    if (isRecurring !== undefined) {
      values.push(isRecurring);
      updates.push(`is_recurring = $${values.length}`);
    }
    
    if (frequency !== undefined) {
      values.push(frequency);
      updates.push(`frequency = $${values.length}`);
    }
    
    if (updates.length === 0) return current;
    
    values.push(id);
    queryStr += updates.join(', ') + ` WHERE id = $${values.length} RETURNING *`;
    
    const result = await query(queryStr, values);
    return result.rows[0];
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Revenue methods
  async getRevenues(): Promise<Revenue[]> {
    const result = await query('SELECT * FROM revenues ORDER BY date DESC');
    return result.rows;
  }

  async getRevenue(id: number): Promise<Revenue | undefined> {
    const result = await query('SELECT * FROM revenues WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createRevenue(insertRevenue: InsertRevenue): Promise<Revenue> {
    const { source, description, amount, date, category } = insertRevenue;
    const result = await query(
      'INSERT INTO revenues(source, description, amount, date, category) VALUES($1, $2, $3, $4, $5) RETURNING *',
      [
        source,
        description,
        amount,
        date,
        category
      ]
    );
    return result.rows[0];
  }

  async updateRevenue(id: number, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined> {
    const current = await this.getRevenue(id);
    if (!current) return undefined;

    const { source, description, amount, date, category } = revenue;
    
    let queryStr = 'UPDATE revenues SET ';
    const values: any[] = [];
    const updates: string[] = [];
    
    if (source !== undefined) {
      values.push(source);
      updates.push(`source = $${values.length}`);
    }
    
    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }
    
    if (amount !== undefined) {
      values.push(amount);
      updates.push(`amount = $${values.length}`);
    }
    
    if (date !== undefined) {
      values.push(date);
      updates.push(`date = $${values.length}`);
    }
    
    if (category !== undefined) {
      values.push(category);
      updates.push(`category = $${values.length}`);
    }
    
    if (updates.length === 0) return current;
    
    values.push(id);
    queryStr += updates.join(', ') + ` WHERE id = $${values.length} RETURNING *`;
    
    const result = await query(queryStr, values);
    return result.rows[0];
  }

  async deleteRevenue(id: number): Promise<boolean> {
    const result = await query('DELETE FROM revenues WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // RCP Meeting methods
  async getRcpMeetings(): Promise<RcpMeeting[]> {
    const result = await query('SELECT * FROM rcp_meetings ORDER BY date DESC');
    return result.rows;
  }

  async getRcpMeeting(id: number): Promise<RcpMeeting | undefined> {
    const result = await query('SELECT * FROM rcp_meetings WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createRcpMeeting(insertRcpMeeting: InsertRcpMeeting): Promise<RcpMeeting> {
    const { title, description, date, duration } = insertRcpMeeting;
    const result = await query(
      'INSERT INTO rcp_meetings(title, description, date, duration) VALUES($1, $2, $3, $4) RETURNING *',
      [
        title,
        description || null,
        date,
        duration?.toString() || '60'
      ]
    );
    return result.rows[0];
  }
  
  async updateRcpMeeting(id: number, meeting: Partial<InsertRcpMeeting>): Promise<RcpMeeting | undefined> {
    const current = await this.getRcpMeeting(id);
    if (!current) return undefined;

    const { title, description, date, duration } = meeting;
    
    let queryStr = 'UPDATE rcp_meetings SET ';
    const values: any[] = [];
    const updates: string[] = [];
    
    if (title !== undefined) {
      values.push(title);
      updates.push(`title = $${values.length}`);
    }
    
    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }
    
    if (date !== undefined) {
      values.push(date);
      updates.push(`date = $${values.length}`);
    }
    
    if (duration !== undefined) {
      values.push(duration.toString());
      updates.push(`duration = $${values.length}`);
    }
    
    if (updates.length === 0) return current;
    
    values.push(id);
    queryStr += updates.join(', ') + ` WHERE id = $${values.length} RETURNING *`;
    
    const result = await query(queryStr, values);
    return result.rows[0];
  }

  async deleteRcpMeeting(id: number): Promise<boolean> {
    // D'abord, supprimer toutes les présences associées à cette réunion
    await query('DELETE FROM rcp_attendance WHERE rcp_id = $1', [id]);
    
    // Ensuite, supprimer la réunion elle-même
    const result = await query('DELETE FROM rcp_meetings WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // RCP Attendance methods
  async getRcpAttendances(rcpId: number): Promise<RcpAttendance[]> {
    const result = await query('SELECT * FROM rcp_attendance WHERE rcp_id = $1', [rcpId]);
    return result.rows;
  }

  async createRcpAttendance(insertRcpAttendance: InsertRcpAttendance): Promise<RcpAttendance> {
    const { rcpId, associateId, attended } = insertRcpAttendance;
    const result = await query(
      'INSERT INTO rcp_attendance(rcp_id, associate_id, attended) VALUES($1, $2, $3) RETURNING *',
      [
        rcpId,
        associateId,
        attended ?? false
      ]
    );
    return result.rows[0];
  }

  async updateRcpAttendance(id: number, attended: boolean): Promise<RcpAttendance | undefined> {
    const result = await query(
      'UPDATE rcp_attendance SET attended = $1 WHERE id = $2 RETURNING *',
      [attended, id]
    );
    return result.rows[0] || undefined;
  }

  // Project methods
  async getProjects(): Promise<Project[]> {
    const result = await query('SELECT * FROM projects ORDER BY start_date DESC');
    return result.rows;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const result = await query('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const { title, description, startDate, endDate, status, weight } = insertProject;
    const result = await query(
      'INSERT INTO projects(title, description, start_date, end_date, status, weight) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        title,
        description || null,
        startDate,
        endDate || null,
        status ?? 'active',
        weight ?? '1.0'
      ]
    );
    return result.rows[0];
  }

  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const current = await this.getProject(id);
    if (!current) return undefined;

    const { title, description, startDate, endDate, status, weight } = project;
    
    let queryStr = 'UPDATE projects SET ';
    const values: any[] = [];
    const updates: string[] = [];
    
    if (title !== undefined) {
      values.push(title);
      updates.push(`title = $${values.length}`);
    }
    
    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }
    
    if (startDate !== undefined) {
      values.push(startDate);
      updates.push(`start_date = $${values.length}`);
    }
    
    if (endDate !== undefined) {
      values.push(endDate);
      updates.push(`end_date = $${values.length}`);
    }
    
    if (status !== undefined) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    
    if (weight !== undefined) {
      values.push(weight);
      updates.push(`weight = $${values.length}`);
    }
    
    if (updates.length === 0) return current;
    
    values.push(id);
    queryStr += updates.join(', ') + ` WHERE id = $${values.length} RETURNING *`;
    
    const result = await query(queryStr, values);
    return result.rows[0];
  }
  
  async deleteProject(id: number): Promise<boolean> {
    // D'abord, supprimer toutes les affectations associées à ce projet
    await query('DELETE FROM project_assignments WHERE project_id = $1', [id]);
    
    // Ensuite, supprimer le projet lui-même
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Project Assignment methods
  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    const result = await query('SELECT * FROM project_assignments WHERE project_id = $1', [projectId]);
    return result.rows;
  }

  async createProjectAssignment(insertProjectAssignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const { projectId, associateId, contribution } = insertProjectAssignment;
    const result = await query(
      'INSERT INTO project_assignments(project_id, associate_id, contribution) VALUES($1, $2, $3) RETURNING *',
      [
        projectId,
        associateId,
        contribution ?? '1.0'
      ]
    );
    return result.rows[0];
  }

  async updateProjectAssignment(id: number, contribution: number): Promise<ProjectAssignment | undefined> {
    const result = await query(
      'UPDATE project_assignments SET contribution = $1 WHERE id = $2 RETURNING *',
      [contribution.toString(), id]
    );
    return result.rows[0] || undefined;
  }

  // Accessory Missions methods
  async getAccessoryMissions(): Promise<AccessoryMission[]> {
    const result = await query('SELECT * FROM accessory_missions ORDER BY start_date DESC');
    return result.rows;
  }

  async getAccessoryMissionsByYear(year: number): Promise<AccessoryMission[]> {
    const result = await query('SELECT * FROM accessory_missions WHERE year = $1 ORDER BY start_date DESC', [year]);
    return result.rows;
  }

  async getAccessoryMission(id: number): Promise<AccessoryMission | undefined> {
    const result = await query('SELECT * FROM accessory_missions WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createAccessoryMission(mission: InsertAccessoryMission): Promise<AccessoryMission> {
    const { title, description, startDate, endDate, status, budget, type, year } = mission;
    const result = await query(
      `INSERT INTO accessory_missions(
        title, description, start_date, end_date, status, budget, type, year
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        title,
        description || null,
        startDate,
        endDate || null,
        status || 'active',
        budget || '0',
        type || 'santé publique',
        year
      ]
    );
    return result.rows[0];
  }

  async updateAccessoryMission(id: number, mission: Partial<InsertAccessoryMission>): Promise<AccessoryMission | undefined> {
    const current = await this.getAccessoryMission(id);
    if (!current) return undefined;

    const { title, description, startDate, endDate, status, budget, type, year } = mission;
    
    let queryStr = 'UPDATE accessory_missions SET ';
    const values: any[] = [];
    const updates: string[] = [];
    
    if (title !== undefined) {
      values.push(title);
      updates.push(`title = $${values.length}`);
    }
    
    if (description !== undefined) {
      values.push(description);
      updates.push(`description = $${values.length}`);
    }
    
    if (startDate !== undefined) {
      values.push(startDate);
      updates.push(`start_date = $${values.length}`);
    }
    
    if (endDate !== undefined) {
      values.push(endDate);
      updates.push(`end_date = $${values.length}`);
    }
    
    if (status !== undefined) {
      values.push(status);
      updates.push(`status = $${values.length}`);
    }
    
    if (budget !== undefined) {
      values.push(budget);
      updates.push(`budget = $${values.length}`);
    }
    
    if (type !== undefined) {
      values.push(type);
      updates.push(`type = $${values.length}`);
    }
    
    if (year !== undefined) {
      values.push(year);
      updates.push(`year = $${values.length}`);
    }
    
    if (updates.length === 0) return current;
    
    values.push(id);
    queryStr += updates.join(', ') + ` WHERE id = $${values.length} RETURNING *`;
    
    const result = await query(queryStr, values);
    return result.rows[0];
  }

  async deleteAccessoryMission(id: number): Promise<boolean> {
    const result = await query('DELETE FROM accessory_missions WHERE id = $1 RETURNING id', [id]);
    return result.rowCount! > 0;
  }

  // Mission Assignment methods
  async getMissionAssignments(missionId: number): Promise<MissionAssignment[]> {
    const result = await query('SELECT * FROM mission_assignments WHERE mission_id = $1', [missionId]);
    return result.rows;
  }

  async getMissionAssignment(id: number): Promise<MissionAssignment | undefined> {
    const result = await query('SELECT * FROM mission_assignments WHERE id = $1', [id]);
    return result.rows[0] || undefined;
  }

  async createMissionAssignment(assignment: InsertMissionAssignment): Promise<MissionAssignment> {
    const { missionId, associateId, contributionPercentage } = assignment;
    const result = await query(
      'INSERT INTO mission_assignments(mission_id, associate_id, contribution_percentage) VALUES($1, $2, $3) RETURNING *',
      [
        missionId,
        associateId,
        contributionPercentage || '100'
      ]
    );
    return result.rows[0];
  }

  async updateMissionAssignment(id: number, contributionPercentage: number): Promise<MissionAssignment | undefined> {
    const result = await query(
      'UPDATE mission_assignments SET contribution_percentage = $1 WHERE id = $2 RETURNING *',
      [contributionPercentage, id]
    );
    return result.rows[0] || undefined;
  }

  async deleteMissionAssignment(id: number): Promise<boolean> {
    const result = await query('DELETE FROM mission_assignments WHERE id = $1 RETURNING id', [id]);
    return result.rowCount! > 0;
  }

  // Settings methods
  async getSettings(): Promise<Setting[]> {
    const result = await query('SELECT * FROM settings ORDER BY category, key');
    return result.rows;
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const result = await query('SELECT * FROM settings WHERE key = $1', [key]);
    return result.rows[0] || undefined;
  }

  async createSetting(insertSetting: InsertSetting): Promise<Setting> {
    const { key, value, category, description } = insertSetting;
    const result = await query(
      'INSERT INTO settings(key, value, category, description) VALUES($1, $2, $3, $4) RETURNING *',
      [
        key,
        value,
        category,
        description || null
      ]
    );
    return result.rows[0];
  }

  async updateSetting(key: string, value: string): Promise<Setting | undefined> {
    const result = await query(
      'UPDATE settings SET value = $1 WHERE key = $2 RETURNING *',
      [value, key]
    );
    return result.rows[0] || undefined;
  }
}

// Classe de stockage en mémoire qui utilise des fichiers JSON
export class MemStorage implements IStorage {
  private users: User[] = [];
  private associates: Associate[] = [];
  private expenses: Expense[] = [];
  private revenues: Revenue[] = [];
  private rcpMeetings: RcpMeeting[] = [];
  private rcpAttendances: RcpAttendance[] = [];
  private projects: Project[] = [];
  private projectAssignments: ProjectAssignment[] = [];
  private accessoryMissions: AccessoryMission[] = [];
  private missionAssignments: MissionAssignment[] = [];
  private settings: Setting[] = [];
  
  private dataDir = path.join(__dirname, '../data');
  
  constructor() {
    // Créer le répertoire de données s'il n'existe pas
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Chargement des données initiales
    this.loadData();
    
    // Ajouter des données de base si les tableaux sont vides
    this.initializeDefaultData();
  }
  
  // Méthode utilitaire pour générer un nouvel ID
  private getNextId(items: { id: number }[]): number {
    if (items.length === 0) return 1;
    return Math.max(...items.map(item => item.id)) + 1;
  }
  
  // Charger les données depuis les fichiers JSON
  private loadData(): void {
    try {
      // Créer des fichiers vides s'ils n'existent pas
      const files = [
        'users.json', 'associates.json', 'expenses.json', 'revenues.json',
        'rcp_meetings.json', 'rcp_attendances.json', 'projects.json',
        'project_assignments.json', 'accessory_missions.json',
        'mission_assignments.json', 'settings.json'
      ];
      
      files.forEach(file => {
        const filePath = path.join(this.dataDir, file);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, '[]', 'utf8');
        }
      });
      
      // Charger les données
      this.users = this.loadJsonFile('users.json');
      this.associates = this.loadJsonFile('associates.json');
      this.expenses = this.loadJsonFile('expenses.json');
      this.revenues = this.loadJsonFile('revenues.json');
      this.rcpMeetings = this.loadJsonFile('rcp_meetings.json');
      this.rcpAttendances = this.loadJsonFile('rcp_attendances.json');
      this.projects = this.loadJsonFile('projects.json');
      this.projectAssignments = this.loadJsonFile('project_assignments.json');
      this.accessoryMissions = this.loadJsonFile('accessory_missions.json');
      this.missionAssignments = this.loadJsonFile('mission_assignments.json');
      this.settings = this.loadJsonFile('settings.json');
      
      console.log('Données chargées avec succès');
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  }
  
  // Sauvegarder les données dans un fichier JSON
  private saveJsonFile(fileName: string, data: any[]): void {
    const filePath = path.join(this.dataDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
  
  // Charger les données depuis un fichier JSON
  private loadJsonFile<T>(fileName: string): T[] {
    try {
      const filePath = path.join(this.dataDir, fileName);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent) as T[];
    } catch (error) {
      console.error(`Erreur lors du chargement du fichier ${fileName}:`, error);
      return [];
    }
  }
  
  // Initialiser les données par défaut si nécessaire
  private initializeDefaultData(): void {
    // Vérifier si les données de base existent déjà
    if (this.settings.length === 0) {
      // Ajouter les paramètres par défaut
      this.settings = [
        { id: 1, key: 'fixed_revenue_share', value: '0.5', category: 'distribution', description: 'Part fixe des revenus (en %)' },
        { id: 2, key: 'rcp_share', value: '0.25', category: 'distribution', description: 'Part des revenus attribuée aux présences RCP (en %)' },
        { id: 3, key: 'project_share', value: '0.25', category: 'distribution', description: 'Part des revenus attribuée aux projets (en %)' },
        { id: 4, key: 'aci_manager_weight', value: '1.5', category: 'distribution', description: 'Coefficient de pondération pour les gérants' },
        { id: 5, key: 'manager_weight', value: '1.5', category: 'distribution', description: 'Coefficient de pondération pour les gérants' }
      ];
      this.saveJsonFile('settings.json', this.settings);
    }
    
    // Importer les données de professionnels de santé si disponibles
    if (this.associates.length === 0) {
      try {
        // Essayer d'abord avec le fichier formaté
        const professionnelsFormattedPath = path.join(__dirname, '../data/professionnels_sante_formatted.json');
        if (fs.existsSync(professionnelsFormattedPath)) {
          const professionnels = JSON.parse(fs.readFileSync(professionnelsFormattedPath, 'utf8'));
          if (Array.isArray(professionnels)) {
            let id = 1;
            for (const prof of professionnels) {
              this.associates.push({
                id: id++,
                name: prof.nom || '',
                profession: prof.profession || '',
                isManager: prof.isManager || false,
                joinDate: prof.dateArrivee || new Date().toISOString().split('T')[0],
                patientCount: prof.nbPatients || null,
                participationWeight: prof.isManager ? '1.5' : '1.0'
              });
            }
            this.saveJsonFile('associates.json', this.associates);
            console.log(`Importation de ${this.associates.length} professionnels de santé depuis le fichier formaté`);
          }
        } else {
          console.log("Aucun fichier formaté trouvé, ajout des données par défaut");
          
          // Ajouter quelques professionnels par défaut
          this.associates = [
            {
              id: 1,
              name: "Dr. Martin Dupont",
              profession: "Médecin",
              isManager: true,
              joinDate: "2022-01-01",
              patientCount: 425,
              participationWeight: "1.5"
            },
            {
              id: 2,
              name: "Agnès Laurent",
              profession: "Pharmacien",
              isManager: true,
              joinDate: "2022-01-01",
              patientCount: null,
              participationWeight: "1.5"
            },
            {
              id: 3,
              name: "Émilie Bernard",
              profession: "Infirmière",
              isManager: false,
              joinDate: "2022-01-01",
              patientCount: null,
              participationWeight: "1.0"
            },
            {
              id: 4,
              name: "Martine Collier",
              profession: "Kinésithérapeute",
              isManager: true,
              joinDate: "2022-01-01",
              patientCount: null,
              participationWeight: "1.5"
            },
            {
              id: 5,
              name: "Julien Moreau",
              profession: "Dentiste",
              isManager: false,
              joinDate: "2022-01-01",
              patientCount: 280,
              participationWeight: "1.0"
            }
          ];
          
          this.saveJsonFile('associates.json', this.associates);
          console.log(`Ajout de ${this.associates.length} professionnels de santé par défaut`);
        }
      } catch (error) {
        console.error('Erreur lors de l\'importation des professionnels de santé:', error);
      }
    }
    
    // Ajouter des projets de démonstration si nécessaire
    if (this.projects.length === 0) {
      this.projects = [
        {
          id: 1,
          title: 'Prévention Diabète',
          description: 'Programme de prévention et de suivi des patients diabétiques',
          startDate: '2023-01-01',
          endDate: null,
          status: 'active',
          weight: '1.5'
        },
        {
          id: 2,
          title: 'Téléconsultation',
          description: 'Mise en place d\'un système de téléconsultation pour les patients éloignés',
          startDate: '2023-03-15',
          endDate: null,
          status: 'active',
          weight: '1.2'
        }
      ];
      this.saveJsonFile('projects.json', this.projects);
      
      // Ajouter des réunions RCP de démonstration
      this.rcpMeetings = [
        {
          id: 1,
          title: 'RCP Mensuelle Janvier',
          description: 'Réunion mensuelle de coordination pluriprofessionnelle',
          date: '2023-01-15',
          duration: 60
        },
        {
          id: 2,
          title: 'RCP Mensuelle Février',
          description: 'Réunion mensuelle de coordination pluriprofessionnelle',
          date: '2023-02-15',
          duration: 60
        },
        {
          id: 3,
          title: 'RCP Diabète',
          description: 'Réunion spécifique sur le suivi des patients diabétiques',
          date: '2023-02-01',
          duration: 120
        }
      ];
      this.saveJsonFile('rcp_meetings.json', this.rcpMeetings);
      
      // Ajouter des revenus ACI de démonstration
      this.revenues = [
        {
          id: 1,
          source: 'CPAM',
          description: 'Versement ACI Annuel',
          amount: '50000',
          date: '2023-01-10',
          category: 'ACI'
        },
        {
          id: 2,
          source: 'CPAM',
          description: 'Supplément ACI Projets Innovants',
          amount: '7375',
          date: '2023-02-15',
          category: 'ACI'
        }
      ];
      this.saveJsonFile('revenues.json', this.revenues);
      
      // Ajouter des dépenses de démonstration
      this.expenses = [
        {
          id: 1,
          category: 'Loyer',
          description: 'Loyer du local',
          amount: '2500',
          date: '2023-01-05',
          isRecurring: true,
          frequency: 'mensuel'
        },
        {
          id: 2,
          category: 'Matériel',
          description: 'Achat de matériel informatique',
          amount: '3800',
          date: '2023-01-20',
          isRecurring: false,
          frequency: null
        }
      ];
      this.saveJsonFile('expenses.json', this.expenses);
    }
  }
  
  // Implémentation des méthodes de l'interface IStorage
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.getNextId(this.users),
      ...user,
      role: user.role || 'user'
    };
    
    this.users.push(newUser);
    this.saveJsonFile('users.json', this.users);
    return newUser;
  }
  
  // Associate methods
  async getAssociates(): Promise<Associate[]> {
    return [...this.associates].sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getAssociate(id: number): Promise<Associate | undefined> {
    return this.associates.find(associate => associate.id === id);
  }
  
  async createAssociate(associate: InsertAssociate): Promise<Associate> {
    const newAssociate: Associate = {
      id: this.getNextId(this.associates),
      ...associate,
      isManager: associate.isManager ?? false,
      patientCount: associate.patientCount ?? null,
      participationWeight: associate.participationWeight ?? '1.0'
    };
    
    this.associates.push(newAssociate);
    this.saveJsonFile('associates.json', this.associates);
    return newAssociate;
  }
  
  async updateAssociate(id: number, associate: Partial<InsertAssociate>): Promise<Associate | undefined> {
    const index = this.associates.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    
    const current = this.associates[index];
    
    // Vérifier si le statut de gérant a changé
    let updatedWeight = associate.participationWeight;
    
    if (associate.isManager !== undefined && associate.isManager !== current.isManager) {
      // Si l'associé devient gérant, son poids de participation passe à 1.5
      // sauf si une valeur explicite a été fournie
      if (associate.isManager === true && associate.participationWeight === undefined) {
        // Récupération de la valeur de pondération des gérants depuis les paramètres
        const managerWeightSetting = await this.getSetting('manager_weight');
        const managerWeight = managerWeightSetting ? managerWeightSetting.value : '1.5';
        
        updatedWeight = managerWeight;
      }
      
      // Si l'associé n'est plus gérant, son poids revient à 1.0
      // sauf si une valeur explicite a été fournie
      if (associate.isManager === false && associate.participationWeight === undefined) {
        updatedWeight = '1.0';
      }
    }
    
    const updated: Associate = {
      ...current,
      ...associate,
      participationWeight: updatedWeight || associate.participationWeight || current.participationWeight
    };
    
    this.associates[index] = updated;
    this.saveJsonFile('associates.json', this.associates);
    return updated;
  }
  
  async deleteAssociate(id: number): Promise<boolean> {
    const initialLength = this.associates.length;
    this.associates = this.associates.filter(associate => associate.id !== id);
    
    if (initialLength !== this.associates.length) {
      this.saveJsonFile('associates.json', this.associates);
      return true;
    }
    
    return false;
  }
  
  // Expense methods
  async getExpenses(): Promise<Expense[]> {
    return [...this.expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.find(expense => expense.id === id);
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const newExpense: Expense = {
      id: this.getNextId(this.expenses),
      ...expense,
      isRecurring: expense.isRecurring ?? false,
      frequency: expense.frequency || null
    };
    
    this.expenses.push(newExpense);
    this.saveJsonFile('expenses.json', this.expenses);
    return newExpense;
  }
  
  async updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense | undefined> {
    const index = this.expenses.findIndex(e => e.id === id);
    if (index === -1) return undefined;
    
    const current = this.expenses[index];
    const updated: Expense = { ...current, ...expense };
    
    this.expenses[index] = updated;
    this.saveJsonFile('expenses.json', this.expenses);
    return updated;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    const initialLength = this.expenses.length;
    this.expenses = this.expenses.filter(expense => expense.id !== id);
    
    if (initialLength !== this.expenses.length) {
      this.saveJsonFile('expenses.json', this.expenses);
      return true;
    }
    
    return false;
  }
  
  // Revenue methods
  async getRevenues(): Promise<Revenue[]> {
    return [...this.revenues].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  
  async getRevenue(id: number): Promise<Revenue | undefined> {
    return this.revenues.find(revenue => revenue.id === id);
  }
  
  async createRevenue(revenue: InsertRevenue): Promise<Revenue> {
    const newRevenue: Revenue = {
      id: this.getNextId(this.revenues),
      ...revenue
    };
    
    this.revenues.push(newRevenue);
    this.saveJsonFile('revenues.json', this.revenues);
    return newRevenue;
  }
  
  async updateRevenue(id: number, revenue: Partial<InsertRevenue>): Promise<Revenue | undefined> {
    const index = this.revenues.findIndex(r => r.id === id);
    if (index === -1) return undefined;
    
    const current = this.revenues[index];
    const updated: Revenue = { ...current, ...revenue };
    
    this.revenues[index] = updated;
    this.saveJsonFile('revenues.json', this.revenues);
    return updated;
  }
  
  async deleteRevenue(id: number): Promise<boolean> {
    const initialLength = this.revenues.length;
    this.revenues = this.revenues.filter(revenue => revenue.id !== id);
    
    if (initialLength !== this.revenues.length) {
      this.saveJsonFile('revenues.json', this.revenues);
      return true;
    }
    
    return false;
  }
  
  // RCP Meeting methods
  async getRcpMeetings(): Promise<RcpMeeting[]> {
    // Ajouter le compte des présences pour chaque réunion et trier par date décroissante
    const meetingsWithCounts = [...this.rcpMeetings].map(meeting => {
      const attendanceCount = this.rcpAttendances.filter(a => a.rcpId === meeting.id && a.attended).length;
      return {
        ...meeting,
        attendanceCount
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return meetingsWithCounts;
  }
  
  async getRcpMeeting(id: number): Promise<RcpMeeting | undefined> {
    return this.rcpMeetings.find(meeting => meeting.id === id);
  }
  
  async createRcpMeeting(meeting: InsertRcpMeeting): Promise<RcpMeeting> {
    // Conversion de la durée en nombre si elle est fournie sous forme de chaîne
    let durationValue: number | null = null;
    if (meeting.duration !== undefined) {
      durationValue = typeof meeting.duration === 'string' 
        ? parseInt(meeting.duration, 10) 
        : meeting.duration;
    }

    const newMeeting: RcpMeeting = {
      id: this.getNextId(this.rcpMeetings),
      title: meeting.title,
      description: meeting.description || null,
      date: meeting.date,
      duration: durationValue
    };
    
    this.rcpMeetings.push(newMeeting);
    this.saveJsonFile('rcp_meetings.json', this.rcpMeetings);
    return newMeeting;
  }
  
  async updateRcpMeeting(id: number, meeting: Partial<InsertRcpMeeting>): Promise<RcpMeeting | undefined> {
    const index = this.rcpMeetings.findIndex(m => m.id === id);
    if (index === -1) return undefined;
    
    const current = this.rcpMeetings[index];
    const updated: RcpMeeting = { ...current, ...meeting };
    
    this.rcpMeetings[index] = updated;
    this.saveJsonFile('rcp_meetings.json', this.rcpMeetings);
    return updated;
  }
  
  async deleteRcpMeeting(id: number): Promise<boolean> {
    const initialLength = this.rcpMeetings.length;
    this.rcpMeetings = this.rcpMeetings.filter(meeting => meeting.id !== id);
    
    if (initialLength !== this.rcpMeetings.length) {
      // Supprimer aussi les présences associées
      const initialAttendancesLength = this.rcpAttendances.length;
      this.rcpAttendances = this.rcpAttendances.filter(attendance => attendance.rcpId !== id);
      
      this.saveJsonFile('rcp_meetings.json', this.rcpMeetings);
      
      if (initialAttendancesLength !== this.rcpAttendances.length) {
        this.saveJsonFile('rcp_attendances.json', this.rcpAttendances);
      }
      
      return true;
    }
    
    return false;
  }
  
  // RCP Attendance methods
  async getRcpAttendances(rcpId: number): Promise<RcpAttendance[]> {
    return this.rcpAttendances.filter(attendance => attendance.rcpId === rcpId);
  }
  
  async createRcpAttendance(attendance: InsertRcpAttendance): Promise<RcpAttendance> {
    // Vérifier si une entrée existe déjà pour cette combinaison rcpId/associateId
    const existingIndex = this.rcpAttendances.findIndex(
      a => a.rcpId === attendance.rcpId && a.associateId === attendance.associateId
    );
    
    if (existingIndex !== -1) {
      // Mettre à jour l'entrée existante au lieu d'en créer une nouvelle
      const updated = {
        ...this.rcpAttendances[existingIndex],
        attended: attendance.attended ?? false
      };
      
      this.rcpAttendances[existingIndex] = updated;
      this.saveJsonFile('rcp_attendances.json', this.rcpAttendances);
      return updated;
    }
    
    // Sinon, créer une nouvelle entrée
    const newAttendance: RcpAttendance = {
      id: this.getNextId(this.rcpAttendances),
      ...attendance,
      attended: attendance.attended ?? false
    };
    
    this.rcpAttendances.push(newAttendance);
    this.saveJsonFile('rcp_attendances.json', this.rcpAttendances);
    return newAttendance;
  }
  
  async updateRcpAttendance(id: number, attended: boolean): Promise<RcpAttendance | undefined> {
    const index = this.rcpAttendances.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    
    const updated = { ...this.rcpAttendances[index], attended };
    this.rcpAttendances[index] = updated;
    this.saveJsonFile('rcp_attendances.json', this.rcpAttendances);
    return updated;
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    // Ajouter le compte des associés pour chaque projet
    const projectsWithCounts = this.projects.map(project => {
      const assignmentCount = this.projectAssignments.filter(a => a.projectId === project.id).length;
      return {
        ...project,
        assignmentCount
      };
    });
    return projectsWithCounts;
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.find(project => project.id === id);
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const newProject: Project = {
      id: this.getNextId(this.projects),
      title: project.title,
      description: project.description || null,
      startDate: project.startDate,
      endDate: project.endDate || null,
      status: project.status || 'active',
      weight: project.weight || '1.0'
    };
    
    this.projects.push(newProject);
    this.saveJsonFile('projects.json', this.projects);
    return newProject;
  }
  
  async updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined> {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    
    const current = this.projects[index];
    const updated: Project = { ...current, ...project };
    
    this.projects[index] = updated;
    this.saveJsonFile('projects.json', this.projects);
    return updated;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    const initialLength = this.projects.length;
    this.projects = this.projects.filter(project => project.id !== id);
    
    if (initialLength !== this.projects.length) {
      // Supprimer aussi les affectations associées
      const initialAssignmentsLength = this.projectAssignments.length;
      this.projectAssignments = this.projectAssignments.filter(assignment => assignment.projectId !== id);
      
      this.saveJsonFile('projects.json', this.projects);
      
      if (initialAssignmentsLength !== this.projectAssignments.length) {
        this.saveJsonFile('project_assignments.json', this.projectAssignments);
      }
      
      return true;
    }
    
    return false;
  }
  
  // Project Assignment methods
  async getProjectAssignments(projectId: number): Promise<ProjectAssignment[]> {
    return this.projectAssignments.filter(assignment => assignment.projectId === projectId);
  }
  
  async createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const newAssignment: ProjectAssignment = {
      id: this.getNextId(this.projectAssignments),
      associateId: assignment.associateId,
      projectId: assignment.projectId,
      contribution: assignment.contribution || '0'
    };
    
    this.projectAssignments.push(newAssignment);
    this.saveJsonFile('project_assignments.json', this.projectAssignments);
    return newAssignment;
  }
  
  async updateProjectAssignment(id: number, contribution: number): Promise<ProjectAssignment | undefined> {
    const index = this.projectAssignments.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    
    const updated = {
      ...this.projectAssignments[index],
      contribution: contribution.toString()
    };
    
    this.projectAssignments[index] = updated;
    this.saveJsonFile('project_assignments.json', this.projectAssignments);
    return updated;
  }
  
  // Accessory Missions methods
  async getAccessoryMissions(): Promise<AccessoryMission[]> {
    return this.accessoryMissions;
  }
  
  async getAccessoryMissionsByYear(year: number): Promise<AccessoryMission[]> {
    return this.accessoryMissions.filter(mission => mission.year === year);
  }
  
  async getAccessoryMission(id: number): Promise<AccessoryMission | undefined> {
    return this.accessoryMissions.find(mission => mission.id === id);
  }
  
  async createAccessoryMission(mission: InsertAccessoryMission): Promise<AccessoryMission> {
    const newMission: AccessoryMission = {
      id: this.getNextId(this.accessoryMissions),
      title: mission.title,
      description: mission.description || null,
      startDate: mission.startDate,
      endDate: mission.endDate || null,
      status: mission.status || 'active',
      type: mission.type || 'standard',
      budget: mission.budget || '0',
      year: mission.year
    };
    
    this.accessoryMissions.push(newMission);
    this.saveJsonFile('accessory_missions.json', this.accessoryMissions);
    return newMission;
  }
  
  async updateAccessoryMission(id: number, mission: Partial<InsertAccessoryMission>): Promise<AccessoryMission | undefined> {
    const index = this.accessoryMissions.findIndex(m => m.id === id);
    if (index === -1) return undefined;
    
    const current = this.accessoryMissions[index];
    const updated: AccessoryMission = { ...current, ...mission };
    
    this.accessoryMissions[index] = updated;
    this.saveJsonFile('accessory_missions.json', this.accessoryMissions);
    return updated;
  }
  
  async deleteAccessoryMission(id: number): Promise<boolean> {
    const initialLength = this.accessoryMissions.length;
    this.accessoryMissions = this.accessoryMissions.filter(mission => mission.id !== id);
    
    if (initialLength !== this.accessoryMissions.length) {
      // Supprimer aussi les assignations associées
      const initialAssignmentsLength = this.missionAssignments.length;
      this.missionAssignments = this.missionAssignments.filter(assignment => assignment.missionId !== id);
      
      this.saveJsonFile('accessory_missions.json', this.accessoryMissions);
      
      if (initialAssignmentsLength !== this.missionAssignments.length) {
        this.saveJsonFile('mission_assignments.json', this.missionAssignments);
      }
      
      return true;
    }
    
    return false;
  }
  
  // Mission Assignment methods
  async getMissionAssignments(missionId: number): Promise<MissionAssignment[]> {
    return this.missionAssignments.filter(assignment => assignment.missionId === missionId);
  }
  
  async getMissionAssignment(id: number): Promise<MissionAssignment | undefined> {
    return this.missionAssignments.find(assignment => assignment.id === id);
  }
  
  async createMissionAssignment(assignment: InsertMissionAssignment): Promise<MissionAssignment> {
    const newAssignment: MissionAssignment = {
      id: this.getNextId(this.missionAssignments),
      associateId: assignment.associateId,
      missionId: assignment.missionId,
      contributionPercentage: assignment.contributionPercentage || '0'
    };
    
    this.missionAssignments.push(newAssignment);
    this.saveJsonFile('mission_assignments.json', this.missionAssignments);
    return newAssignment;
  }
  
  async updateMissionAssignment(id: number, contributionPercentage: number): Promise<MissionAssignment | undefined> {
    const index = this.missionAssignments.findIndex(a => a.id === id);
    if (index === -1) return undefined;
    
    const updated = {
      ...this.missionAssignments[index],
      contributionPercentage: contributionPercentage.toString()
    };
    
    this.missionAssignments[index] = updated;
    this.saveJsonFile('mission_assignments.json', this.missionAssignments);
    return updated;
  }
  
  async deleteMissionAssignment(id: number): Promise<boolean> {
    const initialLength = this.missionAssignments.length;
    this.missionAssignments = this.missionAssignments.filter(assignment => assignment.id !== id);
    
    if (initialLength !== this.missionAssignments.length) {
      this.saveJsonFile('mission_assignments.json', this.missionAssignments);
      return true;
    }
    
    return false;
  }
  
  // Settings methods
  async getSettings(): Promise<Setting[]> {
    return this.settings;
  }
  
  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.find(setting => setting.key === key);
  }
  
  async createSetting(setting: InsertSetting): Promise<Setting> {
    // Vérifier si le paramètre existe déjà
    const existingIndex = this.settings.findIndex(s => s.key === setting.key);
    
    if (existingIndex !== -1) {
      // Mettre à jour le paramètre existant au lieu d'en créer un nouveau
      const updated = {
        ...this.settings[existingIndex],
        value: setting.value,
        category: setting.category || this.settings[existingIndex].category,
        description: setting.description !== undefined ? setting.description : this.settings[existingIndex].description
      };
      
      this.settings[existingIndex] = updated;
      this.saveJsonFile('settings.json', this.settings);
      return updated;
    }
    
    // Sinon, créer un nouveau paramètre
    const newSetting: Setting = {
      id: this.getNextId(this.settings),
      key: setting.key,
      value: setting.value,
      category: setting.category || 'general',
      description: setting.description || null
    };
    
    this.settings.push(newSetting);
    this.saveJsonFile('settings.json', this.settings);
    return newSetting;
  }
  
  async updateSetting(key: string, value: string): Promise<Setting | undefined> {
    const index = this.settings.findIndex(s => s.key === key);
    if (index === -1) return undefined;
    
    const updated = { ...this.settings[index], value };
    this.settings[index] = updated;
    this.saveJsonFile('settings.json', this.settings);
    return updated;
  }
}

// Utiliser le stockage en mémoire au lieu de PostgreSQL
export const storage = new MemStorage();