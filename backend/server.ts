import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { fileURLToPath } from "url";

// ---------------------------------------------------------------------------
// ESM __dirname shim
// ---------------------------------------------------------------------------
const __filename_esm = fileURLToPath(import.meta.url);
const __dirname_esm = path.dirname(__filename_esm);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = 3001;
const WATER_RISK_PORTAL_URL =
  "https://water-risk-portal.onrender.com/report/risk";

const PREDICTIONS_FILE = path.join(__dirname_esm, "data", "lake_predictions.json");
const PARAMETERS_FILE = path.join(__dirname_esm, "data", "lake_parameters.json");
const PREDICT_SCRIPT = path.join(__dirname_esm, "..", "ml_pipeline", "predict_api.py");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PredictionInput {
  ph: number;
  bod: number;
  cod: number;
  tds: number;
  total_coliform: number;
}

interface PredictionResult {
  risk_level: string;
  confidence: number;
  probabilities: Record<string, number>;
  rule_based_risk: string;
  rule_based_violations?: string[];
  error?: boolean;
  message?: string;
}

interface LakeRecord {
  lake_name: string;
  latitude: number;
  longitude: number;
  ph: number;
  bod: number;
  cod: number;
  tds: number;
  total_coliform: number;
  year?: number;
  month?: string;
  ml_risk?: string;
  ml_confidence?: number;
  risk_level?: string;
  confidence?: number;
  records?: LakeRecord[];
  [key: string]: any;
}

