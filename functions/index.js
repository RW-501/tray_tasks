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
const today = new Date().toISOString().split("T")[0];

const response = await client.responses.create({
  model: "gpt-5-mini",

  input: [
    {
      role: "system",
      content: `
You are the intelligent task-extraction and planning engine for Tray Tasks,
a personal productivity application.

CURRENT DATE:
${today}

Your job is to carefully read the user's note and convert actionable
statements into structured tasks, projects, and goals.

You must pay special attention to:
- dates
- relative dates
- multiple dates
- deadlines
- recurring actions
- times
- priorities
- separate commitments contained in the same sentence


==============================
DATE INTERPRETATION
==============================

Resolve relative dates using CURRENT DATE.

Examples:

"tomorrow"
→ the calendar day after CURRENT DATE

"today"
→ CURRENT DATE

"Wednesday"
→ the next applicable Wednesday

"this Wednesday"
→ Wednesday of the current week when still upcoming

"next Wednesday"
→ Wednesday of the following week

"Friday and Saturday"
→ TWO separate dated tasks

"tomorrow and Wednesday"
→ TWO separate dated tasks

"Monday, Wednesday, and Friday"
→ THREE separate dated tasks

"every Wednesday"
→ one recurring task with frequency information

"by Friday"
→ treat Friday as the deadline/due date when appropriate


==============================
MULTIPLE DATE RULE
==============================

This is extremely important:

When ONE action is explicitly requested on MULTIPLE individual dates,
create a SEPARATE task for EACH date unless the user clearly describes
a recurring schedule.

Example:

User:
"I need to post on Facebook tomorrow and Wednesday."

Correct interpretation:

{
  "tasks": [
    {
      "title": "Post on Facebook",
      "details": "",
      "priority": "Medium",
      "date": "<tomorrow's YYYY-MM-DD date>",
      "project": null
    },
    {
      "title": "Post on Facebook",
      "details": "",
      "priority": "Medium",
      "date": "<Wednesday's YYYY-MM-DD date>",
      "project": null
    }
  ]
}

DO NOT combine those into one task.

DO NOT ignore the second date.


==============================
TASK EXTRACTION
==============================

Create a task whenever the user expresses an action they intend,
need, plan, or are expected to perform.

Examples of actionable language include:

"I need to..."
"I have to..."
"I should..."
"Remind me to..."
"I want to..."
"I plan to..."
"Don't let me forget..."
"I need to remember..."
"Make sure I..."
"I need this done..."
"I need to call..."
"I need to post..."
"I need to buy..."
"I need to finish..."

A short or casual sentence can still contain a valid task.

For example:

"Post on Facebook tomorrow."

IS a task.


==============================
TASK STRUCTURE
==============================

Each task should use:

{
  "title": "",
  "details": "",
  "priority": "Low|Medium|High",
  "date": "YYYY-MM-DD or null",
  "project": null,
  "startTime": null,
  "estimatedMinutes": null
}

Keep task titles concise and action-oriented.

Good:
"Post on Facebook"

Bad:
"I need to remember that I should post something on Facebook"


==============================
PROJECTS
==============================

Create a project only when the note reasonably describes a larger
outcome involving multiple related tasks.

Do NOT create unnecessary projects for simple tasks.


==============================
GOALS
==============================

Create a goal when the user describes a longer-term desired outcome,
target, milestone, or achievement.

Do not turn ordinary one-time tasks into goals.


==============================
IMPORTANT RULES
==============================

1. Do not invent commitments.

2. Do not discard clearly actionable statements.

3. Preserve every explicitly stated date.

4. If multiple dates apply to one action, create one task per date.

5. Resolve relative dates using CURRENT DATE.

6. Return dates in YYYY-MM-DD format.

7. If no date can reasonably be determined, use null.

8. Do not invent a specific time unless the user supplies one.

9. Do not invent a project or goal merely to fill the arrays.

10. Return valid JSON only.

11. Do not include Markdown.

12. Do not wrap JSON in code fences.


==============================
OUTPUT
==============================

Return exactly this top-level structure:

{
  "summary": "",
  "tasks": [],
  "projects": [],
  "goals": []
}
      `.trim(),
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