## 2. Architecture & Design Decisions

### 2.1 Deployment Model: Separate Instance Per Domain

**Decision**: Each domain runs as a separate GitHub repository instance, NOT multiple profiles in one deployment.

**Example Repositories**:
```
github.com/my-org/energy-drinks-monitor
github.com/my-org/hydration-monitor
github.com/my-org/saas-competitors-monitor
github.com/my-org/automobile-monitor
```

**Why This Approach**:
1. **Simplicity**: No multi-tenancy complexity in database or code
2. **Isolation**: One profile's issues don't affect others
3. **GitHub-Native**: Leverage GitHub's repo isolation and access control
4. **Independent Scaling**: Each domain can scale independently
5. **Customization**: Teams can fork and modify without affecting others
6. **Clean Schema**: No `profile_id` columns everywhere

**How It Works**:
- Template repository: `generic-web-monitor-template`
- User creates new repo from template via `gh repo create --template`
- Copy example profile JSON, customize for their domain
- Push changes → GitHub Actions workflows run automatically
- Each instance has its own PostgreSQL database, GitHub Pages site, email configuration

### 2.2 Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend Processing | GitHub Actions (Node.js 20) | Scraping, analysis, data sync |
| Database | PostgreSQL (Supabase/Neon) | Data storage |
| Frontend | GitHub Pages (Static HTML/JS) | Dashboard hosting |
| AI Analysis | Anthropic Claude Sonnet 3.5 | Content analysis, scoring |
| AI Baseline | Groq Llama 3.3 70B | Fast baseline analysis |
| Email | SMTP (SendGrid/Postmark) | Notification delivery |
| 3D Visualization | Three.js + 3d-force-graph | Interactive graphs |
| Market Data | US Census Bureau APIs | NAICS statistics (FREE) |

### 2.3 Repository Structure

```
generic-web-monitor-template/
├── profiles/
│   ├── active-profile.json          ← USER EDITS THIS FILE
│   ├── schemas/
│   │   └── profile-schema.json      ← Validation schema
│   ├── templates/
│   │   ├── generic-analysis.txt     ← Default AI prompt
│   │   └── examples/                ← Domain-specific prompts
│   └── examples/
│       ├── energy-drinks.json
│       ├── hydration-drinks.json
│       ├── saas-companies.json
│       └── automobiles.json
│
├── .github/workflows/
│   ├── scrape-postgres.yml          ← Scrape competitor URLs
│   ├── analyze-postgres.yml         ← AI analysis of changes
│   ├── sync-deploy-postgres.yml     ← Deploy to GitHub Pages
│   ├── daily-digest-postgres.yml    ← Send email digest
│   └── naics-data-sync.yml          ← Monthly market data sync
│
├── lib/
│   ├── profile-loader.js            ← Load and validate profile
│   ├── universal-analyzer.js        ← Domain-agnostic AI analysis
│   ├── audience-analyzer.js         ← Detect audience targeting
│   ├── kwic-extractor.js            ← Keyword in context
│   ├── mentions-tracker.js          ← Competitor mentions
│   ├── naics-api.js                 ← Census Bureau integration
│   └── importance-scorer.js         ← Score using profile bands
│
├── dashboard/
│   ├── index.html                   ← Main 6-tab dashboard
│   ├── 3d-force-graph.html          ← Graph visualization
│   ├── setup-wizard.html            ← NEW: Initial config UI
│   ├── profile-editor.html          ← NEW: Edit config UI
│   └── assets/
│       ├── dashboard.js
│       ├── graph.js
│       └── styles.css
│
├── database/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_add_audiences.sql
│       └── 003_add_naics.sql
│
├── email-templates/
│   ├── daily-digest.html            ← Beautiful HTML template
│   └── weekly-summary.html
│
└── docs/
    ├── SETUP.md
    ├── PROFILE-GUIDE.md
    └── DEPLOYMENT.md
```

---

