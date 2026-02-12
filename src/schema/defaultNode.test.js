import { describe, it, expect } from "vitest";
import {
    createNode,
    getDisplayName,
    getDescription,
    CONTAINER_TYPES,
    isContainer,
    LAYOUT_MODES,
} from "./defaultNode.js";

describe("defaultNode", () => {
    describe("createNode – controls", () => {
        const controlTypes = [
            "Text",
            "Button",
            "Image",
            "View",
            "VStack",
            "HStack",
            "ZStack",
            "List",
            "ListItemContent",
            "TextField",
            "Toggle",
            "Slider",
            "Picker",
            "ProgressView",
            "Divider",
            "Link",
            "SecureField",
        ];

        it.each(controlTypes)("creates %s with correct type and id", (type) => {
            const node = createNode(type);
            expect(node).not.toBeNull();
            expect(node.type).toBe(type);
            expect(node.id).toBeDefined();
            expect(typeof node.id).toBe("string");
        });

        it("creates Text with text and alignment", () => {
            const node = createNode("Text");
            expect(node.text).toBe("Hello");
            expect(node.alignment).toBe("start");
        });

        it("creates Button with title", () => {
            const node = createNode("Button");
            expect(node.title).toBe("Tap Me");
        });

        it("creates View with empty children and backgroundColor", () => {
            const node = createNode("View");
            expect(node.children).toEqual([]);
            expect(node.backgroundColor).toBe("#ffffff");
        });

        it("creates VStack and HStack with spacing and alignment", () => {
            const v = createNode("VStack");
            const h = createNode("HStack");
            expect(v.spacing).toBe(12);
            expect(v.alignment).toBe("center");
            expect(h.spacing).toBe(12);
            expect(h.alignment).toBe("center");
        });

        it("creates ZStack with alignment", () => {
            const node = createNode("ZStack");
            expect(node.alignment).toBe("center");
        });

        it("creates List with items and children", () => {
            const node = createNode("List");
            expect(Array.isArray(node.items)).toBe(true);
            expect(node.items.length).toBeGreaterThan(0);
            expect(node.children).toEqual([]);
        });

        it("creates Toggle with isOn and label", () => {
            const node = createNode("Toggle");
            expect(node.isOn).toBe(false);
            expect(node.label).toBe("Toggle");
        });

        it("creates Slider with value, min, max", () => {
            const node = createNode("Slider");
            expect(node.value).toBe(50);
            expect(node.min).toBe(0);
            expect(node.max).toBe(100);
        });

        it("creates Picker with selection and options", () => {
            const node = createNode("Picker");
            expect(node.selection).toBeDefined();
            expect(Array.isArray(node.options)).toBe(true);
        });

        it("creates ProgressView with progress and indeterminate", () => {
            const node = createNode("ProgressView");
            expect(node.progress).toBe(0.5);
            expect(node.indeterminate).toBe(false);
        });

        it("creates nodes with layoutMode default autoLayout", () => {
            const node = createNode("View");
            expect(node.layoutMode).toBe("autoLayout");
            expect(node.autoResize).toBe(false);
        });

        it("returns null for unknown type", () => {
            expect(createNode("Unknown")).toBeNull();
        });
    });

    describe("getDisplayName", () => {
        it("returns friendly name for known types", () => {
            expect(getDisplayName("View")).toBe("Container");
            expect(getDisplayName("VStack")).toBe("Vertical stack");
            expect(getDisplayName("Text")).toBe("Text");
            expect(getDisplayName("Button")).toBe("Button");
        });

        it("returns type for unknown type", () => {
            expect(getDisplayName("Unknown")).toBe("Unknown");
        });
    });

    describe("getDescription", () => {
        it("returns description for View", () => {
            expect(getDescription("View")).toContain("box");
        });
        it("returns empty string for unknown type", () => {
            expect(getDescription("Unknown")).toBe("");
        });
    });

    describe("CONTAINER_TYPES and isContainer", () => {
        it("includes View, VStack, HStack, ZStack, List", () => {
            expect(CONTAINER_TYPES).toContain("View");
            expect(CONTAINER_TYPES).toContain("VStack");
            expect(CONTAINER_TYPES).toContain("HStack");
            expect(CONTAINER_TYPES).toContain("ZStack");
            expect(CONTAINER_TYPES).toContain("List");
        });

        it("isContainer returns true for container types", () => {
            expect(isContainer({ type: "View" })).toBe(true);
            expect(isContainer({ type: "VStack" })).toBe(true);
            expect(isContainer({ type: "List" })).toBe(true);
        });

        it("isContainer returns false for non-containers and null", () => {
            expect(isContainer({ type: "Text" })).toBe(false);
            expect(isContainer(null)).toBeFalsy();
        });
    });

    describe("LAYOUT_MODES", () => {
        it("includes autoLayout, autoResize, freeForm", () => {
            expect(LAYOUT_MODES).toEqual(["autoLayout", "autoResize", "freeForm"]);
        });
    });
});