const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const {defineSecret} = require("firebase-functions/params");
const OpenAI = require("openai");
const cors = require("cors");

setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
});

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const corsHandler = cors({
  origin: [
    "https://rw-501.github.io",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
  ],
});

function runCors(req, res) {
  return new Promise((resolve, reject) => {
    corsHandler(req, res, (result) => {
      if (result instanceof Error) {
        reject(result);
      } else {
        resolve();
      }
    });
  });
}

function getOpenAI() {
  return new OpenAI({
    apiKey: OPENAI_API_KEY.value(),
  });
}

exports.api = onRequest(
  {
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 60,
  },
  async (req, res) => {
    await runCors(req, res);

    try {
      // -------------------------
      // Health check
      // -------------------------
      if (req.method === "GET" && req.path === "/health") {
        return res.json({
          ok: true,
          service: "Tray Tasks AI",
        });
      }

      // -------------------------
      // Analyze Note
      // -------------------------
      if (req.method === "POST" && req.path === "/analyze-note") {
        const note =
          req.body?.note ||
          req.body?.text ||
          req.body?.content ||
          "";

        if (!note.trim()) {
          return res.status(400).json({
            error: "A note is required.",
          });
        }

        const client = getOpenAI();

        const response = await client.responses.create({
          model: "gpt-5-mini",
          input: [
            {
              role: "system",
              content:
                "You are the AI reasoning engine for Tray Tasks, a personal productivity application. Analyze the user's note and identify actionable tasks, projects, and goals. Do not invent commitments that are not reasonably supported by the note. Return JSON only with this structure: {\"summary\":\"\",\"tasks\":[],\"projects\":[],\"goals\":[]}. Each task should contain title, details, priority, date when reasonably inferable, and project when applicable. Each project should contain title and details. Each goal should contain title, details, and deadline when reasonably inferable.",
            },
            {
              role: "user",
              content: note,
            },
          ],
        });

        let result;

        try {
          result = JSON.parse(response.output_text);
        } catch {
          result = {
            summary: response.output_text,
            tasks: [],
            projects: [],
            goals: [],
          };
        }

        return res.json(result);
      }

      // -------------------------
      // Plan Day
      // -------------------------
      if (req.method === "POST" && req.path === "/plan-day") {
        const tasks = Array.isArray(req.body?.tasks)
          ? req.body.tasks.slice(0, 50)
          : [];

        const date = req.body?.date || null;

        const client = getOpenAI();

        const response = await client.responses.create({
          model: "gpt-5-mini",
          input: [
            {
              role: "system",
              content:
                "You are a productivity planning assistant for Tray Tasks. Build a realistic daily schedule from the supplied tasks. Respect priorities, deadlines, specified times, estimated durations, and reasonable breaks. Return concise JSON only.",
            },
            {
              role: "user",
              content: JSON.stringify({
                date,
                tasks,
              }),
            },
          ],
        });

        let plan;

        try {
          plan = JSON.parse(response.output_text);
        } catch {
          plan = response.output_text;
        }

        return res.json({plan});
      }

      return res.status(404).json({
        error: "Route not found.",
      });
    } catch (error) {
      console.error("Tray Tasks API error:", error);

      return res.status(500).json({
        error: "Unable to process AI request.",
      });
    }
  },
);