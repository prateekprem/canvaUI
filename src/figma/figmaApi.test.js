import { describe, it, expect } from "vitest";
import {
    getFileKeyFromUrl,
    getNodeIdFromUrl,
    getRootNodeFromFile,
} from "./figmaApi.js";

describe("figmaApi", () => {
    describe("getFileKeyFromUrl", () => {
        it("extracts file key from file URL", () => {
            expect(getFileKeyFromUrl("https://www.figma.com/file/abc123/Design")).toBe("abc123");
            expect(getFileKeyFromUrl("https://figma.com/file/xyz789/Name")).toBe("xyz789");
        });

        it("extracts file key from design URL", () => {
            expect(getFileKeyFromUrl("https://figma.com/design/def456/")).toBe("def456");
        });

        it("extracts file key from proto URL", () => {
            expect(getFileKeyFromUrl("https://figma.com/proto/ghi789")).toBe("ghi789");
        });

        it("returns null for invalid or empty input", () => {
            expect(getFileKeyFromUrl("")).toBeNull();
            expect(getFileKeyFromUrl(null)).toBeNull();
            expect(getFileKeyFromUrl("https://example.com/not-figma")).toBeNull();
        });

        it("handles trimmed URLs", () => {
            expect(getFileKeyFromUrl("  https://figma.com/file/abc123/  ")).toBe("abc123");
        });
    });

    describe("getNodeIdFromUrl", () => {
        it("extracts node-id from query", () => {
            expect(getNodeIdFromUrl("https://figma.com/file/abc?node-id=1-2")).toBe("1-2");
            expect(getNodeIdFromUrl("https://figma.com/file/abc?node_id=3-4")).toBe("3-4");
        });

        it("strips node- prefix if present", () => {
            expect(getNodeIdFromUrl("https://figma.com/file/x?node-id=node-5-6")).toBe("5-6");
        });

        it("returns null when no node-id param", () => {
            expect(getNodeIdFromUrl("https://figma.com/file/abc")).toBeNull();
            expect(getNodeIdFromUrl("")).toBeNull();
            expect(getNodeIdFromUrl(null)).toBeNull();
        });
    });

    describe("getRootNodeFromFile", () => {
        it("returns null when document has no children", () => {
            const fileResponse = {
                document: { id: "0:1", type: "DOCUMENT", children: [] },
                name: "File",
            };
            expect(getRootNodeFromFile(fileResponse)).toBeNull();
        });

        it("returns first frame when no preferNodeId", () => {
            const firstFrame = { id: "1:2", type: "FRAME", name: "Frame 1" };
            const fileResponse = {
                document: {
                    id: "0:1",
                    type: "DOCUMENT",
                    children: [
                        { id: "0:1", type: "CANVAS", children: [firstFrame] },
                    ],
                },
                name: "File",
            };
            const result = getRootNodeFromFile(fileResponse);
            expect(result).not.toBeNull();
            expect(result.node).toEqual(firstFrame);
            expect(result.nodeId).toBe("1:2");
        });

        it("returns specific node when preferNodeId matches", () => {
            const childNode = { id: "2:3", type: "FRAME", name: "Frame 2" };
            const fileResponse = {
                document: {
                    id: "0:1",
                    type: "DOCUMENT",
                    children: [{
                        id: "0:1",
                        type: "CANVAS",
                        children: [
                            { id: "1:2", type: "FRAME" },
                            childNode,
                        ],
                    }, ],
                },
                name: "File",
            };
            const result = getRootNodeFromFile(fileResponse, "2:3");
            expect(result).not.toBeNull();
            expect(result.node).toEqual(childNode);
            expect(result.nodeId).toBe("2:3");
        });

        it("returns null when fileResponse is null", () => {
            expect(getRootNodeFromFile(null)).toBeNull();
        });
    });
});