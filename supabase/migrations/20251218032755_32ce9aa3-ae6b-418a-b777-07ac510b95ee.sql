-- Create contract templates table
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- HTML template with placeholders like {{contractor_name}}, {{company_name}}, etc.
  is_system_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  default_witness_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create contract signature status enum
CREATE TYPE public.signature_status AS ENUM ('pending', 'partial', 'completed', 'cancelled');

-- Create signer type enum
CREATE TYPE public.signer_type AS ENUM ('contractor', 'company_representative', 'witness');

-- Create contract documents table (generated contracts from templates)
CREATE TABLE public.contract_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.contract_templates(id),
  document_html TEXT NOT NULL, -- The rendered HTML with data filled in
  witness_count INTEGER DEFAULT 0,
  signature_status signature_status DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(contract_id) -- One document per contract
);

-- Create contract signatures table
CREATE TABLE public.contract_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.contract_documents(id) ON DELETE CASCADE,
  signer_type signer_type NOT NULL,
  signer_order INTEGER DEFAULT 0, -- Order for witnesses (1, 2, 3...)
  signer_user_id UUID, -- References auth user if internal
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_document TEXT, -- CPF or CNPJ
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_image_url TEXT, -- URL to signature image in storage (for simple signatures)
  external_signature_id TEXT, -- For future DocuSign/HelloSign integration
  external_signature_provider TEXT, -- 'docusign', 'hellosign', etc.
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_templates
CREATE POLICY "Users can view system templates"
ON public.contract_templates FOR SELECT
USING (is_system_default = true AND is_active = true);

CREATE POLICY "Users can view their company templates"
ON public.contract_templates FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND is_active = true);

CREATE POLICY "Admins can manage company templates"
ON public.contract_templates FOR ALL
USING (is_company_admin(auth.uid(), company_id) OR (company_id IS NULL AND is_master_admin(auth.uid())));

CREATE POLICY "Master admins can manage all templates"
ON public.contract_templates FOR ALL
USING (is_master_admin(auth.uid()));

-- RLS Policies for contract_documents
CREATE POLICY "Users can view their own contract documents"
ON public.contract_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Company admins can manage contract documents"
ON public.contract_documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id AND is_company_admin(auth.uid(), c.company_id)
  )
);

CREATE POLICY "Master admins can manage all documents"
ON public.contract_documents FOR ALL
USING (is_master_admin(auth.uid()));

CREATE POLICY "Juridico can view contract documents in their company"
ON public.contract_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_id 
    AND c.company_id = get_user_company_id(auth.uid()) 
    AND has_role(auth.uid(), 'juridico')
  )
);

-- RLS Policies for contract_signatures
CREATE POLICY "Users can view their own signatures"
ON public.contract_signatures FOR SELECT
USING (signer_user_id = auth.uid());

CREATE POLICY "Users can sign documents addressed to them"
ON public.contract_signatures FOR UPDATE
USING (signer_user_id = auth.uid() OR signer_email = (SELECT email FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Company admins can manage signatures"
ON public.contract_signatures FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.contract_documents cd
    JOIN public.contracts c ON c.id = cd.contract_id
    WHERE cd.id = document_id AND is_company_admin(auth.uid(), c.company_id)
  )
);

