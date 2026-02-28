import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveCompanies,
  fetchCompany,
  fetchAllCompanies,
  fetchRecentCompanies,
  countAllCompanies,
  countActiveCompanies,
} from "@/services/companyService";
import { countProfilesByCompany } from "@/services/profileService";
import { countContractsByCompany, countAllActivePJContracts } from "@/services/contractService";
import { queryKeys } from "./queryKeys";

export function useActiveCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.list({ active: true }),
    queryFn: fetchActiveCompanies,
  });
}

export function useCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId!),
    queryFn: () => fetchCompany(companyId!),
    enabled: !!companyId,
  });
}

/* ------------------------------------------------------------------ */
/*  Empresas page — all companies with users / contracts counts       */
/* ------------------------------------------------------------------ */

export interface CompanyWithCounts {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  _count: {
    users: number;
    pjContracts: number;
    otherContracts: number;
  };
}

export function useAllCompaniesWithCounts() {
  return useQuery({
    queryKey: queryKeys.companies.list({ withCounts: true }),
    queryFn: async (): Promise<CompanyWithCounts[]> => {
      const companiesData = await fetchAllCompanies();
      if (!companiesData) return [];

      return Promise.all(
        companiesData.map(async (company) => {
          const [usersCount, pjContractsCount, totalContractsCount] =
            await Promise.all([
              countProfilesByCompany(company.id),
              countContractsByCompany(company.id, "PJ"),
              countContractsByCompany(company.id),
            ]);
          return {
            ...company,
            _count: {
              users: usersCount,
              pjContracts: pjContractsCount,
              otherContracts: totalContractsCount - pjContractsCount,
            },
          };
        }),
      );
    },
  });
}

/* ------------------------------------------------------------------ */
/*  MasterAdminOverview — global stats + recent companies             */
/* ------------------------------------------------------------------ */

export interface MasterAdminGlobalStats {
  totalCompanies: number;
  activeCompanies: number;
  totalPJContracts: number;
  estimatedRevenue: number;
}

export interface RecentCompanyWithCounts {
  id: string;
  name: string;
  cnpj: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  _count: {
    users: number;
    pjContracts: number;
  };
}

export function useMasterAdminOverview() {
  return useQuery({
    queryKey: queryKeys.companies.list({ masterAdmin: true }),
    queryFn: async (): Promise<{
      stats: MasterAdminGlobalStats;
      companies: RecentCompanyWithCounts[];
    }> => {
      const [totalCompanies, activeCompanies, totalPJContracts] =
        await Promise.all([
          countAllCompanies(),
          countActiveCompanies(),
          countAllActivePJContracts(),
        ]);

      const pricePerContract = 49.9;

      const stats: MasterAdminGlobalStats = {
        totalCompanies,
        activeCompanies,
        totalPJContracts,
        estimatedRevenue: totalPJContracts * pricePerContract,
      };

      const companiesData = await fetchRecentCompanies(5);

      const companies = await Promise.all(
        companiesData.map(async (company) => {
          const [usersCount, pjContractsCount] = await Promise.all([
            countProfilesByCompany(company.id),
            countContractsByCompany(company.id, "PJ"),
          ]);
          return {
            ...company,
            _count: { users: usersCount, pjContracts: pjContractsCount },
          };
        }),
      );

      return { stats, companies };
    },
  });
}
