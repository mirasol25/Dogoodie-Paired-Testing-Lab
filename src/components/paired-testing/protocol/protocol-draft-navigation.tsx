"use client";

import { createContext, useContext } from "react";

type DraftStep = "details" | "conditions" | "thresholds" | "requirements" | "exclusions";
type WorkspaceStep = "configure" | "changes" | "review";

const ProtocolDraftNavigationContext = createContext<{ goToStep: (step: DraftStep) => void; goToWorkspace: (step: WorkspaceStep) => void } | null>(null);

export const ProtocolDraftNavigationProvider = ProtocolDraftNavigationContext.Provider;

export function useProtocolDraftNavigation() {
  return useContext(ProtocolDraftNavigationContext);
}
