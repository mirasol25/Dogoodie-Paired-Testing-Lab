"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { initialDemoState, testerProfilesFixture } from "@/data/paired-testing-demo.fixtures";
import type {
  AssignmentStatus,
  AuditEvent,
  DashboardFilter,
  DemoNotification,
  EvidenceFile,
  Role,
  Study,
  TestAssignment,
  TesterDraft,
  TestPair,
  TestSubmission,
} from "@/types/paired-testing-demo.types";

interface CreateAssignmentInput {
  testerAId: string; testerBId: string; scheduledDate: string; startTime: string; endTime: string;
  platform: string; pickup: string; destination: string; rideTier: string; isolatedVariable: string;
}

interface DemoStore {
  hydrated: boolean;
  role: Role;
  studies: Study[];
  assignments: TestAssignment[];
  submissions: TestSubmission[];
  pairs: TestPair[];
  evidence: EvidenceFile[];
  auditEvents: AuditEvent[];
  dashboardFilter: DashboardFilter;
  pairSearchQuery: string;
  assignmentSearchQuery: string;
  evidenceFilter: string;
  auditFilter: string;
  selectedPair?: string;
  testerDraft?: TesterDraft;
  notifications: DemoNotification[];
  localCounter: number;
  setHydrated: (hydrated: boolean) => void;
  setRole: (role: Role) => void;
  setDashboardFilter: (filter: DashboardFilter) => void;
  setSearchQuery: (query: string) => void;
  setAssignmentSearchQuery: (query: string) => void;
  setEvidenceFilter: (filter: string) => void;
  setAuditFilter: (filter: string) => void;
  createDemoAssignment: (input: CreateAssignmentInput) => string;
  saveTesterDraft: (assignmentId: string, values: Record<string, unknown>) => void;
  submitTesterResponse: (submission: TestSubmission) => void;
  acceptPair: (pairId: string, reason: string, note: string) => void;
  flagPair: (pairId: string, reason: string, note: string) => void;
  rejectPair: (pairId: string, reason: string, note: string) => void;
  clearPairDecision: (pairId: string) => void;
  addReviewerNote: (pairId: string, note: string) => void;
  addAuditEvent: (event: Omit<AuditEvent, "id" | "timestamp">) => void;
  resetDemoData: () => void;
}

const cloneInitial = () => structuredClone(initialDemoState);
const interactionTimestamp = () => new Date().toISOString();

