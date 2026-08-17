import { afterEach, describe, expect, it } from "vitest";
import { getAllowedServerActionOrigins } from "../productionOriginConfig";

afterEach(() => {
    delete process.env.PRODUCTION_ORIGIN;
});

describe("getAllowedServerActionOrigins", () => {
    it("returns undefined when unset", () => {
        delete process.env.PRODUCTION_ORIGIN;
        expect(getAllowedServerActionOrigins()).toBeUndefined();
    });

    it("returns a single origin as a one-element array", () => {
        process.env.PRODUCTION_ORIGIN = "my-journal.vercel.app";
        expect(getAllowedServerActionOrigins()).toEqual(["my-journal.vercel.app"]);
    });

    it("splits, trims, and drops empty entries from a comma-separated list", () => {
        process.env.PRODUCTION_ORIGIN = "my-journal.vercel.app, *.example.com ,,";
        expect(getAllowedServerActionOrigins()).toEqual(["my-journal.vercel.app", "*.example.com"]);
    });
});
