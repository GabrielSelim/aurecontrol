import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchInvitesByCompany,
  createInvite,
  extendInviteExpiry,
  renewExpiredInvite,
  updateInviteStatus,
} from "@/services/inviteService";
import { fetchActiveContractsByCompany } from "@/services/contractService";
import { fetchProfileByUserId, fetchProfileByEmail } from "@/services/profileService";
import { queryKeys } from "./queryKeys";

/* ------------------------------------------------------------------ */
/*  Shared types                                                      */
/* ------------------------------------------------------------------ */

export interface OnboardingInfo {
  hasPassword: boolean;
  hasPersonalData: boolean;
  hasFiscalData: boolean;
  hasAddress: boolean;
  completionPercent: number;
}

export interface InviteWithOnboarding {
  id: string;
  email: string;
  token: string;
  company_id: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  onboarding?: OnboardingInfo;
}

/* ------------------------------------------------------------------ */
/*  Queries                                                           */
/* ------------------------------------------------------------------ */

/**
 * Fetches invites for a company, enriched with onboarding progress
 * for accepted invites.
 */
export function useInvites(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invites.list(companyId!),
    queryFn: async (): Promise<InviteWithOnboarding[]> => {
      const data = await fetchInvitesByCompany(companyId!);

      return Promise.all(
        data.map(async (invite) => {
          if (invite.status !== "accepted") return invite as InviteWithOnboarding;

          const profileData = await fetchProfileByEmail(
            invite.email,
            companyId!,
          );

          if (!profileData) return invite as InviteWithOnboarding;

          const hasPassword = true; // If accepted, they have a password
          const hasPersonalData = !!(
            profileData.full_name &&
            profileData.cpf &&
            profileData.phone
          );
          const hasFiscalData = !!(
            profileData.pj_cnpj || profileData.pj_razao_social
          );
          const hasAddress = !!(
            profileData.address_cep &&
            profileData.address_street &&
            profileData.address_city
          );

          const steps = [hasPassword, hasPersonalData, hasFiscalData, hasAddress];
          const completionPercent = Math.round(
            (steps.filter(Boolean).length / steps.length) * 100,
          );

          return {
            ...invite,
            onboarding: {
              hasPassword,
              hasPersonalData,
              hasFiscalData,
              hasAddress,
              completionPercent,
            },
          } as InviteWithOnboarding;
        }),
      );
    },
    enabled: !!companyId,
  });
}

/**
 * Fetches active contracts with profile names for the invite dialog
 * "link to contract" feature.
 */
export function useAvailableContracts(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.contracts.list(companyId!, { available: true }),
    queryFn: async () => {
      const data = await fetchActiveContractsByCompany(companyId!);
      return Promise.all(
        data.map(async (c) => {
          let profileName = "";
          try {
            const prof = await fetchProfileByUserId(c.user_id);
            profileName = prof.full_name || "";
          } catch {
            /* profile may not exist */
          }
          return {
            id: c.id,
            job_title: c.job_title,
            profile_name: profileName,
          };
        }),
      );
    },
    enabled: !!companyId,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                         */
/* ------------------------------------------------------------------ */

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invite: {
      email: string;
      role: string;
      company_id: string;
      invited_by: string;
      expires_at?: string;
    }) => createInvite(invite),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.invites.list(variables.company_id),
      });
    },
  });
}

export function useExtendInviteExpiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inviteId,
      newExpiresAt,
    }: {
      inviteId: string;
      newExpiresAt: string;
      companyId: string;
    }) => extendInviteExpiry(inviteId, newExpiresAt),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.invites.list(variables.companyId),
      });
    },
  });
}

export function useRenewExpiredInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inviteId,
      newExpiresAt,
    }: {
      inviteId: string;
      newExpiresAt: string;
      companyId: string;
    }) => renewExpiredInvite(inviteId, newExpiresAt),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.invites.list(variables.companyId),
      });
    },
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inviteId,
    }: {
      inviteId: string;
      companyId: string;
    }) => updateInviteStatus(inviteId, "cancelled"),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.invites.list(variables.companyId),
      });
    },
  });
}
