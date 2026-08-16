"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

interface SegmentedNavProps {
  param: string;
  options: { value: string; label: string }[];
  basePath: string;
}

export function SegmentedNav({ param, options, basePath }: SegmentedNavProps) {
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? options[0]?.value;

  const buildHref = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, value);
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1"
      aria-label={`Pilih ${param}`}
    >
      {options.map((opt) => {
        const active = opt.value === current;
        return (
          <Link
            key={opt.value}
            href={buildHref(opt.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </Link>
        );
      })}
    </nav>
  );
}
