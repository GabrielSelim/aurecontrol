export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _migrations_applied: {
        Row: {
          applied_at: string | null
          filename: string
        }
        Insert: {
          applied_at?: string | null
          filename: string
        }
        Update: {
          applied_at?: string | null
          filename?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "system_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          bank_account: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          cnpj: string
          created_at: string | null
          default_adjustment_policy: string | null
          default_template_id: string | null
          default_witness_count: number | null
          email: string | null
          id: string
          is_active: boolean | null
          legal_rep_cpf: string | null
          legal_rep_name: string | null
          legal_rep_nationality: string | null
          legal_rep_profession: string | null
          legal_rep_rg: string | null
          legal_rep_rg_issuer: string | null
          logo_url: string | null
          max_collaborators: number | null
          name: string
          phone: string | null
          plan_expires_at: string | null
          plan_name: string | null
          updated_at: string | null
          welcome_email_template: string | null
          asaas_customer_id: string | null
        }
        Insert: {
          address?: string | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnpj: string
          created_at?: string | null
          default_adjustment_policy?: string | null
          default_template_id?: string | null
          default_witness_count?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_rep_cpf?: string | null
          legal_rep_name?: string | null
          legal_rep_nationality?: string | null
          legal_rep_profession?: string | null
          legal_rep_rg?: string | null
          legal_rep_rg_issuer?: string | null
          logo_url?: string | null
          max_collaborators?: number | null
          name: string
          phone?: string | null
          plan_expires_at?: string | null
          plan_name?: string | null
          updated_at?: string | null
          welcome_email_template?: string | null
          asaas_customer_id?: string | null
        }
        Update: {
          address?: string | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          bank_account?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          cnpj?: string
          created_at?: string | null
          default_adjustment_policy?: string | null
          default_template_id?: string | null
          default_witness_count?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          legal_rep_cpf?: string | null
          legal_rep_name?: string | null
          legal_rep_nationality?: string | null
          legal_rep_profession?: string | null
          legal_rep_rg?: string | null
          legal_rep_rg_issuer?: string | null
          logo_url?: string | null
          max_collaborators?: number | null
          name?: string
          phone?: string | null
          plan_expires_at?: string | null
          plan_name?: string | null
          updated_at?: string | null
          welcome_email_template?: string | null
          asaas_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      company_billings: {
        Row: {
          company_id: string
          coupon_id: string | null
          created_at: string | null
          discount_amount: number | null
          discount_description: string | null
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_proof_url: string | null
          pj_contracts_count: number
          promotion_id: string | null
          reference_month: string
          status: string
          subtotal: number
          total: number
          unit_price: number
          updated_at: string | null
          asaas_charge_id: string | null
          asaas_payment_link: string | null
          asaas_pix_payload: string | null
          asaas_boleto_url: string | null
          asaas_boleto_barcode: string | null
        }
        Insert: {
          company_id: string
          coupon_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          pj_contracts_count?: number
          promotion_id?: string | null
          reference_month: string
          status?: string
          subtotal: number
          total: number
          unit_price: number
          updated_at?: string | null
          asaas_charge_id?: string | null
          asaas_payment_link?: string | null
          asaas_pix_payload?: string | null
          asaas_boleto_url?: string | null
          asaas_boleto_barcode?: string | null
        }
        Update: {
          company_id?: string
          coupon_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          pj_contracts_count?: number
          promotion_id?: string | null
          reference_month?: string
          status?: string
          subtotal?: number
          total?: number
          unit_price?: number
          updated_at?: string | null
          asaas_charge_id?: string | null
          asaas_payment_link?: string | null
          asaas_pix_payload?: string | null
          asaas_boleto_url?: string | null
          asaas_boleto_barcode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_billings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_billings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_billings_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "discount_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_billings_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_audit_logs: {
        Row: {
          action: string
          action_category: string
          actor_email: string
          actor_id: string | null
          actor_name: string
          contract_id: string
          created_at: string | null
          details: Json | null
          document_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_category?: string
          actor_email: string
          actor_id?: string | null
          actor_name: string
          contract_id: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_category?: string
          actor_email?: string
          actor_id?: string | null
          actor_name?: string
          contract_id?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_documents: {
        Row: {
          company_representative_id: string | null
          completed_at: string | null
          contract_id: string
          created_at: string | null
          document_html: string
          id: string
          signature_status:
            | Database["public"]["Enums"]["signature_status"]
            | null
          template_id: string | null
          updated_at: string | null
          witness_count: number | null
        }
        Insert: {
          company_representative_id?: string | null
          completed_at?: string | null
          contract_id: string
          created_at?: string | null
          document_html: string
          id?: string
          signature_status?:
            | Database["public"]["Enums"]["signature_status"]
            | null
          template_id?: string | null
          updated_at?: string | null
          witness_count?: number | null
        }
        Update: {
          company_representative_id?: string | null
          completed_at?: string | null
          contract_id?: string
          created_at?: string | null
          document_html?: string
          id?: string
          signature_status?:
            | Database["public"]["Enums"]["signature_status"]
            | null
          template_id?: string | null
          updated_at?: string | null
          witness_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_documents_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: true
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          created_at: string | null
          document_id: string
          external_signature_id: string | null
          external_signature_provider: string | null
          id: string
          ip_address: string | null
          position_height: number | null
          position_page: number | null
          position_width: number | null
          position_x: number | null
          position_y: number | null
          signature_image_url: string | null
          signed_at: string | null
          signer_document: string | null
          signer_email: string
          signer_name: string
          signer_order: number | null
          signer_type: Database["public"]["Enums"]["signer_type"]
          signer_user_id: string | null
          signing_token: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          external_signature_id?: string | null
          external_signature_provider?: string | null
          id?: string
          ip_address?: string | null
          position_height?: number | null
          position_page?: number | null
          position_width?: number | null
          position_x?: number | null
          position_y?: number | null
          signature_image_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_email: string
          signer_name: string
          signer_order?: number | null
          signer_type: Database["public"]["Enums"]["signer_type"]
          signer_user_id?: string | null
          signing_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          external_signature_id?: string | null
          external_signature_provider?: string | null
          id?: string
          ip_address?: string | null
          position_height?: number | null
          position_page?: number | null
          position_width?: number | null
          position_x?: number | null
          position_y?: number | null
          signature_image_url?: string | null
          signed_at?: string | null
          signer_document?: string | null
          signer_email?: string
          signer_name?: string
          signer_order?: number | null
          signer_type?: Database["public"]["Enums"]["signer_type"]
          signer_user_id?: string | null
          signing_token?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_splits: {
        Row: {
          beneficiary_account: string | null
          beneficiary_agency: string | null
          beneficiary_bank: string | null
          beneficiary_document: string | null
          beneficiary_name: string
          contract_id: string
          created_at: string
          id: string
          percentage: number
        }
        Insert: {
          beneficiary_account?: string | null
          beneficiary_agency?: string | null
          beneficiary_bank?: string | null
          beneficiary_document?: string | null
          beneficiary_name: string
          contract_id: string
          created_at?: string
          id?: string
          percentage: number
        }
        Update: {
          beneficiary_account?: string | null
          beneficiary_agency?: string | null
          beneficiary_bank?: string | null
          beneficiary_document?: string | null
          beneficiary_name?: string
          contract_id?: string
          created_at?: string
          id?: string
          percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_splits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_splits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_splits_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      contract_template_versions: {
        Row: {
          content: string
          created_at: string
          description: string | null
          id: string
          name: string
          saved_by: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          saved_by?: string | null
          template_id: string
          version_number?: number
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          saved_by?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          category: string | null
          company_id: string | null
          content: string
          created_at: string | null
          created_by: string | null
          default_witness_count: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          default_witness_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          default_witness_count?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          adjustment_date: string | null
          adjustment_index: string | null
          company_id: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string | null
          created_by: string | null
          deliverable_description: string | null
          department: string | null
          document_url: string | null
          duration_type: string | null
          duration_unit: string | null
          duration_value: number | null
          end_date: string | null
          hourly_rate: number | null
          id: string
          job_title: string
          monthly_value: number | null
          notes: string | null
          payment_day: number | null
          payment_frequency: string | null
          salary: number | null
          scope_description: string | null
          start_date: string
          status: Database["public"]["Enums"]["contract_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adjustment_date?: string | null
          adjustment_index?: string | null
          company_id: string
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at?: string | null
          created_by?: string | null
          deliverable_description?: string | null
          department?: string | null
          document_url?: string | null
          duration_type?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          job_title: string
          monthly_value?: number | null
          notes?: string | null
          payment_day?: number | null
          payment_frequency?: string | null
          salary?: number | null
          scope_description?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adjustment_date?: string | null
          adjustment_index?: string | null
          company_id?: string
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string | null
          created_by?: string | null
          deliverable_description?: string | null
          department?: string | null
          document_url?: string | null
          duration_type?: string | null
          duration_unit?: string | null
          duration_value?: number | null
          end_date?: string | null
          hourly_rate?: number | null
          id?: string
          job_title?: string
          monthly_value?: number | null
          notes?: string | null
          payment_day?: number | null
          payment_frequency?: string | null
          salary?: number | null
          scope_description?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_anexos: {
        Row: {
          company_id: string
          contract_id: string
          created_at: string | null
          description: string | null
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          contract_id: string
          created_at?: string | null
          description?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          contract_id?: string
          created_at?: string | null
          description?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_anexos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_anexos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_anexos_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_anexos_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_anexos_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      discount_coupons: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_uses: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"] | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"] | null
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["invite_status"] | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      nfse: {
        Row: {
          company_id: string
          competencia: string
          contract_id: string
          created_at: string
          emitida_em: string | null
          error_message: string | null
          id: string
          numero: string | null
          pdf_url: string | null
          status: string
          updated_at: string
          valor: number
          xml: string | null
        }
        Insert: {
          company_id: string
          competencia: string
          contract_id: string
          created_at?: string
          emitida_em?: string | null
          error_message?: string | null
          id?: string
          numero?: string | null
          pdf_url?: string | null
          status?: string
          updated_at?: string
          valor: number
          xml?: string | null
        }
        Update: {
          company_id?: string
          competencia?: string
          contract_id?: string
          created_at?: string
          emitida_em?: string | null
          error_message?: string | null
          id?: string
          numero?: string | null
          pdf_url?: string | null
          status?: string
          updated_at?: string
          valor?: number
          xml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfse_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfse_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      notification_delivery_logs: {
        Row: {
          attempt_number: number
          attempted_at: string
          channel: string
          created_at: string
          delivered_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          notification_log_id: string | null
          response_data: Json | null
          status: string
        }
        Insert: {
          attempt_number?: number
          attempted_at?: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          notification_log_id?: string | null
          response_data?: Json | null
          status?: string
        }
        Update: {
          attempt_number?: number
          attempted_at?: string
          channel?: string
          created_at?: string
          delivered_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          notification_log_id?: string | null
          response_data?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_notification_log_id_fkey"
            columns: ["notification_log_id"]
            isOneToOne: false
            referencedRelation: "notification_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          channel: string | null
          company_id: string | null
          created_at: string
          delivered_at: string | null
          event_type: string | null
          id: string
          idempotency_key: string | null
          last_retry_at: string | null
          max_retries: number | null
          metadata: Json | null
          notification_type: string
          recipient_email: string
          retry_count: number | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          company_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          last_retry_at?: string | null
          max_retries?: number | null
          metadata?: Json | null
          notification_type: string
          recipient_email: string
          retry_count?: number | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          company_id?: string | null
          created_at?: string
          delivered_at?: string | null
          event_type?: string | null
          id?: string
          idempotency_key?: string | null
          last_retry_at?: string | null
          max_retries?: number | null
          metadata?: Json | null
          notification_type?: string
          recipient_email?: string
          retry_count?: number | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_in_app: boolean
          created_at: string
          id: string
          is_enabled: boolean
          notification_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean
          channel_in_app?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          notification_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          contract_id: string | null
          created_at: string | null
          event_type: string | null
          id: string
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string | null
          event_type?: string | null
          id?: string
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          company_id: string
          contract_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          payment_date: string | null
          proof_url: string | null
          reference_month: string
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          contract_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          proof_url?: string | null
          reference_month: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          contract_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          proof_url?: string | null
          reference_month?: string
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_contracts: number | null
          min_contracts: number
          name: string
          price_per_contract: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_contracts?: number | null
          min_contracts: number
          name: string
          price_per_contract: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_contracts?: number | null
          min_contracts?: number
          name?: string
          price_per_contract?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          address_cep: string | null
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          avatar_url: string | null
          birth_date: string | null
          company_id: string | null
          cpf: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          identity_issuer: string | null
          identity_number: string | null
          is_active: boolean | null
          marital_status: string | null
          nationality: string | null
          phone: string | null
          pj_bank_account: string | null
          pj_bank_account_type: string | null
          pj_bank_agency: string | null
          pj_bank_name: string | null
          pj_cnpj: string | null
          pj_nome_fantasia: string | null
          pj_onboarding_done: boolean | null
          pj_pix_key: string | null
          pj_pix_key_type: string | null
          pj_razao_social: string | null
          pj_regime_tributario: string | null
          profession: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          identity_issuer?: string | null
          identity_number?: string | null
          is_active?: boolean | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          pj_bank_account?: string | null
          pj_bank_account_type?: string | null
          pj_bank_agency?: string | null
          pj_bank_name?: string | null
          pj_cnpj?: string | null
          pj_nome_fantasia?: string | null
          pj_onboarding_done?: boolean | null
          pj_pix_key?: string | null
          pj_pix_key_type?: string | null
          pj_razao_social?: string | null
          pj_regime_tributario?: string | null
          profession?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          address_cep?: string | null
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          company_id?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          identity_issuer?: string | null
          identity_number?: string | null
          is_active?: boolean | null
          marital_status?: string | null
          nationality?: string | null
          phone?: string | null
          pj_bank_account?: string | null
          pj_bank_account_type?: string | null
          pj_bank_agency?: string | null
          pj_bank_name?: string | null
          pj_cnpj?: string | null
          pj_nome_fantasia?: string | null
          pj_onboarding_done?: boolean | null
          pj_pix_key?: string | null
          pj_pix_key_type?: string | null
          pj_razao_social?: string | null
          pj_regime_tributario?: string | null
          profession?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applies_to: string | null
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          applies_to?: string | null
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          end_date: string
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          applies_to?: string | null
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      signature_provider_configs: {
        Row: {
          api_key_secret_name: string | null
          company_id: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          provider_name: string
          sandbox_mode: boolean | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          api_key_secret_name?: string | null
          company_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_name: string
          sandbox_mode?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_key_secret_name?: string | null
          company_id?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          provider_name?: string
          sandbox_mode?: boolean | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_provider_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_provider_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          priority: string
          target_company_id: string | null
          target_roles: string[] | null
          target_type: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          priority?: string
          target_company_id?: string | null
          target_roles?: string[] | null
          target_type?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          priority?: string
          target_company_id?: string | null
          target_roles?: string[] | null
          target_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_announcements_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_announcements_created_by_profile_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_secure"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_announcements_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_announcements_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      lgpd_deletion_requests: {
        Row: {
          id: string
          user_id: string
          requester_email: string
          reason: string | null
          status: "pending" | "in_review" | "completed" | "rejected"
          rejection_reason: string | null
          anonymized_at: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          requester_email: string
          reason?: string | null
          status?: "pending" | "in_review" | "completed" | "rejected"
          rejection_reason?: string | null
          anonymized_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          requester_email?: string
          reason?: string | null
          status?: "pending" | "in_review" | "completed" | "rejected"
          rejection_reason?: string | null
          anonymized_at?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pj_documents: {
        Row: {
          id: string
          user_id: string
          company_id: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          status: "pending" | "approved" | "rejected"
          rejection_reason: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id?: string | null
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          status?: "pending" | "approved" | "rejected"
          rejection_reason?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string | null
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          status?: "pending" | "approved" | "rejected"
          rejection_reason?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      audit_log_full: {
        Row: {
          action: string | null
          action_category: string | null
          actor_email: string | null
          actor_full_name: string | null
          actor_id: string | null
          actor_name: string | null
          company_id: string | null
          contract_id: string | null
          contract_job_title: string | null
          contract_status: Database["public"]["Enums"]["contract_status"] | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string | null
          details: Json | null
          document_id: string | null
          id: string | null
          ip_address: string | null
          user_agent: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts_secure"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_audit_logs_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "pj_payment_queue"
            referencedColumns: ["contract_id"]
          },
          {
            foreignKeyName: "contract_audit_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "contract_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      companies_secure: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: never
          cnpj?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          phone?: never
          updated_at?: string | null
        }
        Update: {
          address?: never
          cnpj?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string | null
          phone?: never
          updated_at?: string | null
        }
        Relationships: []
      }
      contracts_secure: {
        Row: {
          company_id: string | null
          contract_type: Database["public"]["Enums"]["contract_type"] | null
          created_at: string | null
          created_by: string | null
          department: string | null
          document_url: string | null
          end_date: string | null
          hourly_rate: number | null
          id: string | null
          job_title: string | null
          notes: string | null
          salary: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["contract_status"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          document_url?: string | null
          end_date?: string | null
          hourly_rate?: never
          id?: string | null
          job_title?: string | null
          notes?: string | null
          salary?: never
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"] | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          document_url?: string | null
          end_date?: string | null
          hourly_rate?: never
          id?: string | null
          job_title?: string | null
          notes?: string | null
          salary?: never
          start_date?: string | null
          status?: Database["public"]["Enums"]["contract_status"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_dashboard: {
        Row: {
          approved_count: number | null
          company_id: string | null
          month: string | null
          paid_count: number | null
          pending_count: number | null
          rejected_count: number | null
          total_approved: number | null
          total_paid: number | null
          total_pending: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_alerts: {
        Row: {
          alert_date: string | null
          alert_type: string | null
          company_id: string | null
          message: string | null
          reference_id: string | null
        }
        Relationships: []
      }
      pj_payment_queue: {
        Row: {
          company_id: string | null
          contract_id: string | null
          email: string | null
          end_date: string | null
          full_name: string | null
          job_title: string | null
          monthly_value: number | null
          payment_day: number | null
          payment_frequency: string | null
          start_date: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_secure: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          cpf?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          phone?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          cpf?: never
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          phone?: never
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_secure"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_view_sensitive_profile_data: {
        Args: { _target_company_id: string; _user_id: string }
        Returns: boolean
      }
      generate_document_hash: { Args: { content: string }; Returns: string }
      get_invite_by_token: {
        Args: { _token: string }
        Returns: {
          company_id: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["invite_status"]
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      handle_invited_user_signup: {
        Args: {
          _cpf: string
          _email: string
          _full_name: string
          _invite_token: string
          _phone: string
          _user_id: string
        }
        Returns: Json
      }
      handle_master_admin_signup: {
        Args: {
          _cpf: string
          _email: string
          _full_name: string
          _phone: string
          _user_id: string
        }
        Returns: Json
      }
      handle_new_user_signup: {
        Args: {
          _cnpj: string
          _company_name: string
          _cpf: string
          _email: string
          _full_name: string
          _phone: string
          _user_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_financeiro: { Args: { _user_id: string }; Returns: boolean }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      anonymize_user_data: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "master_admin"
        | "admin"
        | "financeiro"
        | "gestor"
        | "colaborador"
        | "juridico"
        | "pj"
      contract_status:
        | "active"
        | "inactive"
        | "terminated"
        | "enviado"
        | "assinado"
      contract_type: "CLT" | "PJ" | "estagio" | "temporario"
      invite_status: "pending" | "accepted" | "expired" | "cancelled"
      payment_status: "pending" | "approved" | "paid" | "rejected"
      signature_status: "pending" | "partial" | "completed" | "cancelled"
      signer_type: "contractor" | "company_representative" | "witness"
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
      app_role: [
        "master_admin",
        "admin",
        "financeiro",
        "gestor",
        "colaborador",
        "juridico",
        "pj",
      ],
      contract_status: [
        "active",
        "inactive",
        "terminated",
        "enviado",
        "assinado",
      ],
      contract_type: ["CLT", "PJ", "estagio", "temporario"],
      invite_status: ["pending", "accepted", "expired", "cancelled"],
      payment_status: ["pending", "approved", "paid", "rejected"],
      signature_status: ["pending", "partial", "completed", "cancelled"],
      signer_type: ["contractor", "company_representative", "witness"],
    },
  },
} as const
