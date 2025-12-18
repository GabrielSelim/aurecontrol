import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { useCepLookup, AddressData } from "@/hooks/useCepLookup";

interface AddressFormProps {
  address: AddressData;
  onChange: (address: AddressData) => void;
  disabled?: boolean;
}

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export function AddressForm({ address, onChange, disabled = false }: AddressFormProps) {
  const { formatCep, lookupCep, isLoading } = useCepLookup();

  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    onChange({ ...address, cep: formatted });
  };

  const handleCepBlur = async () => {
    const cleanCep = address.cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      const result = await lookupCep(address.cep);
      if (result) {
        onChange({
          ...address,
          cep: result.cep,
          street: result.street,
          complement: result.complement || address.complement,
          neighborhood: result.neighborhood,
          city: result.city,
          state: result.state,
        });
      }
    }
  };

  const handleLookupClick = async () => {
    const result = await lookupCep(address.cep);
    if (result) {
      onChange({
        ...address,
        cep: result.cep,
        street: result.street,
        complement: result.complement || address.complement,
        neighborhood: result.neighborhood,
        city: result.city,
        state: result.state,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <div className="flex gap-2">
            <Input
              id="cep"
              value={address.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleLookupClick}
              disabled={disabled || isLoading || address.cep.replace(/\D/g, "").length !== 8}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="street">Rua / Logradouro</Label>
          <Input
            id="street"
            value={address.street}
            onChange={(e) => onChange({ ...address, street: e.target.value })}
            placeholder="Nome da rua"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input
            id="number"
            value={address.number}
            onChange={(e) => onChange({ ...address, number: e.target.value })}
            placeholder="123"
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="complement">Complemento</Label>
          <Input
            id="complement"
            value={address.complement}
            onChange={(e) => onChange({ ...address, complement: e.target.value })}
            placeholder="Apto, Bloco, Sala (opcional)"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input
            id="neighborhood"
            value={address.neighborhood}
            onChange={(e) => onChange({ ...address, neighborhood: e.target.value })}
            placeholder="Nome do bairro"
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(e) => onChange({ ...address, city: e.target.value })}
            placeholder="Nome da cidade"
            disabled={disabled}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <select
            id="state"
            value={address.state}
            onChange={(e) => onChange({ ...address, state: e.target.value })}
            disabled={disabled}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Selecione</option>
            {BRAZILIAN_STATES.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
