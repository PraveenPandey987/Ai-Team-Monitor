import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { searchActiveIssuesByUser } from "./jira-client.js";
import { searchActivePRsByUser, searchRecentCommitsByUser } from "./github-client.js";

// Import our new user mapping function
import { findUserInQuery } from "./query-parser.js";

// 1. Initialize the Gemini client
const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// 2. Create data-level cache (caches raw API data, not AI responses)
// Cache key format: "jira_username" or "commits_username" or "prs_username"
const dataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Helper function to get cached data
 * Returns cached data if valid, null if expired or not found
 */
function getCachedData(cacheKey) {
  const cached = dataCache.get(cacheKey);
  if (!cached) return null;

  const isExpired = (Date.now() - cached.timestamp) > CACHE_TTL;
  if (isExpired) {
    dataCache.delete(cacheKey);
    return null;
  }

  console.log(`✅ Cache HIT for ${cacheKey}`);
  return cached.data;
}

/**
 * Helper function to set cached data
 */
function setCachedData(cacheKey, data) {
  dataCache.set(cacheKey, {
    data: data,
    timestamp: Date.now()
  });
  console.log(`💾 Cached data for ${cacheKey}`);
}

/**
 * Helper function to format relative dates
 */
function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Fetch JIRA data with caching
 */
async function fetchJiraData(jiraId) {
  const cacheKey = `jira_${jiraId}`;

  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData !== null) {
    return cachedData;
  }

  // Cache miss - fetch from API
  console.log(`🌐 API call: Fetching JIRA data for ${jiraId}`);
  const data = await searchActiveIssuesByUser(jiraId);

  // Cache the result
  setCachedData(cacheKey, data);

  return data;
}

/**
 * Fetch GitHub commits with caching
 */
async function fetchCommitsData(githubId) {
  const cacheKey = `commits_${githubId}`;

  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData !== null) {
    return cachedData;
  }

  // Cache miss - fetch from API
  console.log(`🌐 API call: Fetching commits for ${githubId}`);
  const data = await searchRecentCommitsByUser(githubId);

  // Cache the result
  setCachedData(cacheKey, data);

  return data;
}

/**
 * Fetch GitHub PRs with caching
 */
async function fetchPRsData(githubId) {
  const cacheKey = `prs_${githubId}`;

  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData !== null) {
    return cachedData;
  }

  // Cache miss - fetch from API
  console.log(`🌐 API call: Fetching PRs for ${githubId}`);
  const data = await searchActivePRsByUser(githubId);

  // Cache the result
  setCachedData(cacheKey, data);

  return data;
}

/**
 * Classify user intent to determine what data to fetch
 */
async function classifyIntent(question) {
  const intentPrompt = `
    Analyze the following question and determine what type of information the user wants.
    Respond with ONLY ONE of these words: JIRA, COMMITS, PRS, or FULL_SUMMARY.

    Rules:
    - If they ask about JIRA tickets, issues, or tasks -> JIRA
    - If they ask about commits, what they committed, or code changes -> COMMITS
    - If they ask about pull requests, PRs, or reviews -> PRS
    - If they ask "what is [name] working on" or want a general summary -> FULL_SUMMARY
    - If unclear, default to FULL_SUMMARY

    Examples:
    "What is he working on?" -> FULL_SUMMARY
    "Show me his JIRA tickets" -> JIRA
    "What has she committed this week?" -> COMMITS
    "Show me Sarah's recent pull requests" -> PRS
    "Give me the full report" -> FULL_SUMMARY
    "What JIRA issues is John assigned to?" -> JIRA

    Question: "${question}"

    Response (one word only):
  `;

  try {
    const intentResult = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [{ parts: [{ text: intentPrompt }] }],
    });

    const intent = intentResult.text.trim().toUpperCase();
    console.log(`Classified intent: ${intent}`);

    // Validate the intent
    if (['JIRA', 'COMMITS', 'PRS', 'FULL_SUMMARY'].includes(intent)) {
      return intent;
    }

    // Default to FULL_SUMMARY if invalid response
    return 'FULL_SUMMARY';
  } catch (error) {
    console.error("Error classifying intent:", error);
    return 'FULL_SUMMARY'; // Default on error
  }
}

/**
 * Main AI Response Generation Function
 * This is the main function that combines all our data.
 */
