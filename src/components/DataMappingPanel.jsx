import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PRIMARY_PROP_KEY_BY_TYPE,
  getNodePropValue,
} from "../utils/dataModel";
import { randomUUID } from "../utils/uuid";
import { getDisplayName } from "../schema/defaultNode";
import { findNodeInTree, findParentInTree, getPathToNode } from "../utils/tree";
import { findSheetForSelection, getSheetDataMapping, BOTTOM_SHEET_TYPE } from "../features/bottomSheet";

const DATA_NODE_ATTR = "data-node-id";

/** Foldable JSON tree for picking a path (e.g. has next page path) from mock JSON */
function FoldablePathTree({ value, pathPrefix = "", expanded, onToggle, onSelectPath, depth = 0 }) {
  if (value == null || typeof value !== "object") return null;
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value);
  return (
    <div className="flex flex-col">
      {entries.map(([k, v]) => {
        const path = pathPrefix ? `${pathPrefix}.${k}` : k;
        const isExpandable = v != null && typeof v === "object";
        const isExpanded = expanded.has(path);
        const isArray = Array.isArray(v);
        return (
          <div key={path} className="flex flex-col" style={{ marginLeft: depth * 10 }}>
            <div
              className="flex items-center gap-0.5 py-0.5 px-1 rounded hover:bg-gray-100 cursor-pointer text-xs font-mono min-w-0"
              onClick={() => {
                if (isExpandable) onToggle(path);
                else onSelectPath(path);
              }}
            >
              {isExpandable ? (
                <span className="shrink-0 w-3 text-gray-500" aria-hidden>
                  {isExpanded ? "▼" : "▶"}
                </span>
              ) : (
                <span className="shrink-0 w-3" />
              )}
              <span className="text-amber-700 truncate">{k}</span>
              {isExpandable && (
                <span className="shrink-0 text-gray-400 ml-0.5">
                  {isArray ? `[${v.length}]` : "{}"}
                </span>
              )}
              {!isExpandable && v !== null && v !== undefined && (
                <span className="shrink-0 text-gray-500 truncate max-w-[100px]" title={String(v)}>
                  {typeof v === "string" ? ` "${String(v).slice(0, 12)}${String(v).length > 12 ? "…" : ""}"` : ` ${String(v)}`}
                </span>
              )}
            </div>
            {isExpandable && isExpanded && (
              <FoldablePathTree
                value={v}
                pathPrefix={path}
                expanded={expanded}
                onToggle={onToggle}
                onSelectPath={onSelectPath}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function getNodeIdFromElement(el) {
  if (!el) return null;
  const nodeEl = el.closest && el.closest(`[${DATA_NODE_ATTR}]`);
  if (!nodeEl) return null;
  const id = nodeEl.getAttribute(DATA_NODE_ATTR);
  return id || null;
}

export default function DataMappingPanel({
  tree,
  selectedId,
  dataModel,
  onDataModelChange,
  mockApiJson,
  apiConfigMethod,
  onApiConfigMethodChange,
  apiUrl,
  onApiUrlChange,
  apiMethod,
  onApiMethodChange,
  loadMorePageParamName,
  onLoadMorePageParamNameChange,
  loadMorePageParamInQuery,
  onLoadMorePageParamInQueryChange,
  loadMoreHasNextPagePath,
  onLoadMoreHasNextPagePathChange,
  onUpdateNode,
  collapsed,
  onToggleCollapsed,
  onHighlightNode,
}) {
  const [bindingDrag, setBindingDrag] = useState(null);
  const bindingDragRef = useRef(null);
  const [showDataModelSection, setShowDataModelSection] = useState(true);
  const [showApiSection, setShowApiSection] = useState(false);
  const [pathPickerExpanded, setPathPickerExpanded] = useState(() => new Set());
  const [mappingMode, setMappingMode] = useState("screen");

  const sheetNode = findSheetForSelection(tree, selectedId);
  const isSheetMode = mappingMode === "sheet" && sheetNode != null;

  const effectiveDataModel = isSheetMode ? (getSheetDataMapping(sheetNode).dataModel || []) : (dataModel || []);
  const effectiveOnDataModelChange = isSheetMode
    ? (updater) => {
        const prev = getSheetDataMapping(sheetNode).dataModel || [];
        const next = typeof updater === "function" ? updater(prev) : updater;
        onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), dataModel: next } });
      }
    : onDataModelChange;

  const effectiveApiUrl = isSheetMode ? getSheetDataMapping(sheetNode).apiUrl : apiUrl;
  const effectiveOnApiUrlChange = isSheetMode
    ? (v) => onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), apiUrl: v } })
    : onApiUrlChange;
  const effectiveApiMethod = isSheetMode ? getSheetDataMapping(sheetNode).apiMethod : apiMethod;
  const effectiveOnApiMethodChange = isSheetMode
    ? (v) => onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), apiMethod: v } })
    : onApiMethodChange;
  const effectiveLoadMorePageParamName = isSheetMode ? getSheetDataMapping(sheetNode).loadMorePageParamName : loadMorePageParamName;
  const effectiveOnLoadMorePageParamNameChange = isSheetMode
    ? (v) => onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), loadMorePageParamName: v } })
    : onLoadMorePageParamNameChange;
  const effectiveLoadMorePageParamInQuery = isSheetMode ? getSheetDataMapping(sheetNode).loadMorePageParamInQuery : loadMorePageParamInQuery;
  const effectiveOnLoadMorePageParamInQueryChange = isSheetMode
    ? (v) => onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), loadMorePageParamInQuery: v } })
    : onLoadMorePageParamInQueryChange;
  const effectiveLoadMoreHasNextPagePath = isSheetMode ? getSheetDataMapping(sheetNode).loadMoreHasNextPagePath : loadMoreHasNextPagePath;
  const effectiveOnLoadMoreHasNextPagePathChange = isSheetMode
    ? (v) => onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), loadMoreHasNextPagePath: v } })
    : onLoadMoreHasNextPagePathChange;
  const effectiveMockApiJson = isSheetMode ? getSheetDataMapping(sheetNode).mockApiJson : mockApiJson;

  useEffect(() => {
    if (!bindingDrag) return;
    const onMove = (e) => {
      setBindingDrag((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nodeId = getNodeIdFromElement(el);
      if (nodeId && nodeId !== "root") onHighlightNode && onHighlightNode(nodeId);
      else onHighlightNode && onHighlightNode(null);
    };
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
    };
  }, [bindingDrag != null, onHighlightNode]);

  useEffect(() => {
    const onUp = (e) => {
      const state = bindingDragRef.current;
      if (!state) return;
      bindingDragRef.current = null;
      setBindingDrag(null);
      onHighlightNode && onHighlightNode(null);
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nodeId = getNodeIdFromElement(el);
      if (nodeId && nodeId !== "root") {
        let node = findNodeInTree(state.tree, nodeId);
        let key = node && PRIMARY_PROP_KEY_BY_TYPE[node.type];
        let bindNodeId = nodeId;
        // Dropping on a list row may hit the template or a child (e.g. ListItemText). Walk up to find a List and bind to its "items".
        if (node && !key) {
          let currentId = nodeId;
          let parent = findParentInTree(state.tree, currentId);
          while (parent) {
            if (parent.type === "List") {
              node = parent;
              key = "items";
              bindNodeId = parent.id;
              break;
            }
            currentId = parent.id;
            parent = findParentInTree(state.tree, currentId);
          }
        }
        if (key) {
          state.onDataModelChange((prev) => {
            const modelList = prev || [];
            const alreadyHasPrimary = modelList.some((ent) => ent.boundNodeId === bindNodeId && ent.boundProperty === key);
            if (alreadyHasPrimary) {
              // Control already has a display binding (e.g. title); add a separate field for action value (e.g. deeplink)
              const typeLabel = node && getDisplayName(node.type) ? getDisplayName(node.type) : (node && node.type != null ? node.type : "Control");
              const newEntry = {
                id: randomUUID(),
                name: `Deeplink_${typeLabel}_${String(bindNodeId).slice(0, 8)}`,
                value: "",
                boundNodeId: null,
                boundProperty: null,
              };
              return [...modelList, newEntry];
            }
            const newEntry = {
              id: randomUUID(),
              name: `${node.type}_${key}_${String(bindNodeId).slice(0, 8)}`,
              value: getNodePropValue(node, key),
              boundNodeId: bindNodeId,
              boundProperty: key,
            };
            const withoutThisControl = modelList.filter((ent) => ent.boundNodeId !== bindNodeId);
            return [...withoutThisControl, newEntry];
          });
        }
      }
    };
    window.addEventListener("mouseup", onUp, true);
    return () => window.removeEventListener("mouseup", onUp, true);
  }, []);

  useEffect(() => {
    if (bindingDrag) {
      bindingDragRef.current = { ...bindingDrag, tree, onDataModelChange: effectiveOnDataModelChange, onHighlightNode };
    } else {
      bindingDragRef.current = null;
    }
  }, [bindingDrag, tree, effectiveOnDataModelChange, onHighlightNode]);

  const updateDataModelValue = (id, value) => {
    const list = (effectiveDataModel || []).map((e) =>
      e.id === id ? { ...e, value } : e
    );
    effectiveOnDataModelChange(list);
    const entry = list.find((e) => e.id === id);
    if (entry && entry.boundNodeId && entry.boundProperty != null && onUpdateNode) {
      onUpdateNode({ id: entry.boundNodeId, [entry.boundProperty]: value });
    }
  };

  const removeDataModelField = (id) => {
    effectiveOnDataModelChange((effectiveDataModel || []).filter((e) => e.id !== id));
  };

  const modelList = effectiveDataModel || [];

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 h-full flex flex-col border-l border-gray-300 bg-gray-200">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex-1 flex items-center justify-center text-gray-600 hover:bg-gray-300"
          title="Open Data Mapping"
        >
          ‹‹
        </button>
      </div>
    );
  }

  const lineOverlay =
    bindingDrag &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        className="fixed inset-0 pointer-events-none z-[9999]"
        aria-hidden
      >
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${typeof window !== "undefined" ? window.innerWidth : 800} ${typeof window !== "undefined" ? window.innerHeight : 600}`}
          preserveAspectRatio="none"
        >
          <line
            x1={bindingDrag.startX}
            y1={bindingDrag.startY}
            x2={bindingDrag.x}
            y2={bindingDrag.y}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="8 4"
          />
        </svg>
      </div>,
      document.body
    );

  return (
    <>
      {lineOverlay}
      <aside className="w-80 shrink-0 h-full flex flex-col border-l border-gray-300 bg-gray-100 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-gray-300 bg-gray-200 px-2 py-1.5">
          <span className="font-semibold text-sm text-gray-800">Data Mapping</span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="p-1 text-gray-600 hover:bg-gray-300 rounded"
            title="Hide panel"
          >
            ››
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {sheetNode && (
            <div className="flex border-b border-gray-300 bg-gray-200/80">
              <button
                type="button"
                onClick={() => setMappingMode("screen")}
                className={`flex-1 py-1.5 text-xs font-medium ${mappingMode === "screen" ? "bg-gray-100 text-gray-900" : "text-gray-600"}`}
                title="Screen data mapping"
              >
                Screen
              </button>
              <button
                type="button"
                onClick={() => setMappingMode("sheet")}
                className={`flex-1 py-1.5 text-xs font-medium ${mappingMode === "sheet" ? "bg-gray-100 text-gray-900" : "text-gray-600"}`}
                title="Bottom sheet data mapping"
              >
                Sheet
              </button>
            </div>
          )}
          {/* Part 1: Data Model */}
          <div className="border-b border-gray-300">
            <button
              type="button"
              onClick={() => setShowDataModelSection((s) => !s)}
              className="w-full px-2 py-1.5 flex items-center justify-between text-left text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300"
            >
              <span className="uppercase tracking-wide">Data model</span>
              <span className="text-gray-400">{showDataModelSection ? "▼ Hide" : "▶ Show"}</span>
            </button>
            {showDataModelSection && (
            <div className="p-2 space-y-2">
              <p className="text-xs text-gray-500 mb-2">
                {isSheetMode ? "Bind to controls inside this sheet. Drag to a control in the sheet." : "Drag to a control on canvas to bind it. Release to add to data model."}
              </p>
              <button
                type="button"
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  setBindingDrag({ startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY });
                }}
                className="w-full py-2 border-2 border-dashed border-slate-400 rounded text-sm text-slate-700 bg-slate-50 hover:bg-slate-100 hover:border-slate-500 mb-1 select-none"
              >
                + Add field — drag to canvas
              </button>
              <button
                type="button"
                onClick={() => effectiveOnDataModelChange([...modelList, { id: randomUUID(), name: `field_${(modelList.length + 1)}`, value: "", boundNodeId: null, boundProperty: null }])}
                className="text-xs text-slate-500 hover:text-slate-700 underline mb-2"
              >
                + Add empty field
              </button>
              {modelList.map((entry) => (
                <div key={entry.id} className="bg-white border border-gray-200 rounded p-2 text-sm">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs text-slate-600 truncate" title={entry.name}>
                      {entry.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDataModelField(entry.id)}
                      className="text-red-500 hover:bg-red-50 rounded px-1 text-xs"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                  {entry.boundNodeId && (() => {
                    const node = findNodeInTree(tree, entry.boundNodeId);
                    const pathArr = node ? getPathToNode(tree, entry.boundNodeId) : [];
                    const pathStr = pathArr.length > 1 ? pathArr.slice(1).join(" › ") : (node ? getDisplayName(node.type) : "");
                    return node ? (
                      <div
                        className="text-xs text-gray-500 mb-1 cursor-default"
                        title={`Hover a control below to highlight it on canvas`}
                      >
                        → {getDisplayName(node.type)}.{entry.boundProperty}
                        {pathStr ? ` · ${pathStr}` : ""} (bound)
                      </div>
                    ) : null;
                  })()}
                  {entry.boundProperty === "options" || entry.boundProperty === "items" ? (
                    <textarea
                      value={Array.isArray(entry.value) ? entry.value.join("\n") : String(entry.value || "")}
                      onChange={(e) => {
                        const arr = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
                        updateDataModelValue(entry.id, arr);
                      }}
                      rows={2}
                      className="w-full p-1.5 border rounded text-xs font-mono"
                    />
                  ) : entry.boundProperty === "isOn" ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={entry.value === true}
                        onChange={(e) => updateDataModelValue(entry.id, e.target.checked)}
                      />
                      <span className="text-xs">On</span>
                    </label>
                  ) : (
                    <input
                      type="text"
                      value={typeof entry.value === "number" ? entry.value : (entry.value ?? "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateDataModelValue(entry.id, entry.boundProperty === "value" || entry.boundProperty === "progress" ? (parseFloat(v, 10) || 0) : v);
                      }}
                      className="w-full p-1.5 border rounded text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
            )}
          </div>

          {/* API URL & config - at bottom of section */}
          <div className="border-t border-gray-300">
            <button
              type="button"
              onClick={() => setShowApiSection((s) => !s)}
              className="w-full px-2 py-1.5 flex items-center justify-between text-left text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300"
            >
              <span className="uppercase tracking-wide">API URL &amp; config</span>
              <span className="text-gray-400">{showApiSection ? "▼ Hide" : "▶ Show"}</span>
            </button>
            {showApiSection && (
              <div className="px-2 pb-2 pt-1 space-y-2 bg-white border-t border-gray-200">
                <div className="text-xs text-gray-500">{isSheetMode ? "When sheet opens" : "On screen load (frontend)"}</div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">API URL (optional)</label>
                  <input
                    type="text"
                    value={effectiveApiUrl ?? ""}
                    onChange={(e) => effectiveOnApiUrlChange && effectiveOnApiUrlChange(e.target.value.trim() || null)}
                    placeholder="https://api.example.com/data"
                    className="w-full p-1.5 border border-gray-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Method (optional)</label>
                  <select
                    value={effectiveApiMethod ?? ""}
                    onChange={(e) => effectiveOnApiMethodChange && effectiveOnApiMethodChange(e.target.value || null)}
                    className="w-full p-1.5 border border-gray-300 rounded text-xs"
                  >
                    <option value="">—</option>
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                {!isSheetMode && (
                <>
                <div>
                  <label className="block text-xs text-gray-500 mb-0.5">Config method (required for load)</label>
                  <input
                    type="text"
                    value={apiConfigMethod ?? ""}
                    onChange={(e) => onApiConfigMethodChange && onApiConfigMethodChange(e.target.value.trim() || null)}
                    placeholder="e.g. getScreenApiConfig"
                    className="w-full p-1.5 border border-gray-300 rounded text-xs font-mono"
                  />
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  <strong>If URL is set:</strong> method returns <code className="bg-gray-100 px-0.5">headers</code>, <code className="bg-gray-100 px-0.5">body</code> only; app fetches URL with them.<br />
                  <strong>If URL is empty:</strong> method returns <code className="bg-gray-100 px-0.5">response</code> (the JSON); app applies it to the data model.
                </p>
                </>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="text-xs font-medium text-gray-600 mb-1.5">Load more (pagination)</div>
                  <div className="mb-1.5">
                    <label className="block text-xs text-gray-500 mb-0.5">Page param name</label>
                    <input
                      type="text"
                      value={effectiveLoadMorePageParamName ?? ""}
                      onChange={(e) => effectiveOnLoadMorePageParamNameChange && effectiveOnLoadMorePageParamNameChange(e.target.value.trim() || null)}
                      placeholder="e.g. pageNumber, page"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-2 mb-1.5">
                    <input
                      type="checkbox"
                      checked={effectiveLoadMorePageParamInQuery === true}
                      onChange={(e) => effectiveOnLoadMorePageParamInQueryChange && effectiveOnLoadMorePageParamInQueryChange(e.target.checked)}
                    />
                    <span className="text-xs">Send page param in query (else in body)</span>
                  </label>
                  <div>
                    <label className="block text-xs text-gray-500 mb-0.5">Has next page path (optional)</label>
                    <input
                      type="text"
                      value={effectiveLoadMoreHasNextPagePath ?? ""}
                      onChange={(e) => effectiveOnLoadMoreHasNextPagePathChange && effectiveOnLoadMoreHasNextPagePathChange(e.target.value.trim() || null)}
                      placeholder="e.g. data.hasNextPage"
                      className="w-full p-1.5 border border-gray-300 rounded text-xs font-mono mb-1"
                    />
                    {effectiveMockApiJson != null && typeof effectiveMockApiJson === "object" && (
                      <div className="border border-gray-200 rounded bg-white">
                        <div className="px-1.5 py-0.5 text-xs font-medium text-gray-600 border-b border-gray-100">
                          Pick from mock — click a path
                        </div>
                        <div className="max-h-32 overflow-y-auto p-1">
                          <FoldablePathTree
                            value={effectiveMockApiJson}
                            pathPrefix=""
                            expanded={pathPickerExpanded}
                            onToggle={(path) => {
                              setPathPickerExpanded((prev) => {
                                const next = new Set(prev);
                                if (next.has(path)) next.delete(path);
                                else next.add(path);
                                return next;
                              });
                            }}
                            onSelectPath={(path) => effectiveOnLoadMoreHasNextPagePathChange && effectiveOnLoadMoreHasNextPagePathChange(path)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