CREATE POLICY "Master admins can manage all signatures"
ON public.contract_signatures FOR ALL
USING (is_master_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON public.contract_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_documents_updated_at
BEFORE UPDATE ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contract_signatures_updated_at
BEFORE UPDATE ON public.contract_signatures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system template for PJ contracts
INSERT INTO public.contract_templates (company_id, name, description, content, is_system_default, default_witness_count)
VALUES (
  NULL,
  'Contrato de Prestação de Serviços PJ - Padrão',
  'Template padrão do sistema para contratos PJ',
  '<div class="contract-document">
  <h1 style="text-align: center;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>
  
  <p><strong>CONTRATANTE:</strong> {{company_name}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{company_cnpj}}, com sede em {{company_address}}, neste ato representada por {{company_representative_name}}, doravante denominada simplesmente CONTRATANTE.</p>
  
  <p><strong>CONTRATADO(A):</strong> {{contractor_company_name}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{contractor_cnpj}}, com sede em {{contractor_address}}, neste ato representada por {{contractor_name}}, portador(a) do CPF nº {{contractor_cpf}}, doravante denominado(a) simplesmente CONTRATADO(A).</p>
  
  <p>As partes acima qualificadas celebram o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, que será regido pelas seguintes cláusulas e condições:</p>
  
  <h2>CLÁUSULA PRIMEIRA - DO OBJETO</h2>
  <p>O presente contrato tem por objeto a prestação de serviços de {{job_title}} pelo(a) CONTRATADO(A) à CONTRATANTE, conforme as especificações e condições estabelecidas neste instrumento.</p>
  
  <h2>CLÁUSULA SEGUNDA - DA VIGÊNCIA</h2>
  <p>O presente contrato terá vigência a partir de {{start_date}}{{#if end_date}}, com término previsto para {{end_date}}{{else}}, por prazo indeterminado{{/if}}.</p>
  
  <h2>CLÁUSULA TERCEIRA - DA REMUNERAÇÃO</h2>
  <p>Pelos serviços prestados, a CONTRATANTE pagará ao(à) CONTRATADO(A) o valor de {{salary}}, mediante apresentação de Nota Fiscal de Serviços.</p>
  
  <h2>CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATADO</h2>
  <p>São obrigações do(a) CONTRATADO(A):</p>
  <ul>
    <li>Executar os serviços contratados com zelo, diligência e competência;</li>
    <li>Manter sigilo sobre todas as informações confidenciais da CONTRATANTE;</li>
    <li>Emitir Nota Fiscal correspondente aos serviços prestados;</li>
    <li>Manter regularidade fiscal e tributária durante a vigência do contrato.</li>
  </ul>
  
  <h2>CLÁUSULA QUINTA - DAS OBRIGAÇÕES DA CONTRATANTE</h2>
  <p>São obrigações da CONTRATANTE:</p>
  <ul>
    <li>Efetuar o pagamento dos serviços na forma e prazo estabelecidos;</li>
    <li>Fornecer as informações necessárias para a execução dos serviços;</li>
    <li>Proporcionar condições adequadas para a prestação dos serviços.</li>
  </ul>
  
  <h2>CLÁUSULA SEXTA - DA RESCISÃO</h2>
  <p>O presente contrato poderá ser rescindido por qualquer das partes, mediante comunicação prévia por escrito com antecedência mínima de 30 (trinta) dias.</p>
  
  <h2>CLÁUSULA SÉTIMA - DO FORO</h2>
  <p>Fica eleito o foro da comarca de {{company_city}} para dirimir quaisquer dúvidas ou litígios oriundos do presente contrato.</p>
  
  <p style="margin-top: 40px;">E, por estarem assim justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor e forma.</p>
  
  <p style="margin-top: 20px;">{{city}}, {{current_date}}</p>
  
  <div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 45%;">
      <div class="signature-line" data-signer="company_representative">_________________________________</div>
      <p><strong>CONTRATANTE</strong></p>
      <p>{{company_name}}</p>
    </div>
    <div style="text-align: center; width: 45%;">
      <div class="signature-line" data-signer="contractor">_________________________________</div>
      <p><strong>CONTRATADO(A)</strong></p>
      <p>{{contractor_name}}</p>
    </div>
  </div>
  
  <div class="witnesses-section" style="margin-top: 60px;">
    <p><strong>TESTEMUNHAS:</strong></p>
    <div style="display: flex; justify-content: space-between; margin-top: 40px;">
      {{#each witnesses}}
      <div style="text-align: center; width: 45%;">
        <div class="signature-line" data-signer="witness_{{@index}}">_________________________________</div>
        <p>Nome: {{this.name}}</p>
        <p>CPF: {{this.cpf}}</p>
      </div>
      {{/each}}
    </div>
  </div>
</div>',
  true,
  2
);