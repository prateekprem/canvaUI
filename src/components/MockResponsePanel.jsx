import { useState } from "react";
import { getValueAtPath } from "../utils/dataModel";
import { findSheetForSelection, getSheetDataMapping } from "../features/bottomSheet";

/** Recursive tree node for JSON */
function JsonTreeNode({ path, value, onSelectPath, selectedPath }) {
  const key = path.split(".").pop() ?? "";
  const isSelected = selectedPath === path;
  const isObject = value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);

  if (isObject || isArray) {
    const entries = isArray
      ? value.map((v, i) => ({ k: String(i), v }))
      : Object.entries(value).map(([k, v]) => ({ k, v }));
    const isRoot = path === "";
    return (
      <div className={isRoot ? "" : "pl-2 border-l border-gray-200 ml-1"}>
        {!isRoot && (
          <button
            type="button"
            onClick={() => onSelectPath(path)}
            className={`text-left w-full py-0.5 px-1 rounded text-sm ${isSelected ? "bg-blue-100" : "hover:bg-gray-100"}`}
          >
            <span className="text-amber-700 font-mono">{key}</span>
            <span className="text-gray-400 ml-1">
              {isArray ? `[${value.length}]` : "{}"}
            </span>
          </button>
        )}
        {entries.map(({ k, v }) => {
          const childPath = path ? `${path}.${k}` : k;
          return (
            <JsonTreeNode
              key={childPath}
              path={childPath}
              value={v}
              onSelectPath={onSelectPath}
              selectedPath={selectedPath}
            />
          );
        })}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSelectPath(path)}
      className={`text-left w-full py-0.5 px-1 rounded text-sm flex items-baseline gap-1 ${isSelected ? "bg-blue-100" : "hover:bg-gray-100"}`}
    >
      <span className="text-amber-700 font-mono shrink-0">{key}</span>
      <span className="text-gray-600 truncate">
        {typeof value === "string" ? `"${value}"` : String(value)}
      </span>
    </button>
  );
}

