import { afterEach, describe, expect, it } from "vitest";
import { getTrustedProxy } from "../trustedProxyConfig";

afterEach(() => {
    delete process.env.TRUSTED_PROXY;
});

describe("getTrustedProxy", () => {
    it("defaults to none when unset", () => {
        delete process.env.TRUSTED_PROXY;
        expect(getTrustedProxy()).toBe("none");
    });

    it("defaults to none on an unrecognized value, rather than throwing", () => {
        process.env.TRUSTED_PROXY = "some-typo";
        expect(getTrustedProxy()).toBe("none");
    });

    it.each(["fly", "railway", "render", "vercel", "none"] as const)("resolves %s", (value) => {
        process.env.TRUSTED_PROXY = value;
        expect(getTrustedProxy()).toBe(value);
    });

    it("is case-insensitive", () => {
        process.env.TRUSTED_PROXY = "VERCEL";
        expect(getTrustedProxy()).toBe("vercel");
    });
});
