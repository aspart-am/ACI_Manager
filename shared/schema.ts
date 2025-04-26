import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  fullName: z.string(),
  role: z.string().default("user"),
});

export const insertUserSchema = userSchema.omit({ id: true });

// Associate schema 
export const associateSchema = z.object({
  id: z.number(),
  name: z.string(),
  profession: z.string(),
  isManager: z.boolean().default(false),
  joinDate: z.string(), // Date as ISO string
  patientCount: z.number().optional(),
  participationWeight: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).default(1),
});

export const insertAssociateSchema = associateSchema.omit({ id: true });

// Expense schema
export const expenseSchema = z.object({
  id: z.number(),
  category: z.string(),
  description: z.string(),
  amount: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  date: z.string(), // Date as ISO string
  isRecurring: z.boolean().default(false),
  frequency: z.string().default("monthly"),
});

export const insertExpenseSchema = expenseSchema.omit({ id: true });

// Revenue schema
export const revenueSchema = z.object({
  id: z.number(),
  source: z.string(),
  description: z.string(),
  amount: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ),
  date: z.string(), // Date as ISO string
  category: z.string(),
});

export const insertRevenueSchema = revenueSchema.omit({ id: true });

// RCP Meeting schema
export const rcpMeetingSchema = z.object({
  id: z.number(),
  date: z.string(), // Date as ISO string
  title: z.string(),
  description: z.string().optional(),
  duration: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseInt(val, 10) : val
  ).default(60), // Durée en minutes (défaut 1h)
});

export const insertRcpMeetingSchema = rcpMeetingSchema.omit({ id: true });

// RCP Attendance schema
export const rcpAttendanceSchema = z.object({
  id: z.number(),
  rcpId: z.number(),
  associateId: z.number(),
  attended: z.boolean().default(false),
});

export const insertRcpAttendanceSchema = rcpAttendanceSchema.omit({ id: true });

// Accessory Mission schema
export const accessoryMissionSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string(), // Date as ISO string
  endDate: z.string().optional(), // Date as ISO string
  status: z.string().default("active"),
  budget: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).default(0),
  type: z.string().default("santé publique"),
  year: z.number(),
});

export const insertAccessoryMissionSchema = accessoryMissionSchema.omit({ id: true });

// Mission Assignment schema
export const missionAssignmentSchema = z.object({
  id: z.number(),
  missionId: z.number(),
  associateId: z.number(),
  contributionPercentage: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).default(100),
});

export const insertMissionAssignmentSchema = missionAssignmentSchema.omit({ id: true });

// Project schema
export const projectSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string(), // Date as ISO string
  endDate: z.string().optional(), // Date as ISO string
  status: z.string().default("active"),
  weight: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).default(1),
});

export const insertProjectSchema = projectSchema.omit({ id: true });

// Project Assignment schema
export const projectAssignmentSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  associateId: z.number(),
  contribution: z.union([z.number(), z.string()]).transform(val => 
    typeof val === 'string' ? parseFloat(val) : val
  ).default(1),
});

export const insertProjectAssignmentSchema = projectAssignmentSchema.omit({ id: true });

// Setting schema
export const settingSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  category: z.string(),
  description: z.string().optional(),
});

export const insertSettingSchema = settingSchema.omit({ id: true });

// Exported types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Associate = z.infer<typeof associateSchema>;
export type InsertAssociate = z.infer<typeof insertAssociateSchema>;

export type Expense = z.infer<typeof expenseSchema>;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Revenue = z.infer<typeof revenueSchema>;
export type InsertRevenue = z.infer<typeof insertRevenueSchema>;

export type RcpMeeting = z.infer<typeof rcpMeetingSchema>;
export type InsertRcpMeeting = z.infer<typeof insertRcpMeetingSchema>;

export type RcpAttendance = z.infer<typeof rcpAttendanceSchema>;
export type InsertRcpAttendance = z.infer<typeof insertRcpAttendanceSchema>;

export type Project = z.infer<typeof projectSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectAssignment = z.infer<typeof projectAssignmentSchema>;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;

export type AccessoryMission = z.infer<typeof accessoryMissionSchema>;
export type InsertAccessoryMission = z.infer<typeof insertAccessoryMissionSchema>;

export type MissionAssignment = z.infer<typeof missionAssignmentSchema>;
export type InsertMissionAssignment = z.infer<typeof insertMissionAssignmentSchema>;

export type Setting = z.infer<typeof settingSchema>;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
