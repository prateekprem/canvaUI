/**
 * Bottom Sheet canonical schema: type defaults and nodeToCanonical / nodeFromCanonical extensions.
 * Data mapping and mock JSON/bindings are separate for screen vs bottom sheet:
 * - Screen: doc.dataMapping (top-level) is screen-only. Do not use here.
 * - Sheet: each BottomSheet node has sheetDataMapping (sheet-only). This module handles only sheetDataMapping.
 */

import { BOTTOM_SHEET_TYPE } from "./constants";

export function getBottomSheetTypeDefaults() {
    return {
        [BOTTOM_SHEET_TYPE]: {
            children: [],
            sheetDetent: "medium",
            sheetDismissible: true,
            sheetShowHandle: true,
            sheetBackdropOpacity: 0.5,
            sheetDataMapping: null,
        },
    };
}

/** JSON-serializable clone for mockApiJson; returns null if not an object or on circular ref. */
function safeMockJsonClone(val) {
    if (val == null || typeof val !== "object") return null;
    try {
        return JSON.parse(JSON.stringify(val));
    } catch {
        return null;
    }
}

/** One dataModel entry for export: only keys Swift expects, values JSON-safe. */
function sanitizeDataModelEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const id = entry.id != null ? String(entry.id) : "";
    const name = entry.name != null ? String(entry.name) : "";
    const out = { id, name };
    if (Object.prototype.hasOwnProperty.call(entry, "value") && entry.value !== undefined) {
        const v = entry.value;
        if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") out.value = v;
        else if (typeof v === "object") try { out.value = JSON.parse(JSON.stringify(v)); } catch { out.value = null; }
        else out.value = String(v);
    }
    if (entry.boundNodeId != null && entry.boundNodeId !== "") out.boundNodeId = String(entry.boundNodeId);
    if (entry.boundProperty != null && entry.boundProperty !== "") out.boundProperty = String(entry.boundProperty);
    return out;
}

/** Build sheetDataMapping object safe for JSON.stringify and Swift Codable (no undefined, serializable only). */
function sheetDataMappingForExport(raw) {
    if (!raw || typeof raw !== "object") return null;
    const dataModel = Array.isArray(raw.dataModel) ?
        raw.dataModel.map(sanitizeDataModelEntry).filter(Boolean) : [];
    const mockApiBindings = Array.isArray(raw.mockApiBindings) ?
        raw.mockApiBindings.map((b) => ({
            apiPath: b && b.apiPath != null ? String(b.apiPath) : "",
            dataModelId: b && b.dataModelId != null ? String(b.dataModelId) : "",
        })) : [];
    return {
        apiUrl: raw.apiUrl != null && raw.apiUrl !== "" ? String(raw.apiUrl) : null,
        apiMethod: ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(raw.apiMethod) ? raw.apiMethod : "GET",
        dataModel,
        mockApiJson: safeMockJsonClone(raw.mockApiJson),
        mockApiBindings,
        loadMorePageParamName: raw.loadMorePageParamName != null && raw.loadMorePageParamName !== "" ? String(raw.loadMorePageParamName) : null,
        loadMorePageParamInQuery: raw.loadMorePageParamInQuery === true,
        loadMoreHasNextPagePath: raw.loadMoreHasNextPagePath != null && raw.loadMoreHasNextPagePath !== "" ? String(raw.loadMoreHasNextPagePath) : null,
    };
}

/**
 * Fill canonical out for a BottomSheet node. Caller must pass nodeToCanonical to recurse.
 * @param {Object} node - source tree node
 * @param {Object} out - canonical output object (already has type, id, style)
 * @param {Function} nodeToCanonical - (node) => canonical
 */
export function bottomSheetToCanonical(node, out, nodeToCanonical) {
    const defaults = getBottomSheetTypeDefaults()[BOTTOM_SHEET_TYPE];
    out.children = (node.children || []).map(nodeToCanonical).filter(Boolean);
    out.sheetDetent = node.sheetDetent != null && ["small", "medium", "large"].includes(node.sheetDetent) ? node.sheetDetent : defaults.sheetDetent;
    out.sheetDismissible = node.sheetDismissible !== false;
    out.sheetShowHandle = node.sheetShowHandle !== false;
    out.sheetBackdropOpacity = typeof node.sheetBackdropOpacity === "number" ? Math.max(0, Math.min(1, node.sheetBackdropOpacity)) : defaults.sheetBackdropOpacity;
    const raw = node.sheetDataMapping != null && typeof node.sheetDataMapping === "object" ? node.sheetDataMapping : null;
    out.sheetDataMapping = sheetDataMappingForExport(raw);
}

/**
 * Apply canonical BottomSheet props to node. Caller already set node.children in nodeFromCanonical.
 * @param {Object} n - canonical node
 * @param {Object} node - target tree node (already has type, id, style, children)
 */
export function bottomSheetFromCanonical(n, node) {
    if (n.type !== BOTTOM_SHEET_TYPE) return;
    const defaults = getBottomSheetTypeDefaults()[BOTTOM_SHEET_TYPE];
    node.sheetDetent = n.sheetDetent != null && ["small", "medium", "large"].includes(n.sheetDetent) ? n.sheetDetent : defaults.sheetDetent;
    node.sheetDismissible = n.sheetDismissible !== false;
    node.sheetShowHandle = n.sheetShowHandle !== false;
    node.sheetBackdropOpacity = typeof n.sheetBackdropOpacity === "number" ? Math.max(0, Math.min(1, n.sheetBackdropOpacity)) : defaults.sheetBackdropOpacity;
    node.sheetDataMapping = n.sheetDataMapping != null && typeof n.sheetDataMapping === "object" ? n.sheetDataMapping : null;
}