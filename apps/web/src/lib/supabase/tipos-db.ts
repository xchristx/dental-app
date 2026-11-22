export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      anamnesis: {
        Row: {
          alergias: string | null
          antecedentes_familiares: string | null
          antecedentes_personales: string | null
          autor_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          medicamentos: string | null
          organization_id: string
          paciente_id: string
          profesional_id: string | null
          sin_alergias: boolean
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          alergias?: string | null
          antecedentes_familiares?: string | null
          antecedentes_personales?: string | null
          autor_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          medicamentos?: string | null
          organization_id: string
          paciente_id: string
          profesional_id?: string | null
          sin_alergias?: boolean
          updated_at?: string
        }
        Update: {
          alergias?: string | null
          antecedentes_familiares?: string | null
          antecedentes_personales?: string | null
          autor_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          medicamentos?: string | null
          organization_id?: string
          paciente_id?: string
          profesional_id?: string | null
          sin_alergias?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'anamnesis_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'anamnesis_organization_id_paciente_id_fkey'
            columns: ['organization_id', 'paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'anamnesis_organization_id_profesional_id_fkey'
            columns: ['organization_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['organization_id', 'id']
          },
        ]
      }
      citas: {
        Row: {
          created_at: string
          deleted_at: string | null
          estado: string
          fin: string
          fin_previsto: string | null
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
          fin_previsto?: string | null
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
          fin_previsto?: string | null
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
      derivaciones: {
        Row: {
          autor_id: string | null
          contacto: string | null
          created_at: string
          deleted_at: string | null
          fecha: string
          id: string
          motivo: string | null
          organization_id: string
          paciente_id: string
          profesional_id: string | null
          sentido: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          autor_id?: string | null
          contacto?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha: string
          id?: string
          motivo?: string | null
          organization_id: string
          paciente_id: string
          profesional_id?: string | null
          sentido: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          contacto?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          id?: string
          motivo?: string | null
          organization_id?: string
          paciente_id?: string
          profesional_id?: string | null
          sentido?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'derivaciones_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'derivaciones_organization_id_paciente_id_fkey'
            columns: ['organization_id', 'paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'derivaciones_organization_id_profesional_id_fkey'
            columns: ['organization_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['organization_id', 'id']
          },
        ]
      }
      evoluciones: {
        Row: {
          autor_id: string | null
          cita_id: string | null
          created_at: string
          deleted_at: string | null
          fecha: string
          id: string
          organization_id: string
          paciente_id: string
          profesional_id: string | null
          texto: string
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          autor_id?: string | null
          cita_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha: string
          id?: string
          organization_id: string
          paciente_id: string
          profesional_id?: string | null
          texto: string
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          cita_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          id?: string
          organization_id?: string
          paciente_id?: string
          profesional_id?: string | null
          texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'evoluciones_organization_id_cita_id_fkey'
            columns: ['organization_id', 'cita_id']
            isOneToOne: false
            referencedRelation: 'citas'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'evoluciones_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'evoluciones_organization_id_paciente_id_fkey'
            columns: ['organization_id', 'paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'evoluciones_organization_id_profesional_id_fkey'
            columns: ['organization_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
            referencedColumns: ['organization_id', 'id']
          },
        ]
      }
      examen_bucal: {
        Row: {
          autor_id: string | null
          cepilla_lengua: boolean | null
          created_at: string
          deleted_at: string | null
          halitosis: boolean | null
          id: string
          materia_alba: boolean | null
          observaciones: string | null
          oclusion: string | null
          organization_id: string
          paciente_id: string
          placa_bacteriana: boolean | null
          profesional_id: string | null
          tartaro: boolean | null
          updated_at: string
          usa_mondadientes: boolean | null
        }
        ComputedFields: never
        Insert: {
          autor_id?: string | null
          cepilla_lengua?: boolean | null
          created_at?: string
          deleted_at?: string | null
          halitosis?: boolean | null
          id?: string
          materia_alba?: boolean | null
          observaciones?: string | null
          oclusion?: string | null
          organization_id: string
          paciente_id: string
          placa_bacteriana?: boolean | null
          profesional_id?: string | null
          tartaro?: boolean | null
          updated_at?: string
          usa_mondadientes?: boolean | null
        }
        Update: {
          autor_id?: string | null
          cepilla_lengua?: boolean | null
          created_at?: string
          deleted_at?: string | null
          halitosis?: boolean | null
          id?: string
          materia_alba?: boolean | null
          observaciones?: string | null
          oclusion?: string | null
          organization_id?: string
          paciente_id?: string
          placa_bacteriana?: boolean | null
          profesional_id?: string | null
          tartaro?: boolean | null
          updated_at?: string
          usa_mondadientes?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'examen_bucal_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'examen_bucal_organization_id_paciente_id_fkey'
            columns: ['organization_id', 'paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'examen_bucal_organization_id_profesional_id_fkey'
            columns: ['organization_id', 'profesional_id']
            isOneToOne: false
            referencedRelation: 'profesionales'
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
      odontograma_codigos: {
        Row: {
          abreviatura: string
          created_at: string
          deleted_at: string | null
          id: string
          indice: string | null
          nombre: string
          orden: number
          organization_id: string
          por_caras: boolean
          simbolo: string
          tipo: string
          updated_at: string
          usa_grado: boolean
        }
        ComputedFields: never
        Insert: {
          abreviatura: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          indice?: string | null
          nombre: string
          orden?: number
          organization_id: string
          por_caras?: boolean
          simbolo: string
          tipo: string
          updated_at?: string
          usa_grado?: boolean
        }
        Update: {
          abreviatura?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          indice?: string | null
          nombre?: string
          orden?: number
          organization_id?: string
          por_caras?: boolean
          simbolo?: string
          tipo?: string
          updated_at?: string
          usa_grado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'odontograma_codigos_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
        ]
      }
      odontograma_registros: {
        Row: {
          autor_id: string | null
          caras: string[] | null
          codigo_id: string | null
          created_at: string
          deleted_at: string | null
          fecha: string
          grado: number | null
          id: string
          nota: string | null
          organization_id: string
          paciente_id: string
          pieza: number
          resuelve_id: string | null
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          autor_id?: string | null
          caras?: string[] | null
          codigo_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha: string
          grado?: number | null
          id?: string
          nota?: string | null
          organization_id: string
          paciente_id: string
          pieza: number
          resuelve_id?: string | null
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          caras?: string[] | null
          codigo_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          grado?: number | null
          id?: string
          nota?: string | null
          organization_id?: string
          paciente_id?: string
          pieza?: number
          resuelve_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'odontograma_registros_organization_id_codigo_id_fkey'
            columns: ['organization_id', 'codigo_id']
            isOneToOne: false
            referencedRelation: 'odontograma_codigos'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'odontograma_registros_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'odontograma_registros_organization_id_paciente_id_fkey'
            columns: ['organization_id', 'paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
            referencedColumns: ['organization_id', 'id']
          },
          {
            foreignKeyName: 'odontograma_registros_resuelve'
            columns: ['organization_id', 'resuelve_id']
            isOneToOne: false
            referencedRelation: 'odontograma_registros'
            referencedColumns: ['organization_id', 'id']
          },
        ]
      }
      odontograma_rx: {
        Row: {
          autor_id: string | null
          created_at: string
          deleted_at: string | null
          fecha: string
          id: string
          nota: string | null
          organization_id: string
          paciente_id: string
          pieza: number
          updated_at: string
        }
        ComputedFields: never
        Insert: {
          autor_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha: string
          id?: string
          nota?: string | null
          organization_id: string
          paciente_id: string
          pieza: number
          updated_at?: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          deleted_at?: string | null
          fecha?: string
          id?: string
          nota?: string | null
          organization_id?: string
          paciente_id?: string
          pieza?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'odontograma_rx_organization_id_fkey'
            columns: ['organization_id']
            isOneToOne: false
            referencedRelation: 'organizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'odontograma_rx_organization_id_paciente_id_fkey'
            columns: ['organization_id', 'paciente_id']
            isOneToOne: false
            referencedRelation: 'pacientes'
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
      es_admin_de: { Args: { org: string }; Returns: boolean }
      odontograma_catalogo_inicial: { Args: { org: string }; Returns: undefined }
      odontograma_codigos_usados: { Args: Record<PropertyKey, never>; Returns: string[] }
      org_ids_del_usuario: { Args: Record<PropertyKey, never>; Returns: string[] }
      profesional_del_usuario: { Args: { org: string }; Returns: string }
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
