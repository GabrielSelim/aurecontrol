import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HoleritoProps {
  open: boolean;
  onClose: () => void;
  referenceMonth?: string; // "YYYY-MM", defaults to current month
  contract: {
    job_title: string;
    salary: number | null;
    start_date: string;
    clt_employee_id?: string | null;
    clt_work_regime?: string | null;
    pis_pasep?: string | null;
    data_admissao?: string | null;
  };
  profile: {
    full_name: string;
    cpf?: string | null;
  };
  company: {
    name: string;
    cnpj?: string | null;
    address?: string | null;
  };
}

/* ------------------------------------------------------------------ */
/*  INSS 2024 progressive table                                        */
/*  Faixas: até 1412, 2666.68, 4000.03, 7786.02                       */
/* ------------------------------------------------------------------ */
function calcINSS(salary: number): number {
  const brackets = [
    { limit: 1412.0, rate: 0.075, prev: 0 },
    { limit: 2666.68, rate: 0.09, prev: 1412.0 },
    { limit: 4000.03, rate: 0.12, prev: 2666.68 },
    { limit: 7786.02, rate: 0.14, prev: 4000.03 },
  ];
  let inss = 0;
  for (const b of brackets) {
    if (salary > b.prev) {
      const base = Math.min(salary, b.limit) - b.prev;
      inss += base * b.rate;
    } else {
      break;
    }
  }
  // Cap: if salary > 7786.02, the excess is not subject to INSS (already capped)
  return Math.round(inss * 100) / 100;
}

