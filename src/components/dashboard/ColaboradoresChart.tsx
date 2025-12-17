import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Colaborador {
  id: string;
  created_at: string;
  is_active: boolean;
}

interface ColaboradoresChartProps {
  colaboradores: Colaborador[];
  isLoading?: boolean;
}

const chartConfig = {
  total: {
    label: "Total de colaboradores",
    color: "hsl(var(--primary))",
  },
};

export function ColaboradoresChart({ colaboradores, isLoading }: ColaboradoresChartProps) {
  const chartData = useMemo(() => {
    if (colaboradores.length === 0) return [];

    // Get date range - last 6 months
    const now = new Date();
    const sixMonthsAgo = subMonths(startOfMonth(now), 5);
    
    const months = eachMonthOfInterval({
      start: sixMonthsAgo,
      end: now,
    });

    return months.map((month) => {
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      // Count collaborators created before or during this month
      const count = colaboradores.filter((c) => {
        const createdAt = parseISO(c.created_at);
        return createdAt <= monthEnd;
      }).length;

      return {
        month: format(month, "MMM", { locale: ptBR }),
        fullMonth: format(month, "MMMM 'de' yyyy", { locale: ptBR }),
        total: count,
      };
    });
  }, [colaboradores]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Colaboradores</CardTitle>
          <CardDescription>Crescimento da equipe nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Colaboradores</CardTitle>
          <CardDescription>Crescimento da equipe nos últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução de Colaboradores</CardTitle>
        <CardDescription>Crescimento da equipe nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              allowDecimals={false}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  labelFormatter={(_, payload) => payload[0]?.payload?.fullMonth || ""}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
