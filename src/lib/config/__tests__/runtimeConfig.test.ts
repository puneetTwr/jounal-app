import { afterEach, describe, expect, it, vi } from "vitest";
import { isProductionRuntime } from "../runtimeConfig";

// NODE_ENV is typed read-only by Next's own ambient types, so it's set
// via vi.stubEnv (vitest's sanctioned way to override it) rather than a
// direct assignment.
afterEach(() => {
    vi.unstubAllEnvs();
});

describe("isProductionRuntime", () => {
    it("is true when NODE_ENV is production", () => {
        vi.stubEnv("NODE_ENV", "production");
        expect(isProductionRuntime()).toBe(true);
    });

    it("is false when NODE_ENV is not production", () => {
        vi.stubEnv("NODE_ENV", "development");
        expect(isProductionRuntime()).toBe(false);
    });

    it("is false when NODE_ENV is unset", () => {
        vi.stubEnv("NODE_ENV", "");
        expect(isProductionRuntime()).toBe(false);
    });
});