function MockJsonOverlay({ initialJson, onSave, onClose }) {
  const [raw, setRaw] = useState(() =>
    typeof initialJson === "object" && initialJson !== null
      ? JSON.stringify(initialJson, null, 2)
      : "{\n  \n}"
  );
  const [error, setError] = useState(null);

  const handleSave = () => {
    setError(null);
    try {
      const parsed = JSON.parse(raw);
      onSave(parsed);
      onClose();
    } catch (e) {
      setError(e.message || "Invalid JSON");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-3 border-b border-gray-200 font-semibold">Edit Mock API JSON</div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          className="flex-1 min-h-[200px] p-3 font-mono text-sm border-0 resize-none focus:ring-0"
          spellCheck={false}
          placeholder='{ "user": { "name": "John" } }'
        />
        {error && <div className="px-3 py-1 text-sm text-red-600 bg-red-50">{error}</div>}
        <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="px-3 py-1.5 bg-slate-600 text-white rounded text-sm">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MockResponsePanel({
  tree,
  selectedId,
  dataModel,
  onDataModelChange,
  mockApiJson,
  onMockApiJsonChange,
  mockApiBindings,
  onMockApiBindingsChange,
  onUpdateNode,
  onUpdateNodes,
  collapsed,
  onToggleCollapsed,
}) {
  const [showJsonOverlay, setShowJsonOverlay] = useState(false);
  const [selectedApiPath, setSelectedApiPath] = useState(null);
  const [connectTargetFieldId, setConnectTargetFieldId] = useState("");
  const [mappingMode, setMappingMode] = useState("screen");

  const sheetNode = findSheetForSelection(tree, selectedId);
  const isSheetMode = mappingMode === "sheet" && sheetNode != null;

  const effectiveDataModel = isSheetMode ? (getSheetDataMapping(sheetNode).dataModel || []) : (dataModel || []);
  const effectiveMockApiJson = isSheetMode ? getSheetDataMapping(sheetNode).mockApiJson : mockApiJson;
  const effectiveMockApiBindings = isSheetMode ? (getSheetDataMapping(sheetNode).mockApiBindings || []) : (mockApiBindings || []);
  const effectiveOnMockApiJsonChange = isSheetMode
    ? (v) => onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), mockApiJson: v } })
    : onMockApiJsonChange;
  const effectiveOnMockApiBindingsChange = isSheetMode
    ? (v) => {
        const prev = getSheetDataMapping(sheetNode).mockApiBindings || [];
        const next = typeof v === "function" ? v(prev) : v;
        onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), mockApiBindings: next } });
      }
    : onMockApiBindingsChange;
  const effectiveOnDataModelChange = isSheetMode
    ? (updater) => {
        const prev = getSheetDataMapping(sheetNode).dataModel || [];
        const next = typeof updater === "function" ? updater(prev) : updater;
        onUpdateNode({ id: sheetNode.id, sheetDataMapping: { ...getSheetDataMapping(sheetNode), dataModel: next } });
      }
    : onDataModelChange;

  const modelList = effectiveDataModel;
  const bindings = effectiveMockApiBindings;

  const addBinding = () => {
    if (!selectedApiPath || !connectTargetFieldId) return;
    const existing = effectiveMockApiBindings;
    if (existing.some((b) => b.apiPath === selectedApiPath && b.dataModelId === connectTargetFieldId)) return;
    effectiveOnMockApiBindingsChange([...existing, { apiPath: selectedApiPath, dataModelId: connectTargetFieldId }]);
    setSelectedApiPath(null);
    setConnectTargetFieldId("");
  };

  const removeBinding = (apiPath, dataModelId) => {
    effectiveOnMockApiBindingsChange(
      effectiveMockApiBindings.filter(
        (b) => !(b.apiPath === apiPath && b.dataModelId === dataModelId)
      )
    );
  };

  const applyMockToDataModel = () => {
    if (!effectiveMockApiJson || typeof effectiveMockApiJson !== "object") return;
    try {
      const nextModel = [...effectiveDataModel];
      const nodeUpdates = [];
      let changed = false;
      bindings.forEach(({ apiPath, dataModelId }) => {
        const val = getValueAtPath(effectiveMockApiJson, apiPath);
        if (val === undefined) return;
        const idx = nextModel.findIndex((e) => e.id === dataModelId);
        if (idx < 0) return;
        nextModel[idx] = { ...nextModel[idx], value: val };
        changed = true;
        const entry = nextModel[idx];
        if (entry.boundNodeId && entry.boundProperty != null) {
          const displayVal = entry.boundProperty === "text" && typeof val !== "string" ? String(val) : val;
          nodeUpdates.push({ id: entry.boundNodeId, [entry.boundProperty]: displayVal });
        }
      });
      if (!changed) return;
      if (isSheetMode && sheetNode != null && typeof onUpdateNodes === "function") {
        const sheetMapping = getSheetDataMapping(sheetNode);
        nodeUpdates.unshift({
          id: sheetNode.id,
          sheetDataMapping: { ...sheetMapping, dataModel: nextModel },
        });
        onUpdateNodes(nodeUpdates);
      } else {
        nodeUpdates.forEach((patch) => onUpdateNode?.(patch));
        effectiveOnDataModelChange(nextModel);
      }
    } catch (err) {
      console.error("Apply mock data to canvas failed:", err);
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 h-full flex flex-col border-l border-gray-300 bg-gray-200">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex-1 flex items-center justify-center text-gray-600 hover:bg-gray-300"
          title="Open Mock response"
        >
          ‹‹
        </button>
      </div>
    );
  }

  return (
    <>
      <aside className="w-80 shrink-0 h-full flex flex-col border-l border-gray-300 bg-gray-100 overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-gray-300 bg-gray-200 px-2 py-1.5">
          <span className="font-semibold text-sm text-gray-800">Mock response &amp; outlet</span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="p-1 text-gray-600 hover:bg-gray-300 rounded"
            title="Hide panel"
          >
            ››
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {sheetNode && (
            <div className="flex border-b border-gray-300 bg-gray-200/80">
              <button
                type="button"
                onClick={() => setMappingMode("screen")}
                className={`flex-1 py-1.5 text-xs font-medium ${mappingMode === "screen" ? "bg-gray-100 text-gray-900" : "text-gray-600"}`}
                title="Screen mock"
              >
                Screen
              </button>
              <button
                type="button"
                onClick={() => setMappingMode("sheet")}
                className={`flex-1 py-1.5 text-xs font-medium ${mappingMode === "sheet" ? "bg-gray-100 text-gray-900" : "text-gray-600"}`}
                title="Sheet mock"
              >
                Sheet
              </button>
            </div>
          )}
          <div className="shrink-0 px-2 py-1.5 bg-gray-200 font-medium text-xs text-gray-700 uppercase tracking-wide flex items-center justify-between">
            <span>{isSheetMode ? "Sheet mock JSON" : "Mock API JSON"}</span>
            <button
              type="button"
              onClick={() => setShowJsonOverlay(true)}
              className="px-2 py-0.5 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50"
            >
              Edit JSON
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
            {effectiveMockApiJson != null && typeof effectiveMockApiJson === "object" && Object.keys(effectiveMockApiJson).length > 0 ? (
              <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded bg-white p-1">
                <JsonTreeNode
                  path=""
                  value={effectiveMockApiJson}
                  onSelectPath={setSelectedApiPath}
                  selectedPath={selectedApiPath}
                />
              </div>
            ) : (
              <p className="text-xs text-gray-500">No mock data. Click &quot;Edit JSON&quot; to paste JSON.</p>
            )}
            <div className="shrink-0 space-y-1">
              <div className="text-xs font-medium text-gray-700">Connect (IBOutlet-style)</div>
              <p className="text-xs text-gray-500">Select a path above, then pick a data model field and Connect.</p>
              <div className="flex gap-1 flex-wrap items-center">
                <select
                  value={connectTargetFieldId}
                  onChange={(e) => setConnectTargetFieldId(e.target.value)}
                  className="p-1.5 border rounded text-xs max-w-[140px]"
                >
                  <option value="">Select field</option>
                  {modelList.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addBinding}
                  disabled={!selectedApiPath || !connectTargetFieldId}
                  className="px-2 py-1 bg-slate-600 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Connect
                </button>
              </div>
              {selectedApiPath && (
                <div className="text-xs text-gray-500">Path: <code className="bg-gray-100 px-1">{selectedApiPath}</code></div>
              )}
              {bindings.length > 0 && (
                <ul className="text-xs space-y-0.5 mt-1">
                  {bindings.map((b) => (
                    <li key={`${b.apiPath}-${b.dataModelId}`} className="flex items-center justify-between gap-1 bg-white border rounded px-2 py-1">
                      <span><code className="text-amber-700">{b.apiPath}</code> → {(() => { const e = modelList.find((x) => x.id === b.dataModelId); return e && e.name != null ? e.name : b.dataModelId; })()}</span>
                      <button
                        type="button"
                        onClick={() => removeBinding(b.apiPath, b.dataModelId)}
                        className="text-red-500 hover:bg-red-50 rounded"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={applyMockToDataModel}
                disabled={bindings.length === 0}
                className="w-full mt-1 px-2 py-1.5 bg-emerald-600 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply mock data to canvas
              </button>
            </div>
          </div>
        </div>
      </aside>
      {showJsonOverlay && (
        <MockJsonOverlay
          initialJson={effectiveMockApiJson}
          onSave={effectiveOnMockApiJsonChange}
          onClose={() => setShowJsonOverlay(false)}
        />
      )}
    </>
  );
}
