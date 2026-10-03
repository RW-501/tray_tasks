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

  if (typeof note !== "string" || !note.trim()) {
    return res.status(400).json({
      error: "A note is required.",
    });
  }

  const client = getOpenAI();

  // Tray Tasks is currently using Central Time.
  // This prevents UTC from accidentally shifting "today".
  const now = new Date();

  const currentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const currentWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
  }).format(now);

  console.log("Analyzing note:", note);
  console.log("Current date:", currentDate, currentWeekday);

  const response = await client.responses.create({
    model: "gpt-5-mini",

    instructions: `
You are the task extraction engine for Tray Tasks.

Your ONLY job is to turn natural-language notes into structured
tasks, projects, and goals.

TODAY IS:
${currentWeekday}, ${currentDate}

All relative dates MUST be calculated from this date.

==================================================
MOST IMPORTANT RULE: DO NOT LOSE ACTIONS OR DATES
==================================================

Every explicit action must be represented.

Every explicit date attached to an action must be represented.

If the SAME action must happen on TWO OR MORE distinct dates,
create a SEPARATE task for EACH date.

For example:

USER:
"I need to post on Facebook tomorrow and Wednesday."

This contains TWO commitments:

1. Post on Facebook tomorrow.
2. Post on Facebook Wednesday.

Therefore you MUST return TWO tasks.

NEVER return only one task for that sentence.

NEVER put "tomorrow and Wednesday" into one task's date.

==================================================
DATE RULES
==================================================

All task dates must use YYYY-MM-DD.

Interpret:

"today"
= ${currentDate}

"tomorrow"
= the calendar day immediately after ${currentDate}

A weekday by itself such as:
"Wednesday"
= the next occurrence of that weekday that has not already passed.

"next Wednesday"
= Wednesday of the following week.

Examples:

"Call mom tomorrow"
=> 1 task

"Call mom tomorrow and Friday"
=> 2 tasks

"Post Monday, Wednesday and Friday"
=> 3 tasks

"Go to the gym Saturday and Sunday"
=> 2 tasks

"Pay rent Friday"
=> 1 task

"Finish report by Friday"
=> 1 task due Friday

==================================================
RECURRING TASKS
==================================================

Distinguish multiple explicit dates from recurrence.

"I need to post tomorrow and Wednesday."
=> TWO individual tasks.

"I need to post every Wednesday."
=> ONE recurring task.

"I need to work out every Monday, Wednesday and Friday."
=> ONE recurring task with those weekdays.

For recurring tasks, include recurrence information.

==================================================
TIMES
==================================================

Preserve explicit times.

Examples:

"Call the dentist tomorrow at 10 AM"

should include:

"startTime": "10:00"

"Meeting Wednesday at 3:30 PM"

should include:

"startTime": "15:30"

Do NOT invent a time when none was given.

==================================================
TASK DETECTION
==================================================

Statements indicating intention, obligation, reminders,
plans, or required actions are tasks.

Examples include:

"I need to..."
"I have to..."
"I should..."
"I want to..."
"I plan to..."
"Remind me to..."
"Don't let me forget..."
"Make sure I..."
"I need to remember..."
"I need to post..."
"I need to call..."
"I need to buy..."
"I need to finish..."

Casual language still counts.

"I gotta call mom tomorrow."

is a task.

"Facebook tomorrow."

can be interpreted as a task if the surrounding note clearly
indicates the user intends to post on Facebook.

==================================================
TASK TITLES
==================================================

Titles should be short and action-oriented.

GOOD:
"Post on Facebook"

GOOD:
"Call dentist"

GOOD:
"Buy groceries"

BAD:
"I need to remember that I have to post on Facebook tomorrow"

==================================================
PRIORITY
==================================================

Use:

"Low"
"Medium"
"High"

Default to "Medium" unless the note clearly indicates
something is urgent or low priority.

==================================================
PROJECTS
==================================================

A project is a larger outcome involving multiple related actions.

Do NOT create a project for a normal standalone task.

Example:

"Build my portfolio website. I need to redesign the homepage,
update my resume and add my projects."

This can reasonably produce:
- one project
- three tasks

==================================================
GOALS
==================================================

A goal represents a larger desired result or milestone.

Example:

"I want to save $10,000 by July."

can be a goal.

Do NOT classify normal errands or reminders as goals.

==================================================
FINAL VALIDATION
==================================================

Before returning your answer, silently check:

1. How many actions did the user explicitly request?
2. How many dates did the user explicitly mention?
3. Did I preserve every action?
4. Did I preserve every date?
5. If one action had multiple dates, did I create multiple tasks?
6. Did I convert relative dates to actual YYYY-MM-DD dates?
7. Did I preserve explicit times?
8. Did I avoid inventing tasks?

If any explicit action or date is missing, FIX THE OUTPUT
before returning it.
    `.trim(),

    input: note.trim(),

    text: {
      format: {
        type: "json_schema",
        name: "tray_tasks_note_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,

          properties: {
            summary: {
              type: "string",
            },

            tasks: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,

                properties: {
                  title: {
                    type: "string",
                  },

                  details: {
                    type: "string",
                  },

                  priority: {
                    type: "string",
                    enum: ["Low", "Medium", "High"],
                  },

                  date: {
                    type: ["string", "null"],
                  },

                  project: {
                    type: ["string", "null"],
                  },

                  startTime: {
                    type: ["string", "null"],
                  },

                  estimatedMinutes: {
                    type: ["number", "null"],
                  },

                  frequency: {
                    type: ["string", "null"],
                  },

                  frequencyDays: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },

                required: [
                  "title",
                  "details",
                  "priority",
                  "date",
                  "project",
                  "startTime",
                  "estimatedMinutes",
                  "frequency",
                  "frequencyDays",
                ],
              },
            },

            projects: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,

                properties: {
                  title: {
                    type: "string",
                  },

                  details: {
                    type: "string",
                  },
                },

                required: [
                  "title",
                  "details",
                ],
              },
            },

            goals: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,

                properties: {
                  title: {
                    type: "string",
                  },

                  details: {
                    type: "string",
                  },

                  deadline: {
                    type: ["string", "null"],
                  },
                },

                required: [
                  "title",
                  "details",
                  "deadline",
                ],
              },
            },
          },

          required: [
            "summary",
            "tasks",
            "projects",
            "goals",
          ],
        },
      },
    },
  });

  console.log("OpenAI output:", response.output_text);

  let result;

  try {
    result = JSON.parse(response.output_text);
  } catch (error) {
    console.error(
      "Could not parse OpenAI response:",
      response.output_text
    );

    return res.status(502).json({
      error: "AI returned an invalid response.",
    });
  }

  console.log("Parsed Tray Tasks result:", result);

  return res.status(200).json(result);
}
      // -------------------------
      // Plan Day
      // -------------------------
      if (req.method === "POST" && req.path === "/plan-day") {
        const tasks = Array.isArray(req.body?.tasks)
          ? req.body.tasks.slice(0, 50)
          : [];

        const date = req.body?.date || null;
        const blocks = Array.isArray(req.body?.blocks) ? req.body.blocks.slice(0, 30) : [];
        const recentActivity = Array.isArray(req.body?.recentActivity) ? req.body.recentActivity.slice(-80) : [];
        const reason = req.body?.reason || 'manual';

        const client = getOpenAI();

        const response = await client.responses.create({
          model: "gpt-5-mini",
          input: [
            {
              role: "system",
              content:
                "You are the adaptive productivity planning assistant for Tray Tasks. Build a realistic daily schedule from open tasks AND fixed/variable life blocks such as work, sleep, school, and workouts. Recent activity history is behavioral evidence: use it to prefer time periods when similar actions are commonly completed, but never treat past patterns as hard requirements. Respect priorities, deadlines, specified times, durations, energy, transitions, and breaks. If this is an update after a meaningful change, re-plan the remaining day rather than rewriting completed time. Return concise JSON only with summary, schedule, reminders, and adjustments.",
            },
            {
              role: "user",
              content: JSON.stringify({
                date,
                tasks,
                blocks,
                recentActivity,
                reason,
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