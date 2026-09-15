import { OrderStatus } from "@prisma/client";
import { mapProviderOrderStatus } from "./order-status-mapper";

describe("mapProviderOrderStatus", () => {
  it.each([
    ["pending", OrderStatus.QUEUED],
    ["in_progress", OrderStatus.PROCESSING],
    ["processing", OrderStatus.PROCESSING],
    ["completed", OrderStatus.COMPLETED],
    ["partial", OrderStatus.PARTIAL],
    ["canceled", OrderStatus.CANCELLED],
    ["cancelled", OrderStatus.CANCELLED],
  ])("maps %s to %s", (raw, expected) => {
    expect(mapProviderOrderStatus(raw)).toBe(expected);
  });

  it("is case-insensitive", () => {
    expect(mapProviderOrderStatus("COMPLETED")).toBe(OrderStatus.COMPLETED);
  });

  it("returns null for an unrecognized value instead of guessing", () => {
    expect(mapProviderOrderStatus("some_future_status_panelfollows_invents")).toBeNull();
  });
});
