import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchPaymentsByCompany, createPayments, approvePayment, batchApprovePayments, rejectPayment, fetchContractSplits } from "@/services/paymentService";
import { fetchProfileByUserId, fetchProfileByUserIdMaybe } from "@/services/profileService";
import { fetchActiveContractsByCompany } from "@/services/contractService";
import { fetchNfseByContract } from "@/services/nfseService";
import { sendEmail, gerarObrigacoesPJ } from "@/services/edgeFunctionService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  MoreHorizontal,
  CreditCard,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  TrendingUp,
  AlertTriangle,
  X,
  Users,
  Zap,
  FileCheck,
  FileClock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebounce } from "@/hooks/useDebounce";
import { logger } from "@/lib/logger";

interface Payment {
  id: string;
  user_id: string;
  company_id: string;
  contract_id: string;
  amount: number;
  description: string | null;
  reference_month: string;
  payment_date: string | null;
  due_date: string | null;
  status: string;
  created_at: string;
  profile?: {
    full_name: string;
    email: string;
  };
}

interface Contract {
  id: string;
  user_id: string;
  job_title: string;
  salary: number | null;
  contract_type?: string;
  profile?: {
    full_name: string;
  };
}

const Pagamentos = () => {
  useDocumentTitle("Pagamentos");
  const { profile, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  const [pagamentos, setPagamentos] = useState<Payment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [splitsMap, setSplitsMap] = useState<Record<string, { beneficiary_name: string; beneficiary_document: string | null; percentage: number }[]>>({});
  const [nfseStatusMap, setNfseStatusMap] = useState<Record<string, "emitida" | "pendente" | "loading">>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [contractFilter, setContractFilter] = useState<string>("all");

  // Form state
  const [selectedContractId, setSelectedContractId] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const [batchMonths, setBatchMonths] = useState("3");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const canManagePayments = isAdmin() || hasRole("financeiro");

  // Auto-fill when contract is selected
  const handleContractSelect = async (contractId: string) => {
    setSelectedContractId(contractId);
    setDuplicateWarning("");
    
    const contract = contracts.find(c => c.id === contractId);
    if (contract) {
      // Auto-fill value from contract salary
      if (contract.salary) {
        setAmount(contract.salary.toString());
      }
      
      // Auto-fill description
      setDescription(`Pagamento mensal - ${contract.profile?.full_name || contract.job_title}`);
      
      // Suggest next reference month
      const existingMonths = pagamentos
        .filter(p => p.contract_id === contractId)
        .map(p => p.reference_month)
        .sort();
      
      if (existingMonths.length > 0) {
        const lastMonth = new Date(existingMonths[existingMonths.length - 1]);
        lastMonth.setMonth(lastMonth.getMonth() + 1);
        const nextMonth = lastMonth.toISOString().slice(0, 7);
        setReferenceMonth(nextMonth);
      } else {
        // Default to current month
        const now = new Date();
        setReferenceMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      }
    }
  };

  // Check for duplicate when reference month changes
  const handleReferenceMonthChange = (month: string) => {
    setReferenceMonth(month);
    setDuplicateWarning("");
    
    if (selectedContractId && month) {
      const existing = pagamentos.find(
        p => p.contract_id === selectedContractId && p.reference_month.startsWith(month)
      );
      if (existing) {
        const statusLabel = existing.status === "paid" ? "pago" : existing.status === "pending" ? "pendente" : "rejeitado";
        setDuplicateWarning(`Já existe um pagamento ${statusLabel} para este contrato em ${month}`);
      }
    }
  };

  const fetchSplits = async () => {
    if (!profile?.company_id) return;
    try {
      const data = await fetchContractSplits();
      const map: Record<string, { beneficiary_name: string; beneficiary_document: string | null; percentage: number }[]> = {};
      data.forEach(s => {
        if (!map[s.contract_id]) map[s.contract_id] = [];
        map[s.contract_id].push({ beneficiary_name: s.beneficiary_name, beneficiary_document: s.beneficiary_document, percentage: s.percentage });
      });
      setSplitsMap(map);
    } catch (err) {
      logger.error("Error fetching splits:", err);
    }
  };

  useEffect(() => {
    fetchPagamentos();
    fetchContracts();
    fetchSplits();
  }, [profile?.company_id]);

  // Prefetch NFS-e status for pending PJ payments
  useEffect(() => {
    if (pagamentos.length === 0 || contracts.length === 0) return;
    const contractTypeMap: Record<string, string> = {};
    contracts.forEach((c) => { if (c.contract_type) contractTypeMap[c.id] = c.contract_type; });

    const pendingPjContractIds = [...new Set(
      pagamentos
        .filter((p) => p.status === "pending" && contractTypeMap[p.contract_id] === "PJ")
        .map((p) => p.contract_id)
    )];

    if (pendingPjContractIds.length === 0) return;

    // Mark all as loading first
    setNfseStatusMap((prev) => {
      const updated = { ...prev };
      pendingPjContractIds.forEach((id) => { if (!(id in updated)) updated[id] = "loading"; });
      return updated;
    });

    // Fetch NFS-e for each PJ contract
    pendingPjContractIds.forEach(async (contractId) => {
      try {
        const nfseList = await fetchNfseByContract(contractId);
        const month = new Date().toISOString().substring(0, 7);
        const hasEmitted = nfseList.some(
          (n) => n.status === "emitida" && n.reference_month?.startsWith(month)
        );
        setNfseStatusMap((prev) => ({ ...prev, [contractId]: hasEmitted ? "emitida" : "pendente" }));
      } catch {
        setNfseStatusMap((prev) => ({ ...prev, [contractId]: "pendente" }));
      }
    });
  }, [pagamentos, contracts]);

  const fetchPagamentos = async () => {
    if (!profile?.company_id) return;

    try {
      const data = await fetchPaymentsByCompany(profile.company_id);

      // Fetch profile info for each payment
      const pagamentosWithProfiles = await Promise.all(
        data.map(async (payment) => {
          try {
            const profileData = await fetchProfileByUserId(payment.user_id);
            return { ...payment, profile: profileData || undefined };
          } catch {
            return { ...payment, profile: undefined };
          }
        })
      );

      setPagamentos(pagamentosWithProfiles);
    } catch (error) {
      logger.error("Error fetching pagamentos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContracts = async () => {
    if (!profile?.company_id) return;

    try {
      const data = await fetchActiveContractsByCompany(profile.company_id);

      // Fetch profile names
      const contractsWithProfiles = await Promise.all(
        data.map(async (contract) => {
          try {
            const profileData = await fetchProfileByUserId(contract.user_id);
            return { ...contract, profile: profileData ? { full_name: profileData.full_name } : undefined };
          } catch {
            return { ...contract, profile: undefined };
          }
        })
      );

      setContracts(contractsWithProfiles);
    } catch (error) {
      logger.error("Error fetching contracts:", error);
    }
  };

  const handleCreatePayment = async () => {
    if (!profile?.company_id || !selectedContractId || !amount || !referenceMonth) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const selectedContract = contracts.find((c) => c.id === selectedContractId);
    if (!selectedContract) {
      toast.error("Contrato não encontrado");
      return;
    }

    setIsSubmitting(true);

    try {
      const monthCount = batchMode ? Math.min(Math.max(parseInt(batchMonths) || 1, 1), 12) : 1;
      const baseDate = new Date(`${referenceMonth}-01`);
      const payloads = [];

      for (let i = 0; i < monthCount; i++) {
        const monthDate = addMonths(baseDate, i);
        const refMonth = format(monthDate, "yyyy-MM");
        const dueDay = dueDate ? new Date(dueDate).getDate() : 10;
        const dueDateStr = `${refMonth}-${String(dueDay).padStart(2, "0")}`;

        payloads.push({
          company_id: profile.company_id,
          user_id: selectedContract.user_id,
          contract_id: selectedContractId,
          amount: parseFloat(amount),
          reference_month: `${refMonth}-01`,
          due_date: dueDateStr,
          description: description || null,
          notes: internalNotes || null,
          status: "pending" as const,
        });
      }

      await createPayments(payloads);

      // Send notification to PJ about new payment(s)
      try {
        const userProfile = await fetchProfileByUserIdMaybe(selectedContract.user_id);

        if (userProfile?.email) {
          const formattedAmount = formatCurrency(parseFloat(amount));
          const formattedMonth = format(new Date(`${referenceMonth}-01`), "MMMM/yyyy", { locale: ptBR });
          const monthLabel = monthCount > 1 ? `${monthCount} meses a partir de ${formattedMonth}` : formattedMonth;
          const html = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
  .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
</style>
</head><body>
<div class="container">
  <div class="header"><h1>\uD83D\uDCB0 Novo Pagamento Registrado</h1></div>
  <div class="content">
    <p>Olá <strong>${userProfile.full_name}</strong>,</p>
    <p>Um novo pagamento foi registrado para você:</p>
    <div class="info-box">
      <p><strong>Referência:</strong> ${monthLabel}</p>
      <p><strong>Valor:</strong> ${formattedAmount}</p>
      <p><strong>Status:</strong> Pendente</p>
    </div>
    <p>Você será notificado quando o pagamento for aprovado.</p>
    <div class="footer"><p>Aure System - Gestão de Colaboradores</p></div>
  </div>
</div>
</body></html>`;

          await sendEmail({
            to: userProfile.email,
            subject: `\uD83D\uDCB0 Novo Pagamento Registrado - ${monthLabel}`,
            html,
            from_name: "Aure System",
          });
        }
      } catch (emailError) {
        logger.error("Error sending payment creation notification:", emailError);
      }

      toast.success(
        monthCount > 1
          ? `${monthCount} pagamentos criados com sucesso!`
          : "Pagamento criado com sucesso!"
      );
      setIsDialogOpen(false);
      resetForm();
      fetchPagamentos();
    } catch (error) {
      logger.error("Error creating payment:", error);
      toast.error("Erro ao criar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendPaymentNotification = async (
    paymentId: string,
    email: string,
    userName: string,
    amount: number,
    referenceMonth: string,
    status: "approved" | "rejected"
  ) => {
    try {
      const formattedAmount = formatCurrency(amount);
      const formattedMonth = format(new Date(referenceMonth), "MMMM/yyyy", { locale: ptBR });
      
      const statusText = status === "approved" ? "Aprovado" : "Rejeitado";
      const statusColor = status === "approved" ? "#22c55e" : "#ef4444";
      const statusIcon = status === "approved" ? "✅" : "❌";
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .status-badge { display: inline-block; background: ${statusColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #666; }
    .value { font-weight: bold; color: #333; }
    .amount { font-size: 24px; color: #667eea; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusIcon} Pagamento ${statusText}</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      <p>Seu pagamento foi <span class="status-badge">${statusText}</span></p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">Mês de Referência</span>
          <span class="value">${formattedMonth}</span>
        </div>
        <div class="info-row">
          <span class="label">Valor</span>
          <span class="value amount">${formattedAmount}</span>
        </div>
        <div class="info-row">
          <span class="label">Status</span>
          <span class="value">${statusText}</span>
        </div>
      </div>
      
      ${status === "approved" 
        ? "<p>O pagamento foi processado e deve estar disponível em breve.</p>" 
        : "<p>Entre em contato com o departamento financeiro para mais informações.</p>"}
      
      <div class="footer">
        <p>Este é um email automático do Aure System.</p>
        <p>Por favor, não responda a este email.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `;

      await sendEmail({
        to: email,
        subject: `${statusIcon} Pagamento ${statusText} - ${formattedMonth}`,
        html,
        from_name: "Aure System",
      });
    } catch (error) {
      logger.error("Error sending payment notification:", error);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    const payment = pagamentos.find(p => p.id === paymentId);
    
    // Check NFS-e: if contract is PJ, BLOCK approval when no emitted NFS-e for the same reference month
    if (payment?.contract_id) {
      const contractType = contractsMap[payment.contract_id]?.contract_type;
      if (contractType === "PJ") {
        try {
          const nfseList = await fetchNfseByContract(payment.contract_id);
          const month = payment.reference_month?.substring(0, 7); // "YYYY-MM"
          const hasEmitted = nfseList.some(
            (n) => n.status === "emitida" && n.competencia?.startsWith(month ?? "")
          );
          if (!hasEmitted) {
            toast.error(
              `Aprovação bloqueada: o prestador PJ deve emitir a NFS-e referente a ${month} antes da liberação do pagamento.`,
              { duration: 8000 }
            );
            return; // HARD BLOCK — does not proceed to approvePayment
          }
        } catch {
          // If NFS-e lookup fails, warn but do not block (fail-open)
          toast.warning("Não foi possível verificar a NFS-e. Prosseguindo com aprovação.", { duration: 4000 });
        }
      }
    }

    try {
      await approvePayment(paymentId, profile?.user_id ?? "", new Date().toISOString().split("T")[0]);

      toast.success("Pagamento aprovado!");
      
      // Send notification email
      if (payment?.profile?.email) {
        sendPaymentNotification(
          paymentId,
          payment.profile.email,
          payment.profile.full_name,
          Number(payment.amount),
          payment.reference_month,
          "approved"
        );
      }
      
      fetchPagamentos();
    } catch (error) {
      logger.error("Error approving payment:", error);
      toast.error("Erro ao aprovar pagamento");
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      await batchApprovePayments(ids, profile?.user_id ?? "", new Date().toISOString().split("T")[0]);
      toast.success(`${ids.length} pagamento(s) aprovado(s)!`);
      setSelectedIds(new Set());
      fetchPagamentos();
    } catch (error) {
      logger.error("Error batch approving:", error);
      toast.error("Erro ao aprovar pagamentos em lote");
    }
  };

  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter((p) => {
      const matchesSearch =
        p.profile?.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      
      const matchesContract = contractFilter === "all" || p.contract_id === contractFilter;
      
      let matchesPeriod = true;
      if (periodFilter !== "all") {
        matchesPeriod = p.reference_month.startsWith(periodFilter);
      }

      return matchesSearch && matchesStatus && matchesContract && matchesPeriod;
    });
  }, [pagamentos, debouncedSearchTerm, statusFilter, periodFilter, contractFilter]);

  const toggleSelectAll = useCallback(() => {
    const pendingIds = filteredPagamentos
      .filter((p) => p.status === "pending")
      .map((p) => p.id);
    if (pendingIds.length === 0) return;
    const allSelected = pendingIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  }, [filteredPagamentos, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRejectPayment = async (paymentId: string) => {
    const payment = pagamentos.find(p => p.id === paymentId);
    
    try {
      await rejectPayment(paymentId);

      toast.success("Pagamento rejeitado");
      
      // Send notification email
      if (payment?.profile?.email) {
        sendPaymentNotification(
          paymentId,
          payment.profile.email,
          payment.profile.full_name,
          Number(payment.amount),
          payment.reference_month,
          "rejected"
        );
      }
      
      fetchPagamentos();
    } catch (error) {
      logger.error("Error rejecting payment:", error);
      toast.error("Erro ao rejeitar pagamento");
    }
  };

  const resetForm = () => {
    setSelectedContractId("");
    setAmount("");
    setReferenceMonth("");
    setDueDate("");
    setDescription("");
    setInternalNotes("");
    setBatchMode(false);
    setBatchMonths("3");
    setDuplicateWarning("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      rejected: "destructive",
      cancelled: "outline",
    };
    return variants[status] || "outline";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: "Pago",
      pending: "Pendente",
      rejected: "Rejeitado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatReferenceMonth = (date: string) => {
    return format(new Date(date), "MMMM/yyyy", { locale: ptBR });
  };

  // Map contract_id -> contract for quick lookup in table
  const contractsMap = useMemo(() => {
    const map: Record<string, Contract> = {};
    contracts.forEach((c) => { map[c.id] = c; });
    return map;
  }, [contracts]);

  // Stats
  const totalPendente = pagamentos
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPago = pagamentos
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Projection: sum of salaries from active contracts (next month commitment)
  const projectedNextMonth = useMemo(() => {
    return contracts.reduce((sum, c) => sum + (c.salary || 0), 0);
  }, [contracts]);

  // Overdue indicator: payments pending with due_date in the past
  const overdueInfo = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const pending = pagamentos.filter(p => p.status === "pending");
    const overdue = pending.filter(p => p.due_date && p.due_date < today);
    const percent = pending.length > 0 ? Math.round((overdue.length / pending.length) * 100) : 0;
    return { count: overdue.length, percent };
  }, [pagamentos]);

  // Chart data: last 6 months
  const chartData = useMemo(() => {
    const months: { month: string; label: string; pago: number; pendente: number }[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, "yyyy-MM");
      const label = format(date, "MMM/yy", { locale: ptBR });
      
      const pago = pagamentos
        .filter(p => p.status === "paid" && p.reference_month.startsWith(monthKey))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      
      const pendente = pagamentos
        .filter(p => p.status === "pending" && p.reference_month.startsWith(monthKey))
        .reduce((sum, p) => sum + Number(p.amount), 0);
      
      months.push({ month: monthKey, label, pago, pendente });
    }
    
    return months;
  }, [pagamentos]);

  // Available periods for filter
  const availablePeriods = useMemo(() => {
    const periods = new Set<string>();
    pagamentos.forEach(p => {
      const month = p.reference_month.slice(0, 7);
      periods.add(month);
    });
    return Array.from(periods).sort().reverse();
  }, [pagamentos]);

  const hasActiveFilters = statusFilter !== "all" || periodFilter !== "all" || contractFilter !== "all";

  const clearFilters = () => {
    setStatusFilter("all");
    setPeriodFilter("all");
    setContractFilter("all");
    setSearchTerm("");
  };

  const exportToCSV = () => {
    const headers = ["Colaborador", "E-mail", "Valor", "Referência", "Descrição", "Status", "Data Pagamento"];
    const rows = filteredPagamentos.map(p => [
      p.profile?.full_name || "-",
      p.profile?.email || "-",
      Number(p.amount).toFixed(2),
      formatReferenceMonth(p.reference_month),
      p.description || "",
      getStatusLabel(p.status),
      p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy") : "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pagamentos_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Pagamentos exportados com sucesso!");
  };

  const exportToPDF = () => {
    const rows = filteredPagamentos.map(p => `
      <tr>
        <td>${p.profile?.full_name || "-"}</td>
        <td>${p.profile?.email || "-"}</td>
        <td style="text-align:right">${formatCurrency(Number(p.amount))}</td>
        <td>${formatReferenceMonth(p.reference_month)}</td>
        <td>${p.description || "-"}</td>
        <td>${getStatusLabel(p.status)}</td>
        <td>${p.payment_date ? format(new Date(p.payment_date), "dd/MM/yyyy", { locale: ptBR }) : "-"}</td>
      </tr>`).join("");
    const totalValue = filteredPagamentos.reduce((s, p) => s + Number(p.amount), 0);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Relatório de Pagamentos</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 24px; color: #111; }
        h2 { margin-bottom: 4px; }
        p.sub { color: #666; margin-bottom: 16px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; padding: 6px 8px; text-align: left; border: 1px solid #ccc; font-size: 11px; }
        td { padding: 5px 8px; border: 1px solid #ddd; font-size: 11px; }
        tr:nth-child(even) td { background: #f9f9f9; }
        tfoot td { font-weight: bold; background: #f0f0f0; }
        @media print { @page { margin: 1.5cm; } }
      </style></head><body>
      <h2>Relatório de Pagamentos</h2>
      <p class="sub">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })} · ${filteredPagamentos.length} registro(s)</p>
      <table>
        <thead><tr><th>Colaborador</th><th>E-mail</th><th>Valor</th><th>Referência</th><th>Descrição</th><th>Status</th><th>Data Pagamento</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td style="text-align:right">${formatCurrency(totalValue)}</td><td colspan="4"></td></tr></tfoot>
      </table>
      <script>window.onload=function(){window.print();}${"</script>"}
      </body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
    else toast.error("Permita pop-ups para gerar o PDF.");
  };

  const handleGerarObrigacoes = async () => {
    setIsGenerating(true);
    try {
      const result = await gerarObrigacoesPJ();
      if (result.generated > 0) {
        toast.success(`${result.generated} obrigação(ões) gerada(s) para ${result.month}`);
        fetchPagamentos();
      } else if (result.skipped > 0) {
        toast.info(`Nenhuma nova obrigação gerada para ${result.month} — ${result.skipped} já existia(m)`);
      } else {
        toast.info("Nenhum contrato PJ ativo encontrado");
      }
    } catch (err: any) {
      toast.error(`Erro ao gerar obrigações: ${err?.message ?? "Erro desconhecido"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os pagamentos dos colaboradores
          </p>
        </div>
        {canManagePayments && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleGerarObrigacoes} disabled={isGenerating}>
              <Zap className="mr-2 h-4 w-4" />
              {isGenerating ? "Gerando..." : "Gerar Obrigações PJ"}
            </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Pagamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Pagamento</DialogTitle>
                <DialogDescription>
                  Preencha as informações do pagamento
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Contrato *</Label>
                  <Select value={selectedContractId} onValueChange={handleContractSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contracts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.profile?.full_name} - {c.job_title}
                          {c.salary ? ` (${formatCurrency(c.salary)})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mês de Referência *</Label>
                    <Input
                      type="month"
                      value={referenceMonth}
                      onChange={(e) => handleReferenceMonthChange(e.target.value)}
                    />
                  </div>
                </div>
                {duplicateWarning && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">{duplicateWarning}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-md border bg-muted/30">
                  <Checkbox
                    id="batchMode"
                    checked={batchMode}
                    onCheckedChange={(checked) => setBatchMode(checked === true)}
                  />
                  <div className="flex-1">
                    <Label htmlFor="batchMode" className="text-sm font-medium cursor-pointer">
                      Criar múltiplos meses
                    </Label>
                    <p className="text-xs text-muted-foreground">Gera pagamentos para vários meses consecutivos</p>
                  </div>
                  {batchMode && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="2"
                        max="12"
                        value={batchMonths}
                        onChange={(e) => setBatchMonths(e.target.value)}
                        className="w-16 h-8 text-center"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">meses</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    placeholder="Dia de vencimento"
                  />
                  <p className="text-xs text-muted-foreground">Se não informado, será dia 10 do mês de referência</p>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Ex: Salário mensal"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observações Internas</Label>
                  <Textarea
                    placeholder="Notas visíveis apenas para gestores..."
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">Não aparece para o colaborador PJ</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePayment} disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : batchMode ? `Criar ${Math.min(Math.max(parseInt(batchMonths) || 1, 1), 12)} Pagamentos` : "Criar Pagamento"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendente)}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPago)}</div>
            <p className="text-xs text-muted-foreground">Pagamentos aprovados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagamentos.length}</div>
            <p className="text-xs text-muted-foreground">Total de registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${overdueInfo.count > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueInfo.count > 0 ? 'text-red-600' : ''}`}>
              {overdueInfo.percent}%
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueInfo.count > 0 ? `${overdueInfo.count} pagamento(s) em atraso` : "Nenhum em atraso"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção Próximo Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectedNextMonth > 0 ? formatCurrency(projectedNextMonth) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Baseado nos contratos ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart - Last 6 months */}
      {!isLoading && pagamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pagamentos — Últimos 6 meses</CardTitle>
            <CardDescription>Comparativo entre valores pagos e pendentes por mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis 
                    className="text-xs" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{ borderRadius: "8px", fontSize: "13px" }}
                  />
                  <Legend />
                  <Bar dataKey="pago" name="Pago" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendente" name="Pendente" fill="#eab308" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lista de Pagamentos</CardTitle>
            <CardDescription>
              {filteredPagamentos.length} de {pagamentos.length} pagamento(s)
            </CardDescription>
          </div>
          {pagamentos.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos períodos</SelectItem>
                {availablePeriods.map(p => (
                  <SelectItem key={p} value={p}>
                    {format(new Date(p + "-01"), "MMMM/yyyy", { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={contractFilter} onValueChange={setContractFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos contratos</SelectItem>
                {contracts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.profile?.full_name || c.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="mr-1 h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>

          {/* Batch action bar */}
          {canManagePayments && selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-sm font-medium">
                {selectedIds.size} pagamento(s) selecionado(s)
              </span>
              <Button size="sm" onClick={handleBatchApprove} className="gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Aprovar selecionados
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar seleção
              </Button>
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {canManagePayments && (
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          filteredPagamentos.filter((p) => p.status === "pending").length > 0 &&
                          filteredPagamentos
                            .filter((p) => p.status === "pending")
                            .every((p) => selectedIds.has(p.id))
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="hidden md:table-cell">Contrato</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Referência</TableHead>
                  <TableHead className="hidden lg:table-cell">Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {canManagePayments && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredPagamentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManagePayments ? 8 : 7} className="h-32 text-center">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPagamentos.map((pagamento) => (
                    <TableRow key={pagamento.id} className={selectedIds.has(pagamento.id) ? "bg-primary/5" : ""}>
                      {canManagePayments && (
                        <TableCell>
                          {pagamento.status === "pending" ? (
                            <Checkbox
                              checked={selectedIds.has(pagamento.id)}
                              onCheckedChange={() => toggleSelect(pagamento.id)}
                            />
                          ) : (
                            <span />
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <p className="font-medium">{pagamento.profile?.full_name || "-"}</p>
                          <p className="text-sm text-muted-foreground">
                            {pagamento.profile?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {pagamento.contract_id && contractsMap[pagamento.contract_id] ? (
                          <span className="text-sm font-medium text-primary hover:underline cursor-pointer" onClick={() => navigate("/dashboard/contratos")}>
                            {contractsMap[pagamento.contract_id].job_title}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 font-medium">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          {formatCurrency(Number(pagamento.amount))}
                          {pagamento.contract_id && splitsMap[pagamento.contract_id] && splitsMap[pagamento.contract_id].length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-1">
                                  <Users className="h-3 w-3 text-blue-500" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-72 p-3" side="left">
                                <p className="text-xs font-semibold mb-2">Split de Pagamento</p>
                                <div className="space-y-1.5">
                                  {splitsMap[pagamento.contract_id].map((sp, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                                      <div>
                                        <span className="font-medium">{sp.beneficiary_name}</span>
                                        {sp.beneficiary_document && (
                                          <span className="text-muted-foreground ml-1">({sp.beneficiary_document})</span>
                                        )}
                                      </div>
                                      <div className="text-right whitespace-nowrap">
                                        <span className="text-muted-foreground">{sp.percentage}% → </span>
                                        <span className="font-medium">{formatCurrency(Number(pagamento.amount) * sp.percentage / 100)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1 text-sm capitalize">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatReferenceMonth(pagamento.reference_month)}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {pagamento.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(pagamento.status)}
                            <Badge variant={getStatusBadgeVariant(pagamento.status)}>
                              {getStatusLabel(pagamento.status)}
                            </Badge>
                          </div>
                          {/* NFS-e indicator for pending PJ payments */}
                          {pagamento.status === "pending" && contractsMap[pagamento.contract_id]?.contract_type === "PJ" && (
                            nfseStatusMap[pagamento.contract_id] === "emitida" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 w-fit">
                                <FileCheck className="h-3 w-3" /> NFS-e emitida
                              </span>
                            ) : nfseStatusMap[pagamento.contract_id] === "pendente" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 w-fit">
                                <FileClock className="h-3 w-3" /> NFS-e pendente
                              </span>
                            ) : null
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Mais opções">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            {canManagePayments && pagamento.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleApprovePayment(pagamento.id)}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Aprovar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleRejectPayment(pagamento.id)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Rejeitar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pagamentos;
