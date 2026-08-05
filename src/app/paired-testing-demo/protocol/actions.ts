"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { activateProtocol, createInitialProtocol, createProtocolVersion, discardProtocolDraft, ProtocolDataError, saveProtocolDetails, saveProtocolExclusions, saveProtocolMatchingControls, saveProtocolRequirements, saveProtocolValidationThresholds } from "@/lib/data/protocols";

export interface ProtocolActionResult {
  ok: boolean;
  message: string;
  protocolId?: string;
}

export async function saveProtocolDetailsAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await saveProtocolDetails(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: "Protocol details saved.", protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Protocol details could not be saved." };
  }
}

export async function createProtocolVersionAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await createProtocolVersion(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: `${protocol.version} draft created.`, protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The new protocol version could not be created." };
  }
}

export async function discardProtocolDraftAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const version = await discardProtocolDraft(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: `${version} draft discarded.` };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The protocol draft could not be discarded." };
  }
}

export async function saveMatchingControlsAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await saveProtocolMatchingControls(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: "Matching controls saved.", protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Matching controls could not be saved." };
  }
}

export async function saveValidationThresholdsAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await saveProtocolValidationThresholds(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: "Validation thresholds saved.", protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Validation thresholds could not be saved." };
  }
}

export async function saveProtocolRequirementsAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await saveProtocolRequirements(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: "Evidence and observation requirements saved.", protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Protocol requirements could not be saved." };
  }
}

export async function saveProtocolExclusionsAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await saveProtocolExclusions(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: "Exclusion conditions saved.", protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "Exclusion conditions could not be saved." };
  }
}

export async function activateProtocolAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await activateProtocol(input as never);
    revalidatePath("/paired-testing-demo", "layout");
    return { ok: true, message: `${protocol.version} is now active.`, protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The protocol could not be activated." };
  }
}

export async function createInitialProtocolAction(input: unknown): Promise<ProtocolActionResult> {
  await requireRole(["admin", "test_coordinator"], "/paired-testing-demo/protocol");
  try {
    const protocol = await createInitialProtocol(input as never);
    revalidatePath("/paired-testing-demo/protocol");
    return { ok: true, message: `${protocol.version} protocol draft created.`, protocolId: protocol.id };
  } catch (error) {
    if (error instanceof ProtocolDataError) return { ok: false, message: error.message };
    return { ok: false, message: "The protocol draft could not be created." };
  }
}
