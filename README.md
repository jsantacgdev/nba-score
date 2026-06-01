# NBA Scores

This is a personal project I built to mess around with modern mobile development, data engineering, and clean architecture. It's a React Native app that tracks NBA games, player stats, and team standings in near real-time, backed by a Python ETL and Supabase.

## Tech Stack & Badges

- **Frontend:** React Native (Expo SDK 54), Expo Router, TanStack Query, Reanimated, TypeScript
- **Backend & DB:** Supabase (Postgres), Row Level Security, SQL Functions & Views
- **Data Ingestion:** Python 3.11+, `nba_api`

---

## Core Features

- **Games Dashboard:** Includes a horizontal date picker to check any day of the season. Shows live scores, final results, and upcoming matchups.
- **Game Details:** Full box scores for both teams and an automatic MVP calculation using Hollinger's Game Score formula.
- **Teams & Rosters:** All 30 teams broken down by conference, with full roster lists for each.
- **Player Profiles:** Season averages, complete game logs, and profile pictures. Positions are mapped and translated to Spanish.
- **Head-to-Head Comparison:** Side-by-side player stats comparison with visual bars to easily spot who's leading in which category.
- **Standings:** Live conference tables featuring automatic playoff and play-in cut-off lines.
- **Favorites & Search:** Local favorites storage (via AsyncStorage) and a debounced global search to find teams or players instantly by name, city, or abbreviation.
- **UX Details:** Pull-to-refresh on all lists, proper loading/error states, haptic feedback, and a few subtle animations (like a custom basketball loading spinner and a pulsing live badge).

---

## Architecture & Data Flow

```text
nba-scores/
├── apps/
│   └── mobile/          # React Native + Expo app
├── services/
│   └── ingestion/       # Python ETL syncing stats.nba.com -> Supabase
└── supabase/            # Database migrations
```

The data flow is pretty strict about separation of concerns:

1. The mobile frontend **never** hits the official NBA API directly. It only talks to Supabase via `lib/api/` hooks.
2. The Python ETL is the **only** piece that connects to the external `nba_api` library.
3. This setup makes it incredibly easy to swap out the backend or database later without breaking a single UI component.

---

## Why I Built It This Way (Design Decisions)

- **Game-centric Box Scores:** My first approach was iterating through all ~500 active players to update stats, but making 500 individual API requests took nearly 15 minutes. Swapping the logic to fetch data game-by-game instead cut the daily sync down to less than a minute.
- **Live Standings via SQL Views:** Instead of setting up a heavy cron job to recalculate team records and dump them into a table, I offloaded this to a Postgres view. Standings are calculated on the fly whenever the app asks for them, ensuring they are always accurate.
- **Deterministic MVP Card:** I initially thought about using an LLM API to generate fancy post-game summaries, but it quickly felt like overkill (and unnecessary cost) for a side project. Sticking to Hollinger’s Game Score formula gives a reliable, zero-cost performance rating that works perfectly on the UI.
- **Local-only Favorites:** Kept things simple by storing favorited teams in AsyncStorage. No auth required, zero backend overhead, and instant response times for the user.

---

## Local Setup

### Prerequisites

- Node.js (v20+)
- Python (3.11+)
- A free Supabase account
- Expo Go installed on your phone

### 1. Clone & DB Setup

```bash
git clone https://github.com/jsantacgdev/nba-scores
cd nba-scores

# Link and push schema to Supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push

# Generate types
npx supabase gen types typescript --linked > apps/mobile/src/types/database.ts
```

### 2. Mobile Frontend

```bash
cd apps/mobile
npm install
```

Create a `.env` file in `apps/mobile/`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Run the app:

```bash
npx expo start
```

Scan the QR code with Expo Go.

### 3. Python ETL Setup

```bash
cd ../../services/ingestion
python -m venv .venv

# Activate environment
source .venv/bin/activate  # macOS/Linux
# Or .venv\Scripts\Activate.ps1 on Windows

pip install -r requirements.txt
```

Create a `.env` file in `services/ingestion/`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_secret_service_role_key
LOG_LEVEL=INFO
```

### 4. Initial Seed & Maintenance

If running this for the first time, you need to populate the database in this exact order:

```bash
python -m src.jobs.sync_teams
python -m src.jobs.sync_players
python -m src.jobs.sync_games
python -m src.jobs.sync_upcoming_games
python -m src.jobs.sync_box_scores
python -m src.jobs.sync_season_stats
```

_Note: All scripts use `upsert` under the hood, so they are completely safe to rerun without duplicating data._

For **daily updates**, you only need to run these three:

```bash
python -m src.jobs.sync_upcoming_games
python -m src.jobs.sync_box_scores
python -m src.jobs.sync_season_stats
```

---

## Data Model Reference

- `teams`: Core team info, conference, division, and ESPN CDN logo URLs.
- `players`: Active roster data linked to team IDs, plus NBA CDN headshot endpoints.
- `games`: Schedule, status (live/final/upcoming), and scores.
- `player_game_log`: Individual box score lines for every single game.
- `player_season_stats`: Cached season averages.
- `game_mvp`: Calculated top performer metrics per game.
- `league_standings` (SQL View): Real-time standings generated directly from the `games` table.

Player and team searches use custom `search_players` and `search_teams` SQL functions for fast, case-insensitive partial matching.

---

## Disclaimer & License

This is an educational, non-commercial side project. All player names, team logos, and official stats belong to the NBA and its respective entities. This repository is not affiliated with or endorsed by the National Basketball Association.

Feel free to look through the code or use it as a reference for your own projects.
