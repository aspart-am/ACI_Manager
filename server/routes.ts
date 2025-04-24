import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertAssociateSchema,
  insertExpenseSchema,
  insertRevenueSchema,
  insertRcpMeetingSchema,
  insertRcpAttendanceSchema,
  insertProjectSchema,
  insertProjectAssignmentSchema,
  insertSettingSchema
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
      // Fetch all the data needed for distribution calculation
      const associates = await storage.getAssociates();
      const revenues = await storage.getRevenues();
      const expenses = await storage.getExpenses();
      const settings = await storage.getSettings();
      
      // Calculate total ACI revenue
      const aciRevenues = revenues.filter(rev => rev.category === "ACI");
      const totalAciRevenue = aciRevenues.reduce((sum, rev) => sum + Number(rev.amount), 0);
      
      // Calculate total expenses
      const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
      
      // Net amount to distribute
      const netDistribution = totalAciRevenue - totalExpenses;
      
      // Get settings values
      const managerWeightSetting = settings.find(s => s.key === "aci_manager_weight");
      const managerWeight = managerWeightSetting ? Number(managerWeightSetting.value) : 1.5;
      
      // Calculate base distribution factor
      let totalWeight = 0;
      associates.forEach(associate => {
        const weight = associate.isManager 
          ? Number(associate.participationWeight) * managerWeight 
          : Number(associate.participationWeight);
        totalWeight += weight;
      });
      
      // Calculate distribution for each associate
      const distribution = associates.map(associate => {
        const weight = associate.isManager 
          ? Number(associate.participationWeight) * managerWeight 
          : Number(associate.participationWeight);
        
        const sharePercentage = (weight / totalWeight) * 100;
        const amount = (netDistribution * sharePercentage) / 100;
        
        return {
          associateId: associate.id,
          name: associate.name,
          profession: associate.profession,
          isManager: associate.isManager,
          weight,
          sharePercentage,
          amount
        };
      });
      
      res.json({
        totalAciRevenue,
        totalExpenses,
        netDistribution,
        distribution
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate distribution" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
