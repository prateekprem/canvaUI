import { describe, it, expect } from "vitest";
import {
    findNodeInTree,
    addNodeToTree,
    removeNodeFromTree,
    getPathToNode,
    hasDescendant,
} from "./tree.js";

const makeTree = () => ({
    id: "root",
    type: "View",
    children: [
        { id: "a", type: "View", children: [] },
        {
            id: "b",
            type: "VStack",
            children: [
                { id: "b1", type: "Text", children: undefined },
                { id: "b2", type: "Button", children: undefined },
            ],
        },
    ],
});

describe("tree", () => {
    describe("findNodeInTree", () => {
        it("finds root by id", () => {
            const tree = makeTree();
            const found = findNodeInTree(tree, "root");
            expect(found).toBe(tree);
            expect(found.id).toBe("root");
        });

        it("finds direct child by id", () => {
            const tree = makeTree();
            const found = findNodeInTree(tree, "a");
            expect(found).not.toBeNull();
            expect(found.id).toBe("a");
            expect(found.type).toBe("View");
        });

        it("finds nested node by id", () => {
            const tree = makeTree();
            const found = findNodeInTree(tree, "b1");
            expect(found).not.toBeNull();
            expect(found.id).toBe("b1");
            expect(found.type).toBe("Text");
        });

        it("returns null for missing id", () => {
            const tree = makeTree();
            expect(findNodeInTree(tree, "missing")).toBeNull();
        });

        it("returns null for null tree", () => {
            expect(findNodeInTree(null, "root")).toBeNull();
        });

        it("matches id as string (number id)", () => {
            const tree = { id: 123, type: "View", children: [] };
            expect(findNodeInTree(tree, "123")).toEqual(tree);
            expect(findNodeInTree(tree, 123)).toEqual(tree);
        });
    });

    describe("addNodeToTree", () => {
        it("adds node as direct child of root", () => {
            const tree = makeTree();
            const newNode = { id: "new", type: "Text" };
            const result = addNodeToTree(tree, "root", newNode, 0);
            expect(result.children[0].id).toBe("new");
            expect(result.children.length).toBe(tree.children.length + 1);
        });

        it("adds node at index", () => {
            const tree = makeTree();
            const newNode = { id: "new", type: "Text" };
            const result = addNodeToTree(tree, "root", newNode, 1);
            expect(result.children[1].id).toBe("new");
        });

        it("adds node to nested parent", () => {
            const tree = makeTree();
            const newNode = { id: "new", type: "Text" };
            const result = addNodeToTree(tree, "b", newNode, 0);
            const b = result.children.find((c) => c.id === "b");
            expect(b.children[0].id).toBe("new");
        });

        it("returns unchanged tree when parentId not found", () => {
            const tree = makeTree();
            const newNode = { id: "new", type: "Text" };
            const result = addNodeToTree(tree, "nonexistent", newNode, 0);
            expect(result).toEqual(tree);
        });
    });

    describe("removeNodeFromTree", () => {
        it("removes direct child and returns new tree and node", () => {
            const tree = makeTree();
            const { tree: newTree, node } = removeNodeFromTree(tree, "a");
            expect(node).not.toBeNull();
            expect(node.id).toBe("a");
            expect(newTree.children.length).toBe(tree.children.length - 1);
            expect(newTree.children.some((c) => c.id === "a")).toBe(false);
        });

        it("removes nested node", () => {
            const tree = makeTree();
            const { tree: newTree, node } = removeNodeFromTree(tree, "b1");
            expect(node.id).toBe("b1");
            const b = newTree.children.find((c) => c.id === "b");
            expect(b.children.some((c) => c.id === "b1")).toBe(false);
        });

        it("returns tree and null when nodeId not found", () => {
            const tree = makeTree();
            const { tree: newTree, node } = removeNodeFromTree(tree, "missing");
            expect(node).toBeNull();
            expect(newTree).toEqual(tree);
        });

        it("returns null tree when tree is null", () => {
            const { tree: newTree, node } = removeNodeFromTree(null, "root");
            expect(newTree).toBeNull();
            expect(node).toBeNull();
        });
    });

    describe("getPathToNode", () => {
        it("returns path for root", () => {
            const tree = makeTree();
            expect(getPathToNode(tree, "root")).toEqual(["View"]);
        });

        it("returns path for nested node", () => {
            const tree = makeTree();
            expect(getPathToNode(tree, "b1")).toEqual(["View", "VStack", "Text"]);
        });

        it("returns empty array when node not found", () => {
            const tree = makeTree();
            expect(getPathToNode(tree, "missing")).toEqual([]);
        });
    });

    describe("hasDescendant", () => {
        it("returns true for self", () => {
            const tree = makeTree();
            expect(hasDescendant(tree, "root")).toBe(true);
        });

        it("returns true for direct child", () => {
            const tree = makeTree();
            expect(hasDescendant(tree, "a")).toBe(true);
            expect(hasDescendant(tree.children[1], "b1")).toBe(true);
        });

        it("returns false for non-descendant", () => {
            const tree = makeTree();
            expect(hasDescendant(tree.children[0], "b1")).toBe(false);
        });

        it("returns false for null node", () => {
            expect(hasDescendant(null, "root")).toBe(false);
        });
    });
});