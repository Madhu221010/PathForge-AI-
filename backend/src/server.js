import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

let memoryRoadmaps = [];

const roadmapSchema = new mongoose.Schema(
  {
    targetRole: String,
    currentSkills: [String],
    interests: [String],
    analysis: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

const Roadmap = mongoose.models.Roadmap || mongoose.model("Roadmap", roadmapSchema);

async function connectMongo() {
  if (!process.env.MONGODB_URI) {
    console.log("MongoDB URI not provided. Using in-memory storage.");
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.");
  } catch (error) {
    console.error("MongoDB connection failed. Continuing with in-memory storage.");
    console.error(error.message);
  }
}

function cleanJson(text) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI returned invalid JSON.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function fallbackRoadmap(targetRole, currentSkills, interests) {
  const role = targetRole || "Frontend Developer";
  const skills = currentSkills || [];
  const gaps = [
    "Advanced JavaScript",
    "React",
    "Git & GitHub",
    "REST APIs",
    "Testing"
  ].filter((x) => !skills.some((s) => s.toLowerCase().includes(x.toLowerCase())));

  return {
    summary: `A practical roadmap for becoming a ${role}, based on your current skills and interests.`,
    readinessScore: Math.min(90, 35 + skills.length * 8),
    strengths: skills.slice(0, 5),
    skillGaps: gaps.slice(0, 5).map((skill) => ({
      skill,
      priority: "High",
      reason: `This skill is commonly useful for a ${role} role.`
    })),
    roadmap: [
      {
        phase: 1,
        title: "Foundation",
        duration: "2 weeks",
        goals: ["Strengthen core concepts", "Set up Git/GitHub workflow"],
        tasks: ["Revise fundamentals", "Create a small practice repository"]
      },
      {
        phase: 2,
        title: "Core Role Skills",
        duration: "3 weeks",
        goals: ["Learn the most important role-specific tools"],
        tasks: ["Build one guided project", "Practice with small coding tasks"]
      },
      {
        phase: 3,
        title: "Portfolio",
        duration: "3 weeks",
        goals: ["Build proof of skills"],
        tasks: ["Build one real-world project", "Write a strong README", "Deploy it"]
      }
    ],
    resources: [
      { title: "MDN Web Docs", type: "Documentation", url: "https://developer.mozilla.org/" },
      { title: "freeCodeCamp", type: "Course", url: "https://www.freecodecamp.org/" },
      { title: "GitHub Skills", type: "Practice", url: "https://skills.github.com/" }
    ],
    projects: [
      {
        title: `${role} Portfolio Project`,
        difficulty: "Intermediate",
        description: `Build a portfolio project that demonstrates ${gaps.slice(0, 2).join(" and ")}.`,
        skills: gaps.slice(0, 3)
      }
    ],
    milestones: [
      { title: "Finish foundations", completed: false },
      { title: "Complete core skill project", completed: false },
      { title: "Deploy portfolio project", completed: false }
    ]
  };
}

async function generateWithGemini({ targetRole, currentSkills, interests, resumeText }) {
  if (!ai) return fallbackRoadmap(targetRole, currentSkills, interests);

  const prompt = `
You are PathForge AI, a career-roadmap assistant.

Create a realistic, beginner-friendly career roadmap for:
Target role: ${targetRole}
Current skills: ${currentSkills.join(", ") || "Not provided"}
Interests: ${interests.join(", ") || "Not provided"}
Resume text:
${resumeText || "Not provided"}

Rules:
1. Identify strengths and skill gaps.
2. Prioritize gaps as High, Medium or Low.
3. Build a phased learning roadmap with concrete tasks.
4. Recommend useful learning resources with real, stable URLs when possible.
5. Recommend portfolio projects.
6. Include milestones for progress tracking.
7. Do not claim a person is guaranteed to get a job.
8. Keep recommendations practical for a student/early-career learner.
9. Return ONLY valid JSON matching this exact shape:

{
  "summary": "string",
  "readinessScore": 0,
  "strengths": ["string"],
  "skillGaps": [
    {"skill":"string","priority":"High|Medium|Low","reason":"string"}
  ],
  "roadmap": [
    {
      "phase": 1,
      "title": "string",
      "duration": "string",
      "goals": ["string"],
      "tasks": ["string"]
    }
  ],
  "resources": [
    {"title":"string","type":"Course|Documentation|Practice|Video|Other","url":"https://..."}
  ],
  "projects": [
    {
      "title":"string",
      "difficulty":"Beginner|Intermediate|Advanced",
      "description":"string",
      "skills":["string"]
    }
  ],
  "milestones": [
    {"title":"string","completed":false}
  ]
}
`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.4,
      maxOutputTokens: 5000
    }
  });

  return cleanJson(response.text);
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    database: mongoose.connection.readyState === 1 ? "mongodb" : "memory"
  });
});

app.post("/api/resume/text", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No resume file uploaded." });

    const isPdf = req.file.mimetype === "application/pdf";
    const isText = req.file.mimetype === "text/plain" || req.file.originalname.endsWith(".txt");

    if (!isPdf && !isText) {
      return res.status(400).json({ message: "Please upload a PDF or TXT resume." });
    }

    let text = "";

    if (isText) {
      text = req.file.buffer.toString("utf8");
    } else {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const data = await pdfParse(req.file.buffer);
      text = data.text;
    }

    res.json({ text: text.slice(0, 20000) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not read the resume." });
  }
});

app.post("/api/roadmaps", async (req, res) => {
  try {
    const {
      targetRole = "",
      currentSkills = [],
      interests = [],
      resumeText = ""
    } = req.body;

    if (!targetRole.trim()) {
      return res.status(400).json({ message: "Target role is required." });
    }

    const analysis = await generateWithGemini({
      targetRole: targetRole.trim(),
      currentSkills,
      interests,
      resumeText
    });

    const record = {
      targetRole: targetRole.trim(),
      currentSkills,
      interests,
      analysis
    };

    if (mongoose.connection.readyState === 1) {
      const saved = await Roadmap.create(record);
      return res.status(201).json({ id: saved._id, ...record });
    }

    const id = String(Date.now());
    memoryRoadmaps.push({ id, ...record });
    res.status(201).json({ id, ...record });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: error.message || "Failed to generate roadmap."
    });
  }
});

app.get("/api/roadmaps/:id", async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const found = await Roadmap.findById(req.params.id);
      if (!found) return res.status(404).json({ message: "Roadmap not found." });
      return res.json(found);
    }

    const found = memoryRoadmaps.find((item) => item.id === req.params.id);
    if (!found) return res.status(404).json({ message: "Roadmap not found." });
    res.json(found);
  } catch {
    res.status(400).json({ message: "Invalid roadmap ID." });
  }
});

app.patch("/api/roadmaps/:id/progress", async (req, res) => {
  const { milestones } = req.body;

  try {
    if (mongoose.connection.readyState === 1) {
      const found = await Roadmap.findById(req.params.id);
      if (!found) return res.status(404).json({ message: "Roadmap not found." });
      found.analysis.milestones = milestones;
      await found.save();
      return res.json(found);
    }

    const found = memoryRoadmaps.find((item) => item.id === req.params.id);
    if (!found) return res.status(404).json({ message: "Roadmap not found." });
    found.analysis.milestones = milestones;
    res.json(found);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

connectMongo().then(() => {
  app.listen(PORT, () => {
    console.log(`PathForge backend running at http://localhost:${PORT}`);
  });
});
