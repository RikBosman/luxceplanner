import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutosaveController, type AutosaveState, type SaveOutcome } from "./autosave";

function setup(save: (doc: string, rev: number) => Promise<SaveOutcome>) {
  const states: AutosaveState[] = [];
  const c = new AutosaveController<string>({ revision: 1, save, onChange: (s) => states.push(s), delay: 1000 });
  return { c, states, last: () => states.at(-1)! };
}

describe("autosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("bundelt snelle wijzigingen tot één opslagverzoek", async () => {
    const save = vi.fn(async (_d: string, rev: number): Promise<SaveOutcome> => ({ ok: true, revision: rev + 1 }));
    const { c, last } = setup(save);
    c.update("a");
    c.update("ab");
    c.update("abc");
    expect(last().status).toBe("pending");
    await vi.advanceTimersByTimeAsync(999);
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("abc", 1);
    expect(last()).toMatchObject({ status: "saved", revision: 2 });
  });

  it("stuurt nooit twee verzoeken tegelijk en gebruikt steeds de nieuwste revisie", async () => {
    let resolve!: (o: SaveOutcome) => void;
    const save = vi.fn<(d: string, rev: number) => Promise<SaveOutcome>>(() => new Promise<SaveOutcome>((r) => (resolve = r)));
    const { c, last } = setup(save);
    c.update("v1");
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    c.update("v2"); // tijdens het opslaan
    await vi.advanceTimersByTimeAsync(5000);
    expect(save).toHaveBeenCalledTimes(1); // wacht op het lopende verzoek
    resolve({ ok: true, revision: 2 });
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("v2", 2);
    resolve({ ok: true, revision: 3 });
    await vi.advanceTimersByTimeAsync(0);
    expect(last()).toMatchObject({ status: "saved", revision: 3 });
    expect(c.hasUnsavedChanges).toBe(false);
  });

  it("maakt opslagfouten zichtbaar en probeert opnieuw zonder werk te verliezen", async () => {
    const save = vi
      .fn<(d: string, rev: number) => Promise<SaveOutcome>>()
      .mockRejectedValueOnce(new Error("netwerk"))
      .mockResolvedValueOnce({ ok: false, reason: "error", message: "Serverfout" })
      .mockResolvedValue({ ok: true, revision: 2 });
    const { c, last } = setup(save);
    c.update("werk");
    await vi.advanceTimersByTimeAsync(1000);
    expect(last()).toMatchObject({ status: "error", message: "Geen verbinding met de server." });
    expect(c.hasUnsavedChanges).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(last()).toMatchObject({ status: "error", message: "Serverfout" });
    await vi.advanceTimersByTimeAsync(4000);
    expect(save).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenLastCalledWith("werk", 1);
    expect(last()).toMatchObject({ status: "saved", revision: 2 });
  });

  it("stopt bij een conflict in plaats van te overschrijven", async () => {
    const save = vi.fn(async (): Promise<SaveOutcome> => ({ ok: false, reason: "conflict", message: "Gewijzigd elders" }));
    const { c, last } = setup(save);
    c.update("x");
    await vi.advanceTimersByTimeAsync(1000);
    expect(last().status).toBe("conflict");
    c.update("y");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(c.hasUnsavedChanges).toBe(true);
  });
});
