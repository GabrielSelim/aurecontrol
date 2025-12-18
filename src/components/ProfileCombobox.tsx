import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandInput,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
}

interface ProfileComboboxProps {
  profiles: Profile[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ProfileCombobox({ 
  profiles, 
  value, 
  onChange, 
  placeholder = "Selecione um colaborador" 
}: ProfileComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedProfile = profiles.find((p) => p.user_id === value);

  const filteredProfiles = profiles.filter((profile) =>
    profile.full_name.toLowerCase().includes(searchValue.toLowerCase()) ||
    profile.email.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedProfile ? selectedProfile.full_name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 bg-popover" 
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar colaborador..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <div className="max-h-[200px] overflow-y-auto">
            {filteredProfiles.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum colaborador encontrado.
              </div>
            ) : (
              <div className="p-1">
                {filteredProfiles.map((profile) => (
                  <div
                    key={profile.user_id}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      value === profile.user_id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => {
                      onChange(profile.user_id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === profile.user_id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{profile.full_name}</span>
                      <span className="text-xs text-muted-foreground">{profile.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
