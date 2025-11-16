import dotenv from "dotenv";
dotenv.config();

// Helper function to create the Basic Auth header
function getJiraAuthHeader() {
  const email = process.env.JIRA_USER_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!email || !token) {
    throw new Error("JIRA_USER_EMAIL or JIRA_API_TOKEN is not set in .env");
  }

  // JIRA Basic Auth is 'email:token' encoded in Base64
  const base64Credentials = Buffer.from(`${email}:${token}`).toString("base64");
  return `Basic ${base64Credentials}`;
}

/**
 * Searches for active JIRA issues assigned to a user.
 * This directly answers: "What JIRA tickets is John working on?"
 * * @param {string} userQuery - The user's JIRA Display Name OR their email address.
 * (e.g., "Praveenk Pandey" or "praveen@example.com")
 */
export async function searchActiveIssuesByUser(userQuery) {
  const jiraHost = process.env.JIRA_HOST;
  const authHeader = getJiraAuthHeader();

  if (!jiraHost) {
    throw new Error("JIRA_HOST is not set in .env");
  }

  // JQL (Jira Query Language) to find open issues for a user.
  // This searches for any issue that is not in a "Done" status category.
  const jql = `assignee = "${userQuery}" AND statusCategory != "Done" ORDER BY updated DESC`;

  // JIRA REST API endpoint for searching issues
  // UPDATED URL: Added /jql to the end as required by the new JIRA API
  const url = `${jiraHost}/rest/api/3/search/jql`;

  try {
    const response = await fetch(url, {
      method: "POST", // Using POST is recommended for search, even for GET-like ops
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        jql: jql,
        // We can limit the fields to get only what we need
        fields: [
          "summary",    // The issue title
          "status",     // The current status (e.g., "In Progress")
          "updated",    // When it was last updated
          "key",        // The issue key (e.g., "PROJ-123")
          "issuetype",  // (e.g., "Task", "Bug")
          "priority"    // The issue priority (e.g., "High", "Medium", "Low")
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("JIRA API Error:", errorData);
      throw new Error(`JIRA API request failed with status ${response.status}: ${errorData}`);
    }

    const data = await response.json();

    // Simplify the complex JIRA response into a clean list
    return data.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      issueType: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name || 'Not set',
      lastUpdated: issue.fields.updated,
      // You can build a direct link to the issue
      link: `${jiraHost}/browse/${issue.key}`
    }));

  } catch (err) {
    console.error("Error in searchActiveIssuesByUser:", err);
    throw err;
  }
}

/**
 * NEW: Searches for ALL JIRA issues (active and completed) assigned to a user.
 * This answers: "Show me all issues for Sarah, completed or not."
 * * @param {string} userQuery - The user's JIRA Display Name OR their email address.
 */
export async function searchAllIssuesByUser(userQuery) {
  const jiraHost = process.env.JIRA_HOST;
  const authHeader = getJiraAuthHeader();

  if (!jiraHost) {
    throw new Error("JIRA_HOST is not set in .env");
  }

  // JQL to find ALL issues for a user, just ordered by last updated.
  // We removed the "AND statusCategory != 'Done'" filter.
  const jql = `assignee = "${userQuery}" ORDER BY updated DESC`;

  // JIRA REST API endpoint for searching issues
  // UPDATED URL: Added /jql to the end as required by the new JIRA API
  const url = `${jiraHost}/rest/api/3/search/jql`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        jql: jql,
        fields: [
          "summary",
          "status",
          "updated",
          "key",
          "issuetype",
          "priority"
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("JIRA API Error:", errorData);
      throw new Error(`JIRA API request failed with status ${response.status}: ${errorData}`);
    }

    const data = await response.json();

    // Simplify the complex JIRA response into a clean list
    return data.issues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      issueType: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name || 'Not set',
      lastUpdated: issue.fields.updated,
      link: `${jiraHost}/browse/${issue.key}`
    }));

  } catch (err) {
    console.error("Error in searchAllIssuesByUser:", err);
    throw err;
  }
}