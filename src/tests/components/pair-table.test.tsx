import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PairTable } from "@/components/paired-testing/shared/pair-table";
import { useDemoStore } from "@/store/paired-testing-demo.store";

describe("matched-pair table interactions", () => {
  beforeEach(() => {
    useDemoStore.getState().resetDemoData();
  });

  it("filters the rendered pair list by search query", async () => {
    const user = userEvent.setup();
    render(<PairTable />);
    expect(screen.getByText("PAIR-008")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search matched pairs"), "PAIR-010");
    expect(screen.getByText("PAIR-010")).toBeInTheDocument();
    expect(screen.queryByText("PAIR-008")).not.toBeInTheDocument();
  });

  it("applies a technical-status filter", async () => {
    render(<PairTable initialFilter="warning" />);
    expect(await screen.findByText("PAIR-009")).toBeInTheDocument();
    expect(screen.getByText("PAIR-012")).toBeInTheDocument();
    expect(screen.queryByText("PAIR-008")).not.toBeInTheDocument();
  });
});

