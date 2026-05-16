"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { currencies as allCurrenciesData } from "country-data-list";

const CurrencyDropDown = ({
  value,
  onValueChange,
  placeholder = "Select a currency",
  className,
}) => {
  const [open, setOpen] = React.useState(false);

  const sortedCurrencies = React.useMemo(() => {
    const filtered = allCurrenciesData.all.filter(
      (curr) => curr.code && curr.name && curr.symbol
    );
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const selectedCurrency = React.useMemo(() => {
    return sortedCurrencies.find((currency) => currency.code === value);
  }, [value, sortedCurrencies]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-1/2 justify-between bg-white", className)}
        >
          {selectedCurrency ? (
            <span className="font-medium">
              {`${selectedCurrency.code} (${selectedCurrency.symbol})`}
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white">
        <Command>
          <CommandInput placeholder="Search currency by name or code..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {sortedCurrencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name} ${currency.symbol}`}
                  onSelect={() => {
                    onValueChange(currency.code === value ? "" : currency.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === currency.code ? "opacity-100" : "opacity-0"
                    )}
                  />

                  <div className="flex items-center gap-2">
                    <span className="text-sm">{currency.symbol}</span>
                    <span className="text-sm font-medium">{currency.code}</span>
                    <span className="text-sm text-muted-foreground">
                      {currency.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { CurrencyDropDown };