export const useDemoStore = create<DemoStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      role: "expert_reviewer",
      ...cloneInitial(),
      dashboardFilter: "all",
      pairSearchQuery: "",
      assignmentSearchQuery: "",
      evidenceFilter: "all",
      auditFilter: "all",
      selectedPair: "PAIR-008",
      notifications: [],
      localCounter: 13,
      setHydrated: (hydrated) => set({ hydrated }),
      setRole: (role) => set({ role }),
      setDashboardFilter: (dashboardFilter) => set({ dashboardFilter }),
      setSearchQuery: (pairSearchQuery) => set({ pairSearchQuery }),
      setAssignmentSearchQuery: (assignmentSearchQuery) => set({ assignmentSearchQuery }),
      setEvidenceFilter: (evidenceFilter) => set({ evidenceFilter }),
      setAuditFilter: (auditFilter) => set({ auditFilter }),
      createDemoAssignment: (input) => {
        const number = get().localCounter;
        const suffix = String(number).padStart(3, "0");
        const id = `ASN-${suffix}`;
        const pairId = `PAIR-${suffix}`;
        const timestamp = interactionTimestamp();
        const assignment: TestAssignment = {
          id,
          pairId,
          studyId: get().studies[0].id,
          testerAId: input.testerAId,
          testerBId: input.testerBId,
          scheduledStart: new Date(`${input.scheduledDate}T${input.startTime}:00-04:00`).toISOString(),
          scheduledEnd: new Date(`${input.scheduledDate}T${input.endTime}:00-04:00`).toISOString(),
          platform: input.platform,
          pickup: input.pickup,
          destination: input.destination,
          rideTier: input.rideTier,
          isolatedVariable: input.isolatedVariable,
          status: "not_started",
          testerAStatus: "Not started",
          testerBStatus: "Not started",
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          assignments: [...state.assignments, assignment],
          localCounter: number + 1,
          auditEvents: [{
            id: `AUD-${String(state.auditEvents.length + 1).padStart(3, "0")}`,
            timestamp,
            actor: "Demonstration Coordinator",
            actorRole: "Test Coordinator",
            action: "Assignment created",
            objectType: "Assignment",
            objectId: id,
            category: "assignment",
            integrityIndicator: "Synthetic event record",
            note: "Created locally in the demonstration workspace.",
          }, ...state.auditEvents],
        }));
        return id;
      },
      saveTesterDraft: (assignmentId, values) => {
        const timestamp = interactionTimestamp();
        set((state) => ({
          testerDraft: { assignmentId, values, savedAt: timestamp },
          assignments: state.assignments.map((assignment) =>
            assignment.id === assignmentId ? { ...assignment, status: "draft" as AssignmentStatus, updatedAt: timestamp } : assignment),
          auditEvents: [{
            id: `AUD-${String(state.auditEvents.length + 1).padStart(3, "0")}`,
            timestamp,
            actor: "Demonstration Tester",
            actorRole: "Tester",
            action: "Draft saved",
            objectType: "Assignment",
            objectId: assignmentId,
            category: "submission",
            integrityIndicator: "Synthetic event record",
          }, ...state.auditEvents],
        }));
      },
      submitTesterResponse: (submission) => {
        const timestamp = interactionTimestamp();
        set((state) => ({
          submissions: [...state.submissions.filter((item) => item.id !== submission.id), submission],
          assignments: state.assignments.map((assignment) =>
            assignment.id === submission.assignmentId
              ? { ...assignment, status: "awaiting_partner" as AssignmentStatus, testerAStatus: "Submitted", updatedAt: timestamp }
              : assignment),
          auditEvents: [{
            id: `AUD-${String(state.auditEvents.length + 1).padStart(3, "0")}`,
            timestamp,
            actor: submission.testerAlias,
            actorRole: "Tester",
            action: "Submission completed",
            objectType: "Submission",
            objectId: submission.id,
            category: "submission",
            integrityIndicator: "Synthetic event record",
          }, ...state.auditEvents],
        }));
      },
      acceptPair: (pairId, reason, note) => updateDecision(set, get, pairId, "accepted", reason, note),
      flagPair: (pairId, reason, note) => updateDecision(set, get, pairId, "flagged", reason, note),
      rejectPair: (pairId, reason, note) => updateDecision(set, get, pairId, "rejected", reason, note),
      clearPairDecision: (pairId) => updateDecision(set, get, pairId, "pending", "", ""),
      addReviewerNote: (pairId, note) => set((state) => ({
        pairs: state.pairs.map((pair) => pair.id === pairId
          ? { ...pair, reviewerNotes: [...pair.reviewerNotes, note], updatedAt: interactionTimestamp() }
          : pair),
      })),
      addAuditEvent: (event) => {
        const timestamp = interactionTimestamp();
        set((state) => ({
          auditEvents: [{
            ...event,
            id: `AUD-${String(state.auditEvents.length + 1).padStart(3, "0")}`,
            timestamp,
          }, ...state.auditEvents],
        }));
      },
      resetDemoData: () => set({
        ...cloneInitial(),
        role: "expert_reviewer",
        dashboardFilter: "all",
        pairSearchQuery: "",
        assignmentSearchQuery: "",
        evidenceFilter: "all",
        auditFilter: "all",
        selectedPair: "PAIR-008",
        testerDraft: undefined,
        notifications: [],
        localCounter: 13,
        hydrated: true,
      }),
    }),
    {
      name: "dogoodie-paired-testing-demo",
      skipHydration: true,
      partialize: (state) => ({
        role: state.role,
        assignments: state.assignments,
        submissions: state.submissions,
        pairs: state.pairs,
        evidence: state.evidence,
        auditEvents: state.auditEvents,
        testerDraft: state.testerDraft,
        localCounter: state.localCounter,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

function updateDecision(
  set: (partial: Partial<DemoStore> | ((state: DemoStore) => Partial<DemoStore>)) => void,
  get: () => DemoStore,
  pairId: string,
  status: "accepted" | "flagged" | "rejected" | "pending",
  reason: string,
  note: string,
) {
  const timestamp = interactionTimestamp();
  const label = status === "pending" ? "Pair decision cleared" : `Pair ${status}`;
  set((state) => ({
    pairs: state.pairs.map((pair) => pair.id === pairId ? {
      ...pair,
      expertReviewStatus: status,
      reviewerDecision: status === "pending" ? { status } : { status, reason, note, decidedAt: timestamp },
      reviewerNotes: note ? [...pair.reviewerNotes, note] : pair.reviewerNotes,
      updatedAt: timestamp,
    } : pair),
    auditEvents: [{
      id: `AUD-${String(get().auditEvents.length + 1).padStart(3, "0")}`,
      timestamp,
      actor: "Expert Reviewer 01",
      actorRole: "Expert Reviewer",
      action: label,
      objectType: "Pair",
      objectId: pairId,
      category: "review",
      integrityIndicator: "Synthetic event record",
      note: note || "Reviewer decision updated in demonstration state.",
    }, ...state.auditEvents],
  }));
}

export { testerProfilesFixture };

