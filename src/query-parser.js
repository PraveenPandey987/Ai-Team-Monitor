// This object maps a user's various names to a single identity.
// The AI will find a user's name (e.g., "Praveenk Pandey") and then use
// the correct ID for JIRA and GitHub.

export const userMapping = {
  // --- Praveenk Pandey ---
  "praveenk pandey": {
    jiraId: "Praveenk Pandey", // JIRA Display Name
    githubId: "PraveenPandey987" // GitHub Username
  },
  "praveenpandey987": {
    jiraId: "Praveenk Pandey",
    githubId: "PraveenPandey987"
  },
  "pp7007144435@gmail.com": {
    jiraId: "pp7007144435@gmail.com", // JIRA Email
    githubId: "PraveenPandey987"
  },
  
  // --- Add other users here ---
  "mike": {
    jiraId: "Mike Ross",
    githubId: "mikeross88"
  },
  "sarah": {
    jiraId: "Sarah Connor",
    githubId: "sarah-connor"
  },
  "lisa": {
    jiraId: "Lisa Smith",
    githubId: "lsmith"
  }
};

/**
 * Searches the query for any mention of a known user.
 * @param {string} question - The user's full question.
 * @returns {object|null} The matching user object (e.g., { jiraId: "...", githubId: "..." }) or null.
 */
export function findUserInQuery(question) {
  const normalizedQuery = question.toLowerCase();

  for (const key in userMapping) {
    if (normalizedQuery.includes(key)) {
      return userMapping[key];
    }
  }

  return null;
}