/* ------------------------------------------------------------------ */
/*  IRRF 2024 simplified (base = salary – INSS – deduction/dependent) */
/* ------------------------------------------------------------------ */
function calcIRRF(salaryBruto: number, inss: number): number {
  const base = salaryBruto - inss;
  if (base <= 2824.0) return 0;
  if (base <= 3751.05) return base * 0.075 - 142.8;
  if (base <= 4664.68) return base * 0.15 - 354.8;
  if (base <= 6529.89) return base * 0.225 - 636.13;
  return base * 0.275 - 869.36;
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function fmtMonthYear(ym: string): string {
  const [y, m] = ym.split("-");
  const monthNames = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];
  return `${monthNames[parseInt(m) - 1]} / ${y}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function HoleritoDigital({ open, onClose, referenceMonth, contract, profile, company }: HoleritoProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const month = referenceMonth ?? new Date().toISOString().substring(0, 7);
  const grossSalary = contract.salary ?? 0;
  const inss = calcINSS(grossSalary);
  const irrf = Math.max(0, calcIRRF(grossSalary, inss));
  const fgts = Math.round(grossSalary * 0.08 * 100) / 100;
  const netSalary = grossSalary - inss - irrf;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow || !printRef.current) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Holerite — ${profile.full_name} — ${fmtMonthYear(month)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 24px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 12px; }
            .company-name { font-size: 16px; font-weight: bold; }
            .month-label { font-size: 14px; font-weight: bold; text-align: right; }
            .section { margin-bottom: 12px; }
            .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #555; margin-bottom: 6px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
            .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 16px; }
            .field label { font-size: 9px; color: #777; text-transform: uppercase; }
            .field p { font-size: 12px; font-weight: 500; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
            thead th { background: #f0f0f0; border: 1px solid #ddd; padding: 6px 8px; font-size: 10px; text-align: left; }
            tbody td { border: 1px solid #ddd; padding: 6px 8px; font-size: 12px; }
            tbody tr:nth-child(even) { background: #fafafa; }
            .text-right { text-align: right; }
            .text-green { color: #16a34a; }
            .text-red { color: #dc2626; }
            .net-row td { font-weight: bold; background: #f0fdf4; font-size: 13px; }
            .fgts-row td { color: #1d4ed8; font-size: 11px; font-style: italic; }
            .footer { font-size: 9px; color: #888; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 12px; }
          </style>
        </head>
        <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const workRegimeLabel: Record<string, string> = {
    presencial: "Presencial",
    teletrabalho: "Teletrabalho (Home Office)",
    hibrido: "Híbrido",
    parcial: "Jornada Parcial",
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Holerite — {fmtMonthYear(month)}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" onClick={handlePrint} className="gap-1">
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        </DialogHeader>

        {/* ---------- Printable area ---------- */}
        <div ref={printRef} className="p-2 space-y-4 text-sm">

          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-foreground pb-3">
            <div>
              <p className="text-base font-bold">{company.name}</p>
              {company.cnpj && <p className="text-xs text-muted-foreground">CNPJ: {company.cnpj}</p>}
              {company.address && <p className="text-xs text-muted-foreground">{company.address}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Recibo de Pagamento</p>
              <p className="text-base font-bold">{fmtMonthYear(month)}</p>
            </div>
          </div>

          {/* Employee info */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 border-b pb-1">Dados do Colaborador</p>
            <div className="grid grid-cols-3 gap-y-2 gap-x-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Nome</p>
                <p className="font-medium">{profile.full_name}</p>
              </div>
              {profile.cpf && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">CPF</p>
                  <p className="font-medium font-mono">{profile.cpf}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Cargo</p>
                <p className="font-medium">{contract.job_title}</p>
              </div>
              {contract.clt_employee_id && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Matrícula</p>
                  <p className="font-medium">{contract.clt_employee_id}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Admissão</p>
                <p className="font-medium">
                  {new Date(contract.data_admissao || contract.start_date).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {contract.clt_work_regime && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Regime</p>
                  <p className="font-medium">{workRegimeLabel[contract.clt_work_regime] ?? contract.clt_work_regime}</p>
                </div>
              )}
              {contract.pis_pasep && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">PIS/PASEP</p>
                  <p className="font-medium font-mono">{contract.pis_pasep}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Proventos / Descontos table */}
          <div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border border-muted bg-muted/50 px-3 py-1.5 text-left text-[10px] uppercase tracking-wide">Descrição</th>
                  <th className="border border-muted bg-muted/50 px-3 py-1.5 text-left text-[10px] uppercase tracking-wide w-24">Tipo</th>
                  <th className="border border-muted bg-muted/50 px-3 py-1.5 text-right text-[10px] uppercase tracking-wide w-32">Valor</th>
                </tr>
              </thead>
              <tbody>
                {/* Proventos */}
                <tr>
                  <td className="border border-muted px-3 py-1.5">Salário Base</td>
                  <td className="border border-muted px-3 py-1.5 text-green-600 text-xs font-medium">Provento</td>
                  <td className="border border-muted px-3 py-1.5 text-right text-green-600 font-medium">{brl(grossSalary)}</td>
                </tr>
                {/* Descontos */}
                <tr>
                  <td className="border border-muted px-3 py-1.5">INSS (tabela progressiva 2024)</td>
                  <td className="border border-muted px-3 py-1.5 text-red-600 text-xs font-medium">Desconto</td>
                  <td className="border border-muted px-3 py-1.5 text-right text-red-600">- {brl(inss)}</td>
                </tr>
                <tr>
                  <td className="border border-muted px-3 py-1.5">IRRF (base: salário − INSS)</td>
                  <td className="border border-muted px-3 py-1.5 text-red-600 text-xs font-medium">Desconto</td>
                  <td className="border border-muted px-3 py-1.5 text-right text-red-600">- {brl(irrf)}</td>
                </tr>
                {/* FGTS — informativo */}
                <tr className="opacity-70">
                  <td className="border border-muted px-3 py-1.5 italic text-xs text-blue-700">FGTS (informativo — 8%, depositado pelo empregador)</td>
                  <td className="border border-muted px-3 py-1.5 text-blue-700 text-xs">Informativo</td>
                  <td className="border border-muted px-3 py-1.5 text-right text-blue-700 text-xs">{brl(fgts)}</td>
                </tr>
                {/* Net */}
                <tr className="bg-green-50 font-bold">
                  <td className="border border-muted px-3 py-2 text-green-800">Salário Líquido</td>
                  <td className="border border-muted px-3 py-2"></td>
                  <td className="border border-muted px-3 py-2 text-right text-green-800 text-base">{brl(netSalary)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary boxes */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Salário Bruto</p>
              <p className="font-bold text-base">{brl(grossSalary)}</p>
            </div>
            <div className="border rounded p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Total de Descontos</p>
              <p className="font-bold text-base text-red-600">{brl(inss + irrf)}</p>
            </div>
            <div className="border rounded p-3 text-center bg-green-50">
              <p className="text-[10px] text-muted-foreground uppercase">Salário Líquido</p>
              <p className="font-bold text-base text-green-700">{brl(netSalary)}</p>
            </div>
          </div>

          <Separator />

          {/* Signature area */}
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="text-center">
              <div className="border-t border-foreground mt-8 pt-2">
                <p className="text-xs text-muted-foreground">Assinatura do(a) Colaborador(a)</p>
                <p className="text-xs font-medium">{profile.full_name}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-foreground mt-8 pt-2">
                <p className="text-xs text-muted-foreground">Assinatura do(a) Responsável</p>
                <p className="text-xs font-medium">{company.name}</p>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground text-center pt-2">
            Documento gerado em {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}.
            Os cálculos de INSS e IRRF são baseados nas tabelas vigentes em 2024 e têm caráter estimativo.
            Consulte o departamento contábil para valores definitivos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
