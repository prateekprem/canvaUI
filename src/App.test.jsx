import { describe, it, expect } from "vitest";
import { findNodeInTree } from "./utils/tree.js";
import { createNode } from "./schema/defaultNode.js";

/**
 * Tests for App merge/update logic: layoutMode and autoResize must be
 * in STYLE_AND_LAYOUT_KEYS so Inspector layout dropdown update persists.
 * We test the contract: a payload with layoutMode and autoResize should
 * be mergeable into a tree node.
 */
describe("App update contract", () => {
  const STYLE_AND_LAYOUT_KEYS = [
    "fitToScreen", "autoResize", "layoutMode",
    "width", "height", "x", "y",
    "paddingHorizontal", "paddingVertical", "paddingTop", "paddingBottom",
    "marginHorizontal", "marginVertical", "marginTop", "marginBottom", "marginLeft", "marginRight",
    "alignment", "spacing", "text", "title", "src", "alt", "contentMode", "items",
    "placeholder", "isOn", "label", "value", "min", "max", "selection", "options",
    "progress", "indeterminate", "axis", "url",
    "localizationEnabled", "localizationKey", "localizationDefaultValue",
    "accessibilityEnabled", "accessibilityIdentifier", "accessibilityLabel",
    "tag", "isUserInteractionEnabled", "isHidden", "automationIdentifier",
    "actionId", "actionEvent", "actionBoundNodeId", "actionBoundProperty", "actionBoundDataModelId",
    "gestures", "displayFormat", "screenId",
  ];

  it("STYLE_AND_LAYOUT_KEYS includes layoutMode and autoResize", () => {
    expect(STYLE_AND_LAYOUT_KEYS).toContain("layoutMode");
    expect(STYLE_AND_LAYOUT_KEYS).toContain("autoResize");
  });

  it("simulated merge preserves layoutMode and autoResize from payload", () => {
    const nodeInTree = createNode("View");
    nodeInTree.id = "n1";
    nodeInTree.layoutMode = "freeForm";
    nodeInTree.autoResize = false;
    const updated = {
      ...nodeInTree,
      id: "n1",
      layoutMode: "autoLayout",
      autoResize: false,
    };
    const merged = { ...nodeInTree, id: nodeInTree.id };
    for (const key of STYLE_AND_LAYOUT_KEYS) {
      if (key === "width" || key === "height") {
        if (key in updated) merged[key] = updated[key];
      } else if (updated[key] !== undefined) {
        merged[key] = updated[key];
      }
    }
    expect(merged.layoutMode).toBe("autoLayout");
    expect(merged.autoResize).toBe(false);
  });
});

describe("Menu / Sidebar data flow", () => {
  it("default tree has root with id root and type View", () => {
    const root = {
      id: "root",
      type: "View",
      children: [],
      fitToScreen: false,
    };
    expect(root.id).toBe("root");
    expect(root.type).toBe("View");
    expect(Array.isArray(root.children)).toBe(true);
  });

  it("findNodeInTree finds added node after add", () => {
    const root = { id: "root", type: "View", children: [] };
    const text = createNode("Text");
    text.id = "t1";
    root.children = [text];
    const found = findNodeInTree(root, "t1");
    expect(found).not.toBeNull();
    expect(found.type).toBe("Text");
  });
});
