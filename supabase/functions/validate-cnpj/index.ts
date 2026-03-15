import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getClientIp } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CNPJResponse {
  valid: boolean;
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao?: string;
  uf?: string;
  municipio?: string;
  bairro?: string;
  logradouro?: string;
  numero?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  error?: string;
  already_registered?: boolean;
  existing_company_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj, check_duplicate = true, exclude_company_id } = await req.json();

    // Rate limit: 30 CNPJ lookups per minute per IP
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(supabase, `cnpj:${ip}`, 30, 60);
    if (!allowed) {
      return new Response(
        JSON.stringify({ valid: false, error: "Muitas requisições. Aguarde um momento." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!cnpj) {
      return new Response(
        JSON.stringify({ valid: false, error: 'CNPJ não informado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove formatting from CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');

    if (cleanCNPJ.length !== 14) {
      return new Response(
        JSON.stringify({ valid: false, error: 'CNPJ deve ter 14 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Validating CNPJ: ${cleanCNPJ}, check_duplicate: ${check_duplicate}, exclude_company_id: ${exclude_company_id}`);

    // Check if CNPJ already exists in database
    if (check_duplicate) {
      let query = supabase
        .from('companies')
        .select('id, name')
        .eq('cnpj', cleanCNPJ);
      
      // Exclude a specific company (useful for edit scenarios)
      if (exclude_company_id) {
        query = query.neq('id', exclude_company_id);
      }

      const { data: existingCompany, error: dbError } = await query.maybeSingle();

      if (dbError) {
        console.error('Database error:', dbError);
      } else if (existingCompany) {
        console.log(`CNPJ ${cleanCNPJ} already registered: ${existingCompany.name}`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            cnpj: cleanCNPJ,
            already_registered: true,
            existing_company_name: existingCompany.name,
            error: `CNPJ já cadastrado para a empresa "${existingCompany.name}"` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Call BrasilAPI to validate CNPJ (free, no API key required)
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`CNPJ ${cleanCNPJ} not found in Receita Federal`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            cnpj: cleanCNPJ,
            error: 'CNPJ não encontrado na Receita Federal' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 429) {
        console.log('Rate limit exceeded on BrasilAPI');
        return new Response(
          JSON.stringify({ 
            valid: false, 
            cnpj: cleanCNPJ,
            error: 'Muitas requisições. Aguarde um momento e tente novamente.' 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`BrasilAPI returned status ${response.status}`);
    }

    const data = await response.json();
    console.log(`CNPJ ${cleanCNPJ} found: ${data.razao_social}`);

    // Build response with company data
    const result: CNPJResponse = {
      valid: true,
      cnpj: cleanCNPJ,
      razao_social: data.razao_social,
      nome_fantasia: data.nome_fantasia || data.razao_social,
      situacao: data.descricao_situacao_cadastral,
      uf: data.uf,
      municipio: data.municipio,
      bairro: data.bairro,
      logradouro: data.logradouro,
      numero: data.numero,
      cep: data.cep,
      telefone: data.ddd_telefone_1,
      email: data.email,
      already_registered: false,
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating CNPJ:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Erro ao validar CNPJ. Tente novamente.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
