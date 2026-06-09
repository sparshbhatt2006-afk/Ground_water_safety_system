/**
 * server.js — Express REST API for Water Quality Prediction System
 *
 * Endpoints:
 *   GET  /api/health                    Health check
 *   GET  /api/lakes                     All lakes with latest risk predictions
 *   GET  /api/lakes/:lakeName/history   Historical data for a specific lake
 *   GET  /api/parameters                All parameter data
 *   GET  /api/parameters/:lakeName      Parameters for a specific lake
 *   GET  /api/dates                     All available dates
 *   GET  /api/stats                     Statistics (total lakes, risk distribution, etc.)
 *   POST /api/predict                   On-demand ML prediction via Python child process
 *   POST /api/webhook/trigger           Send data to Water Risk Portal
 *   POST /api/predict-and-alert         Combined predict + conditional webhook
 *   GET  /api/webhook/history           Log of webhook calls
 */

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = 3001;
const WATER_RISK_PORTAL_URL =
  "https://water-risk-portal.onrender.com/report/risk";

const PREDICTIONS_FILE = path.join(__dirname, "data", "lake_predictions.json");
const PARAMETERS_FILE = path.join(__dirname, "data", "lake_parameters.json");
const PREDICT_SCRIPT = path.join(__dirname, "..", "ml_pipeline", "predict_api.py");

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------
let webhookHistory = [];

// ---------------------------------------------------------------------------
// Data loaders (with caching)
// ---------------------------------------------------------------------------
let predictionsCache = null;
let parametersCache = null;
let predictionsMtime = 0;
let parametersMtime = 0;

function loadPredictions() {
  try {
    const stat = fs.statSync(PREDICTIONS_FILE);
    if (stat.mtimeMs !== predictionsMtime) {
      const raw = fs.readFileSync(PREDICTIONS_FILE, "utf-8");
      predictionsCache = JSON.parse(raw);
      predictionsMtime = stat.mtimeMs;
    }
    return predictionsCache;
  } catch (err) {
    console.error("Failed to load predictions:", err.message);
    return [];
  }
}

