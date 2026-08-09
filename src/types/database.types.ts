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
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_email_snapshot: string | null
          actor_name_snapshot: string | null
          actor_role_snapshot: Database["public"]["Enums"]["app_role"] | null
          category: string
          created_at: string
          details: Json
          id: string
          study_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_email_snapshot?: string | null
          actor_name_snapshot?: string | null
          actor_role_snapshot?: Database["public"]["Enums"]["app_role"] | null
          category: string
          created_at?: string
          details?: Json
          id?: string
          study_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_email_snapshot?: string | null
          actor_name_snapshot?: string | null
          actor_role_snapshot?: Database["public"]["Enums"]["app_role"] | null
          category?: string
          created_at?: string
          details?: Json
          id?: string
          study_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_testers: {
        Row: {
          account_configuration: Json
          assigned_by: string | null
          assignment_id: string
          created_at: string
          id: string
          platform_service_id: string | null
          slot: Database["public"]["Enums"]["tester_slot"]
          status: Database["public"]["Enums"]["assignment_tester_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_configuration?: Json
          assigned_by?: string | null
          assignment_id: string
          created_at?: string
          id?: string
          platform_service_id?: string | null
          slot: Database["public"]["Enums"]["tester_slot"]
          status?: Database["public"]["Enums"]["assignment_tester_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_configuration?: Json
          assigned_by?: string | null
          assignment_id?: string
          created_at?: string
          id?: string
          platform_service_id?: string | null
          slot?: Database["public"]["Enums"]["tester_slot"]
          status?: Database["public"]["Enums"]["assignment_tester_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_testers_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_testers_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_testers_platform_service_id_fkey"
            columns: ["platform_service_id"]
            isOneToOne: false
            referencedRelation: "platform_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_testers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assignment_code: string
          created_at: string
          created_by: string | null
          destination_location: string
          id: string
          instructions: Json
          isolated_variable: string
          pickup_location: string
          protocol_id: string
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          study_id: string
          updated_at: string
        }
        Insert: {
          assignment_code: string
          created_at?: string
          created_by?: string | null
          destination_location: string
          id?: string
          instructions?: Json
          isolated_variable: string
          pickup_location: string
          protocol_id: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          study_id: string
          updated_at?: string
        }
        Update: {
          assignment_code?: string
          created_at?: string
          created_by?: string | null
          destination_location?: string
          id?: string
          instructions?: Json
          isolated_variable?: string
          pickup_location?: string
          protocol_id?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_protocol_id_study_id_fkey"
            columns: ["protocol_id", "study_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id", "study_id"]
          },
          {
            foreignKeyName: "assignments_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_files: {
        Row: {
          assignment_id: string
          captured_at: string | null
          created_at: string
          evidence_code: string | null
          evidence_type: string
          id: string
          integrity_status: Database["public"]["Enums"]["evidence_integrity_status"]
          metadata: Json
          mime_type: string
          original_filename: string
          sha256: string | null
          size_bytes: number
          storage_bucket: string
          storage_path: string
          study_id: string
          submission_id: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          assignment_id: string
          captured_at?: string | null
          created_at?: string
          evidence_code?: string | null
          evidence_type: string
          id?: string
          integrity_status?: Database["public"]["Enums"]["evidence_integrity_status"]
          metadata?: Json
          mime_type: string
          original_filename: string
          sha256?: string | null
          size_bytes: number
          storage_bucket?: string
          storage_path: string
          study_id: string
          submission_id: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          assignment_id?: string
          captured_at?: string | null
          created_at?: string
          evidence_code?: string | null
          evidence_type?: string
          id?: string
          integrity_status?: Database["public"]["Enums"]["evidence_integrity_status"]
          metadata?: Json
          mime_type?: string
          original_filename?: string
          sha256?: string | null
          size_bytes?: number
          storage_bucket?: string
          storage_path?: string
          study_id?: string
          submission_id?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_files_submission_id_study_id_assignment_id_fkey"
            columns: ["submission_id", "study_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id", "study_id", "assignment_id"]
          },
          {
            foreignKeyName: "evidence_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_reviews: {
        Row: {
          created_at: string
          decided_at: string | null
          id: string
          matched_pair_id: string
          note: string | null
          reason: string | null
          reviewer_id: string
          status: Database["public"]["Enums"]["review_status"]
          technical_exception: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          id?: string
          matched_pair_id: string
          note?: string | null
          reason?: string | null
          reviewer_id: string
          status?: Database["public"]["Enums"]["review_status"]
          technical_exception?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          id?: string
          matched_pair_id?: string
          note?: string | null
          reason?: string | null
          reviewer_id?: string
          status?: Database["public"]["Enums"]["review_status"]
          technical_exception?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expert_reviews_matched_pair_id_fkey"
            columns: ["matched_pair_id"]
            isOneToOne: false
            referencedRelation: "matched_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expert_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matched_pairs: {
        Row: {
          absolute_fare_difference: number | null
          directional_fare_difference: number | null
          assignment_id: string
          created_at: string
          evidence_status: Database["public"]["Enums"]["evidence_integrity_status"]
          gps_distance_feet: number | null
          higher_priced_slot: Database["public"]["Enums"]["tester_slot"] | null
          id: string
          pair_code: string
          paired_at: string | null
          percentage_fare_difference: number | null
          study_id: string
          submission_a_id: string
          submission_b_id: string
          technical_status: Database["public"]["Enums"]["pair_validation_status"]
          timestamp_difference_seconds: number | null
          updated_at: string
        }
        Insert: {
          absolute_fare_difference?: number | null
          directional_fare_difference?: number | null
          assignment_id: string
          created_at?: string
          evidence_status?: Database["public"]["Enums"]["evidence_integrity_status"]
          gps_distance_feet?: number | null
          higher_priced_slot?: Database["public"]["Enums"]["tester_slot"] | null
          id?: string
          pair_code: string
          paired_at?: string | null
          percentage_fare_difference?: number | null
          study_id: string
          submission_a_id: string
          submission_b_id: string
          technical_status?: Database["public"]["Enums"]["pair_validation_status"]
          timestamp_difference_seconds?: number | null
          updated_at?: string
        }
        Update: {
          absolute_fare_difference?: number | null
          directional_fare_difference?: number | null
          assignment_id?: string
          created_at?: string
          evidence_status?: Database["public"]["Enums"]["evidence_integrity_status"]
          gps_distance_feet?: number | null
          higher_priced_slot?: Database["public"]["Enums"]["tester_slot"] | null
          id?: string
          pair_code?: string
          paired_at?: string | null
          percentage_fare_difference?: number | null
          study_id?: string
          submission_a_id?: string
          submission_b_id?: string
          technical_status?: Database["public"]["Enums"]["pair_validation_status"]
          timestamp_difference_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matched_pairs_assignment_id_study_id_fkey"
            columns: ["assignment_id", "study_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id", "study_id"]
          },
          {
            foreignKeyName: "matched_pairs_submission_a_id_study_id_assignment_id_fkey"
            columns: ["submission_a_id", "study_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id", "study_id", "assignment_id"]
          },
          {
            foreignKeyName: "matched_pairs_submission_b_id_study_id_assignment_id_fkey"
            columns: ["submission_b_id", "study_id", "assignment_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id", "study_id", "assignment_id"]
          },
        ]
      }
      platform_services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          normalized_service_category: string
          platform_id: string
          service_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          normalized_service_category?: string
          platform_id: string
          service_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          normalized_service_category?: string
          platform_id?: string
          service_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_services_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          metadata: Json
          name: string
          provider_category: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          provider_category?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          provider_category?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      provider_markets: {
        Row: {
          country_code: string
          created_at: string
          is_active: boolean
          platform_id: string
          region_code: string
        }
        Insert: {
          country_code: string
          created_at?: string
          is_active?: boolean
          platform_id: string
          region_code?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          is_active?: boolean
          platform_id?: string
          region_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_markets_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          display_name: string | null
          email: string
          id: string
          network_type: string | null
          device_type: string | null
          operating_system: string | null
          operating_system_version: string | null
          app_version: string | null
          browser_language: string | null
          browser_timezone: string | null
          device_profile_created_at: string | null
          ip_country_code: string | null
          location_review_status: string
          registration_ip: string | null
          registration_latitude: number | null
          registration_longitude: number | null
          registration_user_agent: string | null
          screen_size: string | null
          tester_country_code: string | null
          tester_country_name: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          network_type?: string | null
          device_type?: string | null
          operating_system?: string | null
          operating_system_version?: string | null
          app_version?: string | null
          browser_language?: string | null
          browser_timezone?: string | null
          device_profile_created_at?: string | null
          ip_country_code?: string | null
          location_review_status?: string
          registration_ip?: string | null
          registration_latitude?: number | null
          registration_longitude?: number | null
          registration_user_agent?: string | null
          screen_size?: string | null
          tester_country_code?: string | null
          tester_country_name?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          network_type?: string | null
          device_type?: string | null
          operating_system?: string | null
          operating_system_version?: string | null
          app_version?: string | null
          browser_language?: string | null
          browser_timezone?: string | null
          device_profile_created_at?: string | null
          ip_country_code?: string | null
          location_review_status?: string
          registration_ip?: string | null
          registration_latitude?: number | null
          registration_longitude?: number | null
          registration_user_agent?: string | null
          screen_size?: string | null
          tester_country_code?: string | null
          tester_country_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      protocols: {
        Row: {
          approved_by: string | null
          change_summary: string | null
          created_at: string
          created_by: string | null
          description: string | null
          effective_at: string | null
          evidence_requirements: Json
          exclusion_conditions: Json
          fixed_controls: Json
          id: string
          isolated_variable: string | null
          tester_a_value: string | null
          tester_b_value: string | null
          protocol_code: string
          status: Database["public"]["Enums"]["protocol_status"]
          study_id: string
          study_question: string
          title: string
          updated_at: string
          validation_configuration: Json
          version: string
        }
        Insert: {
          approved_by?: string | null
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_at?: string | null
          evidence_requirements?: Json
          exclusion_conditions?: Json
          fixed_controls?: Json
          id?: string
          isolated_variable?: string | null
          tester_a_value?: string | null
          tester_b_value?: string | null
          protocol_code: string
          status?: Database["public"]["Enums"]["protocol_status"]
          study_id: string
          study_question: string
          title?: string
          updated_at?: string
          validation_configuration?: Json
          version: string
        }
        Update: {
          approved_by?: string | null
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_at?: string | null
          evidence_requirements?: Json
          exclusion_conditions?: Json
          fixed_controls?: Json
          id?: string
          isolated_variable?: string | null
          tester_a_value?: string | null
          tester_b_value?: string | null
          protocol_code?: string
          status?: Database["public"]["Enums"]["protocol_status"]
          study_id?: string
          study_question?: string
          title?: string
          updated_at?: string
          validation_configuration?: Json
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocols_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_locations: {
        Row: {
          country_code: string
          created_at: string
          created_by: string | null
          currency_code: string
          external_place_id: string | null
          formatted_address: string
          geocoding_provider: string
          id: string
          is_public_location: boolean
          label: string
          latitude: number
          longitude: number
          region_name: string | null
          study_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          external_place_id?: string | null
          formatted_address: string
          geocoding_provider: string
          id?: string
          is_public_location?: boolean
          label: string
          latitude: number
          longitude: number
          region_name?: string | null
          study_id: string
          timezone: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          external_place_id?: string | null
          formatted_address?: string
          geocoding_provider?: string
          id?: string
          is_public_location?: boolean
          label?: string
          latitude?: number
          longitude?: number
          region_name?: string | null
          study_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_locations_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      study_routes: {
        Row: {
          created_at: string
          created_by: string | null
          destination_instructions: string | null
          destination_location_id: string
          id: string
          is_active: boolean
          notes: string | null
          pickup_instructions: string | null
          pickup_location_id: string
          route_name: string
          study_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination_instructions?: string | null
          destination_location_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          pickup_instructions?: string | null
          pickup_location_id: string
          route_name: string
          study_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination_instructions?: string | null
          destination_location_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          pickup_instructions?: string | null
          pickup_location_id?: string
          route_name?: string
          study_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_routes_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      studies: {
        Row: {
          configuration: Json
          created_at: string
          created_by: string | null
          default_currency: string | null
          description: string | null
          display_timezone: string
          id: string
          isolated_variable: string | null
          name: string
          status: Database["public"]["Enums"]["study_status"]
          study_code: string
          study_question: string | null
          study_type: Database["public"]["Enums"]["study_type"]
          target_pair_count: number | null
          testing_ends_at: string | null
          testing_starts_at: string | null
          updated_at: string
        }
        Insert: {
          configuration?: Json
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          description?: string | null
          display_timezone?: string
          id?: string
          isolated_variable?: string | null
          name: string
          status?: Database["public"]["Enums"]["study_status"]
          study_code: string
          study_question?: string | null
          study_type: Database["public"]["Enums"]["study_type"]
          target_pair_count?: number | null
          testing_ends_at?: string | null
          testing_starts_at?: string | null
          updated_at?: string
        }
        Update: {
          configuration?: Json
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          description?: string | null
          display_timezone?: string
          id?: string
          isolated_variable?: string | null
          name?: string
          status?: Database["public"]["Enums"]["study_status"]
          study_code?: string
          study_question?: string | null
          study_type?: Database["public"]["Enums"]["study_type"]
          target_pair_count?: number | null
          testing_ends_at?: string | null
          testing_starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_members: {
        Row: {
          added_by: string | null
          created_at: string
          membership_status: Database["public"]["Enums"]["membership_status"]
          study_id: string
          study_role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          study_id: string
          study_role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          study_id?: string
          study_role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_members_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_platforms: {
        Row: {
          created_at: string
          platform_id: string
          study_id: string
        }
        Insert: {
          created_at?: string
          platform_id: string
          study_id: string
        }
        Update: {
          created_at?: string
          platform_id?: string
          study_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_platforms_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_platforms_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          account_profile: Json
          app_version: string | null
          assignment_id: string
          assignment_tester_id: string
          battery_percentage: number | null
          created_at: string
          currency: string | null
          destination_location: string | null
          device_type: string | null
          displayed_fare: number | null
          id: string
          latitude: number | null
          longitude: number | null
          network_type: string | null
          notes: string | null
          operating_system: string | null
          operating_system_version: string | null
          pickup_location: string | null
          platform_service_id: string | null
          quote_timestamp: string | null
          status: Database["public"]["Enums"]["submission_status"]
          study_id: string
          submission_code: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_profile?: Json
          app_version?: string | null
          assignment_id: string
          assignment_tester_id: string
          battery_percentage?: number | null
          created_at?: string
          currency?: string | null
          destination_location?: string | null
          device_type?: string | null
          displayed_fare?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          network_type?: string | null
          notes?: string | null
          operating_system?: string | null
          operating_system_version?: string | null
          pickup_location?: string | null
          platform_service_id?: string | null
          quote_timestamp?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          study_id: string
          submission_code?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_profile?: Json
          app_version?: string | null
          assignment_id?: string
          assignment_tester_id?: string
          battery_percentage?: number | null
          created_at?: string
          currency?: string | null
          destination_location?: string | null
          device_type?: string | null
          displayed_fare?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          network_type?: string | null
          notes?: string | null
          operating_system?: string | null
          operating_system_version?: string | null
          pickup_location?: string | null
          platform_service_id?: string | null
          quote_timestamp?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          study_id?: string
          submission_code?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_study_id_fkey"
            columns: ["assignment_id", "study_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id", "study_id"]
          },
          {
            foreignKeyName: "submissions_assignment_tester_id_assignment_id_user_id_fkey"
            columns: ["assignment_tester_id", "assignment_id", "user_id"]
            isOneToOne: false
            referencedRelation: "assignment_testers"
            referencedColumns: ["id", "assignment_id", "user_id"]
          },
          {
            foreignKeyName: "submissions_platform_service_id_fkey"
            columns: ["platform_service_id"]
            isOneToOne: false
            referencedRelation: "platform_services"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_revisions: {
        Row: {
          assignment_id: string
          id: string
          pair_snapshot: Json | null
          reason: string
          reopened_at: string
          reopened_by: string
          review_snapshot: Json
          revision_number: number
          study_id: string
          submission_id: string
          submission_snapshot: Json
          validation_snapshot: Json
        }
        Insert: {
          assignment_id: string
          id?: string
          pair_snapshot?: Json | null
          reason: string
          reopened_at?: string
          reopened_by: string
          review_snapshot?: Json
          revision_number: number
          study_id: string
          submission_id: string
          submission_snapshot: Json
          validation_snapshot?: Json
        }
        Update: {
          assignment_id?: string
          id?: string
          pair_snapshot?: Json | null
          reason?: string
          reopened_at?: string
          reopened_by?: string
          review_snapshot?: Json
          revision_number?: number
          study_id?: string
          submission_id?: string
          submission_snapshot?: Json
          validation_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "submission_revisions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_revisions_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_revisions_study_id_fkey"
            columns: ["study_id"]
            isOneToOne: false
            referencedRelation: "studies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_revisions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_results: {
        Row: {
          affects_overall_status: boolean
          created_at: string
          explanation: string | null
          id: string
          label: string
          matched_pair_id: string
          observed_difference: string | null
          requirement_level: Database["public"]["Enums"]["requirement_level"]
          rule_code: string
          status: Database["public"]["Enums"]["rule_status"]
          tester_a_value: Json | null
          tester_b_value: Json | null
          threshold_configuration: Json | null
        }
        Insert: {
          affects_overall_status?: boolean
          created_at?: string
          explanation?: string | null
          id?: string
          label: string
          matched_pair_id: string
          observed_difference?: string | null
          requirement_level?: Database["public"]["Enums"]["requirement_level"]
          rule_code: string
          status: Database["public"]["Enums"]["rule_status"]
          tester_a_value?: Json | null
          tester_b_value?: Json | null
          threshold_configuration?: Json | null
        }
        Update: {
          affects_overall_status?: boolean
          created_at?: string
          explanation?: string | null
          id?: string
          label?: string
          matched_pair_id?: string
          observed_difference?: string | null
          requirement_level?: Database["public"]["Enums"]["requirement_level"]
          rule_code?: string
          status?: Database["public"]["Enums"]["rule_status"]
          tester_a_value?: Json | null
          tester_b_value?: Json | null
          threshold_configuration?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "validation_results_matched_pair_id_fkey"
            columns: ["matched_pair_id"]
            isOneToOne: false
            referencedRelation: "matched_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_own_device_profile: {
        Args: {
          p_app_version: string
          p_device_type: string
          p_network_type: string
          p_operating_system: string
          p_operating_system_version: string
        }
        Returns: undefined
      }
      admin_reopen_submission: {
        Args: { p_reason: string; p_submission_id: string }
        Returns: Database["public"]["Tables"]["submissions"]["Row"]
      }
      record_report_export: {
        Args: { p_export_kind: string; p_study_id: string }
        Returns: undefined
      }
      save_expert_review: {
        Args: {
          p_matched_pair_id: string
          p_note: string
          p_reason: string
          p_status: Database["public"]["Enums"]["review_status"]
          p_technical_exception?: boolean
        }
        Returns: Database["public"]["Tables"]["expert_reviews"]["Row"]
      }
      submit_tester_observation: {
        Args: { p_assignment_id: string }
        Returns: Database["public"]["Tables"]["submissions"]["Row"]
      }
      transition_study_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["study_status"]
          p_study_id: string
        }
        Returns: Database["public"]["Tables"]["studies"]["Row"]
      }
      cancel_assignment: {
        Args: { p_assignment_id: string; p_reason: string }
        Returns: Database["public"]["Tables"]["assignments"]["Row"]
      }
      expire_overdue_assignments: {
        Args: { p_study_id: string }
        Returns: number
      }
      extend_study_testing_period: {
        Args: { p_study_id: string; p_testing_ends_at: string }
        Returns: Database["public"]["Tables"]["studies"]["Row"]
      }
      update_study_before_protocol_activation: {
        Args: {
          p_isolated_variable: string
          p_name: string
          p_study_id: string
          p_study_question: string
          p_target_pair_count: number
          p_testing_ends_at: string
          p_testing_starts_at: string
        }
        Returns: Database["public"]["Tables"]["studies"]["Row"]
      }
      delete_study_before_protocol_activation: {
        Args: { p_study_id: string }
        Returns: undefined
      }
      update_full_draft_study: {
        Args: { p_payload: Json; p_study_id: string }
        Returns: Database["public"]["Tables"]["studies"]["Row"]
      }
      get_study_completion_readiness: {
        Args: { p_study_id: string }
        Returns: Json
      }
      register_submission_evidence: {
        Args: {
          p_captured_at?: string | null
          p_evidence_type: string
          p_mime_type: string
          p_original_filename: string
          p_sha256: string
          p_size_bytes: number
          p_storage_path: string
          p_submission_id: string
        }
        Returns: Database["public"]["Tables"]["evidence_files"]["Row"]
      }
      save_submission_draft: {
        Args: {
          p_app_version: string
          p_assignment_id: string
          p_battery_percentage: number
          p_device_type: string
          p_displayed_fare: number
          p_latitude: number
          p_longitude: number
          p_network_type: string
          p_notes?: string | null
          p_operating_system: string
          p_operating_system_version: string
          p_quote_timestamp: string
        }
        Returns: Database["public"]["Tables"]["submissions"]["Row"]
      }
      start_assignment_test: {
        Args: { p_assignment_id: string }
        Returns: Database["public"]["Tables"]["assignment_testers"]["Row"]
      }
      confirm_assignment_ready: {
        Args: { p_assignment_id: string }
        Returns: Database["public"]["Tables"]["assignment_testers"]["Row"]
      }
      create_paired_assignment: {
        Args: {
          p_end_time: string
          p_instructions?: string | null
          p_protocol_id: string
          p_route_id: string
          p_start_time: string
          p_study_id: string
          p_tester_a_id: string
          p_tester_a_service_id: string
          p_tester_b_id: string
          p_tester_b_service_id: string
          p_testing_date: string
          p_timezone: string
        }
        Returns: Database["public"]["Tables"]["assignments"]["Row"]
      }
      create_paired_assignment_batch: {
        Args: {
          p_end_time: string
          p_instructions?: string | null
          p_protocol_id: string
          p_route_id: string
          p_start_time: string
          p_study_id: string
          p_tester_a_service_id: string
          p_tester_b_service_id: string
          p_tester_pairs: Json
          p_testing_date: string
          p_timezone: string
        }
        Returns: Database["public"]["Tables"]["assignments"]["Row"][]
      }
      create_paired_assignment_batch_v2: {
        Args: {
          p_instructions?: string | null
          p_protocol_id: string
          p_route_id: string
          p_study_id: string
          p_tester_a_end_time: string
          p_tester_a_service_id: string
          p_tester_a_start_time: string
          p_tester_b_end_time: string
          p_tester_b_service_id: string
          p_tester_b_start_time: string
          p_tester_pairs: Json
          p_testing_date: string
          p_timezone: string
        }
        Returns: Database["public"]["Tables"]["assignments"]["Row"][]
      }
      list_activity_log_categories: {
        Args: { p_study_id: string }
        Returns: { category: string }[]
      }
      list_activity_log_feed: {
        Args: { p_action?: string | null; p_actor_id?: string | null; p_category?: string | null; p_date_from?: string | null; p_date_to?: string | null; p_limit?: number; p_offset?: number; p_search?: string | null; p_study_id: string; p_target_type?: string | null }
        Returns: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string
          actor_role: Database["public"]["Enums"]["app_role"] | null
          category: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
          total_count: number
        }[]
      }
      list_activity_log_filter_options: {
        Args: { p_study_id: string }
        Returns: Json
      }
      add_study_member: {
        Args: { p_study_id: string; p_user_id: string }
        Returns: Database["public"]["Tables"]["study_members"]["Row"]
      }
      add_study_members: {
        Args: { p_study_id: string; p_user_ids: string[] }
        Returns: number
      }
      activate_protocol: {
        Args: {
          p_protocol_id: string
          p_study_id: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
      create_initial_protocol_draft: {
        Args: {
          p_description?: string | null
          p_study_id: string
          p_tester_a_value: string
          p_tester_b_value: string
          p_title: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
      create_protocol_version: {
        Args: {
          p_change_summary: string
          p_source_protocol_id: string
          p_study_id: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
      discard_protocol_draft: {
        Args: {
          p_protocol_id: string
          p_study_id: string
        }
        Returns: string
      }
      save_protocol_details: {
        Args: {
          p_description?: string | null
          p_protocol_id: string
          p_study_id: string
          p_tester_a_value: string
          p_tester_b_value: string
          p_title: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
      create_study: {
        Args: {
          p_configuration?: Json
          p_default_currency: string
          p_description?: string | null
          p_display_timezone: string
          p_isolated_variable?: string | null
          p_name: string
          p_study_code: string
          p_study_question?: string | null
          p_study_type: Database["public"]["Enums"]["study_type"]
          p_target_pair_count?: number | null
          p_testing_ends_at?: string | null
          p_testing_starts_at?: string | null
        }
        Returns: Database["public"]["Tables"]["studies"]["Row"]
      }
      list_eligible_study_accounts: {
        Args: { p_study_id: string }
        Returns: {
          display_name: string | null
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      list_assignment_tester_profiles: {
        Args: { p_study_id: string }
        Returns: {
          assignment_id: string
          display_name: string | null
          email: string | null
          user_id: string
        }[]
      }
      list_assignment_tester_options: {
        Args: { p_study_id: string }
        Returns: {
          device_type: string | null
          display_name: string | null
          email: string
          operating_system: string | null
          operating_system_version: string | null
          user_id: string
        }[]
      }
      list_assignment_pair_roster: {
        Args: { p_study_id: string }
        Returns: {
          assignment_id: string
          display_name: string | null
          email: string | null
          slot: Database["public"]["Enums"]["tester_slot"]
          slot_status: Database["public"]["Enums"]["assignment_tester_status"]
          user_id: string
        }[]
      }
      list_study_members: {
        Args: { p_study_id: string }
        Returns: {
          added_by_name: string | null
          created_at: string
          display_name: string | null
          email: string
          membership_status: Database["public"]["Enums"]["membership_status"]
          study_role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      create_study_with_initial_route: {
        Args: {
          p_description?: string | null
          p_destination: Json
          p_destination_instructions?: string | null
          p_isolated_variable?: string | null
          p_name: string
          p_pickup: Json
          p_pickup_instructions?: string | null
          p_platform_service_ids?: string[]
          p_route_name: string
          p_route_notes?: string | null
          p_search_country_code: string
          p_study_code: string
          p_study_question?: string | null
          p_study_type: Database["public"]["Enums"]["study_type"]
          p_target_pair_count?: number | null
          p_testing_ends_at?: string | null
          p_testing_starts_at?: string | null
        }
        Returns: Database["public"]["Tables"]["studies"]["Row"]
      }
      create_study_with_initial_route_v2: {
        Args: {
          p_description?: string | null
          p_destination: Json
          p_destination_instructions?: string | null
          p_isolated_variable?: string | null
          p_name: string
          p_pickup: Json
          p_pickup_instructions?: string | null
          p_platform_service_ids?: string[]
          p_route_name: string
          p_route_notes?: string | null
          p_search_country_code: string
          p_study_question?: string | null
          p_study_type: Database["public"]["Enums"]["study_type"]
          p_target_pair_count?: number | null
          p_testing_ends_at?: string | null
          p_testing_starts_at?: string | null
        }
        Returns: Database["public"]["Tables"]["studies"]["Row"]
      }
      save_protocol_matching_controls: {
        Args: {
          p_optional_controls?: string[]
          p_protocol_id: string
          p_study_id: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
      set_study_membership_status: {
        Args: {
          p_membership_status: Database["public"]["Enums"]["membership_status"]
          p_study_id: string
          p_user_id: string
        }
        Returns: Database["public"]["Tables"]["study_members"]["Row"]
      }
      save_protocol_validation_thresholds: {
        Args: {
          p_maximum_location_gap_feet: number
          p_maximum_time_gap_seconds: number
          p_preferred_location_gap_feet: number
          p_preferred_time_gap_seconds: number
          p_protocol_id: string
          p_study_id: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
      save_protocol_evidence_observation_requirements: {
        Args: {
          p_optional_evidence?: string[]
          p_optional_observation_fields?: string[]
          p_protocol_id: string
          p_study_id: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
      save_protocol_exclusion_conditions: {
        Args: {
          p_optional_exclusions?: string[]
          p_protocol_id: string
          p_study_id: string
        }
        Returns: Database["public"]["Tables"]["protocols"]["Row"]
      }
    }
    Enums: {
      account_status: "pending" | "active" | "disabled"
      app_role:
        | "admin"
        | "test_coordinator"
        | "tester"
        | "expert_reviewer"
        | "law_firm_viewer"
      assignment_status:
        | "not_started"
        | "in_progress"
        | "draft"
        | "awaiting_partner"
        | "ready_for_validation"
        | "completed"
        | "expired"
        | "cancelled"
      assignment_tester_status:
        | "invited"
        | "assigned"
        | "ready"
        | "in_progress"
        | "submitted"
        | "removed"
      evidence_integrity_status: "pending" | "complete" | "flagged" | "rejected"
      membership_status: "invited" | "active" | "removed"
      pair_validation_status:
        | "pending"
        | "valid"
        | "warning"
        | "invalid"
        | "incomplete"
      protocol_status: "draft" | "active" | "superseded" | "archived"
      requirement_level: "required" | "advisory"
      review_status: "pending" | "accepted" | "flagged" | "rejected"
      rule_status: "pass" | "warning" | "fail" | "not_applicable"
      study_status: "draft" | "active" | "paused" | "completed" | "archived"
      study_type: "within_platform_pair" | "cross_platform_comparison"
      submission_status: "draft" | "submitted" | "withdrawn"
      tester_slot: "tester_a" | "tester_b"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["pending", "active", "disabled"],
      app_role: [
        "admin",
        "test_coordinator",
        "tester",
        "expert_reviewer",
        "law_firm_viewer",
      ],
      assignment_status: [
        "not_started",
        "in_progress",
        "draft",
        "awaiting_partner",
        "ready_for_validation",
        "completed",
        "expired",
        "cancelled",
      ],
      assignment_tester_status: [
        "invited",
        "assigned",
        "ready",
        "in_progress",
        "submitted",
        "removed",
      ],
      evidence_integrity_status: ["pending", "complete", "flagged", "rejected"],
      membership_status: ["invited", "active", "removed"],
      pair_validation_status: [
        "pending",
        "valid",
        "warning",
        "invalid",
        "incomplete",
      ],
      protocol_status: ["draft", "active", "superseded", "archived"],
      requirement_level: ["required", "advisory"],
      review_status: ["pending", "accepted", "flagged", "rejected"],
      rule_status: ["pass", "warning", "fail", "not_applicable"],
      study_status: ["draft", "active", "paused", "completed", "archived"],
      study_type: ["within_platform_pair", "cross_platform_comparison"],
      submission_status: ["draft", "submitted", "withdrawn"],
      tester_slot: ["tester_a", "tester_b"],
    },
  },
} as const
