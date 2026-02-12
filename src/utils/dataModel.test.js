import { describe, it, expect } from "vitest";
import {
    BINDABLE_TYPES,
    BINDABLE_PROPERTIES,
    getBindablePropsForType,
    getPrimaryBindablePropForType,
    PRIMARY_PROP_KEY_BY_TYPE,
    getNodePropValue,
    getControlPreview,
    collectBindableFromTree,
    getValueAtPath,
    setValueAtPath,
} from "./dataModel.js";

describe("dataModel", () => {
    describe("BINDABLE_TYPES and getBindablePropsForType", () => {
        it("includes Text, Button, Image, TextField, Toggle, Slider, Picker, List, etc.", () => {
            expect(BINDABLE_TYPES).toContain("Text");
            expect(BINDABLE_TYPES).toContain("Button");
            expect(BINDABLE_TYPES).toContain("List");
        });

        it("getBindablePropsForType returns array of { key, label } for Text", () => {
            const props = getBindablePropsForType("Text");
            expect(Array.isArray(props)).toBe(true);
            expect(props.some((p) => p.key === "text" && p.label === "Text")).toBe(true);
        });

        it("getBindablePropsForType returns empty array for View", () => {
            expect(getBindablePropsForType("View")).toEqual([]);
        });

        it("Picker has selection and options", () => {
            const props = getBindablePropsForType("Picker");
            expect(props.some((p) => p.key === "selection")).toBe(true);
            expect(props.some((p) => p.key === "options")).toBe(true);
        });
    });

    describe("PRIMARY_PROP_KEY_BY_TYPE and getPrimaryBindablePropForType", () => {
        it("Text primary is text", () => {
            expect(PRIMARY_PROP_KEY_BY_TYPE.Text).toBe("text");
            expect(getPrimaryBindablePropForType("Text").key).toBe("text");
        });

        it("Button primary is title", () => {
            expect(getPrimaryBindablePropForType("Button").key).toBe("title");
        });

        it("List primary is items", () => {
            expect(getPrimaryBindablePropForType("List").key).toBe("items");
        });

        it("returns null for non-bindable type", () => {
            expect(getPrimaryBindablePropForType("View")).toBeNull();
        });
    });

    describe("getNodePropValue", () => {
        it("returns text for Text node", () => {
            expect(getNodePropValue({ text: "Hi" }, "text")).toBe("Hi");
            expect(getNodePropValue({}, "text")).toBe("");
        });

        it("returns isOn for Toggle", () => {
            expect(getNodePropValue({ isOn: true }, "isOn")).toBe(true);
            expect(getNodePropValue({}, "isOn")).toBe(false);
        });

        it("returns options array for Picker", () => {
            const opts = ["A", "B"];
            expect(getNodePropValue({ options: opts }, "options")).toEqual(opts);
        });

        it("returns items array for List", () => {
            const items = ["x", "y"];
            expect(getNodePropValue({ items }, "items")).toEqual(items);
        });
    });

    describe("getControlPreview", () => {
        it("returns preview for text", () => {
            expect(getControlPreview({ text: "Hello" }, "text")).toContain("Hello");
            expect(getControlPreview({ text: "" }, "text")).toBe("(empty)");
        });

        it("returns preview for title", () => {
            expect(getControlPreview({ title: "Tap" }, "title")).toContain("Tap");
        });

        it("returns options count for Picker", () => {
            expect(getControlPreview({ options: ["A", "B", "C"] }, "options")).toBe("3 options");
        });

        it("returns empty string for null node", () => {
            expect(getControlPreview(null, "text")).toBe("");
        });
    });

    describe("collectBindableFromTree", () => {
        it("collects bindables from tree with Text and Button", () => {
            const tree = {
                id: "root",
                type: "View",
                children: [
                    { id: "t1", type: "Text", text: "Hi" },
                    { id: "b1", type: "Button", title: "Tap" },
                ],
            };
            const result = collectBindableFromTree(tree);
            expect(result.length).toBeGreaterThan(0);
            const textEntry = result.find((r) => r.nodeId === "t1" && r.propKey === "text");
            expect(textEntry).toBeDefined();
            expect(textEntry.currentValue).toBe("Hi");
            const btnEntry = result.find((r) => r.nodeId === "b1" && r.propKey === "title");
            expect(btnEntry).toBeDefined();
        });

        it("returns empty array for empty or null tree", () => {
            expect(collectBindableFromTree(null)).toEqual([]);
            expect(collectBindableFromTree({ id: "root", type: "View", children: [] })).toEqual([]);
        });
    });

    describe("getValueAtPath", () => {
        it("gets top-level property", () => {
            expect(getValueAtPath({ a: 1 }, "a")).toBe(1);
        });

        it("gets nested path", () => {
            expect(getValueAtPath({ user: { name: "Alice" } }, "user.name")).toBe("Alice");
        });

        it("gets array index", () => {
            expect(getValueAtPath({ items: ["a", "b"] }, "items[0]")).toBe("a");
            expect(getValueAtPath({ items: ["a", "b"] }, "items.1")).toBe("b");
        });

        it("returns undefined for null obj or missing path", () => {
            expect(getValueAtPath(null, "a")).toBeUndefined();
            expect(getValueAtPath({}, "")).toBeUndefined();
            expect(getValueAtPath({ a: 1 }, "b")).toBeUndefined();
        });
    });

    describe("setValueAtPath", () => {
        it("sets top-level property", () => {
            const obj = { a: 1 };
            const next = setValueAtPath(obj, "a", 2);
            expect(next.a).toBe(2);
            expect(obj.a).toBe(1);
        });

        it("sets nested path and creates objects", () => {
            const next = setValueAtPath({}, "user.name", "Bob");
            expect(next.user.name).toBe("Bob");
        });

        it("sets array index", () => {
            const next = setValueAtPath({ items: ["a", "b"] }, "items[1]", "c");
            expect(next.items[1]).toBe("c");
        });
    });
});