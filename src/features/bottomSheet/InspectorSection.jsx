/**
 * Bottom Sheet Inspector section and Open Sheet target picker for Action section.
 * Use only these exports from this feature in Inspector.jsx.
 */

import React from "react";
import { BOTTOM_SHEET_TYPE, DETENT_OPTIONS, ACTION_OPEN_BOTTOM_SHEET } from "./constants";
import { findNodeInTree, findParentInTree } from "../../utils/tree";
import { randomUUID } from "../../utils/uuid";

/** Collect all nodes in tree whose type is BottomSheet. */
export function collectSheetNodes(tree, out = []) {
  if (!tree) return out;
  if (tree.type === BOTTOM_SHEET_TYPE) out.push(tree);
  (tree.children || []).forEach((c) => collectSheetNodes(c, out));
  return out;
}

/** Section heading for grouped properties (mirrors Inspector's pattern). */
function SectionTitle({ title, children }) {
  return (
    <div className="mb-3">
      {title && <h4 className="font-semibold text-sm text-gray-700 mb-2">{title}</h4>}
      {children}
    </div>
  );
}

/** Default shape for sheet data mapping (same keys as screen dataMapping so runtime can reuse logic). */
export function getDefaultSheetDataMapping() {
  return {
    apiUrl: "",
    apiMethod: "GET",
    dataModel: [],
    mockApiJson: null,
    mockApiBindings: [],
    loadMorePageParamName: "",
    loadMorePageParamInQuery: false,
    loadMoreHasNextPagePath: "",
  };
}

export function getSheetDataMapping(selected) {
  const raw = selected?.sheetDataMapping;
  if (raw != null && typeof raw === "object") {
    return {
      apiUrl: raw.apiUrl != null ? String(raw.apiUrl) : "",
      apiMethod: ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(raw.apiMethod) ? raw.apiMethod : "GET",
      dataModel: Array.isArray(raw.dataModel) ? raw.dataModel : [],
      mockApiJson: raw.mockApiJson != null && typeof raw.mockApiJson === "object" ? raw.mockApiJson : null,
      mockApiBindings: Array.isArray(raw.mockApiBindings) ? raw.mockApiBindings : [],
      loadMorePageParamName: raw.loadMorePageParamName != null ? String(raw.loadMorePageParamName) : "",
      loadMorePageParamInQuery: raw.loadMorePageParamInQuery === true,
      loadMoreHasNextPagePath: raw.loadMoreHasNextPagePath != null ? String(raw.loadMoreHasNextPagePath) : "",
    };
  }
  return getDefaultSheetDataMapping();
}

/** Returns the Bottom Sheet node that contains the given node (or the sheet itself if node is a sheet). */
export function findSheetForSelection(tree, selectedId) {
  if (!tree || selectedId == null) return null;
  let node = findNodeInTree(tree, selectedId);
  if (!node) return null;
  if (node.type === BOTTOM_SHEET_TYPE) return node;
  let parent = findParentInTree(tree, selectedId);
  while (parent) {
    if (parent.type === BOTTOM_SHEET_TYPE) return parent;
    parent = findParentInTree(tree, parent.id);
  }
  return null;
}

/**
 * Inspector section shown when selected node is a Bottom Sheet.
 */
