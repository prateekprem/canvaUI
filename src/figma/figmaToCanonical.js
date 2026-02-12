/**
 * Convert Figma file node tree to our canonical UI JSON (schema compatible with fromCanonicalJSON).
 * Maps Figma types to View, VStack, HStack, Text, Image, etc.
 */

import { SCHEMA_VERSION } from "../schema/canonicalSchema";
import { randomUUID } from "../utils/uuid";

function nvl(value, fallback) {
    return value != null ? value : fallback;
}

function defaultStyle(overrides = {}) {
    const s = {
        width: null,
        height: null,
        x: 0,
        y: 0,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        backgroundColor: null,
        textColor: "#000000",
        fontSize: 16,
        fontWeight: "normal",
        fontFamily: "system-ui",
        cornerRadius: 0,
        opacity: 1,
        layoutMode: "autoLayout",
        autoResize: false,
    };
    return {...s, ...overrides };
}

/** Figma color { r,g,b,a } 0-1 to hex */
function figmaColorToHex(fill) {
    if (!fill || fill.type !== "SOLID" || !fill.color) return null;
    const { r, g, b, a = 1 } = fill.color;
    const R = Math.round((nvl(r, 0)) * 255);
    const G = Math.round((nvl(g, 0)) * 255);
    const B = Math.round((nvl(b, 0)) * 255);
    const hex = [R, G, B].map((x) => x.toString(16).padStart(2, "0")).join("");
    if (a >= 1) return `#${hex}`;
    const A = Math.round((nvl(a, 1)) * 255).toString(16).padStart(2, "0");
    return `#${hex}${A}`;
}

/** Primary fill color from Figma node */
function getBackgroundColor(node) {
    const fills = node.fills;
    if (!Array.isArray(fills) || fills.length === 0) return null;
    const solid = fills.find((f) => f.visible !== false && f.type === "SOLID");
    return solid ? figmaColorToHex(solid) : null;
}

/** Bounding box from Figma node (relative to parent for layout) */
function getBounds(node, parentBounds) {
    const b = node.absoluteBoundingBox || node.absoluteRenderBounds;
    if (!b || b.width == null || b.height == null) return null;
    const parent = parentBounds || { x: 0, y: 0 };
    return {
        x: (nvl(b.x, 0)) - parent.x,
        y: (nvl(b.y, 0)) - parent.y,
        width: b.width,
        height: b.height,
    };
}

/** Map Figma layout mode to our stack type */
function getLayoutType(node) {
    const layoutMode = node.layoutMode;
    const primaryAxis = node.primaryAxisAlignItems || "MIN";
    if (layoutMode === "VERTICAL") return "VStack";
    if (layoutMode === "HORIZONTAL") return "HStack";
    return "View";
}

