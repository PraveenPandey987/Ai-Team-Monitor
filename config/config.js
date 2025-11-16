import dotenv from "dotenv";
dotenv.config();

export const config = {
  // GitHub Configuration
  github: {
    appId: process.env.GITHUB_APP_ID,
    privateKeyPath: process.env.GITHUB_PRIVATE_KEY_PATH,
    installationId: process.env.GITHUB_INSTALLATION_ID,
    token: process.env.GITHUB_TOKEN
  },

  // JIRA Configuration
  jira: {
    host: process.env.JIRA_HOST,
    userEmail: process.env.JIRA_USER_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN
  },

  // Google Gemini AI Configuration
  googleAI: {
    apiKey: process.env.GOOGLE_API_KEY
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3000
  }
};
