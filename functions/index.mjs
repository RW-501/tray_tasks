// functions/index.mjs

// --- IMPORTS ---
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import admin from "firebase-admin";
import cors from "cors";
import OpenAI from "openai";
import path, { join } from "path";
import { fileURLToPath } from "url";
import { CloudTasksClient } from "@google-cloud/tasks";
import fetch from "node-fetch";
import { readFileSync } from "fs";
import { defineSecret } from "firebase-functions/params";

// --- Setup Secrets ---
export const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

// --- Firebase Admin Init ---
if (!admin.apps.length) admin.initializeApp();

// --- Other core setup ---
const tasksClient = new CloudTasksClient();
const db = admin.firestore();
const storage = admin.storage().bucket();
const auth = admin.auth();
const corsHandler = cors({ origin: true });

// --- Resolve __dirname for ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Dynamically fetch your tools JSON from your Cloud Function ---
let allTools = [];

try {
  const response = await fetch(
    "https://us-central1-ron-ai-8655e.cloudfunctions.net/trey_tools_json.js"
  );

  if (!response.ok) throw new Error(`Failed to fetch tools: ${response.status} ${response.statusText}`);

  const data = await response.json();
  allTools = Array.isArray(data?.treyTools) ? data.treyTools : [];

  console.log(`✅ TOOLS JSON Loaded: ${allTools.length} tools`);
} catch (err) {
  console.error("❌ Error loading tools JSON:", err);
  allTools = [];
}
