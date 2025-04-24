import { pgTable, text, serial, integer, boolean, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("user"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
});

// Associate model
export const associates = pgTable("associates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  profession: text("profession").notNull(),
  isManager: boolean("is_manager").notNull().default(false),
  joinDate: date("join_date").notNull(),
  patientCount: integer("patient_count").default(0),
  participationWeight: numeric("participation_weight").notNull().default("1"),
});

export const insertAssociateSchema = createInsertSchema(associates).pick({
  name: true,
  profession: true,
  isManager: true,
  joinDate: true,
  patientCount: true,
  participationWeight: true,
});

// Expense model
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  date: date("date").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  frequency: text("frequency").default("monthly"),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  category: true,
  description: true,
  amount: true,
  date: true,
  isRecurring: true,
  frequency: true,
});

// Revenue model
export const revenues = pgTable("revenues", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  date: date("date").notNull(),
  category: text("category").notNull(),
});

export const insertRevenueSchema = createInsertSchema(revenues).pick({
  source: true,
  description: true,
  amount: true,
  date: true,
  category: true,
});

// RCP (Réunion de Concertation Pluriprofessionnelle) model
export const rcpMeetings = pgTable("rcp_meetings", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
});

export const rcpAttendance = pgTable("rcp_attendance", {
  id: serial("id").primaryKey(),
  rcpId: integer("rcp_id").notNull(),
  associateId: integer("associate_id").notNull(),
  attended: boolean("attended").notNull().default(false),
});

export const insertRcpMeetingSchema = createInsertSchema(rcpMeetings).pick({
  date: true,
  title: true,
  description: true,
});

export const insertRcpAttendanceSchema = createInsertSchema(rcpAttendance).pick({
  rcpId: true,
  associateId: true,
  attended: true,
});

// Project / Task model
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  status: text("status").notNull().default("active"),
  weight: numeric("weight").notNull().default("1"),
});

export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  associateId: integer("associate_id").notNull(),
  contribution: numeric("contribution").notNull().default("1"),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  status: true,
  weight: true,
});

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).pick({
  projectId: true,
  associateId: true,
  contribution: true,
});

// Settings model
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull(),
  description: text("description"),
});

export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
  category: true,
  description: true,
});

// Exported types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAssociate = z.infer<typeof insertAssociateSchema>;
export type Associate = typeof associates.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertRevenue = z.infer<typeof insertRevenueSchema>;
export type Revenue = typeof revenues.$inferSelect;

export type InsertRcpMeeting = z.infer<typeof insertRcpMeetingSchema>;
export type RcpMeeting = typeof rcpMeetings.$inferSelect;

export type InsertRcpAttendance = z.infer<typeof insertRcpAttendanceSchema>;
export type RcpAttendance = typeof rcpAttendance.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;
export type ProjectAssignment = typeof projectAssignments.$inferSelect;

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
