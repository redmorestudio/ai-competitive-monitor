## 9. NAICS Market Sizing Integration

### 9.1 Overview

Integrate **free** US Census Bureau data to provide market context and sizing information. This is NEW functionality not in the original system.

### 9.2 NAICS Background

**What is NAICS**: North American Industry Classification System - 6-digit codes for industries

**Example Codes**:
- 312111 - Soft Drink Manufacturing
- 312112 - Bottled Water Manufacturing
- 311930 - Flavoring Syrup and Concentrate Manufacturing
- 511210 - Software Publishers
- 518210 - Data Processing, Hosting, and Related Services

**Why Use NAICS**:
- Standard classification used by US government
- Free data available from Census Bureau
- Updated regularly
- Comprehensive coverage of all industries

### 9.3 Data Sources (All Free)

**County Business Patterns (CBP)**:
- Annual data on establishments, employment, payroll by industry
- Published ~18 months after year-end
- Available at national, state, county, metro levels
- URL: `https://api.census.gov/data/{year}/cbp`

**Economic Census**:
- Every 5 years (years ending in 2 and 7)
- Detailed industry statistics including revenue, expenses
- Most recent: 2022 (data available 2024)
- URL: `https://api.census.gov/data/{year}/ecnbasic`

**BLS QCEW** (Quarterly Census of Employment and Wages):
- Quarterly data, more recent than CBP
- Employment and wage data by industry
- URL: BLS API (not Census, but also free)

### 9.4 Data Integration

**Profile Configuration**:
- primary: "312112" (6-digit NAICS code)
- secondary: ["311930", "454110"]
- trackCompetitorCount: true
- trackMarketSize: true
- trackGrowthRate: true

**Automatic Data Sync**:
- Monthly GitHub Actions workflow
- Fetches latest data from Census Bureau API for profile's NAICS codes
- Stores in PostgreSQL naics_data table
- No manual updates needed

**Data Retrieved**:
- Establishments count (number of businesses in this industry)
- Employment count (total employees across all establishments)
- Annual payroll (total compensation)
- Data year (which year this data represents)

**Calculations**:
- **Market Coverage**: "Monitoring 8 of ~1,234 establishments (0.6%)"
- **Year-over-Year Growth**: Compare current year to previous year employment/establishments
- **Competitive Density**: Establishments per capita in US

### 9.5 Dashboard Display

**Market Size Widget** (Dashboard Tab 1):
```
┌─────────────────────────────────────────────────┐
│ Market Size (NAICS 312112)                      │
├─────────────────────────────────────────────────┤
│ Total Establishments:        1,234              │
│ Total Employment:            45,678             │
│ Annual Payroll:              $2.1B              │
│ Monitoring Coverage:         8 / 1,234 (0.6%)  │
│ YoY Employment Growth:       +3.2%              │
│ Data Year:                   2023               │
└─────────────────────────────────────────────────┘
```

**Competitive Context**:
- Show how many total competitors exist (establishments)
- Show what percentage we're monitoring
- Highlight if we're missing major players

**Email Inclusion**:
- Footer of daily digest: "Market Size (NAICS 312112): 1,234 establishments, 45,678 employees"
- Weekly summary: Expanded market stats with growth trends

**Trend Tracking**:
- Store historical NAICS data
- Chart growth over time
- Compare competitor activity to market growth

### 9.6 NAICS Browser (Setup Wizard Feature)

**Purpose**: Help users find correct NAICS code for their domain

**Features**:
- Keyword search (e.g., "hydration" returns relevant codes)
- Hierarchical browse (drill down from 2-digit to 6-digit)
- Preview market size data before selection
- "Similar industries" suggestions
- Save primary + multiple secondary codes

---

