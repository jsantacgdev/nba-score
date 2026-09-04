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
          decided_at: string | null
          season: string
          team_id: string | null
          updated_at: string | null
        }
        Insert: {
          decided_at?: string | null
          season: string
          team_id?: string | null
          updated_at?: string | null
        }
        Update: {
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
          games_count: number
          season: string
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
