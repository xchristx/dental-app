export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      citas: {
        Row: {
          created_at: string
          deleted_at: string | null
          estado: string
          fin: string
          id: string
          inicio: string
          llegada_at: string | null
          lugar_controla_sillon: boolean
          lugar_id: string
          nota: string | null
          organization_id: string
          paciente_id: string | null
          profesional_id: string
          reagendada_desde: string | null
          recordatorio_enviado_at: string | null
          tipo_cita_id: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          estado?: string
          fin: string
          id?: string
          inicio: string
          llegada_at?: string | null
          lugar_controla_sillon?: boolean
          lugar_id: string
          nota?: string | null
          organization_id: string
          paciente_id?: string | null
          profesional_id: string
          reagendada_desde?: string | null
          recordatorio_enviado_at?: string | null
          tipo_cita_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          estado?: string
          fin?: string
          id?: string
          inicio?: string
          llegada_at?: string | null
          lugar_controla_sillon?: boolean
          lugar_id?: string
          nota?: string | null
          organization_id?: string
          paciente_id?: string | null
          profesional_id?: string
          reagendada_desde?: string | null
          recordatorio_enviado_at?: string | null
          tipo_cita_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'citas_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'citas_organization_id_lugar_id_fkey'
            columns: ['organization_id', 'lugar_id']
            isOneToOne: false
            referencedRelation: 'lugares'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'citas_organization_id_paciente_id_fkey'
            columns: ['organization_id', 'paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'citas_organization_id_profesional_id_fkey'
            columns: ['organization_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'citas_organization_id_tipo_cita_id_fkey'
            columns: ['organization_id', 'tipo_cita_id']
            isOneToOne: false
            referencedRelation: 'tipos_cita'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'citas_reagendada_desde_fkey'
            columns: ['organization_id', 'reagendada_desde']
            isOneToOne: false
            referencedRelation: 'citas'
            referencedColumns: ['organization_id', 'id']
          },
        ]
      }
      horarios: {
        Row: {
          created_at: string
          deleted_at: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id: string
          lugar_id: string
          organization_id: string
          profesional_id: string
          updated_at: string
          vigente_desde: string
          vigente_hasta: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          dia_semana: number
          hora_fin: string
          hora_inicio: string
          id?: string
          lugar_id: string
          organization_id: string
          profesional_id: string
          updated_at?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          dia_semana?: number
          hora_fin?: string
          hora_inicio?: string
          id?: string
          lugar_id?: string
          organization_id?: string
          profesional_id?: string
          updated_at?: string
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'horarios_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'horarios_organization_id_lugar_id_fkey'
            columns: ['organization_id', 'lugar_id']
            isOneToOne: false
            referencedRelation: 'lugares'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'horarios_organization_id_profesional_id_fkey'
            columns: ['organization_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['organization_id', 'id']
          },
        ]
      }
      lugares: {
        Row: {
          color: string
          controla_sillon: boolean
          created_at: string
          deleted_at: string | null
          direccion: string | null
          id: string
          nombre: string
          organization_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          color?: string
          controla_sillon?: boolean
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          id?: string
          nombre: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          controla_sillon?: boolean
          created_at?: string
          deleted_at?: string | null
          direccion?: string | null
          id?: string
          nombre?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'lugares_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
        ]
      }
      miembros: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          organization_id: string
          profesional_id: string | null
          rol: string
          updated_at: string
          user_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id: string
          profesional_id?: string | null
          rol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string
          profesional_id?: string | null
          rol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'miembros_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'miembros_organization_id_profesional_id_fkey'
            columns: ['organization_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['organization_id', 'id']
          },
        ]
      }
      organizaciones: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          moneda: string
          nombre: string
          updated_at: string
          zona_horaria: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          moneda?: string
          nombre: string
          updated_at?: string
          zona_horaria?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          moneda?: string
          nombre?: string
          updated_at?: string
          zona_horaria?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          created_at: string
          deleted_at: string | null
          fecha_nacimiento: string | null
          id: string
          nombre: string
          organization_id: string
          telefono: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre: string
          organization_id: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fecha_nacimiento?: string | null
          id?: string
          nombre?: string
          organization_id?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'pacientes_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
        ]
      }
      profesionales: {
        Row: {
          created_at: string
          deleted_at: string | null
          especialidad: string | null
          id: string
          margen_traslado_min: number
          nombre: string
          organization_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          especialidad?: string | null
          id?: string
          margen_traslado_min?: number
          nombre: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          especialidad?: string | null
          id?: string
          margen_traslado_min?: number
          nombre?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profesionales_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
        ]
      }
      tipos_cita: {
        Row: {
          created_at: string
          deleted_at: string | null
          duracion_min: number
          id: string
          nombre: string
          organization_id: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duracion_min: number
          id?: string
          nombre: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duracion_min?: number
          id?: string
          nombre?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tipos_cita_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      org_ids_del_usuario: { Args: Record<PropertyKey, never>; Returns: string[] }
      reagendar_cita: {
        Args: {
          p_estado_original: string
          p_fin: string
          p_id: string
          p_inicio: string
          p_lugar: string
          p_nota?: string
          p_original: string
          p_profesional: string
          p_tipo_cita?: string
        }
        Returns: string
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
