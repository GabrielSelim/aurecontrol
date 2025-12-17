import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();

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

    console.log(`Validating CNPJ: ${cleanCNPJ}`);

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
