import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { App } from "@octokit/app";
// Import the base Octokit class
import { Octokit } from "octokit";
// Import the pagination plugin
import { paginateRest } from "@octokit/plugin-paginate-rest";

// Create a custom Octokit class that includes the pagination plugin
const MyOctokit = Octokit.plugin(paginateRest);

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: fs.readFileSync(process.env.GITHUB_PRIVATE_KEY_PATH, "utf8"),
  // Tell the App to use your custom Octokit class for all instances it creates
  Octokit: MyOctokit,
});

// Create authenticated Octokit instance
// This will now return an Octokit instance that has .paginate()
export async function getOctokit() {

  if (process.env.GITHUB_TOKEN) {
    // --- FIX: Use MyOctokit here ---
    // This ensures pagination is included, matching your GitHub App method.
    return new MyOctokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  return await app.getInstallationOctokit(
    process.env.GITHUB_INSTALLATION_ID
  );
}

// ---------------------------------------------------------------
// Get recent commits
// ---------------------------------------------------------------
export async function getRecentCommits(username, owner, repo) {
  const octokit = await getOctokit();

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const commits = await octokit.request(
    "GET /repos/{owner}/{repo}/commits",
    {
      owner,
      repo,
      author: username,
      since: since.toISOString(),
    }
  );

  return commits.data;
}

// ---------------------------------------------------------------
// Get active pull requests
// ---------------------------------------------------------------
export async function getActivePullRequests(username, owner, repo) {
  const octokit = await getOctokit();

  // Get all open PRs in the repo
  const prs = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    state: "open",
  });

  // Filter by author
  return prs.data.filter((pr) => pr.user?.login === username);
}

// ---------------------------------------------------------------
// Get contribution repos of user
// ---------------------------------------------------------------
export async function getContributionRepos(username) {
  const octokit = await getOctokit();

  // Use octokit.paginate() to get ALL recent events, not just the first 30
  const events = await octokit.paginate(
    "GET /users/{username}/events",
    {
      username,
      per_page: 100, // Fetch 100 per page to be efficient
    }
  );

  // This logic is perfect
  const repos = [
    ...new Set(events.map(e => e.repo?.name).filter(Boolean)),
  ];

  return repos;
}

// ---------------------------------------------------------------
// NEW: Search functions that answer the example queries
// ---------------------------------------------------------------

/**
 * Finds all recent commits by a user across all repos they've
 * recently contributed to.
 * Answers: "What has Mike committed this week?"
 */
export async function searchRecentCommitsByUser(username) {
  // 1. Find all repos user has contributed to (e.g., ["owner/repo1", "owner/repo2"])
  const repoFullNames = await getContributionRepos(username);

  const allCommits = [];

  // 2. Loop through each repo and get commits
  for (const fullName of repoFullNames) {
    try {
      const [owner, repo] = fullName.split('/');
      if (!owner || !repo) continue;

      const commits = await getRecentCommits(username, owner, repo);
      // Add repo name to each commit for clarity
      const commitsWithRepo = commits.map(commit => ({
        ...commit,
        repo: fullName,
      }));
      allCommits.push(...commitsWithRepo);
    } catch (error) {
      console.error(`Could not fetch commits for ${fullName}:`, error.message);
      // Continue to the next repo even if one fails
    }
  }

  return allCommits;
}

/**
 * Finds all active pull requests by a user across all repos they've
 * recently contributed to.
 * Answers: "Show me Lisa’s recent pull requests"
 */
export async function searchActivePRsByUser(username) {
  // 1. Find all repos user has contributed to
  const repoFullNames = await getContributionRepos(username);

  const allPRs = [];

  // 2. Loop through each repo and get PRs
  for (const fullName of repoFullNames) {
    try {
      const [owner, repo] = fullName.split('/');
      if (!owner || !repo) continue;

      const prs = await getActivePullRequests(username, owner, repo);
      // Add repo name to each PR for clarity
      const prsWithRepo = prs.map(pr => ({
        ...pr,
        repo: fullName,
      }));
      allPRs.push(...prsWithRepo);
    } catch (error) {
      console.error(`Could not fetch PRs for ${fullName}:`, error.message);
      // Continue to the next repo even if one fails
    }
  }

  return allPRs;
}