export async function handleAIQuery(question) {
  // Step 1: Find the user in our mapping
  const user = findUserInQuery(question);

  if (!user) {
    return "I'm sorry, I couldn't find a known user (from JIRA or GitHub) in your query. Please include a name I recognize.";
  }

  try {
    // Step 2: Classify the user's intent
    const intent = await classifyIntent(question);
    console.log(`📊 Intent classified as: ${intent}`);

    // Step 3: Fetch data selectively based on intent (with data-level caching)
    let jiraIssues = [];
    let githubPRs = [];
    let githubCommits = [];

    if (intent === 'JIRA') {
      jiraIssues = await fetchJiraData(user.jiraId);
    } else if (intent === 'COMMITS') {
      githubCommits = await fetchCommitsData(user.githubId);
    } else if (intent === 'PRS') {
      githubPRs = await fetchPRsData(user.githubId);
    } else { // FULL_SUMMARY
      // Fetch all data in parallel, each checks its own cache
      [jiraIssues, githubPRs, githubCommits] = await Promise.all([
        fetchJiraData(user.jiraId),
        fetchPRsData(user.githubId),
        fetchCommitsData(user.githubId)
      ]);
    }

    // Step 4: Check if we found any data at all
    if (jiraIssues.length === 0 && githubPRs.length === 0 && githubCommits.length === 0) {
      return `I found ${user.jiraId} (JIRA) / ${user.githubId} (GitHub), but they have no recent activity based on your query.`;
    }

    // Step 5: Add relative time formatting to data
    if (jiraIssues.length > 0) {
      jiraIssues = jiraIssues.map(issue => ({
        ...issue,
        relativeTime: getRelativeTime(issue.lastUpdated)
      }));
    }

    if (githubCommits.length > 0) {
      githubCommits = githubCommits.map(commit => ({
        ...commit,
        relativeTime: commit.commit?.author?.date ? getRelativeTime(commit.commit.author.date) : 'unknown'
      }));
    }

    // Step 6: Determine what data we actually have
    const hasJira = jiraIssues.length > 0;
    const hasPRs = githubPRs.length > 0;
    const hasCommits = githubCommits.length > 0;

    // Step 7: Construct the prompt for the Gemini API
    const dataContext = `
      ${hasJira ? `--- JIRA DATA (Active Issues) ---\n${JSON.stringify(jiraIssues, null, 2)}\n` : ''}
      ${hasPRs ? `--- GITHUB DATA (Active Pull Requests) ---\n${JSON.stringify(githubPRs, null, 2)}\n` : ''}
      ${hasCommits ? `--- GITHUB DATA (Recent Commits) ---\n${JSON.stringify(githubCommits, null, 2)}\n` : ''}
    `;

    const prompt = `
      You are a helpful AI team assistant. A manager asked a question about a team member.
      Based on the following data, provide a CONCISE, CONVERSATIONAL answer in PLAIN TEXT.

      Question: "${question}"
      User: ${user.jiraId} (JIRA) / ${user.githubId} (GitHub)

      ${dataContext}

      --- CRITICAL INSTRUCTIONS ---
      - **RESPOND IN PLAIN TEXT ONLY. NO HTML, NO MARKDOWN.**
      - **ONLY answer what was specifically asked. Do NOT include extra information.**
      - If they asked about JIRA, ONLY talk about JIRA. Don't mention GitHub at all.
      - If they asked about commits, ONLY talk about commits. Don't mention JIRA or PRs.
      - If they asked about PRs, ONLY talk about PRs. Don't mention JIRA or commits.
      - If they asked "what is [name] working on", include everything available.
      - Be conversational and natural, like talking to a human.
      - Keep it brief - 2-3 sentences per item maximum.
      - Use natural language for time (e.g., "1 day ago" not timestamps).
      - Include specific details like ticket IDs, commit messages, PR titles.
      - Format lists with simple bullets (•) or line breaks.
      - Do NOT create sections or headers unless there's a lot of data.
      - Start directly with the answer, no preamble.

      Examples of good responses:
      Q: "What JIRA tickets is X working on?"
      A: "X has 2 active JIRA tickets: TS-102 (Fix login bug, High priority, In Progress) updated 2 hours ago, and TS-104 (Payment gateway, High priority, In Progress) updated 1 day ago."

      Q: "What commits has X made?"
      A: "X made 2 commits in the last week: 'Delete .env file' in santosh_calander repo 1 day ago, and 'yehhh' in the same repo also 1 day ago."

      Q: "What is X working on?"
      A: "X is currently working on 1 JIRA ticket: TS-1 (Test Issue - Checking Jira setup, Medium priority, Parking lot status) updated 7 hours ago. No recent GitHub commits or pull requests found."
    `;

    // Step 8: Call the Gemini API and get the response
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-09-2025",
      contents: [{ parts: [{ text: prompt }] }],
    });

    // Return the AI-generated response
    // Note: The raw data is already cached, so different phrasings of the same
    // question will reuse cached API data and only regenerate the AI response
    return response.text;

  } catch (error) {
    console.error("Error in AI query handling:", error);

    // Better error messages
    if (error.message.includes("404")) {
      return `Sorry, I couldn't find one or more repositories. The user might not have access to some repos.`;
    }
    if (error.message.includes("401") || error.message.includes("403")) {
      return `Authentication error: Please check your API credentials in the .env file.`;
    }
    if (error.message.includes("rate limit")) {
      return `API rate limit exceeded. Please try again in a few minutes.`;
    }

    return `An error occurred while fetching data: ${error.message}`;
  }
}