interface WebhookHistoryEntry {
  id: number;
  timestamp: string;
  lake_name: string;
  payload: any;
  response?: any;
  error?: any;
  status: number;
  success: boolean;
  trigger?: string;
  risk_level?: string;
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------
const webhookHistory: WebhookHistoryEntry[] = [];

// ---------------------------------------------------------------------------
// Data loaders (with caching)
// ---------------------------------------------------------------------------
let predictionsCache: LakeRecord[] | null = null;
let parametersCache: LakeRecord[] | null = null;
let predictionsMtime = 0;
let parametersMtime = 0;

function loadPredictions(): LakeRecord[] {
  try {
    const stat = fs.statSync(PREDICTIONS_FILE);
    if (stat.mtimeMs !== predictionsMtime) {
      const raw = fs.readFileSync(PREDICTIONS_FILE, "utf-8");
      predictionsCache = JSON.parse(raw);
      predictionsMtime = stat.mtimeMs;
    }
    return predictionsCache ?? [];
  } catch (err: any) {
    console.error("Failed to load predictions:", err.message);
    return [];
  }
}

function loadParameters(): LakeRecord[] {
  try {
    const stat = fs.statSync(PARAMETERS_FILE);
    if (stat.mtimeMs !== parametersMtime) {
      const raw = fs.readFileSync(PARAMETERS_FILE, "utf-8");
      parametersCache = JSON.parse(raw);
      parametersMtime = stat.mtimeMs;
    }
    return parametersCache ?? [];
  } catch (err: any) {
    console.error("Failed to load parameters:", err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Python prediction helper
// ---------------------------------------------------------------------------
function runPythonPredict(inputData: PredictionInput): Promise<PredictionResult> {
  return new Promise((resolve, reject) => {
    const py: ChildProcess = spawn("python", [PREDICT_SCRIPT], {
      cwd: path.dirname(PREDICT_SCRIPT),
    });

    let stdout = "";
    let stderr = "";

    py.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    py.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    py.on("close", (code: number | null) => {
      if (code !== 0) {
        return reject(
          new Error(
            `Python process exited with code ${code}. stderr: ${stderr}. stdout: ${stdout}`
          )
        );
      }
      try {
        const result: PredictionResult = JSON.parse(stdout.trim());
        if (result.error) {
          return reject(new Error(result.message || "Prediction error"));
        }
        resolve(result);
      } catch (parseErr: any) {
        reject(
          new Error(`Failed to parse Python output: ${stdout}. ${parseErr.message}`)
        );
      }
    });

    py.on("error", (err: Error) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });

    // Send input to stdin and close
    py.stdin?.write(JSON.stringify(inputData));
    py.stdin?.end();
  });
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// Middleware
const CORS_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"];
app.use(
  cors({
    origin: CORS_ORIGINS,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  const predictionsExist = fs.existsSync(PREDICTIONS_FILE);
  const parametersExist = fs.existsSync(PARAMETERS_FILE);
  const modelExists = fs.existsSync(
    path.join(__dirname_esm, "..", "ml_pipeline", "models", "logistic_risk_model.pkl")
  );

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      predictions_data: predictionsExist ? "available" : "missing",
      parameters_data: parametersExist ? "available" : "missing",
      ml_model: modelExists ? "available" : "missing",
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/lakes
// ---------------------------------------------------------------------------
app.get("/api/lakes", (_req: Request, res: Response) => {
  try {
    const predictions = loadPredictions();
    res.json({
      success: true,
      count: predictions.length,
      data: predictions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/lakes/:lakeName/history
// ---------------------------------------------------------------------------
app.get("/api/lakes/:lakeName/history", (req: Request, res: Response) => {
  try {
    const lakeName = decodeURIComponent(req.params.lakeName);
    const parameters = loadParameters();

    const lake = parameters.find(
      (l) => l.lake_name.toLowerCase() === lakeName.toLowerCase()
    );

    if (!lake) {
      return res.status(404).json({
        success: false,
        error: `Lake "${lakeName}" not found`,
        available_lakes: parameters.slice(0, 10).map((l) => l.lake_name),
      });
    }

    res.json({
      success: true,
      lake_name: lake.lake_name,
      latitude: lake.latitude,
      longitude: lake.longitude,
      record_count: lake.records?.length ?? 0,
      records: lake.records ?? [],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/parameters
// ---------------------------------------------------------------------------
app.get("/api/parameters", (_req: Request, res: Response) => {
  try {
    const parameters = loadParameters();
    res.json({
      success: true,
      count: parameters.length,
      data: parameters,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/parameters/:lakeName
// ---------------------------------------------------------------------------
app.get("/api/parameters/:lakeName", (req: Request, res: Response) => {
  try {
    const lakeName = decodeURIComponent(req.params.lakeName);
    const parameters = loadParameters();

    const lake = parameters.find(
      (l) => l.lake_name.toLowerCase() === lakeName.toLowerCase()
    );

    if (!lake) {
      return res.status(404).json({
        success: false,
        error: `Lake "${lakeName}" not found`,
      });
    }

    res.json({
      success: true,
      data: lake,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dates
// ---------------------------------------------------------------------------
app.get("/api/dates", (_req: Request, res: Response) => {
  try {
    const parameters = loadParameters();

    const dateSet = new Set<string>();
    for (const lake of parameters) {
      for (const record of (lake.records ?? [])) {
        if (record.year && record.month) {
          dateSet.add(`${record.year}-${record.month}`);
        }
      }
    }

    const dates = Array.from(dateSet).sort();

    res.json({
      success: true,
      count: dates.length,
      dates,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stats
// ---------------------------------------------------------------------------
app.get("/api/stats", (_req: Request, res: Response) => {
  try {
    const predictions = loadPredictions();
    const parameters = loadParameters();

    // Risk distribution
    const riskDistribution: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
    for (const lake of predictions) {
      const risk = lake.ml_risk ?? "";
      if (risk in riskDistribution) {
        riskDistribution[risk]++;
      }
    }

    // Count total records
    let totalRecords = 0;
    const allDates = new Set<string>();
    for (const lake of parameters) {
      totalRecords += (lake.records ?? []).length;
      for (const record of (lake.records ?? [])) {
        if (record.year && record.month) {
          allDates.add(`${record.year}-${record.month}`);
        }
      }
    }

    // Average parameters across latest records
    let avgPh = 0, avgBod = 0, avgCod = 0, avgTds = 0, avgColiform = 0;
    if (predictions.length > 0) {
      for (const lake of predictions) {
        avgPh += lake.ph || 0;
        avgBod += lake.bod || 0;
        avgCod += lake.cod || 0;
        avgTds += lake.tds || 0;
        avgColiform += lake.total_coliform || 0;
      }
      const n = predictions.length;
      avgPh = Math.round((avgPh / n) * 100) / 100;
      avgBod = Math.round((avgBod / n) * 100) / 100;
      avgCod = Math.round((avgCod / n) * 100) / 100;
      avgTds = Math.round((avgTds / n) * 100) / 100;
      avgColiform = Math.round(avgColiform / n);
    }

    res.json({
      success: true,
      total_lakes: predictions.length,
      total_records: totalRecords,
      available_dates: allDates.size,
      risk_distribution: riskDistribution,
      average_parameters: {
        ph: avgPh, bod: avgBod, cod: avgCod, tds: avgTds, total_coliform: avgColiform,
      },
      webhook_calls: webhookHistory.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/predict
// ---------------------------------------------------------------------------
app.post("/api/predict", async (req: Request, res: Response) => {
  try {
    const { ph, bod, cod, tds, total_coliform } = req.body;

    // Validate required fields
    const missing: string[] = [];
    if (ph == null) missing.push("ph");
    if (bod == null) missing.push("bod");
    if (cod == null) missing.push("cod");
    if (tds == null) missing.push("tds");
    if (total_coliform == null) missing.push("total_coliform");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
        expected: { ph: "number", bod: "number", cod: "number", tds: "number", total_coliform: "number" },
      });
    }

    const prediction = await runPythonPredict({
      ph: Number(ph),
      bod: Number(bod),
      cod: Number(cod),
      tds: Number(tds),
      total_coliform: Number(total_coliform),
    });

    res.json({ success: true, prediction });
  } catch (err: any) {
    console.error("Prediction error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/webhook/trigger
// ---------------------------------------------------------------------------
app.post("/api/webhook/trigger", async (req: Request, res: Response) => {
  try {
    const { lake_name, latitude, longitude, ph, cod, bod, tds } = req.body;

    const missing: string[] = [];
    if (!lake_name) missing.push("lake_name");
    if (latitude == null) missing.push("latitude");
    if (longitude == null) missing.push("longitude");
    if (ph == null) missing.push("ph");
    if (cod == null) missing.push("cod");
    if (bod == null) missing.push("bod");
    if (tds == null) missing.push("tds");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    const payload = {
      lake_name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      ph: Number(ph),
      cod: Number(cod),
      bod: Number(bod),
      tds: Number(tds),
    };

    console.log(`[Webhook] Triggering for ${lake_name} →`, WATER_RISK_PORTAL_URL);

    const response = await axios.post(WATER_RISK_PORTAL_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    webhookHistory.push({
      id: webhookHistory.length + 1,
      timestamp: new Date().toISOString(),
      lake_name,
      payload,
      response: response.data,
      status: response.status,
      success: true,
    });

    res.json({
      success: true,
      webhook_response: response.data,
      status: response.status,
    });
  } catch (err: any) {
    webhookHistory.push({
      id: webhookHistory.length + 1,
      timestamp: new Date().toISOString(),
      lake_name: req.body.lake_name || "unknown",
      payload: req.body,
      error: err.response?.data || err.message,
      status: err.response?.status || 500,
      success: false,
    });

    console.error("Webhook error:", err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      error: err.response?.data || err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/predict-and-alert
// ---------------------------------------------------------------------------
app.post("/api/predict-and-alert", async (req: Request, res: Response) => {
  try {
    const {
      lake_name, latitude, longitude,
      ph, bod, cod, tds, total_coliform,
    } = req.body;

    const missing: string[] = [];
    if (!lake_name) missing.push("lake_name");
    if (latitude == null) missing.push("latitude");
    if (longitude == null) missing.push("longitude");
    if (ph == null) missing.push("ph");
    if (bod == null) missing.push("bod");
    if (cod == null) missing.push("cod");
    if (tds == null) missing.push("tds");
    if (total_coliform == null) missing.push("total_coliform");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    console.log(`[Predict+Alert] Running prediction for ${lake_name}`);
    const prediction = await runPythonPredict({
      ph: Number(ph),
      bod: Number(bod),
      cod: Number(cod),
      tds: Number(tds),
      total_coliform: Number(total_coliform),
    });

    const result: any = {
      success: true,
      prediction,
      webhook_triggered: false,
      webhook_response: null,
    };

    if (prediction.risk_level === "High" || prediction.risk_level === "Medium") {
      console.log(`[Predict+Alert] Risk is ${prediction.risk_level} — triggering webhook`);

      try {
        const webhookPayload = {
          lake_name,
          latitude: Number(latitude),
          longitude: Number(longitude),
          ph: Number(ph),
          cod: Number(cod),
          bod: Number(bod),
          tds: Number(tds),
        };

        const webhookResponse = await axios.post(WATER_RISK_PORTAL_URL, webhookPayload, {
          headers: { "Content-Type": "application/json" },
          timeout: 30000,
        });

        webhookHistory.push({
          id: webhookHistory.length + 1,
          timestamp: new Date().toISOString(),
          lake_name,
          payload: webhookPayload,
          response: webhookResponse.data,
          status: webhookResponse.status,
          success: true,
          trigger: "auto",
          risk_level: prediction.risk_level,
        });

        result.webhook_triggered = true;
        result.webhook_response = webhookResponse.data;
      } catch (webhookErr: any) {
        webhookHistory.push({
          id: webhookHistory.length + 1,
          timestamp: new Date().toISOString(),
          lake_name,
          payload: req.body,
          error: webhookErr.response?.data || webhookErr.message,
          status: webhookErr.response?.status || 500,
          success: false,
          trigger: "auto",
          risk_level: prediction.risk_level,
        });

        result.webhook_triggered = true;
        result.webhook_error = webhookErr.response?.data || webhookErr.message;
        console.error("[Predict+Alert] Webhook failed:", webhookErr.message);
      }
    } else {
      console.log(`[Predict+Alert] Risk is ${prediction.risk_level} — no webhook needed`);
    }

    res.json(result);
  } catch (err: any) {
    console.error("Predict+Alert error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/webhook/history
// ---------------------------------------------------------------------------
app.get("/api/webhook/history", (_req: Request, res: Response) => {
  res.json({
    success: true,
    count: webhookHistory.length,
    history: webhookHistory,
  });
});

// ---------------------------------------------------------------------------
// POST /api/report/generate — AI Report Generation (NVIDIA NIM)
// ---------------------------------------------------------------------------
app.post("/api/report/generate", async (req: Request, res: Response) => {
  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "nvidia/llama-3.3-nemotron-super-49b-v1";

  if (!NVIDIA_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "NVIDIA API key not configured. Set NVIDIA_API_KEY in backend/.env",
    });
  }

  try {
    const { lake_name } = req.body;
    if (!lake_name) {
      return res.status(400).json({ success: false, error: "lake_name is required" });
    }

    // Gather lake data
    const predictions = loadPredictions();
    const parameters = loadParameters();

    const lakePrediction = predictions.find(
      (l) => l.lake_name.toLowerCase() === lake_name.toLowerCase()
    );
    const lakeParams = parameters.find(
      (l) => l.lake_name.toLowerCase() === lake_name.toLowerCase()
    );

    if (!lakePrediction) {
      return res.status(404).json({ success: false, error: `Lake "${lake_name}" not found` });
    }

    // Build context for the AI
    const records = lakeParams?.records ?? [];
    const recentRecords = records.slice(-6); // last 6 data points for trend analysis

    const lakeContext = JSON.stringify({
      lake_name: lakePrediction.lake_name,
      location: { latitude: lakePrediction.latitude, longitude: lakePrediction.longitude },
      latest_parameters: {
        ph: lakePrediction.ph,
        bod_mg_per_l: lakePrediction.bod,
        cod_mg_per_l: lakePrediction.cod,
        tds_mg_per_l: lakePrediction.tds,
        total_coliform_mpn: lakePrediction.total_coliform,
      },
      ml_prediction: {
        risk_level: lakePrediction.ml_risk,
        confidence: lakePrediction.ml_confidence,
      },
      rule_based: {
        risk: lakePrediction.rule_based_risk,
        violations: lakePrediction.rule_based_violations,
      },
      historical_records: recentRecords.map((r: any) => ({
        year: r.year, month: r.month,
        ph: r.ph, bod: r.bod, cod: r.cod, tds: r.tds, coliform: r.total_coliform,
      })),
      total_historical_records: records.length,
    }, null, 2);

    const systemPrompt = `You are AquaWatch AI, an expert water quality analyst. Generate a professional, detailed water quality assessment report in Markdown format.

CPCB (Central Pollution Control Board) Safe Limits:
- pH: 6.5 – 8.5
- BOD: ≤ 3 mg/L
- COD: ≤ 10 mg/L
- TDS: ≤ 500 mg/L
- Total Coliform: ≤ 5000 MPN/100mL

Report Structure:
1. **Executive Summary** — 2-3 sentence overview of the lake's current condition
2. **Risk Assessment** — ML prediction result, confidence level, rule-based cross-check
3. **Parameter Analysis** — For EACH parameter: current value, safe limit, status (Safe/Danger), severity explanation
4. **Historical Trend Analysis** — If historical data is available, describe trends (improving/worsening/stable)
5. **Environmental Impact** — What the current water quality means for aquatic life, human health, and the ecosystem
6. **Remediation Recommendations** — Specific, actionable steps to improve water quality (at least 3 recommendations)
7. **Conclusion** — Final assessment with urgency level

Use clear headings, bullet points, and bold text. Be specific with numbers. Do NOT use generic filler text.`;

    const userPrompt = `Generate a comprehensive water quality report for the following lake:\n\n${lakeContext}`;

    console.log(`[AI Report] Generating report for ${lake_name} via NVIDIA NIM`);

    const nvidiaResponse = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: NVIDIA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${NVIDIA_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const reportContent = nvidiaResponse.data?.choices?.[0]?.message?.content;

    if (!reportContent) {
      return res.status(500).json({
        success: false,
        error: "AI returned empty response",
      });
    }

    console.log(`[AI Report] Report generated successfully for ${lake_name}`);

    res.json({
      success: true,
      lake_name: lakePrediction.lake_name,
      report: reportContent,
      model: NVIDIA_MODEL,
      generated_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[AI Report] Error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.detail || err.response?.data?.error?.message || err.message || "Failed to generate report",
    });
  }
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    available_endpoints: [
      "GET  /api/health",
      "GET  /api/lakes",
      "GET  /api/lakes/:lakeName/history",
      "GET  /api/parameters",
      "GET  /api/parameters/:lakeName",
      "GET  /api/dates",
      "GET  /api/stats",
      "POST /api/predict",
      "POST /api/webhook/trigger",
      "POST /api/predict-and-alert",
      "GET  /api/webhook/history",
      "POST /api/report/generate",
    ],
  });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log("  Water Quality Prediction API (TypeScript)");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Server:    http://localhost:${PORT}`);
  console.log(`  Health:    http://localhost:${PORT}/api/health`);
  console.log(`  Lakes:     http://localhost:${PORT}/api/lakes`);
  console.log(`  Stats:     http://localhost:${PORT}/api/stats`);
  console.log(`${"=".repeat(60)}\n`);
});

export default app;
