export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      draft_picks: {
        Row: {
          draft_year: number
          organization: string | null
          overall_pick: number | null
          player_id: string
          player_name: string
          round: number | null
          round_pick: number | null
          team_abbreviation: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          draft_year: number
          organization?: string | null
          overall_pick?: number | null
          player_id: string
          player_name: string
          round?: number | null
          round_pick?: number | null
          team_abbreviation?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          draft_year?: number
          organization?: string | null
          overall_pick?: number | null
          player_id?: string
          player_name?: string
          round?: number | null
          round_pick?: number | null
          team_abbreviation?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      game_mvp: {
        Row: {
          calculated_at: string | null
          game_id: string
          game_score: number | null
          player_id: string | null
          reasoning: string | null
        }
        Insert: {
          calculated_at?: string | null
          game_id: string
          game_score?: number | null
          player_id?: string | null
          reasoning?: string | null
        }
        Update: {
          calculated_at?: string | null
          game_id?: string
          game_score?: number | null
          player_id?: string | null
          reasoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_mvp_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: true
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_mvp_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_starters: {
        Row: {
          game_id: string
          player_id: string
          position: string | null
          spot: number
          team_id: string
          updated_at: string | null
        }
        Insert: {
          game_id: string
          player_id: string
          position?: string | null
          spot: number
          team_id: string
          updated_at?: string | null
        }
        Update: {
          game_id?: string
          player_id?: string
          position?: string | null
          spot?: number
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_starters_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_starters_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_starters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "game_starters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          away_team_id: string
          created_at: string | null
          home_team_id: string
          id: string
          period: number | null
          score_away: number | null
          score_home: number | null
          season: string
          season_type: string
          starts_at: string
          status: string
          time_remaining: string | null
          updated_at: string | null
        }
        Insert: {
          away_team_id: string
          created_at?: string | null
          home_team_id: string
          id: string
          period?: number | null
          score_away?: number | null
          score_home?: number | null
          season: string
          season_type?: string
          starts_at: string
          status: string
          time_remaining?: string | null
          updated_at?: string | null
        }
        Update: {
          away_team_id?: string
          created_at?: string | null
          home_team_id?: string
          id?: string
          period?: number | null
          score_away?: number | null
          score_home?: number | null
          season?: string
          season_type?: string
          starts_at?: string
          status?: string
          time_remaining?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "games_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "games_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_awards: {
        Row: {
          award: string
          player_id: string
          season: string
          team_name: string | null
          updated_at: string | null
        }
        Insert: {
          award: string
          player_id: string
          season: string
          team_name?: string | null
          updated_at?: string | null
        }
        Update: {
          award?: string
          player_id?: string
          season?: string
          team_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_awards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_game_log: {
        Row: {
          assists: number | null
          blocks: number | null
          fg_attempted: number | null
          fg_made: number | null
          fg3_attempted: number | null
          fg3_made: number | null
          ft_attempted: number | null
          ft_made: number | null
          game_date: string | null
          game_id: string
          is_home: boolean | null
          matchup: string | null
          minutes: number | null
          opponent_abbreviation: string | null
          player_id: string
          plus_minus: number | null
          points: number | null
          rebounds: number | null
          season: string | null
          steals: number | null
          turnovers: number | null
          updated_at: string | null
          win_loss: string | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fg3_attempted?: number | null
          fg3_made?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_date?: string | null
          game_id: string
          is_home?: boolean | null
          matchup?: string | null
          minutes?: number | null
          opponent_abbreviation?: string | null
          player_id: string
          plus_minus?: number | null
          points?: number | null
          rebounds?: number | null
          season?: string | null
          steals?: number | null
          turnovers?: number | null
          updated_at?: string | null
          win_loss?: string | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fg3_attempted?: number | null
          fg3_made?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_date?: string | null
          game_id?: string
          is_home?: boolean | null
          matchup?: string | null
          minutes?: number | null
          opponent_abbreviation?: string | null
          player_id?: string
          plus_minus?: number | null
          points?: number | null
          rebounds?: number | null
          season?: string | null
          steals?: number | null
          turnovers?: number | null
          updated_at?: string | null
          win_loss?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_game_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_game_stats: {
        Row: {
          assists: number | null
          blocks: number | null
          fg_attempted: number | null
          fg_made: number | null
          fg3_attempted: number | null
          fg3_made: number | null
          fouls: number | null
          ft_attempted: number | null
          ft_made: number | null
          game_id: string
          minutes: number | null
          player_id: string
          plus_minus: number | null
          points: number | null
          rebounds_defensive: number | null
          rebounds_offensive: number | null
          rebounds_total: number | null
          steals: number | null
          team_id: string | null
          turnovers: number | null
          updated_at: string | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fg3_attempted?: number | null
          fg3_made?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_id: string
          minutes?: number | null
          player_id: string
          plus_minus?: number | null
          points?: number | null
          rebounds_defensive?: number | null
          rebounds_offensive?: number | null
          rebounds_total?: number | null
          steals?: number | null
          team_id?: string | null
          turnovers?: number | null
          updated_at?: string | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          fg_attempted?: number | null
          fg_made?: number | null
          fg3_attempted?: number | null
          fg3_made?: number | null
          fouls?: number | null
          ft_attempted?: number | null
          ft_made?: number | null
          game_id?: string
          minutes?: number | null
          player_id?: string
          plus_minus?: number | null
          points?: number | null
          rebounds_defensive?: number | null
          rebounds_offensive?: number | null
          rebounds_total?: number | null
          steals?: number | null
          team_id?: string | null
          turnovers?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_game_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_game_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_injuries: {
        Row: {
          espn_athlete_id: string | null
          first_seen_at: string | null
          id: string
          injury_type: string | null
          is_current: boolean
          last_seen_at: string | null
          long_comment: string | null
          player_id: string | null
          player_name: string
          reported_at: string | null
          return_date: string | null
          short_comment: string | null
          side: string | null
          status: string | null
          team_id: string | null
        }
        Insert: {
          espn_athlete_id?: string | null
          first_seen_at?: string | null
          id: string
          injury_type?: string | null
          is_current?: boolean
          last_seen_at?: string | null
          long_comment?: string | null
          player_id?: string | null
          player_name: string
          reported_at?: string | null
          return_date?: string | null
          short_comment?: string | null
          side?: string | null
          status?: string | null
          team_id?: string | null
        }
        Update: {
          espn_athlete_id?: string | null
          first_seen_at?: string | null
          id?: string
          injury_type?: string | null
          is_current?: boolean
          last_seen_at?: string | null
          long_comment?: string | null
          player_id?: string | null
          player_name?: string
          reported_at?: string | null
          return_date?: string | null
          short_comment?: string | null
          side?: string | null
          status?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_injuries_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_injuries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_injuries_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_history: {
        Row: {
          assists: number | null
          blocks: number | null
          field_goal_pct: number | null
          free_throw_pct: number | null
          games_played: number | null
          minutes: number | null
          player_id: string
          points: number | null
          primary_team_id: string | null
          rebounds: number | null
          season: string
          steals: number | null
          team_count: number | null
          three_point_pct: number | null
          turnovers: number | null
          updated_at: string | null
          won_championship: boolean | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          field_goal_pct?: number | null
          free_throw_pct?: number | null
          games_played?: number | null
          minutes?: number | null
          player_id: string
          points?: number | null
          primary_team_id?: string | null
          rebounds?: number | null
          season: string
          steals?: number | null
          team_count?: number | null
          three_point_pct?: number | null
          turnovers?: number | null
          updated_at?: string | null
          won_championship?: boolean | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          field_goal_pct?: number | null
          free_throw_pct?: number | null
          games_played?: number | null
          minutes?: number | null
          player_id?: string
          points?: number | null
          primary_team_id?: string | null
          rebounds?: number | null
          season?: string
          steals?: number | null
          team_count?: number | null
          three_point_pct?: number | null
          turnovers?: number | null
          updated_at?: string | null
          won_championship?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "player_season_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_history_primary_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_season_history_primary_team_id_fkey"
            columns: ["primary_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_stats: {
        Row: {
          assists: number | null
          blocks: number | null
          field_goal_pct: number | null
          free_throw_pct: number | null
          games_played: number | null
          minutes: number | null
          player_id: string
          points: number | null
          rebounds: number | null
          season: string
          steals: number | null
          three_point_pct: number | null
          updated_at: string | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          field_goal_pct?: number | null
          free_throw_pct?: number | null
          games_played?: number | null
          minutes?: number | null
          player_id: string
          points?: number | null
          rebounds?: number | null
          season: string
          steals?: number | null
          three_point_pct?: number | null
          updated_at?: string | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          field_goal_pct?: number | null
          free_throw_pct?: number | null
          games_played?: number | null
          minutes?: number | null
          player_id?: string
          points?: number | null
          rebounds?: number | null
          season?: string
          steals?: number | null
          three_point_pct?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_season_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_teams: {
        Row: {
          assists: number | null
          blocks: number | null
          field_goal_pct: number | null
          free_throw_pct: number | null
          games_played: number | null
          jersey_number: string | null
          minutes: number | null
          player_id: string
          points: number | null
          position: string | null
          rebounds: number | null
          season: string
          steals: number | null
          team_id: string
          three_point_pct: number | null
          turnovers: number | null
          updated_at: string | null
        }
        Insert: {
          assists?: number | null
          blocks?: number | null
          field_goal_pct?: number | null
          free_throw_pct?: number | null
          games_played?: number | null
          jersey_number?: string | null
          minutes?: number | null
          player_id: string
          points?: number | null
          position?: string | null
          rebounds?: number | null
          season: string
          steals?: number | null
          team_id: string
          three_point_pct?: number | null
          turnovers?: number | null
          updated_at?: string | null
        }
        Update: {
          assists?: number | null
          blocks?: number | null
          field_goal_pct?: number | null
          free_throw_pct?: number | null
          games_played?: number | null
          jersey_number?: string | null
          minutes?: number | null
          player_id?: string
          points?: number | null
          position?: string | null
          rebounds?: number | null
          season?: string
          steals?: number | null
          team_id?: string
          three_point_pct?: number | null
          turnovers?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_season_teams_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_season_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "player_season_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_transactions: {
        Row: {
          deal_id: string | null
          description: string
          from_team_id: string | null
          id: string
          player_id: string | null
          player_slug: string | null
          team_id: string | null
          team_slug: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          deal_id?: string | null
          description: string
          from_team_id?: string | null
          id: string
          player_id?: string | null
          player_slug?: string | null
          team_id?: string | null
          team_slug?: string | null
          transaction_date: string
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          deal_id?: string | null
          description?: string
          from_team_id?: string | null
          id?: string
          player_id?: string | null
          player_slug?: string | null
          team_id?: string | null
          team_slug?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string | null
          first_name: string
          id: string
          is_active: boolean | null
          jersey_number: string | null
          last_name: string
          photo_url: string | null
          position: string | null
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          first_name: string
          id: string
          is_active?: boolean | null
          jersey_number?: string | null
          last_name: string
          photo_url?: string | null
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string
          id?: string
          is_active?: boolean | null
          jersey_number?: string | null
          last_name?: string
          photo_url?: string | null
          position?: string | null
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      season_champions: {
        Row: {
          competition: string
          decided_at: string | null
          season: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          competition?: string
          decided_at?: string | null
          season: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
          competition?: string
          decided_at?: string | null
          season?: string
          team_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_champions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "league_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "season_champions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          abbreviation: string
          city: string
          conference: string
          created_at: string | null
          division: string | null
          full_name: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          abbreviation: string
          city: string
          conference: string
          created_at?: string | null
          division?: string | null
          full_name: string
          id: string
          logo_url?: string | null
          name: string
        }
        Update: {
          abbreviation?: string
          city?: string
          conference?: string
          created_at?: string | null
          division?: string | null
          full_name?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      league_standings: {
        Row: {
          abbreviation: string | null
          city: string | null
          conference: string | null
          division: string | null
          full_name: string | null
          games_played: number | null
          logo_url: string | null
          losses: number | null
          name: string | null
          point_differential: number | null
          season: string | null
          team_id: string | null
          total_points_against: number | null
          total_points_for: number | null
          win_percentage: number | null
          wins: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_game_log_dates: {
        Args: never
        Returns: {
          fechas_rellenadas: number
          temporadas_rellenadas: number
        }[]
      }
      deal_detail: {
        Args: { target_deal_id: string }
        Returns: {
          description: string
          from_abbreviation: string
          from_logo_url: string
          from_name: string
          from_team_id: string
          id: string
          is_draft_pick: boolean
          photo_url: string
          player_id: string
          player_name: string
          to_abbreviation: string
          to_logo_url: string
          to_name: string
          to_team_id: string
          transaction_date: string
        }[]
      }
      draft_class: {
        Args: { target_year: number }
        Returns: {
          has_profile: boolean
          organization: string
          overall_pick: number
          photo_url: string
          player_id: string
          player_name: string
          round: number
          round_pick: number
          roy_season: string
          team_abbreviation: string
          team_id: string
          team_logo_url: string
        }[]
      }
      draft_years: {
        Args: never
        Returns: {
          draft_year: number
          picks: number
          rounds: number
          roy_photo_url: string
          roy_player_id: string
          roy_player_name: string
          roy_season: string
          roy2_photo_url: string
          roy2_player_id: string
          roy2_player_name: string
          roy2_season: string
        }[]
      }
      game_starting_lineups: {
        Args: { target_game_id: string }
        Returns: {
          assists: number
          court_position: string
          jersey_number: string
          minutes: number
          photo_url: string
          player_id: string
          player_name: string
          points: number
          rebounds: number
          spot: number
          team_abbreviation: string
          team_id: string
          team_logo_url: string
        }[]
      }
      player_career: {
        Args: { target_player_id: string }
        Returns: {
          assists: number
          blocks: number
          field_goal_pct: number
          free_throw_pct: number
          games_played: number
          minutes: number
          points: number
          rebounds: number
          season: string
          steals: number
          team_abbreviation: string
          team_count: number
          team_id: string
          team_logo_url: string
          team_name: string
          three_point_pct: number
          turnovers: number
          won_championship: boolean
        }[]
      }
      player_career_totals: {
        Args: { target_player_id: string }
        Returns: {
          assists: number
          blocks: number
          championships: number
          field_goal_pct: number
          first_season: string
          free_throw_pct: number
          games_played: number
          last_season: string
          minutes: number
          player_id: string
          points: number
          rebounds: number
          seasons: number
          steals: number
          three_point_pct: number
          turnovers: number
        }[]
      }
      player_injury_history: {
        Args: { target_player_id: string }
        Returns: {
          first_seen_at: string
          id: string
          injury_type: string
          is_current: boolean
          last_seen_at: string
          long_comment: string
          reported_at: string
          return_date: string
          short_comment: string
          side: string
          status: string
          team_abbreviation: string
          team_id: string
          team_logo_url: string
        }[]
      }
      player_movements: {
        Args: { target_player_id: string }
        Returns: {
          deal_id: string
          description: string
          from_abbreviation: string
          from_logo_url: string
          from_team_id: string
          id: string
          to_abbreviation: string
          to_logo_url: string
          to_team_id: string
          transaction_date: string
          transaction_type: string
        }[]
      }
      player_palmares: {
        Args: { target_player_id: string }
        Returns: {
          award: string
          season: string
          team_name: string
        }[]
      }
      search_players: {
        Args: { max_results?: number; query: string }
        Returns: {
          first_name: string
          full_name: string
          id: string
          is_active: boolean
          last_name: string
          photo_url: string
          player_position: string
          team_abbreviation: string
          team_id: string
          team_logo_url: string
          team_name: string
        }[]
      }
      search_teams: {
        Args: { max_results?: number; query: string }
        Returns: {
          abbreviation: string
          city: string
          conference: string
          full_name: string
          id: string
          logo_url: string
          name: string
        }[]
      }
      season_leaders: {
        Args: {
          target_limit?: number
          target_season: string
          target_stat?: string
        }
        Returns: {
          assists: number
          blocks: number
          games_played: number
          minutes: number
          photo_url: string
          player_id: string
          player_name: string
          points: number
          puesto: number
          rebounds: number
          steals: number
          team_abbreviation: string
          team_id: string
          team_logo_url: string
        }[]
      }
      season_standings: {
        Args: { target_season: string }
        Returns: {
          abbreviation: string
          city: string
          conference: string
          division: string
          full_name: string
          games_played: number
          logo_url: string
          losses: number
          name: string
          point_differential: number
          team_id: string
          win_percentage: number
          wins: number
          won_championship: boolean
        }[]
      }
      standings_seasons: {
        Args: never
        Returns: {
          champion_abbreviation: string
          champion_logo_url: string
          champion_name: string
          champion_team_id: string
          games_count: number
          season: string
        }[]
      }
      team_games: {
        Args: { target_season: string; target_team_id: string }
        Returns: {
          away_abbreviation: string
          away_logo_url: string
          away_name: string
          away_team_id: string
          home_abbreviation: string
          home_logo_url: string
          home_name: string
          home_team_id: string
          id: string
          period: number
          playoff_round: number
          score_away: number
          score_home: number
          season_type: string
          series_wins_away: number
          series_wins_home: number
          starts_at: string
          status: string
          time_remaining: string
          title_decider: boolean
        }[]
      }
      team_movements: {
        Args: { target_team_id: string }
        Returns: {
          deal_id: string
          description: string
          direction: string
          id: string
          other_abbreviation: string
          other_logo_url: string
          other_team_id: string
          photo_url: string
          player_id: string
          player_name: string
          transaction_date: string
          transaction_type: string
        }[]
      }
      team_palmares: {
        Args: { target_team_id: string }
        Returns: {
          competition: string
          season: string
          year: number
        }[]
      }
      team_season_roster: {
        Args: { target_season: string; target_team_id: string }
        Returns: {
          assists: number
          blocks: number
          field_goal_pct: number
          first_name: string
          free_throw_pct: number
          games_played: number
          jersey_number: string
          last_name: string
          minutes: number
          photo_url: string
          player_id: string
          player_position: string
          points: number
          rebounds: number
          steals: number
          three_point_pct: number
          won_championship: boolean
        }[]
      }
      team_seasons: {
        Args: { target_team_id: string }
        Returns: {
          players: number
          season: string
          won_championship: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
