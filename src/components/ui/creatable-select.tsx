import * as React from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

interface CreatableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  label?: string;
}

export function CreatableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select or type...",
  className,
  label,
}: CreatableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [customOptions, setCustomOptions] = React.useState<{ value: string; label: string }[]>([])

  // Combine predefined options with custom options
  const allOptions = React.useMemo(() => {
    const combined = [...options, ...customOptions]
    // Remove duplicates
    const unique = combined.filter((option, index, self) =>
      index === self.findIndex((o) => o.value === option.value)
    )
    return unique
  }, [options, customOptions])

  // Find the label for the current value
  const selectedLabel = React.useMemo(() => {
    const option = allOptions.find((opt) => opt.value === value)
    return option?.label || value
  }, [value, allOptions])

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue)
    setOpen(false)
    setInputValue("")
  }

  const handleCreateCustom = () => {
    if (inputValue.trim()) {
      const customValue = inputValue.trim()
      // Check if it already exists
      if (!allOptions.some((opt) => opt.value.toLowerCase() === customValue.toLowerCase())) {
        const newOption = { value: customValue, label: customValue }
        setCustomOptions((prev) => [...prev, newOption])
        handleSelect(customValue)
      } else {
        // If it exists, just select it
        const existing = allOptions.find(
          (opt) => opt.value.toLowerCase() === customValue.toLowerCase()
        )
        if (existing) {
          handleSelect(existing.value)
        }
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      handleCreateCustom()
    }
  }

  // Filter options based on input
  const filteredOptions = React.useMemo(() => {
    if (!inputValue.trim()) return allOptions
    const search = inputValue.toLowerCase()
    return allOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(search) ||
        opt.value.toLowerCase().includes(search)
    )
  }, [allOptions, inputValue])

  return (
    <div className={cn("space-y-2", className)}>
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>
              {value ? selectedLabel : placeholder}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search or type new value..."
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              <CommandEmpty>
                {inputValue.trim() ? (
                  <div className="py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={handleCreateCustom}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create "{inputValue}"
                    </Button>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No options found.
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

