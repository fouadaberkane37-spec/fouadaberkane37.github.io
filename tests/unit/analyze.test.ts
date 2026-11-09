import { describe, expect, it, vi } from "vitest";
import { analyzeHouse, type PhotoInput } from "@/lib/ai/analyze";
import { SIDES } from "@/lib/schemas";

const photos: PhotoInput[] = SIDES.map((side) => ({
  side,
  data: Buffer.from("fake"),
  mediaType: "image/jpeg",
}));

const valid = {
  panes_per_side: { front: 10, back: 8, left: 3, right: 4 },
  patio_doors: 1,
  storeys: 2,
  walls: 4,
  obstructions: ["Haie de cèdres devant la façade"],
  confidence: 0.9,
  notes: "Photos claires.",
};

describe("analyzeHouse", () => {
  it("returns the analysis on the first valid answer", async () => {
    const call = vi.fn().mockResolvedValue(valid);
    const result = await analyzeHouse(photos, call);
    expect(result).toEqual({ status: "ok", analysis: valid, attempts: 1 });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("sends the photos in front, back, left, right order", async () => {
    const call = vi.fn().mockResolvedValue(valid);
    await analyzeHouse([...photos].reverse(), call);
    expect(call.mock.calls[0][0].map((p: PhotoInput) => p.side)).toEqual(["front", "back", "left", "right"]);
  });

  it("retries once when the JSON does not match the schema", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ ...valid, confidence: 3 })
      .mockResolvedValueOnce(valid);
    const result = await analyzeHouse(photos, call);
    expect(result).toMatchObject({ status: "ok", attempts: 2 });
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("falls back to manual review after two invalid answers", async () => {
    const call = vi.fn().mockResolvedValue({ panes: "lots" });
    const result = await analyzeHouse(photos, call);
    expect(result.status).toBe("failed");
    expect(result.attempts).toBe(2);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("treats API errors and refusals like invalid answers", async () => {
    const call = vi.fn().mockRejectedValueOnce(new Error("refusal")).mockRejectedValueOnce(new Error("timeout"));
    const result = await analyzeHouse(photos, call);
    expect(result).toMatchObject({ status: "failed", attempts: 2 });
    if (result.status === "failed") expect(result.error).toContain("timeout");
  });

  it("rejects negative or fractional counts", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce({ ...valid, patio_doors: -1 })
      .mockResolvedValueOnce({ ...valid, storeys: 1.5 });
    expect((await analyzeHouse(photos, call)).status).toBe("failed");
  });

  it("fails without calling the model when a photo is missing", async () => {
    const call = vi.fn();
    const result = await analyzeHouse(photos.slice(0, 3), call);
    expect(result).toMatchObject({ status: "failed", error: "missing_photo" });
    expect(call).not.toHaveBeenCalled();
  });
});
