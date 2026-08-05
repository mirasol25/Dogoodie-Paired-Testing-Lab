"use client";

import { useEffect } from "react";
import { useDemoStore } from "@/store/paired-testing-demo.store";

export function useHydrated(): boolean {
  const hydrated = useDemoStore((state) => state.hydrated);
  useEffect(() => {
    if (!hydrated) void useDemoStore.persist.rehydrate();
  }, [hydrated]);
  return hydrated;
}

