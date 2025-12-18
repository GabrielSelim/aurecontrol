import { useState } from "react";
import { toast } from "sonner";

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface AddressData {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function useCepLookup() {
  const [isLoading, setIsLoading] = useState(false);

  const formatCep = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 5) {
      return digits;
    }
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const lookupCep = async (cep: string): Promise<AddressData | null> => {
    const cleanCep = cep.replace(/\D/g, "");
    
    if (cleanCep.length !== 8) {
      return null;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return null;
      }

      toast.success("Endereço encontrado!");
      
      return {
        cep: formatCep(data.cep),
        street: data.logradouro || "",
        number: "",
        complement: data.complemento || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
      };
    } catch (error) {
      console.error("Error looking up CEP:", error);
      toast.error("Erro ao buscar CEP. Tente novamente.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    formatCep,
    lookupCep,
    isLoading,
  };
}
