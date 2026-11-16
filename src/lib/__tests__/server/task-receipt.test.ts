import { describe, expect, it, vi } from "vitest";
import { issueTaskReceipt, readTaskReceipt } from "../../server/task-receipt";

vi.mock("server-only", () => ({}));
vi.mock("../../server/env", () => ({ env: { signingSecret: () => "test-signing-secret-of-enough-length" } }));

describe("visual task receipts", () => {
  it("round-trips the provider's task id", () => {
    expect(readTaskReceipt(issueTaskReceipt("gvi_1794840579106_gh0zsj"))).toBe("gvi_1794840579106_gh0zsj");
    expect(readTaskReceipt(issueTaskReceipt("e35cf0b9-1829-4ea0-8372-52c7300c6a7b"))).toBe("e35cf0b9-1829-4ea0-8372-52c7300c6a7b");
  });

  it("rejects bare ids, forged signatures and ids swapped under a valid signature", () => {
    const receipt = issueTaskReceipt("gvi_1_abcdef");
    const signature = receipt.split(".")[1];
    expect(readTaskReceipt("gvi_1_abcdef")).toBeNull();
    expect(readTaskReceipt(`gvi_1_abcdef.${"A".repeat(43)}`)).toBeNull();
    expect(readTaskReceipt(`gvi_2_other.${signature}`)).toBeNull();
    expect(readTaskReceipt(42)).toBeNull();
  });
});