export function BottomSheetInspectorSection({ selected, update }) {
  if (!selected || selected.type !== BOTTOM_SHEET_TYPE) return null;

  const sheetMapping = getSheetDataMapping(selected);

  const updateSheetMapping = (patch) => {
    const next = { ...getSheetDataMapping(selected), ...patch };
    update("sheetDataMapping", next);
  };

  const addDataModelField = () => {
    const list = sheetMapping.dataModel.slice();
    list.push({ id: randomUUID(), name: `field_${list.length + 1}`, value: "" });
    updateSheetMapping({ dataModel: list });
  };

  const updateDataModelField = (index, fieldPatch) => {
    const list = sheetMapping.dataModel.slice();
    if (index >= 0 && index < list.length) {
      list[index] = { ...list[index], ...fieldPatch };
      updateSheetMapping({ dataModel: list });
    }
  };

  const removeDataModelField = (index) => {
    const list = sheetMapping.dataModel.filter((_, i) => i !== index);
    updateSheetMapping({ dataModel: list });
  };

  return (
    <>
      <SectionTitle title="Bottom sheet">
        <label className="block text-sm mb-1">Detent</label>
        <select
          value={selected.sheetDetent ?? "medium"}
          onChange={(e) => update("sheetDetent", e.target.value)}
          className="w-full p-2 border rounded text-sm mb-2 bg-white"
        >
          {DETENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={selected.sheetDismissible !== false}
            onChange={(e) => update("sheetDismissible", e.target.checked)}
          />
          <span className="text-sm">Dismissible (drag/tap outside)</span>
        </label>
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={selected.sheetShowHandle !== false}
            onChange={(e) => update("sheetShowHandle", e.target.checked)}
          />
          <span className="text-sm">Show handle</span>
        </label>
        <label className="block text-sm mb-1">Backdrop opacity (0–1)</label>
        <input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={selected.sheetBackdropOpacity != null ? selected.sheetBackdropOpacity : 0.5}
          onChange={(e) => update("sheetBackdropOpacity", Math.max(0, Math.min(1, Number(e.target.value))))}
          className="w-full p-2 border rounded text-sm mb-2"
        />
      </SectionTitle>

      <SectionTitle title="Sheet data mapping">
        <p className="text-xs text-gray-500 mb-2">
          API and data model for this sheet only. Fetched when the sheet opens; screen data is unchanged.
        </p>
        <label className="block text-sm mb-1">API URL</label>
        <input
          type="text"
          value={sheetMapping.apiUrl}
          onChange={(e) => updateSheetMapping({ apiUrl: e.target.value })}
          placeholder="https://api.example.com/sheet-data"
          className="w-full p-2 border rounded text-sm mb-2 bg-white"
        />
        <label className="block text-sm mb-1">Method</label>
        <select
          value={sheetMapping.apiMethod}
          onChange={(e) => updateSheetMapping({ apiMethod: e.target.value })}
          className="w-full p-2 border rounded text-sm mb-3 bg-white"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>

        <h5 className="text-xs font-semibold text-gray-600 mb-1">Data model (for binding inside sheet)</h5>
        <p className="text-xs text-gray-500 mb-2">Add fields; bind controls inside the sheet to these (e.g. Text → bound property).</p>
        {sheetMapping.dataModel.map((entry, i) => (
          <div key={entry.id ?? i} className="flex gap-1 items-center mb-2 p-2 border border-gray-200 rounded bg-white">
            <input
              type="text"
              value={entry.name ?? ""}
              onChange={(e) => updateDataModelField(i, { name: e.target.value })}
              placeholder="Field name"
              className="flex-1 min-w-0 p-1.5 border rounded text-xs"
            />
            <input
              type="text"
              value={entry.value ?? ""}
              onChange={(e) => updateDataModelField(i, { value: e.target.value })}
              placeholder="Default value"
              className="w-20 p-1.5 border rounded text-xs"
            />
            <button type="button" onClick={() => removeDataModelField(i)} className="text-red-500 text-xs px-1" title="Remove">×</button>
          </div>
        ))}
        <button type="button" onClick={addDataModelField} className="text-xs text-blue-600 hover:underline mb-3">
          + Add field
        </button>

        <label className="block text-sm mb-1">Load more: page param name (optional)</label>
        <input
          type="text"
          value={sheetMapping.loadMorePageParamName}
          onChange={(e) => updateSheetMapping({ loadMorePageParamName: e.target.value })}
          placeholder="e.g. page"
          className="w-full p-2 border rounded text-sm mb-2 bg-white"
        />
        <label className="block text-sm mb-1">Load more: has next path (optional)</label>
        <input
          type="text"
          value={sheetMapping.loadMoreHasNextPagePath}
          onChange={(e) => updateSheetMapping({ loadMoreHasNextPagePath: e.target.value })}
          placeholder="e.g. data.hasNextPage"
          className="w-full p-2 border rounded text-sm mb-2 bg-white"
        />
      </SectionTitle>
    </>
  );
}

/**
 * When a control's action is "Open bottom sheet", show this to pick the target sheet.
 * Renders a dropdown of all BottomSheet nodes in the tree; value is actionId (sheet node id).
 */
export function OpenSheetTargetPicker({ tree, selected, update }) {
  const sheets = collectSheetNodes(tree || {});
  const isOpenSheet = (selected?.actionEvent ?? "") === ACTION_OPEN_BOTTOM_SHEET;
  if (!isOpenSheet) return null;

  return (
    <div className="mb-2">
      <label className="block text-sm mb-1">Open bottom sheet</label>
      <select
        value={selected?.actionId ?? ""}
        onChange={(e) => update("actionId", e.target.value)}
        className="w-full p-2 border rounded text-sm bg-white"
        title="Select which bottom sheet to open"
      >
        <option value="">— Select sheet —</option>
        {sheets.map((node) => (
          <option key={node.id} value={node.id ?? ""}>
            {node.id || "Bottom sheet"}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Block for Action section: toggle to use "Open bottom sheet" and the sheet picker.
 * Uses a single update({ actionEvent, actionId }) so both keys apply in one tree update.
 */
export function OpenBottomSheetActionBlock({ tree, selected, update }) {
  const isOpenSheet = (selected?.actionEvent ?? "") === ACTION_OPEN_BOTTOM_SHEET;

  const handleToggle = () => {
    if (!isOpenSheet) {
      update({ actionEvent: ACTION_OPEN_BOTTOM_SHEET, actionId: "" });
    } else {
      update({ actionEvent: "" });
    }
  };

  return (
    <div className="mb-3 relative z-10">
      <button
        type="button"
        onClick={handleToggle}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-2 mb-2 w-full text-left p-2.5 rounded border border-gray-300 bg-white hover:bg-gray-50 shadow-sm cursor-pointer select-none min-h-[36px] relative z-10"
        aria-pressed={isOpenSheet}
      >
        <span
          className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center bg-white border-gray-400"
          aria-hidden
        >
          {isOpenSheet ? (
            <span className="text-blue-600 font-bold leading-none" style={{ fontSize: "12px" }}>✓</span>
          ) : null}
        </span>
        <span className="text-sm font-medium">Open bottom sheet on tap</span>
      </button>
      {isOpenSheet && <OpenSheetTargetPicker tree={tree} selected={selected} update={update} />}
    </div>
  );
}
