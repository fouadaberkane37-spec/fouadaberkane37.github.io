"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import {
  fetchSuggestions,
  loadPlaces,
  resolveSuggestion,
  type AddressSuggestion,
} from "@/lib/client/places";
import type { Address } from "@/lib/schemas";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface Props {
  value: Address | null;
  onChange: (address: Address | null) => void;
  error?: string;
}

/**
 * Accessible combobox over Google Places suggestions. Without an API key (or if
 * Google fails to load) it is a plain text field and the typed address is used.
 */
export function AddressAutocomplete({ value, onChange, error }: Props) {
  const t = useTranslations("quote.address");
  const locale = useLocale();
  const id = useId();
  const [text, setText] = useState(value?.formatted ?? "");
  const [lib, setLib] = useState<google.maps.PlacesLibrary | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [searched, setSearched] = useState(false);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    loadPlaces(API_KEY, locale)
      .then(setLib)
      .catch(() => setLib(null));
  }, [locale]);

  useEffect(() => {
    if (!lib || text.trim().length < 3 || text === value?.formatted) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      token.current ??= new lib.AutocompleteSessionToken();
      try {
        const results = await fetchSuggestions(lib, text, token.current, locale);
        setSuggestions(results);
        setOpen(true);
        setActive(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setSearched(true);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [lib, text, locale, value?.formatted]);

  function typed(next: string) {
    setText(next);
    const trimmed = next.trim();
    // Typed text counts as the address until a suggestion is picked.
    onChange(trimmed.length >= 5 ? { formatted: trimmed, placeId: null, lat: null, lng: null } : null);
  }

  async function pick(s: AddressSuggestion) {
    setOpen(false);
    setSuggestions([]);
    try {
      const resolved = await resolveSuggestion(s);
      token.current = null; // a session ends with a place selection
      setText(resolved.formatted);
      onChange(resolved);
    } catch {
      const formatted = [s.main, s.secondary].filter(Boolean).join(", ");
      setText(formatted);
      onChange({ formatted, placeId: s.id, lat: null, lng: null });
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      void pick(suggestions[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const showList = open && suggestions.length > 0;

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-2 block text-base font-semibold">
        {t("label")}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        aria-describedby={`${hintId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(error)}
        autoComplete="street-address"
        enterKeyHint="next"
        placeholder={t("placeholder")}
        value={text}
        onChange={(e) => typed(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="block h-14 w-full rounded-[var(--radius-control)] border-2 border-line bg-paper px-4 text-lg outline-none transition-colors placeholder:text-ink-soft/60 focus:border-blue aria-[invalid=true]:border-danger"
      />
      <p id={hintId} className="mt-2 text-sm text-ink-soft">
        {lib ? t("hint") : t("hintManual")}
      </p>
      {lib && searched && text.trim().length >= 3 && suggestions.length === 0 && !value?.placeId && (
        <p className="mt-1 text-sm text-ink-soft">{t("noResults")}</p>
      )}
      {error && (
        <p id={errorId} className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <ul
        id={listId}
        role="listbox"
        aria-label={t("suggestions")}
        hidden={!showList}
        className="absolute inset-x-0 top-[5.5rem] z-20 overflow-hidden rounded-[var(--radius-control)] border-2 border-line bg-paper shadow-[0_12px_32px_-12px_rgba(11,59,143,0.35)]"
      >
        {suggestions.map((s, i) => (
          <li
            key={s.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => void pick(s)}
            className="cursor-pointer border-b border-line px-4 py-3 last:border-b-0 aria-selected:bg-glass"
          >
            <span className="block font-semibold">{s.main}</span>
            <span className="block text-sm text-ink-soft">{s.secondary}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
