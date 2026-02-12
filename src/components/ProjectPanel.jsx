import { useRef, useState } from "react";
import { toCanonicalJSON } from "../schema/canonicalSchema";

export default function ProjectPanel({
  currentProject,
  selectedScreenId,
  currentScreenName,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onAddScreen,
  onAddScreenFromJson,
  onDeleteScreen,
  onSelectScreen,
  onOpenBoard,
  onLoadFromJson,
  onOpenFigma,
  tree,
  dataModel,
  mockApiJson,
  mockApiBindings,
  apiConfigMethod,
  apiUrl,
  apiMethod,
  loadMorePageParamName,
  loadMorePageParamInQuery,
  loadMoreHasNextPagePath,
  collapsed,
  onToggleCollapsed,
}) {
  const fileInputRef = useRef(null);
  const openProjectInputRef = useRef(null);
  const newScreenJsonInputRef = useRef(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [showNewScreenModal, setShowNewScreenModal] = useState(false);
  const [screenNameInput, setScreenNameInput] = useState("");
  const [newScreenStep, setNewScreenStep] = useState(null);
  const [newScreenFromJsonTree, setNewScreenFromJsonTree] = useState(null);
  const [newScreenFromJsonDataMapping, setNewScreenFromJsonDataMapping] = useState(null);

  const handleNewProjectClick = () => {
    if (onNewProject && currentProject?.screens?.length > 0 && (tree?.children?.length > 0 || (currentProject.screens?.length || 0) > 1)) {
      if (window.confirm("Start a new project? Current project and data will be cleared.")) {
        setProjectNameInput("");
        setShowNewProjectModal(true);
      }
    } else {
      setProjectNameInput("");
      setShowNewProjectModal(true);
    }
  };

  const handleNewProjectSubmit = () => {
    if (onNewProject) {
      onNewProject(projectNameInput.trim() || undefined);
      setShowNewProjectModal(false);
    }
  };

  const handleNewScreenClick = () => {
    setScreenNameInput("");
    setNewScreenFromJsonTree(null);
    setNewScreenFromJsonDataMapping(null);
    setNewScreenStep("choice");
  };

  const closeNewScreenFlow = () => {
    setNewScreenStep(null);
    setShowNewScreenModal(false);
    setNewScreenFromJsonTree(null);
    setNewScreenFromJsonDataMapping(null);
  };

  const handleNewScreenEmpty = () => {
    setNewScreenStep(null);
    setShowNewScreenModal(true);
  };

  const handleNewScreenFromJsonClick = () => {
    setNewScreenStep("fromJson");
    setNewScreenFromJsonTree(null);
    setNewScreenFromJsonDataMapping(null);
  };

  const handleNewScreenSubmit = () => {
    if (onAddScreen) {
      onAddScreen(screenNameInput.trim() || undefined);
      closeNewScreenFlow();
    }
  };

  const handleNewScreenJsonFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const doc = JSON.parse(text);
      if (!doc || typeof doc !== "object") {
        alert("Invalid JSON file.");
        return;
      }
      let treeToLoad = null;
      let dataMappingToLoad = null;
      if (doc.root != null && typeof doc.root === "object" && typeof doc.root.type === "string") {
        const { fromCanonicalJSON } = await import("../schema/canonicalSchema");
        treeToLoad = fromCanonicalJSON(doc);
        if (doc.dataMapping != null && typeof doc.dataMapping === "object") {
          const dm = doc.dataMapping;
          dataMappingToLoad = {
            dataModel: Array.isArray(dm.dataModel) ? dm.dataModel : [],
            mockApiJson: dm.mockApiJson != null && typeof dm.mockApiJson === "object" ? dm.mockApiJson : null,
            mockApiBindings: Array.isArray(dm.mockApiBindings) ? dm.mockApiBindings : [],
            apiConfigMethod: typeof dm.apiConfigMethod === "string" && dm.apiConfigMethod.trim() ? dm.apiConfigMethod.trim() : (dm.dataSource && dm.dataSource.configMethod) || null,
            apiUrl: typeof dm.apiUrl === "string" ? dm.apiUrl.trim() || null : (dm.dataSource && dm.dataSource.url) || null,
            apiMethod: typeof dm.apiMethod === "string" && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(dm.apiMethod) ? dm.apiMethod : (dm.dataSource && dm.dataSource.method) || null,
            loadMorePageParamName: typeof dm.loadMorePageParamName === "string" ? dm.loadMorePageParamName.trim() || null : null,
            loadMorePageParamInQuery: dm.loadMorePageParamInQuery === true,
            loadMoreHasNextPagePath: typeof dm.loadMoreHasNextPagePath === "string" ? dm.loadMoreHasNextPagePath.trim() || null : null,
          };
        }
      } else if (doc.type === "View" && Array.isArray(doc.children)) {
        treeToLoad = doc;
      } else {
        alert("Not a valid UI export. Need a document with root (exported file) or a View tree.");
        return;
      }
      if (treeToLoad) {
        setNewScreenFromJsonTree(treeToLoad);
        setNewScreenFromJsonDataMapping(dataMappingToLoad);
      }
    } catch (err) {
      alert("Load failed: " + (err != null && err.message != null ? err.message : String(err)));
    }
  };

  const handleNewScreenFromJsonSubmit = () => {
    if (onAddScreenFromJson && newScreenFromJsonTree) {
      onAddScreenFromJson(screenNameInput.trim() || undefined, newScreenFromJsonTree, newScreenFromJsonDataMapping);
      closeNewScreenFlow();
    }
  };

  const handleOpenProjectClick = () => {
    if (openProjectInputRef.current) openProjectInputRef.current.click();
  };

  const handleOpenProjectFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file && onOpenProject) await onOpenProject(file);
  };

  const handleExport = () => {
    try {
      const sanitize = (v) => {
        if (v === undefined) return null;
        if (v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
        if (Array.isArray(v)) return v.map(sanitize);
        if (typeof v === "object") {
          const o = {};
          for (const k of Object.keys(v)) o[k] = sanitize(v[k]);
          return o;
        }
        return null;
      };
      const safeDataModel = (dataModel || []).map((e) =>
        e && typeof e === "object"
          ? { id: e.id, name: e.name, value: sanitize(e.value), boundNodeId: e.boundNodeId ?? null, boundProperty: e.boundProperty ?? null }
          : e
      );
      const screenDataMapping = {
        dataModel: safeDataModel,
        mockApiJson: mockApiJson != null && typeof mockApiJson === "object" ? sanitize(mockApiJson) : null,
        mockApiBindings: mockApiBindings || [],
        apiConfigMethod: apiConfigMethod || null,
        apiUrl: apiUrl || null,
        apiMethod: apiMethod || null,
        loadMorePageParamName: loadMorePageParamName || null,
        loadMorePageParamInQuery: loadMorePageParamInQuery === true,
        loadMoreHasNextPagePath: loadMoreHasNextPagePath || null,
      };
      const doc = toCanonicalJSON(tree, screenDataMapping);
      if (!doc || !doc.root) {
        alert("Export failed: no tree to export.");
        return;
      }
      const json = JSON.stringify(doc, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (currentScreenName || "screen").replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${safeName}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      alert("Export failed: " + msg);
      console.error("Export error", err);
    }
  };

  const handleLoadClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !onLoadFromJson) return;
    e.target.value = "";
    try {
      const text = await file.text();
      const doc = JSON.parse(text);
      if (!doc || typeof doc !== "object") {
        alert("Invalid JSON file.");
        return;
      }
      let treeToLoad = null;
      let dataMappingToLoad = null;
      if (doc.root != null && typeof doc.root === "object" && typeof doc.root.type === "string") {
        const { fromCanonicalJSON } = await import("../schema/canonicalSchema");
        treeToLoad = fromCanonicalJSON(doc);
        if (doc.dataMapping != null && typeof doc.dataMapping === "object") {
          const dm = doc.dataMapping;
          dataMappingToLoad = {
            dataModel: Array.isArray(dm.dataModel) ? dm.dataModel : [],
            mockApiJson: dm.mockApiJson != null && typeof dm.mockApiJson === "object" ? dm.mockApiJson : null,
            mockApiBindings: Array.isArray(dm.mockApiBindings) ? dm.mockApiBindings : [],
            apiConfigMethod: typeof dm.apiConfigMethod === "string" && dm.apiConfigMethod.trim() ? dm.apiConfigMethod.trim() : (dm.dataSource && dm.dataSource.configMethod) || null,
            apiUrl: typeof dm.apiUrl === "string" ? dm.apiUrl.trim() || null : (dm.dataSource && dm.dataSource.url) || null,
            apiMethod: typeof dm.apiMethod === "string" && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(dm.apiMethod) ? dm.apiMethod : (dm.dataSource && dm.dataSource.method) || null,
            loadMorePageParamName: typeof dm.loadMorePageParamName === "string" ? dm.loadMorePageParamName.trim() || null : null,
            loadMorePageParamInQuery: dm.loadMorePageParamInQuery === true,
            loadMoreHasNextPagePath: typeof dm.loadMoreHasNextPagePath === "string" ? dm.loadMoreHasNextPagePath.trim() || null : null,
          };
        }
      } else if (doc.type === "View" && Array.isArray(doc.children)) {
        treeToLoad = doc;
      } else {
        alert("Not a valid UI export. Need a document with root (exported file) or a View tree.");
        return;
      }
      if (treeToLoad) onLoadFromJson(treeToLoad, dataMappingToLoad);
    } catch (err) {
      alert("Load failed: " + (err != null && err.message != null ? err.message : String(err)));
    }
  };

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 h-full flex flex-col border-r border-gray-300 bg-gray-200">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex-1 flex items-center justify-center text-gray-600 hover:bg-gray-300"
          title="Open Project panel"
        >
          ››
        </button>
      </div>
    );
  }

  return (
    <div className="w-52 shrink-0 h-full min-h-0 bg-gray-100 border-r border-gray-300 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between border-b border-gray-300 bg-gray-200 px-2 py-1.5">
        <span className="font-semibold text-sm text-gray-800">Project</span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1 text-gray-600 hover:bg-gray-300 rounded"
          title="Hide Project panel"
        >
          ‹‹
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-3">
        <div className="shrink-0 mb-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Current project</div>
          <div className="font-medium text-gray-900 truncate" title={currentProject?.name}>
            {currentProject?.name ?? "Untitled Project"}
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            <button
              type="button"
              onClick={handleNewProjectClick}
              title="New project"
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
            >
              New
            </button>
            <button
              type="button"
              onClick={handleOpenProjectClick}
              title="Open project (.zip or project.json)"
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
            >
              Open
            </button>
            <button
              type="button"
              onClick={onSaveProject}
              title="Save project as folder (.zip)"
              className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
            >
              Save
            </button>
          </div>
          <input
            ref={openProjectInputRef}
            type="file"
            accept=".zip,.json,application/zip,application/json"
            onChange={handleOpenProjectFile}
            className="hidden"
            aria-hidden
          />
        </div>

        <div className="shrink-0 border-t border-gray-300 my-3" />

        <div className="shrink-0 space-y-2">
          <button
            type="button"
            onClick={handleNewScreenClick}
            className="w-full p-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium"
          >
            + New screen
          </button>
          {onOpenBoard && (
            <button
              type="button"
              onClick={onOpenBoard}
              className="w-full p-2 rounded border border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium"
            >
              Open board
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col mt-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 shrink-0">Screens</div>
          <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 rounded bg-white" style={{ overflowX: "visible" }}>
            {(currentProject?.screens ?? []).length === 0 ? (
              <p className="text-xs text-gray-500 p-2">No screens</p>
            ) : (
              <ul className="py-1 list-none">
                {(currentProject?.screens ?? []).map((screen) => {
                  const isSelected = screen.id === selectedScreenId;
                  const canDelete = (currentProject?.screens?.length ?? 0) > 1;
                  return (
                    <li key={screen.id} className="group relative flex items-center w-full">
                      <button
                        type="button"
                        onClick={() => onSelectScreen && onSelectScreen(screen.id)}
                        className={`flex-1 min-w-0 text-left pl-3 pr-10 py-2 text-sm truncate ${isSelected ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100 text-gray-800"}`}
                        title={screen.name}
                      >
                        {screen.name || "Unnamed"}
                      </button>
                      {onDeleteScreen && (
                        <button
                          type="button"
                          disabled={!canDelete}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!canDelete) return;
                            if (window.confirm(`Delete screen "${screen.name || "Unnamed"}"?`)) onDeleteScreen(screen.id);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 flex items-center justify-center rounded border bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity ${
                            canDelete
                              ? "border-red-300 text-red-600 hover:bg-red-100 cursor-pointer"
                              : "border-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                          title={canDelete ? "Delete screen" : "Add another screen to enable delete"}
                          aria-label="Delete screen"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="shrink-0 pt-3 mt-3 border-t border-gray-300">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Import / Export (current screen)</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            aria-hidden
          />
          <button
            type="button"
            onClick={handleLoadClick}
            className="w-full p-2 mb-2 bg-slate-600 text-white text-sm rounded shadow hover:bg-slate-500"
          >
            Load screen from JSON
          </button>
          {onOpenFigma && (
            <button
              type="button"
              onClick={onOpenFigma}
              className="w-full p-2 mb-2 bg-purple-600 text-white text-sm rounded shadow hover:bg-purple-500"
            >
              Figma
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="w-full p-2 bg-slate-700 text-white text-sm rounded shadow hover:bg-slate-600"
          >
            Export screen JSON
          </button>
          <p className="text-xs text-gray-500 mt-2">SwiftUI & Android compatible</p>
        </div>
      </div>

      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewProjectModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-72" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold text-gray-800 mb-2">New project</div>
            <input
              type="text"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              placeholder="Project name"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNewProjectSubmit()}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewProjectModal(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" onClick={handleNewProjectSubmit} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {newScreenStep === "choice" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeNewScreenFlow}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-72" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold text-gray-800 mb-3">New screen</div>
            <p className="text-xs text-gray-500 mb-3">Add an empty screen or load from a JSON file.</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleNewScreenEmpty}
                className="w-full p-3 text-left rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium"
              >
                Empty screen
              </button>
              <button
                type="button"
                onClick={handleNewScreenFromJsonClick}
                className="w-full p-3 text-left rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium"
              >
                From JSON
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button type="button" onClick={closeNewScreenFlow} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {newScreenStep === "fromJson" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeNewScreenFlow}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-80" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold text-gray-800 mb-2">New screen from JSON</div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Screen name (label in panel)</label>
            <input
              type="text"
              value={screenNameInput}
              onChange={(e) => setScreenNameInput(e.target.value)}
              placeholder="e.g. Detail"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"
              autoFocus
            />
            <input
              ref={newScreenJsonInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleNewScreenJsonFileChange}
              className="hidden"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => newScreenJsonInputRef.current && newScreenJsonInputRef.current.click()}
              className="w-full p-2 mb-3 border border-slate-400 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm rounded"
            >
              {newScreenFromJsonTree ? "✓ JSON loaded — choose another file" : "Choose JSON file"}
            </button>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeNewScreenFlow} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNewScreenFromJsonSubmit}
                disabled={!newScreenFromJsonTree}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add screen
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewScreenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowNewScreenModal(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-72" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-semibold text-gray-800 mb-2">New screen (empty)</div>
            <input
              type="text"
              value={screenNameInput}
              onChange={(e) => setScreenNameInput(e.target.value)}
              placeholder="Screen name (label in panel)"
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNewScreenSubmit()}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewScreenModal(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-100">
                Cancel
              </button>
              <button type="button" onClick={handleNewScreenSubmit} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500">
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
