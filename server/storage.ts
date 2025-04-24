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
import { query } from "./db";

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
    
    if (isManager !== undefined) {
      values.push(isManager);
      updates.push(`is_manager = $${values.length}`);
    }
    
    if (joinDate !== undefined) {
      values.push(joinDate);
      updates.push(`join_date = $${values.length}`);
    }
    
    if (patientCount !== undefined) {
      values.push(patientCount);
      updates.push(`patient_count = $${values.length}`);
    }
    
    if (participationWeight !== undefined) {
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    return result.rowCount > 0;
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
    const { title, description, date } = insertRcpMeeting;
    const result = await query(
      'INSERT INTO rcp_meetings(title, description, date) VALUES($1, $2, $3) RETURNING *',
      [
        title,
        description || null,
        date
      ]
    );
    return result.rows[0];
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

export const storage = new DatabaseStorage();