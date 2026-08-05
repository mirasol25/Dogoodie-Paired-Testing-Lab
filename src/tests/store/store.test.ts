import { beforeEach, describe, expect, it } from "vitest";
import { useDemoStore } from "@/store/paired-testing-demo.store";

describe("demonstration store", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useDemoStore.getState().resetDemoData();
  });

  it("updates reviewer state and creates an activity event", () => {
    const previousEvents = useDemoStore.getState().auditEvents.length;
    useDemoStore.getState().acceptPair("PAIR-008", "Controls satisfied", "Accepted in test.");
    const state = useDemoStore.getState();
    expect(state.pairs.find((pair) => pair.id === "PAIR-008")?.expertReviewStatus).toBe("accepted");
    expect(state.auditEvents).toHaveLength(previousEvents + 1);
    expect(state.auditEvents[0].objectId).toBe("PAIR-008");
  });

  it("creates a sequential local assignment and records its event", () => {
    const id = useDemoStore.getState().createDemoAssignment({
      testerAId: "TESTER-01", testerBId: "TESTER-02", scheduledDate: "2026-05-22",
      startTime: "10:00", endTime: "10:15", platform: "RideApp A",
      pickup: "Midtown Manhattan hotel corridor", destination: "JFK Airport Terminal 4",
      rideTier: "Standard Ride", isolatedVariable: "Membership status",
    });
    expect(id).toBe("ASN-013");
    expect(useDemoStore.getState().assignments).toHaveLength(13);
    expect(useDemoStore.getState().auditEvents[0].action).toBe("Assignment created");
  });

  it("restores deterministic fixtures on reset", () => {
    useDemoStore.getState().rejectPair("PAIR-008", "Other", "Test");
    useDemoStore.getState().resetDemoData();
    expect(useDemoStore.getState().pairs.find((pair) => pair.id === "PAIR-008")?.expertReviewStatus).toBe("pending");
    expect(useDemoStore.getState().assignments).toHaveLength(12);
  });
});

