import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Move, Save, RotateCcw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SignaturePosition {
  id: string;
  signer_type: string;
  signer_name: string;
  signer_order: number;
  position_x: number;
  position_y: number;
  position_width: number;
  position_height: number;
  signed_at: string | null;
}

interface SignaturePositionEditorProps {
  documentHtml: string;
  signatures: SignaturePosition[];
  documentId: string;
  onPositionsUpdated: () => void;
  readOnly?: boolean;
}

const getSignerTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    contractor: "Contratado",
    company_representative: "Representante",
    witness: "Testemunha",
  };
  return labels[type] || type;
};

const getSignerColor = (type: string) => {
  const colors: Record<string, string> = {
    contractor: "bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300",
    company_representative: "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300",
    witness: "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300",
  };
  return colors[type] || "bg-gray-500/20 border-gray-500";
};

export function SignaturePositionEditor({
  documentHtml,
  signatures,
  documentId,
  onPositionsUpdated,
  readOnly = false,
}: SignaturePositionEditorProps) {
  const [positions, setPositions] = useState<SignaturePosition[]>([]);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    // Initialize positions from signatures
    setPositions(
      signatures.map((sig) => ({
        ...sig,
        position_x: sig.position_x ?? 50,
        position_y: sig.position_y ?? 0,
        position_width: sig.position_width ?? 200,
        position_height: sig.position_height ?? 80,
      }))
    );
  }, [signatures]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, signatureId: string) => {
      if (readOnly) return;
      e.preventDefault();
      
      const signature = positions.find((p) => p.id === signatureId);
      if (!signature) return;

      setIsDragging(signatureId);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        posX: signature.position_x,
        posY: signature.position_y,
      };
    },
    [positions, readOnly]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current || !dragStartRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;

      // Convert pixel delta to percentage
      const deltaXPercent = (deltaX / container.width) * 100;
      const deltaYPercent = (deltaY / container.height) * 100;

      const newX = Math.max(0, Math.min(100, dragStartRef.current.posX + deltaXPercent));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.posY + deltaYPercent));

      setPositions((prev) =>
        prev.map((p) =>
          p.id === isDragging
            ? { ...p, position_x: newX, position_y: newY }
            : p
        )
      );
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
    dragStartRef.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, signatureId: string) => {
      if (readOnly) return;
      e.preventDefault();
      
      const touch = e.touches[0];
      const signature = positions.find((p) => p.id === signatureId);
      if (!signature) return;

      setIsDragging(signatureId);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        posX: signature.position_x,
        posY: signature.position_y,
      };
    },
    [positions, readOnly]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || !containerRef.current || !dragStartRef.current) return;

      const touch = e.touches[0];
      const container = containerRef.current.getBoundingClientRect();
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;

      const deltaXPercent = (deltaX / container.width) * 100;
      const deltaYPercent = (deltaY / container.height) * 100;

      const newX = Math.max(0, Math.min(100, dragStartRef.current.posX + deltaXPercent));
      const newY = Math.max(0, Math.min(100, dragStartRef.current.posY + deltaYPercent));

      setPositions((prev) =>
        prev.map((p) =>
          p.id === isDragging
            ? { ...p, position_x: newX, position_y: newY }
            : p
        )
      );
    },
    [isDragging]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(null);
    dragStartRef.current = null;
  }, []);

  const handleResetPositions = () => {
    // Distribute signatures evenly at the bottom
    const total = signatures.length;
    setPositions(
      signatures.map((sig, index) => ({
        ...sig,
        position_x: ((index + 1) / (total + 1)) * 100,
        position_y: 85,
        position_width: sig.position_width ?? 200,
        position_height: sig.position_height ?? 80,
      }))
    );
  };

  const handleSavePositions = async () => {
    setIsSaving(true);
    try {
      // Update each signature position
      for (const pos of positions) {
        const { error } = await supabase
          .from("contract_signatures")
          .update({
            position_x: pos.position_x,
            position_y: pos.position_y,
            position_width: pos.position_width,
            position_height: pos.position_height,
          })
          .eq("id", pos.id);

        if (error) throw error;
      }

      toast.success("Posições das assinaturas salvas com sucesso!");
      onPositionsUpdated();
    } catch (error) {
      console.error("Error saving positions:", error);
      toast.error("Erro ao salvar posições das assinaturas");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Move className="h-5 w-5" />
              Posicionar Assinaturas
            </CardTitle>
            <CardDescription>
              {readOnly
                ? "Visualização das posições das assinaturas"
                : "Arraste as caixas de assinatura para posicioná-las no documento"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOverlay(!showOverlay)}
            >
              {showOverlay ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  Ocultar
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  Mostrar
                </>
              )}
            </Button>
            {!readOnly && (
              <>
                <Button variant="outline" size="sm" onClick={handleResetPositions}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Resetar
                </Button>
                <Button size="sm" onClick={handleSavePositions} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {positions.map((sig) => (
            <Badge
              key={sig.id}
              variant="outline"
              className={getSignerColor(sig.signer_type)}
            >
              {getSignerTypeLabel(sig.signer_type)}
              {sig.signer_type === "witness" ? ` ${sig.signer_order}` : ""}: {sig.signer_name}
            </Badge>
          ))}
        </div>

        {/* Document with signature overlays */}
        <div
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Document preview */}
          <div
            className="prose prose-sm max-w-none bg-white text-black p-8"
            dangerouslySetInnerHTML={{ __html: documentHtml }}
          />

          {/* Signature position overlays */}
          {showOverlay &&
            positions.map((sig) => (
              <div
                key={sig.id}
                className={`absolute border-2 border-dashed rounded-lg transition-shadow ${
                  getSignerColor(sig.signer_type)
                } ${isDragging === sig.id ? "shadow-lg ring-2 ring-primary" : ""} ${
                  readOnly ? "" : "cursor-move hover:shadow-md"
                }`}
                style={{
                  left: `${sig.position_x}%`,
                  top: `${sig.position_y}%`,
                  width: `${sig.position_width}px`,
                  height: `${sig.position_height}px`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseDown={(e) => handleMouseDown(e, sig.id)}
                onTouchStart={(e) => handleTouchStart(e, sig.id)}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                  <span className="text-xs font-medium truncate w-full">
                    {getSignerTypeLabel(sig.signer_type)}
                    {sig.signer_type === "witness" ? ` ${sig.signer_order}` : ""}
                  </span>
                  <span className="text-xs opacity-70 truncate w-full">
                    {sig.signer_name}
                  </span>
                  {sig.signed_at && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Assinado
                    </Badge>
                  )}
                </div>
                {!readOnly && (
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </div>
            ))}
        </div>

        {/* Help text */}
        {!readOnly && (
          <p className="text-sm text-muted-foreground mt-3">
            💡 Dica: Arraste cada caixa de assinatura para a posição desejada no documento.
            As posições serão salvas e usadas quando o documento for impresso ou exportado.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
