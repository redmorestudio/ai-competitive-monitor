## 11. Database Architecture

### 11.1 PostgreSQL Schema

**Key Design Principles**:
- Single instance per domain (no profile_id columns)
- Normalized structure
- JSON columns for flexible data (AI analysis, mentions)
- Indexes on frequently queried fields
- Timestamps on all tables

### 11.2 Core Tables

**companies**
- id (UUID, primary key)
- name (VARCHAR 255)
- category (VARCHAR 100)
- description (TEXT)
- keywords (TEXT[])
- color (VARCHAR 7)
- technologies (TEXT[])
- products (TEXT[])
- interest_level (INTEGER 1-10)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

**urls**
- id (UUID, primary key)
- company_id (UUID, foreign key)
- url (TEXT)
- url_type (VARCHAR 50)
- weight (DECIMAL 3,2)
- check_frequency (VARCHAR 20)
- css_selector (TEXT)
- enabled (BOOLEAN)
- created_at (TIMESTAMPTZ)

**scraped_pages**
- id (UUID, primary key)
- url_id (UUID, foreign key)
- content_hash (VARCHAR 64)
- content (TEXT)
- content_length (INTEGER)
- title (TEXT)
- meta_description (TEXT)
- scraped_at (TIMESTAMPTZ)
- http_status (INTEGER)

**change_detection**
- id (UUID, primary key)
- url_id (UUID, foreign key)
- company_id (UUID, foreign key)
- detected_at (TIMESTAMPTZ)
- previous_hash (VARCHAR 64)
- current_hash (VARCHAR 64)
- change_type (VARCHAR 50)
- magnitude_percent (INTEGER)
- importance_score (INTEGER 0-10)
- importance_band (VARCHAR 50)
- category (VARCHAR 50)
- matched_keywords (TEXT[])
- ai_summary (TEXT)
- ai_key_changes (JSONB)
- ai_insights (JSONB)
- ai_recommendations (JSONB)
- sentiment (VARCHAR 20)
- urgency (VARCHAR 20)
- processed (BOOLEAN)
- created_at (TIMESTAMPTZ)

**kwic_snippets**
- id (UUID, primary key)
- change_id (UUID, foreign key)
- keyword (VARCHAR 255)
- before_text (TEXT)
- after_text (TEXT)
- position (INTEGER)
- relevance_score (INTEGER 1-10)
- created_at (TIMESTAMPTZ)

**competitor_mentions**
- id (UUID, primary key)
- change_id (UUID, foreign key)
- mentioning_company_id (UUID, foreign key)
- mentioned_competitor (VARCHAR 255)
- mention_count (INTEGER)
- context_snippets (JSONB)
- mention_type (VARCHAR 50)
- sentiment (VARCHAR 20)
- detected_at (TIMESTAMPTZ)

**audience_detections**
- id (UUID, primary key)
- change_id (UUID, foreign key)
- audience_id (VARCHAR 50)
- audience_name (VARCHAR 255)
- confidence_score (DECIMAL 5,2)
- matched_keywords (TEXT[])
- matched_channels (TEXT[])
- reasoning (TEXT)
- detected_at (TIMESTAMPTZ)

**naics_data**
- code (VARCHAR 6, primary key)
- title (VARCHAR 255)
- establishments (INTEGER)
- employment (INTEGER)
- annual_payroll (BIGINT)
- data_year (INTEGER)
- synced_at (TIMESTAMPTZ)

**email_log**
- id (UUID, primary key)
- sent_at (TIMESTAMPTZ)
- email_type (VARCHAR 50)
- recipient_email (VARCHAR 255)
- changes_included (INTEGER)
- status (VARCHAR 20)
- error_message (TEXT)

### 11.3 Data Retention

**Scraped Content**: Keep 30 days of history per URL
**Changes**: Keep indefinitely (or configurable, e.g., 1 year)
**KWIC Snippets**: Keep with associated change
**Mentions**: Keep indefinitely
**Audience Detections**: Keep indefinitely
**Email Logs**: Keep 90 days

**Cleanup Job**: Monthly cron deletes old scraped_pages records

---

