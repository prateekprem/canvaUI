import { describe, it, expect } from "vitest";
import {
    SCHEMA_VERSION,
    toCanonicalJSON,
    fromCanonicalJSON,
} from "./canonicalSchema.js";
import { createNode } from "./defaultNode.js";

describe("canonicalSchema", () => {
    describe("SCHEMA_VERSION", () => {
        it("is 1.0", () => {
            expect(SCHEMA_VERSION).toBe("1.0");
        });
    });

    describe("toCanonicalJSON", () => {
        it("returns null for null tree", () => {
            expect(toCanonicalJSON(null)).toBeNull();
        });

        it("exports root with schemaVersion and root node", () => {
            const view = createNode("View");
            view.id = "root";
            const tree = {...view, children: [] };
            const doc = toCanonicalJSON(tree);
            expect(doc).not.toBeNull();
            expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
            expect(doc.root).toBeDefined();
            expect(doc.root.type).toBe("View");
            expect(doc.root.style).toBeDefined();
        });

        it("exports single top-level child as root when one child", () => {
            const child = createNode("VStack");
            child.id = "main";
            const tree = { id: "root", type: "View", children: [child], fitToScreen: false };
            const doc = toCanonicalJSON(tree);
            expect(doc.root.type).toBe("VStack");
            expect(doc.root.id).toBe("main");
        });

        it("exports wrapper View with id screen when multiple children", () => {
            const a = createNode("Text");
            const b = createNode("Button");
            const tree = { id: "root", type: "View", children: [a, b], fitToScreen: false };
            const doc = toCanonicalJSON(tree);
            expect(doc.root.id).toBe("screen");
            expect(doc.root.type).toBe("View");
            expect(doc.root.children.length).toBe(2);
        });

        it("includes dataMapping with dataModel and mockApiBindings", () => {
            const tree = { id: "root", type: "View", children: [] };
            const dataMapping = { dataModel: [{ id: "1", name: "x" }], mockApiBindings: [] };
            const doc = toCanonicalJSON(tree, dataMapping);
            expect(doc.dataMapping).toBeDefined();
            expect(Array.isArray(doc.dataMapping.dataModel)).toBe(true);
            expect(doc.dataMapping.dataModel.length).toBe(1);
            expect(Array.isArray(doc.dataMapping.mockApiBindings)).toBe(true);
        });

        it("includes style with layout keys on root", () => {
            const tree = { id: "root", type: "View", children: [] };
            const doc = toCanonicalJSON(tree);
            expect(doc.root.style).toBeDefined();
            expect(doc.root.style.layoutMode).toBeDefined();
            expect(["autoLayout", "autoResize", "freeForm"]).toContain(doc.root.style.layoutMode);
        });
    });

    describe("fromCanonicalJSON", () => {
        it("returns null for null or missing root", () => {
            expect(fromCanonicalJSON(null)).toBeNull();
            expect(fromCanonicalJSON({})).toBeNull();
            expect(fromCanonicalJSON({ root: null })).toBeNull();
        });

        it("returns canvas root with id root and type View", () => {
            const doc = {
                schemaVersion: "1.0",
                root: { type: "View", id: "screen", style: {}, children: [] },
            };
            const tree = fromCanonicalJSON(doc);
            expect(tree).not.toBeNull();
            expect(tree.id).toBe("root");
            expect(tree.type).toBe("View");
            expect(Array.isArray(tree.children)).toBe(true);
        });

        it("unwraps wrapper (id screen) and uses its children as canvas children", () => {
            const doc = {
                schemaVersion: "1.0",
                root: {
                    type: "View",
                    id: "screen",
                    style: {},
                    children: [
                        { type: "Text", id: "t1", style: {}, text: "Hi" },
                        { type: "Button", id: "b1", style: {}, title: "Tap" },
                    ],
                },
            };
            const tree = fromCanonicalJSON(doc);
            expect(tree.children.length).toBe(2);
            expect(tree.children[0].type).toBe("Text");
            expect(tree.children[0].text).toBe("Hi");
            expect(tree.children[1].type).toBe("Button");
            expect(tree.children[1].title).toBe("Tap");
        });

        it("round-trip: toCanonicalJSON then fromCanonicalJSON preserves structure", () => {
            const view = createNode("View");
            const text = createNode("Text");
            text.text = "Round trip";
            view.children = [text];
            view.id = "root";
            const tree = {...view, children: view.children };
            const doc = toCanonicalJSON(tree);
            const back = fromCanonicalJSON(doc);
            expect(back.id).toBe("root");
            expect(back.type).toBe("View");
            expect(back.children.length).toBe(1);
            expect(back.children[0].type).toBe("Text");
            expect(back.children[0].text).toBe("Round trip");
        });
    });
});