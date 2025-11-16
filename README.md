# AI Team Activity Monitor

## Overview
This is an AI-powered chatbot that answers questions about a team member's recent activity.
It integrates with **JIRA** and **GitHub**, fetches relevant data, and uses **Google's Gemini AI** to provide a concise, human-readable summary.

This project was built to answer the core question:
**"What is [member] working on these days?"**

## Features
- 🤖 **AI-Powered Summaries** – Uses Google Gemini to synthesize raw activity data
- 🧠 **Intent Classification** – Automatically detects whether you want JIRA tickets, commits, PRs, or full summary
- 🎯 **JIRA Integration** – Fetches a user's active and completed JIRA issues with priority levels
- 💻 **GitHub Integration** – Fetches active PRs and recent commits across repositories
- 💬 **Simple Chat UI** – Clean, web-based chat interface with clickable links
- 👥 **User Mapping** – Handles different usernames across services
- ⚡ **Smart Caching** – 5-minute cache reduces API calls and improves response time
- 🕐 **Relative Dates** – Shows "2 days ago" instead of raw timestamps
- 🔗 **Clickable Links** – JIRA tickets and GitHub items are directly clickable
- ⚠️ **Better Error Handling** – Specific error messages for different failure scenarios

## Project Structure
```
project/
├── src/
│   ├── jira-client.js         # JIRA API integration
│   ├── github-client.js       # GitHub API integration
│   ├── query-parser.js        # Extract user names from queries
│   ├── response-generator.js  # Format responses
│   └── main.js                # Main application logic
├── public/
│   ├── index.html             # Simple web interface
│   └── script.js              # Frontend logic
├── config/
│   └── config.js              # API keys and configuration
├── .env                       # Environment variables (not committed)
├── package.json               # Dependencies and scripts
└── README.md                  # Setup and usage instructions
```

