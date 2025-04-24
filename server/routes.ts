import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { calculateDistribution } from "./distribution-calculator";
import { z } from "zod";
import { 
  insertAssociateSchema,
  insertExpenseSchema,
  insertRevenueSchema,
  insertRcpMeetingSchema,
  insertRcpAttendanceSchema,
  insertProjectSchema,
  insertProjectAssignmentSchema,
  insertSettingSchema,
  insertAccessoryMissionSchema,
  insertMissionAssignmentSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ========== ASSOCIATES ROUTES ==========
  app.get("/api/associates", async (req, res) => {
    try {
      const associates = await storage.getAssociates();
      res.json(associates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch associates" });
    }
  });
  
  app.get("/api/associates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const associate = await storage.getAssociate(id);
      
      if (!associate) {
        return res.status(404).json({ message: "Associate not found" });
      }
      
      res.json(associate);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch associate" });
    }
  });
  
  app.post("/api/associates", async (req, res) => {
    try {
      const validatedData = insertAssociateSchema.parse(req.body);
      const associate = await storage.createAssociate(validatedData);
      res.status(201).json(associate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid associate data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create associate" });
    }
  });
  
  app.patch("/api/associates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = req.body;
      
      // Validate the partial data
      Object.keys(partialData).forEach(key => {
        if (!Object.keys(insertAssociateSchema.shape).includes(key)) {
          throw new Error(`Invalid field: ${key}`);
        }
      });
      
      const updatedAssociate = await storage.updateAssociate(id, partialData);
      
      if (!updatedAssociate) {
        return res.status(404).json({ message: "Associate not found" });
      }
      
      res.json(updatedAssociate);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update associate" });
    }
  });
  
  app.delete("/api/associates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAssociate(id);
      
      if (!success) {
        return res.status(404).json({ message: "Associate not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete associate" });
    }
  });
  
  // ========== EXPENSES ROUTES ==========
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });
  
  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });
  
  app.post("/api/expenses", async (req, res) => {
    try {
      const validatedData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid expense data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create expense" });
    }
  });
  
  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = req.body;
      
      // Validate the partial data
      Object.keys(partialData).forEach(key => {
        if (!Object.keys(insertExpenseSchema.shape).includes(key)) {
          throw new Error(`Invalid field: ${key}`);
        }
      });
      
      const updatedExpense = await storage.updateExpense(id, partialData);
      
      if (!updatedExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(updatedExpense);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update expense" });
    }
  });
  
  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteExpense(id);
      
      if (!success) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });
  
  // ========== REVENUES ROUTES ==========
  app.get("/api/revenues", async (req, res) => {
    try {
      const revenues = await storage.getRevenues();
      res.json(revenues);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenues" });
    }
  });
  
  app.get("/api/revenues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const revenue = await storage.getRevenue(id);
      
      if (!revenue) {
        return res.status(404).json({ message: "Revenue not found" });
      }
      
      res.json(revenue);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue" });
    }
  });
  
  app.post("/api/revenues", async (req, res) => {
    try {
      const validatedData = insertRevenueSchema.parse(req.body);
      const revenue = await storage.createRevenue(validatedData);
      res.status(201).json(revenue);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid revenue data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create revenue" });
    }
  });
  
  app.patch("/api/revenues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = req.body;
      
      // Validate the partial data
      Object.keys(partialData).forEach(key => {
        if (!Object.keys(insertRevenueSchema.shape).includes(key)) {
          throw new Error(`Invalid field: ${key}`);
        }
      });
      
      const updatedRevenue = await storage.updateRevenue(id, partialData);
      
      if (!updatedRevenue) {
        return res.status(404).json({ message: "Revenue not found" });
      }
      
      res.json(updatedRevenue);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update revenue" });
    }
  });
  
  app.delete("/api/revenues/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteRevenue(id);
      
      if (!success) {
        return res.status(404).json({ message: "Revenue not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete revenue" });
    }
  });
  
  // ========== RCP MEETINGS ROUTES ==========
  app.get("/api/rcp-meetings", async (req, res) => {
    try {
      const meetings = await storage.getRcpMeetings();
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RCP meetings" });
    }
  });
  
  app.post("/api/rcp-meetings", async (req, res) => {
    try {
      const validatedData = insertRcpMeetingSchema.parse(req.body);
      const meeting = await storage.createRcpMeeting(validatedData);
      res.status(201).json(meeting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid RCP meeting data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create RCP meeting" });
    }
  });
  
  app.get("/api/rcp-meetings/:id/attendances", async (req, res) => {
    try {
      const rcpId = parseInt(req.params.id);
      const attendances = await storage.getRcpAttendances(rcpId);
      res.json(attendances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch RCP attendances" });
    }
  });
  
  app.post("/api/rcp-attendances", async (req, res) => {
    try {
      const validatedData = insertRcpAttendanceSchema.parse(req.body);
      const attendance = await storage.createRcpAttendance(validatedData);
      res.status(201).json(attendance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid RCP attendance data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create RCP attendance" });
    }
  });
  
  app.patch("/api/rcp-attendances/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { attended } = req.body;
      
      if (typeof attended !== 'boolean') {
        return res.status(400).json({ message: "Attended must be a boolean" });
      }
      
      const updatedAttendance = await storage.updateRcpAttendance(id, attended);
      
      if (!updatedAttendance) {
        return res.status(404).json({ message: "RCP attendance not found" });
      }
      
      res.json(updatedAttendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to update RCP attendance" });
    }
  });
  
  // ========== PROJECTS ROUTES ==========
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  
  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });
  
  app.get("/api/projects/:id/assignments", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const assignments = await storage.getProjectAssignments(projectId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project assignments" });
    }
  });
  
  app.post("/api/project-assignments", async (req, res) => {
    try {
      const validatedData = insertProjectAssignmentSchema.parse(req.body);
      const assignment = await storage.createProjectAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project assignment" });
    }
  });
  
  // ========== SETTINGS ROUTES ==========
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });
  
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });
  
  app.patch("/api/settings/:key", async (req, res) => {
    try {
      const key = req.params.key;
      const { value } = req.body;
      
      if (typeof value !== 'string') {
        return res.status(400).json({ message: "Value must be a string" });
      }
      
      const updatedSetting = await storage.updateSetting(key, value);
      
      if (!updatedSetting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      res.json(updatedSetting);
    } catch (error) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  });
  
  // ========== DISTRIBUTION CALCULATIONS ==========
  app.get("/api/distribution/calculation", async (req, res) => {
    try {
      // Utiliser le nouveau système de calcul de distribution
      const distributionResult = await calculateDistribution();
      res.json(distributionResult);
    } catch (error) {
      console.error('Erreur lors du calcul de distribution:', error);
      res.status(500).json({ message: "Failed to calculate distribution" });
    }
  });
  
  // Route de débogage pour les missions accessoires
  app.get("/api/debug/missions-data", async (req, res) => {
    try {
      const { query } = await import('./db');
      
      // Récupérer les missions accessoires
      const missionsResult = await query("SELECT * FROM accessory_missions");
      const missions = missionsResult.rows;
      
      // Récupérer les assignations
      const assignmentsResult = await query("SELECT * FROM mission_assignments");
      const assignments = assignmentsResult.rows;
      
      // Vérifier les correspondances
      const matchReport = assignments.map(assignment => {
        const missionIdNum = Number(assignment.mission_id);
        const matchingMission = missions.find(m => Number(m.id) === missionIdNum);
        
        return {
          assignment,
          matchFound: !!matchingMission,
          matchDetails: matchingMission ? {
            id: matchingMission.id,
            title: matchingMission.title,
            budget: matchingMission.budget
          } : null,
          typeofMissionId: typeof assignment.mission_id,
          typeofMissionsIds: missions.map(m => ({ id: m.id, type: typeof m.id }))
        };
      });
      
      res.json({
        totalMissions: missions.length,
        totalAssignments: assignments.length,
        missions,
        assignments,
        matchReport
      });
    } catch (error) {
      console.error('Erreur lors du débogage des missions:', error);
      res.status(500).json({ message: "Failed to debug missions" });
    }
  });

  // ========== ACCESSORY MISSIONS ROUTES ==========
  app.get("/api/accessory-missions", async (req, res) => {
    try {
      // Si un paramètre d'année est fourni, filtrer par année
      const year = req.query.year ? parseInt(req.query.year as string) : null;
      let missions;
      
      if (year) {
        missions = await storage.getAccessoryMissionsByYear(year);
      } else {
        missions = await storage.getAccessoryMissions();
      }
      
      res.json(missions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accessory missions" });
    }
  });
  
  app.get("/api/accessory-missions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mission = await storage.getAccessoryMission(id);
      
      if (!mission) {
        return res.status(404).json({ message: "Accessory mission not found" });
      }
      
      res.json(mission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch accessory mission" });
    }
  });
  
  app.post("/api/accessory-missions", async (req, res) => {
    try {
      const validatedData = insertAccessoryMissionSchema.parse(req.body);
      const mission = await storage.createAccessoryMission(validatedData);
      res.status(201).json(mission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid accessory mission data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create accessory mission" });
    }
  });
  
  app.patch("/api/accessory-missions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partialData = req.body;
      
      // Valider les données partielles
      Object.keys(partialData).forEach(key => {
        if (!Object.keys(insertAccessoryMissionSchema.shape).includes(key)) {
          throw new Error(`Invalid field: ${key}`);
        }
      });
      
      const updatedMission = await storage.updateAccessoryMission(id, partialData);
      
      if (!updatedMission) {
        return res.status(404).json({ message: "Accessory mission not found" });
      }
      
      res.json(updatedMission);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update accessory mission" });
    }
  });
  
  app.delete("/api/accessory-missions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAccessoryMission(id);
      
      if (!success) {
        return res.status(404).json({ message: "Accessory mission not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete accessory mission" });
    }
  });
  
  // Routes pour les attributions de missions
  app.get("/api/accessory-missions/:id/assignments", async (req, res) => {
    try {
      const missionId = parseInt(req.params.id);
      const assignments = await storage.getMissionAssignments(missionId);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mission assignments" });
    }
  });
  
  app.post("/api/mission-assignments", async (req, res) => {
    try {
      const validatedData = insertMissionAssignmentSchema.parse(req.body);
      const assignment = await storage.createMissionAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mission assignment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create mission assignment" });
    }
  });
  
  app.patch("/api/mission-assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { contributionPercentage } = req.body;
      
      if (isNaN(Number(contributionPercentage))) {
        return res.status(400).json({ message: "Contribution percentage must be a number" });
      }
      
      const updatedAssignment = await storage.updateMissionAssignment(id, Number(contributionPercentage));
      
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Mission assignment not found" });
      }
      
      res.json(updatedAssignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update mission assignment" });
    }
  });
  
  app.delete("/api/mission-assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMissionAssignment(id);
      
      if (!success) {
        return res.status(404).json({ message: "Mission assignment not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete mission assignment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