function loadParameters() {
  try {
    const stat = fs.statSync(PARAMETERS_FILE);
    if (stat.mtimeMs !== parametersMtime) {
      const raw = fs.readFileSync(PARAMETERS_FILE, "utf-8");
      parametersCache = JSON.parse(raw);
      parametersMtime = stat.mtimeMs;
    }
    return parametersCache;
  } catch (err) {
    console.error("Failed to load parameters:", err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Python prediction helper
// ---------------------------------------------------------------------------
function runPythonPredict(inputData) {
  return new Promise((resolve, reject) => {
    const py = spawn("python", [PREDICT_SCRIPT], {
      cwd: path.dirname(PREDICT_SCRIPT),
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    py.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(
            `Python process exited with code ${code}. stderr: ${stderr}. stdout: ${stdout}`
          )
        );
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          return reject(new Error(result.message || "Prediction error"));
        }
        resolve(result);
      } catch (parseErr) {
        reject(
          new Error(`Failed to parse Python output: ${stdout}. ${parseErr.message}`)
        );
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });

    // Send input to stdin and close
    py.stdin.write(JSON.stringify(inputData));
    py.stdin.end();
  });
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// GET /api/health
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  const predictionsExist = fs.existsSync(PREDICTIONS_FILE);
  const parametersExist = fs.existsSync(PARAMETERS_FILE);
  const modelExists = fs.existsSync(
    path.join(__dirname, "..", "ml_pipeline", "models", "logistic_risk_model.pkl")
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
app.get("/api/lakes", (_req, res) => {
  try {
    const predictions = loadPredictions();
    res.json({
      success: true,
      count: predictions.length,
      data: predictions,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/lakes/:lakeName/history
// ---------------------------------------------------------------------------
app.get("/api/lakes/:lakeName/history", (req, res) => {
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
      record_count: lake.records.length,
      records: lake.records,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/parameters
// ---------------------------------------------------------------------------
app.get("/api/parameters", (_req, res) => {
  try {
    const parameters = loadParameters();
    res.json({
      success: true,
      count: parameters.length,
      data: parameters,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/parameters/:lakeName
// ---------------------------------------------------------------------------
app.get("/api/parameters/:lakeName", (req, res) => {
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/dates
// ---------------------------------------------------------------------------
app.get("/api/dates", (_req, res) => {
  try {
    const parameters = loadParameters();

    const dateSet = new Set();
    for (const lake of parameters) {
      for (const record of lake.records) {
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
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stats
// ---------------------------------------------------------------------------
app.get("/api/stats", (_req, res) => {
  try {
    const predictions = loadPredictions();
    const parameters = loadParameters();

    // Risk distribution
    const riskDistribution = { Low: 0, Medium: 0, High: 0 };
    for (const lake of predictions) {
      const risk = lake.ml_risk;
      if (riskDistribution.hasOwnProperty(risk)) {
        riskDistribution[risk]++;
      }
    }

    // Count total records
    let totalRecords = 0;
    const allDates = new Set();
    for (const lake of parameters) {
      totalRecords += lake.records.length;
      for (const record of lake.records) {
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
        ph: avgPh,
        bod: avgBod,
        cod: avgCod,
        tds: avgTds,
        total_coliform: avgColiform,
      },
      webhook_calls: webhookHistory.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/predict
// ---------------------------------------------------------------------------
app.post("/api/predict", async (req, res) => {
  try {
    const { ph, bod, cod, tds, total_coliform } = req.body;

    // Validate required fields
    const missing = [];
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

    res.json({
      success: true,
      prediction,
    });
  } catch (err) {
    console.error("Prediction error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /api/webhook/trigger
// ---------------------------------------------------------------------------
app.post("/api/webhook/trigger", async (req, res) => {
  try {
    const { lake_name, latitude, longitude, ph, cod, bod, tds } = req.body;

    // Validate required fields
    const missing = [];
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

    // Log to history
    const historyEntry = {
      id: webhookHistory.length + 1,
      timestamp: new Date().toISOString(),
      lake_name,
      payload,
      response: response.data,
      status: response.status,
      success: true,
    };
    webhookHistory.push(historyEntry);

    res.json({
      success: true,
      webhook_response: response.data,
      status: response.status,
    });
  } catch (err) {
    // Log failed attempts too
    const historyEntry = {
      id: webhookHistory.length + 1,
      timestamp: new Date().toISOString(),
      lake_name: req.body.lake_name || "unknown",
      payload: req.body,
      error: err.response?.data || err.message,
      status: err.response?.status || 500,
      success: false,
    };
    webhookHistory.push(historyEntry);

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
app.post("/api/predict-and-alert", async (req, res) => {
  try {
    const {
      lake_name, latitude, longitude,
      ph, bod, cod, tds, total_coliform,
    } = req.body;

    // Validate required fields
    const missing = [];
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

    // Step 1: Run ML prediction
    console.log(`[Predict+Alert] Running prediction for ${lake_name}`);
    const prediction = await runPythonPredict({
      ph: Number(ph),
      bod: Number(bod),
      cod: Number(cod),
      tds: Number(tds),
      total_coliform: Number(total_coliform),
    });

    const result = {
      success: true,
      prediction,
      webhook_triggered: false,
      webhook_response: null,
    };

    // Step 2: If risk is High or Medium, trigger webhook
    if (prediction.risk_level === "High" || prediction.risk_level === "Medium") {
      console.log(
        `[Predict+Alert] Risk is ${prediction.risk_level} — triggering webhook`
      );

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

        const webhookResponse = await axios.post(
          WATER_RISK_PORTAL_URL,
          webhookPayload,
          {
            headers: { "Content-Type": "application/json" },
            timeout: 30000,
          }
        );

        // Log to history
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
      } catch (webhookErr) {
        // Log failed webhook but don't fail the whole request
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
      console.log(
        `[Predict+Alert] Risk is ${prediction.risk_level} — no webhook needed`
      );
    }

    res.json(result);
  } catch (err) {
    console.error("Predict+Alert error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ---------------------------------------------------------------------------
// GET /api/webhook/history
// ---------------------------------------------------------------------------
app.get("/api/webhook/history", (_req, res) => {
  res.json({
    success: true,
    count: webhookHistory.length,
    history: webhookHistory,
  });
});

// ---------------------------------------------------------------------------
// 404 catch-all
// ---------------------------------------------------------------------------
app.use((_req, res) => {
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
    ],
  });
});

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
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
  console.log("  Water Quality Prediction API");
  console.log(`${"=".repeat(60)}`);
  console.log(`  Server:    http://localhost:${PORT}`);
  console.log(`  Health:    http://localhost:${PORT}/api/health`);
  console.log(`  Lakes:     http://localhost:${PORT}/api/lakes`);
  console.log(`  Stats:     http://localhost:${PORT}/api/stats`);
  console.log(`${"=".repeat(60)}\n`);
});

module.exports = app;
