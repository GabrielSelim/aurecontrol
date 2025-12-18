/**
 * Signature Provider Integration Types
 * 
 * This file defines the structure for integrating with external signature providers
 * such as ClickSign, DocuSign, D4Sign, Autentique, and ZapSign.
 * 
 * The architecture is designed to be provider-agnostic, allowing easy addition
 * of new providers without modifying existing code.
 */

export type SignatureProviderName = 
  | 'clicksign'
  | 'docusign'
  | 'd4sign'
  | 'autentique'
  | 'zapsign'
  | 'internal'; // Our internal signature system

export interface SignatureProviderConfig {
  id: string;
  companyId: string;
  providerName: SignatureProviderName;
  isActive: boolean;
  apiKeySecretName: string | null;
  webhookUrl: string | null;
  sandboxMode: boolean;
  config: Record<string, unknown>;
}

export interface ExternalSignatureRequest {
  documentId: string;
  documentTitle: string;
  documentContent: string; // HTML or PDF base64
  signers: ExternalSigner[];
  callbackUrl?: string;
  expiresAt?: Date;
}

export interface ExternalSigner {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  signaturePositionX?: number;
  signaturePositionY?: number;
  signaturePageNumber?: number;
  order: number;
  role: 'contractor' | 'company_representative' | 'witness';
}

export interface ExternalSignatureResponse {
  externalId: string;
  status: 'pending' | 'sent' | 'signed' | 'rejected' | 'expired' | 'cancelled';
  signers: ExternalSignerStatus[];
  documentUrl?: string;
  signedDocumentUrl?: string;
}

export interface ExternalSignerStatus {
  email: string;
  status: 'pending' | 'signed' | 'rejected';
  signedAt?: Date;
  signatureUrl?: string;
}

/**
 * Base interface for all signature providers
 * Each provider implementation should extend this interface
 */
export interface ISignatureProvider {
  name: SignatureProviderName;
  displayName: string;
  logoUrl?: string;
  
  // Core methods
  createSignatureRequest(request: ExternalSignatureRequest): Promise<ExternalSignatureResponse>;
  getSignatureStatus(externalId: string): Promise<ExternalSignatureResponse>;
  cancelSignatureRequest(externalId: string): Promise<boolean>;
  downloadSignedDocument(externalId: string): Promise<Blob>;
  
  // Webhook handling
  parseWebhookPayload(payload: unknown): ExternalSignatureResponse;
  verifyWebhookSignature(payload: string, signature: string): boolean;
}

/**
 * Provider metadata for UI display
 */
export const SIGNATURE_PROVIDERS: Record<SignatureProviderName, {
  displayName: string;
  description: string;
  website: string;
  supportsIcpBrasil: boolean;
  priceRange: string;
}> = {
  internal: {
    displayName: 'Assinatura Interna',
    description: 'Sistema de assinatura integrado (não possui validade jurídica ICP-Brasil)',
    website: '',
    supportsIcpBrasil: false,
    priceRange: 'Gratuito',
  },
  clicksign: {
    displayName: 'ClickSign',
    description: 'Plataforma brasileira de assinatura eletrônica com validade jurídica',
    website: 'https://www.clicksign.com',
    supportsIcpBrasil: true,
    priceRange: 'A partir de R$ 49/mês',
  },
  docusign: {
    displayName: 'DocuSign',
    description: 'Líder mundial em assinaturas eletrônicas',
    website: 'https://www.docusign.com',
    supportsIcpBrasil: true,
    priceRange: 'A partir de $15/mês',
  },
  d4sign: {
    displayName: 'D4Sign',
    description: 'Assinatura digital com certificado ICP-Brasil',
    website: 'https://www.d4sign.com.br',
    supportsIcpBrasil: true,
    priceRange: 'A partir de R$ 29/mês',
  },
  autentique: {
    displayName: 'Autentique',
    description: 'Plataforma brasileira de assinatura digital',
    website: 'https://www.autentique.com.br',
    supportsIcpBrasil: true,
    priceRange: 'A partir de R$ 29/mês',
  },
  zapsign: {
    displayName: 'ZapSign',
    description: 'Assinatura eletrônica simples e rápida',
    website: 'https://www.zapsign.com.br',
    supportsIcpBrasil: true,
    priceRange: 'A partir de R$ 19/mês',
  },
};

/**
 * Factory function to create provider instances
 * This will be implemented when integrating with specific providers
 */
export function createSignatureProvider(
  providerName: SignatureProviderName,
  config: SignatureProviderConfig
): ISignatureProvider | null {
  // For now, return null as we haven't implemented specific providers yet
  // When implementing, this will return the appropriate provider instance
  
  switch (providerName) {
    case 'internal':
      // Internal provider doesn't need external API
      return null;
    case 'clicksign':
      // TODO: Implement ClickSign provider
      // return new ClickSignProvider(config);
      return null;
    case 'docusign':
      // TODO: Implement DocuSign provider
      // return new DocuSignProvider(config);
      return null;
    case 'd4sign':
      // TODO: Implement D4Sign provider
      // return new D4SignProvider(config);
      return null;
    case 'autentique':
      // TODO: Implement Autentique provider
      // return new AutentiqueProvider(config);
      return null;
    case 'zapsign':
      // TODO: Implement ZapSign provider
      // return new ZapSignProvider(config);
      return null;
    default:
      return null;
  }
}

/**
 * Helper to check if a provider is configured and active for a company
 */
export async function getActiveSignatureProvider(
  companyId: string
): Promise<SignatureProviderConfig | null> {
  const { supabase } = await import('@/integrations/supabase/client');
  
  const { data, error } = await supabase
    .from('signature_provider_configs')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .maybeSingle();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    companyId: data.company_id,
    providerName: data.provider_name as SignatureProviderName,
    isActive: data.is_active,
    apiKeySecretName: data.api_key_secret_name,
    webhookUrl: data.webhook_url,
    sandboxMode: data.sandbox_mode,
    config: (data.config as Record<string, unknown>) || {},
  };
}
