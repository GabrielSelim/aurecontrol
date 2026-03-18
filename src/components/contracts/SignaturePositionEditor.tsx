import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Move, Save, RotateCcw, Eye, EyeOff, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { updateSignaturePositions } from "@/services/contractService";
import { logger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/sanitize";

export interface SignaturePosition {
  id: string;
  signer_type: string;
  signer_name: string;
  signer_order: number;
  position_x: number;
  position_y: number;
  position_page: number;
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
  totalPages?: number;
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

// Estimate number of pages based on document content
const estimatePageCount = (html: string): number => {
  // A4 page at 96 DPI = ~1122px height with margins
  // Rough estimate: ~3000 characters per page
  const textContent = html.replace(/<[^>]*>/g, '');
  const estimatedPages = Math.max(1, Math.ceil(textContent.length / 3000));
  return Math.min(estimatedPages, 10); // Cap at 10 pages
};

export function SignaturePositionEditor({
  documentHtml,
  signatures,
  documentId: _documentId,
  onPositionsUpdated,
  readOnly = false,
  totalPages: propTotalPages,
}: SignaturePositionEditorProps) {
  const [positions, setPositions] = useState<SignaturePosition[]>([]);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(propTotalPages || 1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);

  useEffect(() => {
    // Estimate page count from document
    if (!propTotalPages) {
      setTotalPages(estimatePageCount(documentHtml));
    }
  }, [documentHtml, propTotalPages]);

  useEffect(() => {
    // Initialize positions from signatures
    // Note: position_y = 0 means "unset" (top+translate would hide the box),
    // so treat 0 the same as null.
    setPositions(
      signatures.map((sig) => ({
        ...sig,
        position_x: sig.position_x || 50,
        position_y: sig.position_y || 85,
        position_page: sig.position_page || totalPages,
        position_width: sig.position_width || 200,
        position_height: sig.position_height || 80,
      }))
    );
  }, [signatures, totalPages]);

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
    // Distribute signatures evenly at the bottom of the last page
    const total = signatures.length;
    setPositions(
      signatures.map((sig, index) => ({
        ...sig,
        position_x: ((index + 1) / (total + 1)) * 100,
        position_y: 85,
        position_page: totalPages,
        position_width: sig.position_width ?? 200,
        position_height: sig.position_height ?? 80,
      }))
    );
  };

  const handlePageChange = (signatureId: string, page: number) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === signatureId ? { ...p, position_page: page } : p
      )
    );
  };

  const handleSavePositions = async () => {
    setIsSaving(true);
    try {
      // Update each signature position
      await updateSignaturePositions(positions);

      toast.success("Posições das assinaturas salvas com sucesso!");
      onPositionsUpdated();
    } catch (error) {
      logger.error("Error saving positions:", error);
      toast.error("Erro ao salvar posições das assinaturas");
    } finally {
      setIsSaving(false);
    }
  };

  const signaturesOnCurrentPage = positions.filter(
    (sig) => sig.position_page === currentPage
  );

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
        {/* Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Página {currentPage} de {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Signature page assignments */}
        {!readOnly && (
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Atribuir assinaturas às páginas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {positions.map((sig) => (
                <div
                  key={sig.id}
                  className={`flex items-center justify-between p-2 rounded-lg border ${getSignerColor(sig.signer_type)}`}
                >
                  <span className="text-xs font-medium truncate mr-2">
                    {getSignerTypeLabel(sig.signer_type)}
                    {sig.signer_type === "witness" ? ` ${sig.signer_order}` : ""}
                  </span>
                  <Select
                    value={String(sig.position_page)}
                    onValueChange={(value) => handlePageChange(sig.id, parseInt(value))}
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <SelectItem key={page} value={String(page)}>
                          Página {page}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-4">
          {signaturesOnCurrentPage.length > 0 ? (
            signaturesOnCurrentPage.map((sig) => (
              <Badge
                key={sig.id}
                variant="outline"
                className={getSignerColor(sig.signer_type)}
              >
                {getSignerTypeLabel(sig.signer_type)}
                {sig.signer_type === "witness" ? ` ${sig.signer_order}` : ""}: {sig.signer_name}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">
              Nenhuma assinatura nesta página
            </span>
          )}
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
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(documentHtml) }}
          />

          {/* Signature position overlays - only show signatures on current page */}
          {showOverlay &&
            signaturesOnCurrentPage.map((sig) => (
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
            💡 Dica: Use os seletores acima para atribuir cada assinatura a uma página específica.
            Depois, arraste as caixas para posicioná-las na visualização do documento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