/** Recursive convert one Figma node to our canonical node */
function figmaNodeToCanonical(figmaNode, parentBounds, imageUrls = {}) {
    if (!figmaNode || !figmaNode.id) return null;
    const bounds = getBounds(figmaNode, parentBounds);
    const id = figmaNode.id.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 36) || randomUUID();
    const style = defaultStyle(
        bounds ? {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            layoutMode: "autoLayout",
            backgroundColor: getBackgroundColor(figmaNode),
            cornerRadius: nvl(figmaNode.cornerRadius, 0),
            opacity: figmaNode.opacity != null ? figmaNode.opacity : 1,
        } : {}
    );

    switch (figmaNode.type) {
        case "TEXT":
            {
                const characters = nvl(figmaNode.characters, "");
                const styleObj = figmaNode.style || {};
                const fontSize = nvl(styleObj.fontSize, 16);
                const fontFamily = nvl(styleObj.fontFamily, "system-ui");
                const fontWeight = styleObj.fontWeight === 700 ? "bold" : styleObj.fontWeight === 600 ? "600" : "normal";
                const textColor = figmaNode.fills && Array.isArray(figmaNode.fills) && figmaNode.fills[0] ?
                    figmaColorToHex(figmaNode.fills[0]) : "#000000";
                return {
                    type: "Text",
                    id,
                    style: {...style, fontSize, fontFamily, fontWeight, textColor: textColor || style.textColor },
                    text: characters,
                    alignment: "start",
                    localizationEnabled: false,
                    localizationKey: "",
                    localizationDefaultValue: "",
                    accessibilityEnabled: false,
                    accessibilityIdentifier: "",
                    accessibilityLabel: "",
                    tag: 0,
                    isUserInteractionEnabled: true,
                    isHidden: false,
                    automationIdentifier: "",
                    actionId: "",
                    actionEvent: "",
                    actionBoundNodeId: "",
                    actionBoundProperty: "",
                    actionBoundDataModelId: "",
                    gestures: [],
                    displayFormat: null,
                };
            }
        case "RECTANGLE":
        case "ELLIPSE":
            {
                const imageUrl = imageUrls[figmaNode.id];
                if (imageUrl) {
                    return {
                        type: "Image",
                        id,
                        style,
                        src: imageUrl,
                        alt: figmaNode.name || "Image",
                        contentMode: "contain",
                        localizationEnabled: false,
                        localizationKey: "",
                        localizationDefaultValue: "",
                        accessibilityEnabled: false,
                        accessibilityIdentifier: "",
                        accessibilityLabel: "",
                        tag: 0,
                        isUserInteractionEnabled: true,
                        isHidden: false,
                        automationIdentifier: "",
                        actionId: "",
                        actionEvent: "",
                        actionBoundNodeId: "",
                        actionBoundProperty: "",
                        actionBoundDataModelId: "",
                        gestures: [],
                        displayFormat: null,
                    };
                }
                return buildViewNode("View", id, style, figmaNode, parentBounds, imageUrls);
            }
        case "FRAME":
            {
                const ourType = getLayoutType(figmaNode);
                return buildViewNode(ourType, id, style, figmaNode, parentBounds, imageUrls);
            }
        case "GROUP":
            // Flatten single-child GROUP to avoid extra View wrappers
            if (figmaNode.children && figmaNode.children.length === 1) {
                const groupBounds = getBounds(figmaNode, parentBounds) || { x: 0, y: 0 };
                const child = figmaNodeToCanonical(figmaNode.children[0], groupBounds, imageUrls);
                if (child && child.style) {
                    child.style.x = (nvl(groupBounds.x, 0)) + (nvl(child.style.x, 0));
                    child.style.y = (nvl(groupBounds.y, 0)) + (nvl(child.style.y, 0));
                }
                return child;
            }
            return buildViewNode("View", id, style, figmaNode, parentBounds, imageUrls);
        case "COMPONENT":
        case "INSTANCE":
        default:
            return buildViewNode("View", id, style, figmaNode, parentBounds, imageUrls);
    }
}

function buildViewNode(ourType, id, style, figmaNode, parentBounds, imageUrls) {
    const children = (figmaNode.children || [])
        .map((child) => figmaNodeToCanonical(child, getBounds(figmaNode, parentBounds), imageUrls))
        .filter(Boolean);
    const base = {
        type: ourType,
        id,
        style,
        localizationEnabled: false,
        localizationKey: "",
        localizationDefaultValue: "",
        accessibilityEnabled: false,
        accessibilityIdentifier: "",
        accessibilityLabel: "",
        tag: 0,
        isUserInteractionEnabled: true,
        isHidden: false,
        automationIdentifier: "",
        actionId: "",
        actionEvent: "",
        actionBoundNodeId: "",
        actionBoundProperty: "",
        actionBoundDataModelId: "",
        gestures: [],
        displayFormat: null,
    };
    if (ourType === "View") {
        base.children = children;
        base.fitToScreen = false;
    } else if (ourType === "VStack" || ourType === "HStack") {
        base.children = children;
        base.spacing = nvl(figmaNode.itemSpacing, 12);
        base.alignment = "center";
    } else {
        base.children = children;
    }
    return base;
}

/**
 * Convert a Figma document root node to our canonical document.
 * @param {object} figmaRootNode - Figma node (e.g. FRAME) from getRootNodeFromFile
 * @param {Record<string, string>} [imageUrls] - optional nodeId -> image URL from fetchFigmaImageUrls
 * @returns {object} { schemaVersion, root, dataMapping } ready for fromCanonicalJSON
 */
export function figmaToCanonicalDocument(figmaRootNode, imageUrls = {}) {
    if (!figmaRootNode) return null;
    const root = figmaNodeToCanonical(figmaRootNode, null, imageUrls);
    if (!root) return null;
    // Normalize root to (0,0) so imported content appears on canvas instead of off-screen
    if (root.style) {
        root.style.x = 0;
        root.style.y = 0;
    }
    return {
        schemaVersion: SCHEMA_VERSION,
        root,
        screenId: "",
        dataMapping: {
            dataModel: [],
            mockApiBindings: [],
        },
    };
}