export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      billing_customers: {
        Row: {
          active: boolean | null
          customer_id: string | null
          email: string | null
          org_id: string
          provider: string | null
        }
        Insert: {
          active?: boolean | null
          customer_id?: string | null
          email?: string | null
          org_id: string
          provider?: string | null
        }
        Update: {
          active?: boolean | null
          customer_id?: string | null
          email?: string | null
          org_id?: string
          provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_customers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_prices: {
        Row: {
          active: boolean | null
          billing_product_id: string | null
          currency: string | null
          description: string | null
          id: string
          interval: string | null
          interval_count: number | null
          metadata: Json | null
          provider: string | null
          trial_period_days: number | null
          type: string | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          billing_product_id?: string | null
          currency?: string | null
          description?: string | null
          id: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          provider?: string | null
          trial_period_days?: number | null
          type?: string | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          billing_product_id?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          interval?: string | null
          interval_count?: number | null
          metadata?: Json | null
          provider?: string | null
          trial_period_days?: number | null
          type?: string | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_prices_billing_product_id_fkey"
            columns: ["billing_product_id"]
            isOneToOne: false
            referencedRelation: "billing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
          provider: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
          provider?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
          provider?: string | null
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          max_projects: number | null
          max_storage: number | null
          max_teams: number | null
          max_users: number | null
          metadata: Json | null
          org_id: string
          price_id: string | null
          provider: string | null
          quantity: number | null
          status: string | null
          trial_end: string | null
          trial_start: string | null
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          max_projects?: number | null
          max_storage?: number | null
          max_teams?: number | null
          max_users?: number | null
          metadata?: Json | null
          org_id: string
          price_id?: string | null
          provider?: string | null
          quantity?: number | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          max_projects?: number | null
          max_storage?: number | null
          max_teams?: number | null
          max_users?: number | null
          metadata?: Json | null
          org_id?: string
          price_id?: string | null
          provider?: string | null
          quantity?: number | null
          status?: string | null
          trial_end?: string | null
          trial_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "billing_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          invitation_type: string
          invited_by_user_id: string
          org_id: string
          org_member_role: string
          org_name: string | null
          team_member_roles: Json | null
          token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          invitation_type?: string
          invited_by_user_id?: string
          org_id: string
          org_member_role: string
          org_name?: string | null
          team_member_roles?: Json | null
          token?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          invitation_type?: string
          invited_by_user_id?: string
          org_id?: string
          org_member_role?: string
          org_name?: string | null
          team_member_roles?: Json | null
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_org_member_role_fkey"
            columns: ["org_member_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_member_roles: {
        Row: {
          id: string
          org_id: string
          org_member_id: string | null
          role_id: string | null
        }
        Insert: {
          id?: string
          org_id: string
          org_member_id?: string | null
          role_id?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          org_member_id?: string | null
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_member_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_roles_org_member_id_fkey"
            columns: ["org_member_id"]
            isOneToOne: false
            referencedRelation: "org_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          primary_owner_user_id: string | null
          slug: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          primary_owner_user_id?: string | null
          slug?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          primary_owner_user_id?: string | null
          slug?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          org_id: string
          post_status: string
          post_type: string
          slug: string | null
          team_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          org_id: string
          post_status?: string
          post_type?: string
          slug?: string | null
          team_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          org_id?: string
          post_status?: string
          post_type?: string
          slug?: string | null
          team_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          action: string
          id: string
          org_id: string
          resource: string
          role_id: string | null
          team_id: string | null
        }
        Insert: {
          action: string
          id?: string
          org_id: string
          resource: string
          role_id?: string | null
          team_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          org_id?: string
          resource?: string
          role_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          display_name: string | null
          id: string
          name: string
          org_id: string
          scope: string
          team_id: string | null
        }
        Insert: {
          description?: string | null
          display_name?: string | null
          id?: string
          name: string
          org_id: string
          scope: string
          team_id?: string | null
        }
        Update: {
          description?: string | null
          display_name?: string | null
          id?: string
          name?: string
          org_id?: string
          scope?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_roles: {
        Row: {
          id: string
          role_id: string | null
          team_id: string
          team_member_id: string | null
        }
        Insert: {
          id?: string
          role_id?: string | null
          team_id: string
          team_member_id?: string | null
        }
        Update: {
          id?: string
          role_id?: string | null
          team_id?: string
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_member_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_roles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_roles_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string | null
          id: string
          team_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          team_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          org_id: string
          primary_owner_user_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          org_id: string
          primary_owner_user_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          org_id?: string
          primary_owner_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: {
        Args: { lookup_invitation_token: string }
        Returns: string
      }
      create_org_invite: {
        Args: {
          input_org_id: string
          org_member_role_id: string
          invitee_email: string
          invitation_type: string
          team_member_roles: Json
        }
        Returns: string
      }
      create_organization: {
        Args: { name: string; type?: string }
        Returns: string
      }
      create_organization_and_add_current_user_as_owner: {
        Args: { name: string; type?: string }
        Returns: string
      }
      create_team_and_add_current_user_as_owner: {
        Args: { team_name: string; org_id: string }
        Returns: string
      }
      current_user_org_member_role: {
        Args: { lookup_org_id: string }
        Returns: Json
      }
      current_user_teams_member_role: {
        Args: { lookup_team_id: string }
        Returns: Json
      }
      get_org_member_count: {
        Args: { org_id: string }
        Returns: number
      }
      get_org_member_quota: {
        Args: { org_id: string }
        Returns: number
      }
      get_org_role_id: {
        Args: { role_name: string }
        Returns: string
      }
      get_organization_billing_status: {
        Args: { lookup_org_id: string }
        Returns: Json
      }
      get_organizations_for_current_user_by_role_name: {
        Args: { role_name: string }
        Returns: string[]
      }
      get_team_role_id: {
        Args: { role_name: string }
        Returns: string
      }
      get_teams_for_current_user_by_role_name: {
        Args: { role_name: string }
        Returns: string[]
      }
      has_org_permission: {
        Args: { _org_id: string; _resource: string; _action: string }
        Returns: boolean
      }
      has_team_permission: {
        Args: { _team_id: string; _resource: string; _action: string }
        Returns: boolean
      }
      increment_rank_order: {
        Args: { rank_val: string }
        Returns: string
      }
      is_valid_org_id: {
        Args: { input_text: string }
        Returns: boolean
      }
      is_valid_team_id: {
        Args: { input_text: string }
        Returns: boolean
      }
      is_valid_team_name: {
        Args: { input_text: string }
        Returns: boolean
      }
      lookup_active_invitations: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          org_name: string
          token: string
          invited_by: string
          is_active: boolean
        }[]
      }
      lookup_invitation: {
        Args: { lookup_invitation_token: string }
        Returns: Database["public"]["CompositeTypes"]["invitation_lookup_result"]
      }
      nanoid: {
        Args: { size?: number; alphabet?: string }
        Returns: string
      }
      slugify: {
        Args: { "": string }
        Returns: string
      }
      update_org_memberships_role: {
        Args: {
          org_id: string
          user_id: string
          new_org_member_role_ids: string[]
          make_primary_owner: boolean
        }
        Returns: undefined
      }
      update_team_memberships_role: {
        Args: {
          team_id: string
          user_id: string
          new_teams_member_role_ids: string[]
          make_primary_owner: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      invitation_lookup_result: {
        active: boolean | null
        name: string | null
        email: string | null
        inviter_email: string | null
        has_account: boolean | null
      }
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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

