## 1. Executive Summary

### 1.1 Vision

Transform the AI Competitor Monitor from an AI-industry-specific tool into a **domain-agnostic template repository** that can monitor ANY competitive landscape (energy drinks, hydration products, SaaS, automobiles, restaurants, etc.) while preserving ALL existing sophisticated features.

### 1.2 Key Principles

**Separate Instance Per Domain**: Each monitored industry runs as an isolated GitHub repository created from the template. No multi-profile complexity in a single deployment.

**Profile-Driven Everything**: All domain-specific configuration (competitors, importance bands, keywords, audiences, categories) lives in a single JSON file that drives the entire system.

**Preserve All Existing Features**: The current system has sophisticated visualization (3D force graph), analysis (KWIC, mentions, LLM), and reporting (beautiful email digests). Every feature must be preserved and made generic.

**Add Missing Capabilities**: Integrate NAICS market sizing, audience segmentation tracking, and human-editable configuration interfaces.

### 1.3 What Gets Transformed

| Current (AI-Specific) | Generic System |
|----------------------|----------------|
| Hardcoded list of 16 AI companies | Profile JSON with N competitors in ANY domain |
| AI-specific keywords ("model", "API", "GPT") | Domain-specific keywords defined per profile |
| AI-specific categories (LLM Provider, Dev Tools) | User-defined categories per profile |
| Fixed importance scoring | Customizable importance bands (0-10) per domain |
| AI technology tracking | Generic technology/feature tracking |
| No market sizing | NAICS-based market size data |
| No audience tracking | Audience segmentation detection |

### 1.4 Core Features Preserved

✅ **3D Force Graph** with 5 view modes, rich filtering, interactive controls
✅ **Email System** with daily digests, weekly summaries, beautiful HTML templates
✅ **KWIC Tracking** (Keyword in Context) with 100-150 char surrounding text
✅ **Competitor Mentions** with context extraction and sentiment analysis
✅ **Multi-Tab Dashboard** with 6 tabs and advanced filtering
✅ **Management Interface** for editing configuration
✅ **LLM Analysis** using Claude for relevance scoring, summaries, insights
✅ **Smart Categorization** with 8 change types and multi-signal detection
✅ **Pattern Detection** across multiple changes for trend identification
✅ **Change Magnitude** calculation (% of content changed)
✅ **Diff Engine** showing before/after comparisons

### 1.5 New Capabilities Added

✅ **NAICS Integration** - Free US Census Bureau data for market sizing
✅ **Audience Segmentation** - Track which customer segments competitors target
✅ **Setup Wizard** - Web UI for non-technical users to configure profiles
✅ **Profile Editor** - Human-editable interface for ongoing management
✅ **Profile Templates** - Pre-built configurations for common industries

---
