"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const THEME_FILTERS = [
  { value: "all", label: "All" },
  { value: "dark", label: "Dark" },
  { value: "paper", label: "Paper" },
  { value: "world3d", label: "World 3D" },
] as const;

export type ThemeFilterValue = (typeof THEME_FILTERS)[number]["value"];

type ThemeFilterProps = {
  value: ThemeFilterValue;
  onChange: (next: ThemeFilterValue) => void;
};

export function ThemeFilter({ value, onChange }: ThemeFilterProps) {
  return (
    <ToggleGroup
      aria-label="Filter videos by theme"
      variant="outline"
      className="flex-wrap"
      value={[value]}
      onValueChange={(pressed) => {
        const next = THEME_FILTERS.find(
          (filter) => filter.value === pressed[0],
        );
        if (next) onChange(next.value);
      }}
    >
      {THEME_FILTERS.map((filter) => (
        <ToggleGroupItem key={filter.value} value={filter.value}>
          {filter.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
