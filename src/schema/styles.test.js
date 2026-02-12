import { describe, it, expect } from "vitest";
import {
    STYLE_DEFINITIONS,
    CONTROL_STYLE_KEYS,
    getEnabledStyleKeysForControl,
    getEnabledStylesForControl,
    getDefaultStyle,
} from "./styles.js";

describe("styles", () => {
    describe("STYLE_DEFINITIONS", () => {
        it("includes font and color keys", () => {
            const keys = STYLE_DEFINITIONS.map((d) => d.key);
            expect(keys).toContain("fontFamily");
            expect(keys).toContain("fontSize");
            expect(keys).toContain("textColor");
            expect(keys).toContain("backgroundColor");
        });
    });

    describe("getEnabledStyleKeysForControl", () => {
        it("returns array for Text (font keys)", () => {
            const keys = getEnabledStyleKeysForControl("Text");
            expect(Array.isArray(keys)).toBe(true);
            expect(keys).toContain("fontSize");
            expect(keys).toContain("textColor");
        });

        it("returns array for View", () => {
            const keys = getEnabledStyleKeysForControl("View");
            expect(Array.isArray(keys)).toBe(true);
        });

        it("returns undefined or empty for unknown type", () => {
            const keys = getEnabledStyleKeysForControl("Unknown");
            expect(keys == null || keys.length === 0).toBe(true);
        });
    });

    describe("getEnabledStylesForControl", () => {
        it("returns style definitions for Text", () => {
            const styles = getEnabledStylesForControl("Text");
            expect(Array.isArray(styles)).toBe(true);
        });
    });

    describe("getDefaultStyle", () => {
        it("returns object with layoutMode and numeric defaults", () => {
            const def = getDefaultStyle();
            expect(def).toBeDefined();
            expect(typeof def.layoutMode === "string" || def.layoutMode == null).toBe(true);
            expect(typeof def.fontSize).toBe("number");
        });
    });
});