## Prerequisites
- **Node.js v18+** installed
- A **Google Gemini API key** ([Get one here](https://aistudio.google.com/api-keys/))
- A **JIRA account** with API access
- A **GitHub Personal Access Token** or GitHub App credentials

## Setup & Installation

### 1. Clone the Repository
```bash
git clone https://your-repo-url/ai-team-monitor.git
cd ai-team-monitor
```

### 2. Install Dependencies
```bash
npm install
```

This will install:
- `express` - Web server framework
- `dotenv` - Environment variable management
- `@google/genai` - Google Gemini AI SDK
- `octokit` - GitHub API client
- `nodemon` - Development auto-reload

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini AI
GOOGLE_API_KEY=your_gemini_api_key_here

# JIRA Configuration
JIRA_HOST=https://your-domain.atlassian.net
JIRA_USER_EMAIL=your-email@example.com
JIRA_API_TOKEN=your_jira_api_token_here

# GitHub Configuration (Option 1: Personal Access Token)
GITHUB_TOKEN=your_github_personal_access_token_here

# GitHub Configuration (Option 2: GitHub App)
# GITHUB_APP_ID=your_app_id
# GITHUB_PRIVATE_KEY_PATH=./private-key.pem
# GITHUB_INSTALLATION_ID=your_installation_id
```

#### How to get API credentials:

**Google Gemini API Key:**
1. Visit [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key"
3. Copy your API key

**JIRA API Token:**
1. Go to [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Copy the token

**GitHub Personal Access Token:**
1. Go to GitHub Settings → Developer Settings → Personal Access Tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:user`
4. Copy the token

### 4. Configure User Mapping

Edit `src/query-parser.js` to add your team members:

```javascript
export const userMapping = {
  // User's name in lowercase
  "praveenk pandey": {
    jiraId: "Praveenk Pandey",      // JIRA Display Name
    githubId: "PraveenPandey987"    // GitHub Username
  },

  // GitHub username
  "praveenpandey987": {
    jiraId: "Praveenk Pandey",
    githubId: "PraveenPandey987"
  },

  // Email address
  "pp7007144435@gmail.com": {
    jiraId: "pp7007144435@gmail.com", // JIRA Email
    githubId: "PraveenPandey987"
  },

  // Add more team members
  "mike": {
    jiraId: "Mike Ross",
    githubId: "mikeross88"
  },
  "sarah": {
    jiraId: "Sarah Connor",
    githubId: "sarah-connor"
  }
};
```

## Usage

### Start the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

The server will start on **http://localhost:3000**

### Open the Chat Interface

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### Ask Questions

The chatbot now supports **intelligent intent classification**, meaning it understands what type of information you want:

**Full Summary (all data):**
- "What is Praveenk Pandey working on?"
- "Show me recent activity for Mike"
- "What has Sarah been up to?"

**JIRA Tickets Only:**
- "What JIRA tickets is John working on?"
- "Show me Sarah's current issues"
- "What tasks is Mike assigned to?"

**GitHub Commits Only:**
- "What has Mike committed this week?"
- "Show me Lisa's recent commits"
- "What code changes did John make?"

**Pull Requests Only:**
- "Show me Lisa's recent pull requests"
- "What PRs is Sarah reviewing?"
- "Display John's active pull requests"

**How it works:**
1. AI classifies your question to determine intent
2. Fetches **only the relevant data** (JIRA, Commits, PRs, or all)
3. Returns cached response if asked within 5 minutes
4. Generates a human-readable summary with clickable links

## API Endpoints

The server also provides REST API endpoints:

### GitHub Endpoints
- `GET /commits?user=Mike&owner=XYZ&repo=ABC` - Get recent commits
- `GET /prs?user=Lisa&owner=XYZ&repo=ABC` - Get active pull requests
- `GET /repos?user=Mike` - Get repos user contributed to
- `GET /search/commits?user=Mike` - Search recent commits across all repos
- `GET /search/prs?user=Lisa` - Search active PRs across all repos

### JIRA Endpoints
- `GET /search/jira?user=John%20Doe` - Get active JIRA issues
- `GET /search/jira/all?user=Sarah` - Get all JIRA issues (active + completed)

### AI Endpoint
- `POST /ask` - Ask a natural language question
  ```json
  {
    "question": "What is Mike working on?"
  }
  ```

## Troubleshooting

### Common Issues

**"Missing required query param: user"**
- Make sure the user is added to the `userMapping` in `src/query-parser.js`

**"JIRA API request failed with status 401"**
- Check your JIRA credentials in `.env`
- Verify your JIRA API token is valid

**"GitHub API rate limit exceeded"**
- Use a GitHub Personal Access Token instead of unauthenticated requests
- Or configure a GitHub App for higher rate limits

**"I couldn't find a known user in your query"**
- Add the user to `src/query-parser.js`
- Make sure the name matches what you're typing in the chat

## Development

### File Descriptions

- **src/main.js** - Express server and API routes
- **src/jira-client.js** - JIRA API integration functions
- **src/github-client.js** - GitHub API integration functions
- **src/query-parser.js** - User mapping and query parsing
- **src/response-generator.js** - AI response generation with Gemini
- **config/config.js** - Centralized configuration (reads from .env)
- **public/index.html** - Chat interface HTML
- **public/script.js** - Frontend JavaScript

### Adding New Features

To add a new data source:
1. Create a new client file in `src/` (e.g., `src/slack-client.js`)
2. Add API credentials to `.env` and `config/config.js`
3. Import and use in `src/response-generator.js`
4. Update the AI prompt to include the new data

## Advanced Features

### 🧠 Intent Classification
The application uses AI to understand your question and fetch only relevant data:
- **JIRA** - Questions about tickets, issues, tasks
- **COMMITS** - Questions about code commits, changes
- **PRS** - Questions about pull requests, reviews
- **FULL_SUMMARY** - General questions about what someone is working on

This reduces unnecessary API calls and provides faster, more focused responses.

### ⚡ Smart Caching
- Responses are cached for **5 minutes**
- Same question within 5 minutes returns instant cached response
- Reduces API rate limit usage
- Cache is stored in-memory (resets on server restart)

### 🕐 Human-Friendly Dates
All timestamps are converted to relative time:
- "2 days ago" instead of "2025-01-14T10:30:00Z"
- "3 hours ago" instead of raw ISO timestamps
- Makes responses more readable and intuitive

### 🔗 Clickable Links
- **JIRA tickets** - Click to open in your JIRA instance
- **GitHub commits** - Click to view commit details
- **Pull requests** - Click to view PR on GitHub
- All links open in new tabs for convenience

### 📊 JIRA Priority Levels
JIRA issues now include priority information:
- High, Medium, Low, or Not set
- Helps prioritize work and understand urgency
- Displayed prominently in the AI response

### ⚠️ Comprehensive Error Handling
Specific error messages for different scenarios:
- **401/403** - Authentication issues with API credentials
- **404** - Repository or user not found
- **Rate Limit** - API rate limit exceeded
- **General errors** - Detailed error information for debugging

## Security Notes

- ⚠️ **Never commit `.env`** - It contains sensitive API keys
- ⚠️ The `.env` file is already in `.gitignore`
- ⚠️ Keep your GitHub tokens and JIRA API tokens secure
- ⚠️ Use environment variables for all secrets

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with:**
- [Express.js](https://expressjs.com/) - Web framework
- [Google Gemini AI](https://ai.google.dev/) - AI language model
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API client
- [JIRA REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/) - JIRA integration
