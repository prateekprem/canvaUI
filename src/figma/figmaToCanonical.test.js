import { describe, it, expect } from "vitest";
import { figmaToCanonicalDocument } from "./figmaToCanonical.js";
import { SCHEMA_VERSION } from "../schema/canonicalSchema.js";

describe("figmaToCanonical", () => {
    describe("figmaToCanonicalDocument", () => {
        it("returns null for null root", () => {
            expect(figmaToCanonicalDocument(null)).toBeNull();
        });

        it("returns document with schemaVersion, root, dataMapping", () => {
            const figmaFrame = {
                id: "1:0",
                type: "FRAME",
                name: "Frame",
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                children: [],
            };
            const doc = figmaToCanonicalDocument(figmaFrame);
            expect(doc).not.toBeNull();
            expect(doc.schemaVersion).toBe(SCHEMA_VERSION);
            expect(doc.root).toBeDefined();
            expect(doc.dataMapping).toBeDefined();
            expect(Array.isArray(doc.dataMapping.dataModel)).toBe(true);
            expect(Array.isArray(doc.dataMapping.mockApiBindings)).toBe(true);
        });

        it("converts FRAME to View with bounds in style, root normalized to (0,0)", () => {
            const figmaFrame = {
                id: "1:0",
                type: "FRAME",
                absoluteBoundingBox: { x: 10, y: 20, width: 200, height: 150 },
                children: [],
            };
            const doc = figmaToCanonicalDocument(figmaFrame);
            expect(doc.root.type).toBe("View");
            expect(doc.root.style).toBeDefined();
            expect(doc.root.style.x).toBe(0);
            expect(doc.root.style.y).toBe(0);
            expect(doc.root.style.width).toBe(200);
            expect(doc.root.style.height).toBe(150);
            expect(doc.root.style.layoutMode).toBe("autoLayout");
        });

        it("converts VERTICAL layout to VStack", () => {
            const figmaFrame = {
                id: "1:0",
                type: "FRAME",
                layoutMode: "VERTICAL",
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                children: [],
            };
            const doc = figmaToCanonicalDocument(figmaFrame);
            expect(doc.root.type).toBe("VStack");
        });

        it("converts HORIZONTAL layout to HStack", () => {
            const figmaFrame = {
                id: "1:0",
                type: "FRAME",
                layoutMode: "HORIZONTAL",
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                children: [],
            };
            const doc = figmaToCanonicalDocument(figmaFrame);
            expect(doc.root.type).toBe("HStack");
        });

        it("converts TEXT node to Text with characters and style", () => {
            const figmaText = {
                id: "2:0",
                type: "TEXT",
                characters: "Hello Figma",
                style: { fontSize: 14, fontFamily: "Inter" },
                absoluteBoundingBox: { x: 0, y: 0, width: 80, height: 20 },
            };
            const doc = figmaToCanonicalDocument(figmaText);
            expect(doc.root.type).toBe("Text");
            expect(doc.root.text).toBe("Hello Figma");
            expect(doc.root.style.fontSize).toBe(14);
            expect(doc.root.style.fontFamily).toBe("Inter");
        });

        it("converts RECTANGLE to View", () => {
            const figmaRect = {
                id: "3:0",
                type: "RECTANGLE",
                absoluteBoundingBox: { x: 0, y: 0, width: 50, height: 50 },
                cornerRadius: 8,
                children: [],
            };
            const doc = figmaToCanonicalDocument(figmaRect);
            expect(doc.root.type).toBe("View");
            expect(doc.root.style.cornerRadius).toBe(8);
        });

        it("sanitizes node id for use as canonical id", () => {
            const figmaFrame = {
                id: "1:2:3-abc",
                type: "FRAME",
                absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
                children: [],
            };
            const doc = figmaToCanonicalDocument(figmaFrame);
            expect(doc.root.id).toBeDefined();
            expect(doc.root.id).toMatch(/^[a-zA-Z0-9_-]+$/);
        });

        it("uses imageUrls for RECTANGLE when provided", () => {
            const figmaRect = {
                id: "4:0",
                type: "RECTANGLE",
                name: "Image",
                absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 100 },
                children: [],
            };
            const imageUrls = { "4:0": "https://example.com/image.png" };
            const doc = figmaToCanonicalDocument(figmaRect, imageUrls);
            expect(doc.root.type).toBe("Image");
            expect(doc.root.src).toBe("https://example.com/image.png");
        });
    });
});