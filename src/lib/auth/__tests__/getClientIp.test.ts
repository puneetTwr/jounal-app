import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const headerStore = new Map<string, string>();

vi.mock("next/headers", () => ({
    headers: async () => ({
        get: (name: string) => headerStore.get(name.toLowerCase()) ?? null,
    }),
}));

// Imported after the mock above so getClientIp() picks it up.
const { getClientIp } = await import("../getClientIp");

function setHeaders(values: Record<string, string>): void {
    headerStore.clear();
    for (const [key, value] of Object.entries(values)) {
        headerStore.set(key.toLowerCase(), value);
    }
}

beforeEach(() => {
    headerStore.clear();
});

afterEach(() => {
    delete process.env.TRUSTED_PROXY;
});

describe("getClientIp", () => {
    it("returns unknown when TRUSTED_PROXY is unset, even if every known header is present", async () => {
        delete process.env.TRUSTED_PROXY;
        setHeaders({ "fly-client-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8", "x-real-ip": "9.9.9.9" });

        expect(await getClientIp()).toBe("unknown");
    });

    it("trusts Fly-Client-IP only when TRUSTED_PROXY=fly", async () => {
        process.env.TRUSTED_PROXY = "fly";
        setHeaders({ "fly-client-ip": "1.2.3.4", "x-forwarded-for": "5.6.7.8" });

        expect(await getClientIp()).toBe("1.2.3.4");
    });

    it("trusts X-Forwarded-For's first hop when TRUSTED_PROXY=vercel", async () => {
        process.env.TRUSTED_PROXY = "vercel";
        setHeaders({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" });

        expect(await getClientIp()).toBe("203.0.113.5");
    });

    it("trusts X-Forwarded-For's first hop when TRUSTED_PROXY=railway", async () => {
        process.env.TRUSTED_PROXY = "railway";
        setHeaders({ "x-forwarded-for": "203.0.113.5" });

        expect(await getClientIp()).toBe("203.0.113.5");
    });

    it("trusts X-Real-IP when TRUSTED_PROXY=render", async () => {
        process.env.TRUSTED_PROXY = "render";
        setHeaders({ "x-real-ip": "198.51.100.7", "x-forwarded-for": "203.0.113.5" });

        expect(await getClientIp()).toBe("198.51.100.7");
    });

    it("falls back to unknown when the trusted header for the configured platform is absent", async () => {
        process.env.TRUSTED_PROXY = "fly";
        setHeaders({ "x-forwarded-for": "5.6.7.8" });

        expect(await getClientIp()).toBe("unknown");
    });
});
