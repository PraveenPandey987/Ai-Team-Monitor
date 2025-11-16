import express from "express";
import dotenv from "dotenv";
dotenv.config();
import path from "path";
import { fileURLToPath } from "url";

import {
  getRecentCommits,
  getActivePullRequests,
  getContributionRepos,
  // Import the new search functions
  searchRecentCommitsByUser,
  searchActivePRsByUser
} from "./github-client.js";

// Import the new JIRA functions
import { searchActiveIssuesByUser, searchAllIssuesByUser } from "./jira-client.js";

// Import the new AI handler
import { handleAIQuery } from "./response-generator.js";
// --- NEW PATH CONFIG ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------------------------------------------------
// 1. Get recent commits by user (last 7 days)
// Example: /commits?user=Mike&owner=XYZ&repo=ABC
// ----------------------------------------------------------
app.get("/commits", async (req, res) => {
  try {
    const { user, owner, repo } = req.query;

    if (!user || !owner || !repo) {
      return res.status(400).json({ error: "Missing required query params: user, owner, repo" });
    }

    const commits = await getRecentCommits(user, owner, repo);
    res.json({ commits });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------------------
// 2. Get active PRs by user
// Example: /prs?user=Lisa&owner=XYZ&repo=ABC
// ----------------------------------------------------------
app.get("/prs", async (req, res) => {
  try {
    const { user, owner, repo } = req.query;

    if (!user || !owner || !repo) {
      return res.status(400).json({ error: "Missing required query params: user, owner, repo" });
    }

    const prs = await getActivePullRequests(user, owner, repo);
    res.json({ prs });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------------------
// 3. Get repos user contributed to
// Example: /repos?user=Mike
// ----------------------------------------------------------
app.get("/repos", async (req, res) => {
  try {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: "Missing required query param: user" });
    }

    const repos = await getContributionRepos(user);
    res.json({ repos });

  } catch (err)
 {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------------------
// NEW: 4. Search recent commits by user
// Answers: "What has Mike committed this week?"
// Example: /search/commits?user=Mike
// ----------------------------------------------------------
app.get("/search/commits", async (req, res) => {
  try {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: "Missing required query param: user" });
    }

    const commits = await searchRecentCommitsByUser(user);
    res.json({ commits });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------------------
// NEW: 5. Search active PRs by user
// Answers: "Show me Lisa's recent pull requests"
// Example: /search/prs?user=Lisa
// ----------------------------------------------------------
app.get("/search/prs", async (req, res) => {
  try {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: "Missing required query param: user" });
    }

    const prs = await searchActivePRsByUser(user);
    res.json({ prs });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------------
// NEW: 6. Search active JIRA issues by user
// Answers: "What JIRA tickets is John working on?"
// Example: /search/jira?user=John%20Doe (or user=john@example.com)
// ----------------------------------------------------------
app.get("/search/jira", async (req, res) => {
  try {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: "Missing required query param: user" });
    }

    // The user query can be a display name or an email
    const issues = await searchActiveIssuesByUser(user);
    res.json({ issues });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


// ----------------------------------------------------------
// NEW: 7. Search ALL JIRA issues by user (active and completed)
// Answers: "Show me all of Sarah's issues"
// Example: /search/jira/all?user=Sarah%20Doe
// ----------------------------------------------------------
app.get("/search/jira/all", async (req, res) => {
  try {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: "Missing required query param: user" });
    }

    // This calls the new function for all issues
    const issues = await searchAllIssuesByUser(user);
    res.json({ issues });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Missing required body param: question" });
    }

    // This one function does it all: parses, fetches, and summarizes
    const answer = await handleAIQuery(question);
    res.json({ answer });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});




// ----------------------------------------------------------
app.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);
