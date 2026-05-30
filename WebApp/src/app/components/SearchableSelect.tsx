"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

interface SearchableSelectProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
}

export default function SearchableSelect({
  label,
  value,
  options,
  placeholder = "Search or select",
  emptyMessage = "No matches found.",
  disabled = false,
  autoFocus = false,
  onChange,
}: SearchableSelectProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const handleBlur = () => {
    window.setTimeout(() => {
      setOpen(false);
      setQuery(value);
    }, 120);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1 block text-sm font-medium text-[#113F67]">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onMouseDown={() => setOpen(true)}
          onBlur={handleBlur}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          className="w-full rounded-md border border-[#113F67] px-10 py-2 text-[#113F67] focus:border-transparent focus:ring-2 focus:ring-[#113F67] disabled:cursor-not-allowed disabled:bg-gray-100"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-[#113F67] hover:text-white"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option);
                  setQuery(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">{emptyMessage}</div>
          )}
        </div>
      )}
    </div>
  );
}
