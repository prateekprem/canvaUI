import { useState, useEffect, useCallback } from "react";
import ProjectPanel from "./components/ProjectPanel";
import Sidebar from "./components/Sidebar";
import Canvas from "./components/Canvas";
import Board from "./components/Board";
import Inspector from "./components/Inspector";
import CanvasTree from "./components/CanvasTree";
import PreviewScreen from "./components/PreviewScreen";
import DataMappingPanel from "./components/DataMappingPanel";
import MockResponsePanel from "./components/MockResponsePanel";
import FigmaImportPanel from "./components/FigmaImportPanel";
import { isContainer } from "./schema/defaultNode";
import {
  removeNodeFromTree,
  addNodeToTree,
  hasDescendant,
  findNodeInTree,
} from "./utils/tree";
import { getBottomSheetLayoutKeys, BOTTOM_SHEET_TYPE } from "./features/bottomSheet";
import { useUndoRedo, createSnapshot } from "./hooks/useUndoRedo";
import { defaultProject, defaultTree, normalizeProject, createScreen } from "./project/projectModel";
import {
  parseProjectFromJSON,
  parseProjectFromZipBlob,
  getDataMappingFromProjectJSON,
  downloadProjectAsZip,
} from "./project/projectStorage";
import { randomUUID } from "./utils/uuid";

const STORAGE_KEY_PROJECT = "ui-builder-project";
const STORAGE_KEY_DATA_MAPPING = "ui-builder-data-mapping";

const CONTAINER_TYPES = ["View", "VStack", "HStack", "ZStack", BOTTOM_SHEET_TYPE];

function normalizeNode(node) {
  if (!node || typeof node !== "object") return null;
  const out = { ...node };
  if (typeof out.id !== "string") out.id = out.id != null ? String(out.id) : "root";
  if (typeof out.type !== "string") return null;
  if (CONTAINER_TYPES.includes(out.type)) {
    out.children = Array.isArray(out.children) ? out.children.map(normalizeNode).filter(Boolean) : [];
  }
  return out;
}

function loadSavedTreeLegacy() {
  try {
    const raw = localStorage.getItem("ui-builder-tree");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || parsed.type !== "View") return null;
    const normalized = normalizeNode(parsed);
    return normalized && normalized.id === "root" ? normalized : null;
  } catch (_) {
    return null;
  }
}

/** Backward compatibility: return tree from saved project or legacy single tree */
function loadSavedTree() {
  const proj = loadSavedProject();
  if (proj?.screens?.[0]?.tree) return proj.screens[0].tree;
  return loadSavedTreeLegacy();
}

function loadSavedProject() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECT);
    if (raw) {
      const parsed = JSON.parse(raw);
      return normalizeProject(parsed);
    }
    const legacyTree = loadSavedTreeLegacy();
    if (legacyTree) {
      const proj = defaultProject();
      proj.screens[0].tree = legacyTree;
      try {
        localStorage.removeItem("ui-builder-tree");
        localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(proj));
      } catch (_) {}
      return proj;
    }
    return null;
  } catch (_) {
    return null;
  }
}

function loadDataMapping() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DATA_MAPPING);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      dataModel: Array.isArray(parsed.dataModel) ? parsed.dataModel : [],
      mockApiJson: parsed.mockApiJson != null && typeof parsed.mockApiJson === "object" ? parsed.mockApiJson : null,
      mockApiBindings: Array.isArray(parsed.mockApiBindings) ? parsed.mockApiBindings : [],
      apiConfigMethod: typeof parsed.apiConfigMethod === "string" && parsed.apiConfigMethod.trim() ? parsed.apiConfigMethod.trim() : null,
      apiUrl: typeof parsed.apiUrl === "string" ? parsed.apiUrl.trim() || null : null,
      apiMethod: typeof parsed.apiMethod === "string" && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(parsed.apiMethod) ? parsed.apiMethod : null,
      loadMorePageParamName: typeof parsed.loadMorePageParamName === "string" ? parsed.loadMorePageParamName.trim() || null : null,
      loadMorePageParamInQuery: parsed.loadMorePageParamInQuery === true,
      loadMoreHasNextPagePath: typeof parsed.loadMoreHasNextPagePath === "string" ? parsed.loadMoreHasNextPagePath.trim() || null : null,
    };
  } catch (_) {
    return null;
  }
}

export default function App() {
  const [currentProject, setCurrentProject] = useState(() => loadSavedProject() || defaultProject());
  const [selectedScreenId, setSelectedScreenId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showInspector, setShowInspector] = useState(true);
  const [showTree, setShowTree] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deviceType, setDeviceType] = useState("mobile");
  const [dataMappingCollapsed, setDataMappingCollapsed] = useState(true);
  const [inspectorPanelCollapsed, setInspectorPanelCollapsed] = useState(false);
  const [mockPanelCollapsed, setMockPanelCollapsed] = useState(false);
  const [projectPanelCollapsed, setProjectPanelCollapsed] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [showFigmaPanel, setShowFigmaPanel] = useState(false);
  const [dataModel, setDataModelState] = useState(() => {
    const m = loadDataMapping();
    return m && m.dataModel != null ? m.dataModel : [];
  });
  const [mockApiJson, setMockApiJsonState] = useState(() => {
    const m = loadDataMapping();
    return m && m.mockApiJson != null ? m.mockApiJson : null;
  });
  const [mockApiBindings, setMockApiBindingsState] = useState(() => {
    const m = loadDataMapping();
    return m && m.mockApiBindings != null ? m.mockApiBindings : [];
  });
  const [apiConfigMethod, setApiConfigMethodState] = useState(() => {
    const m = loadDataMapping();
    return m && m.apiConfigMethod != null ? m.apiConfigMethod : null;
  });
  const [apiUrl, setApiUrlState] = useState(() => {
    const m = loadDataMapping();
    return m && m.apiUrl != null ? m.apiUrl : null;
  });
  const [apiMethod, setApiMethodState] = useState(() => {
    const m = loadDataMapping();
    return m && m.apiMethod != null ? m.apiMethod : null;
  });
  const [loadMorePageParamName, setLoadMorePageParamNameState] = useState(() => {
    const m = loadDataMapping();
    return m && m.loadMorePageParamName != null ? m.loadMorePageParamName : null;
  });
  const [loadMorePageParamInQuery, setLoadMorePageParamInQueryState] = useState(() => {
    const m = loadDataMapping();
    return m && m.loadMorePageParamInQuery === true;
  });
  const [loadMoreHasNextPagePath, setLoadMoreHasNextPagePathState] = useState(() => {
    const m = loadDataMapping();
    return m && m.loadMoreHasNextPagePath != null ? m.loadMoreHasNextPagePath : null;
  });
  const [highlightNodeId, setHighlightNodeId] = useState(null);

  const currentScreen = currentProject?.screens?.find((s) => s.id === selectedScreenId);
  const tree = currentScreen?.tree ?? defaultTree();
  const setTreeState = useCallback(
    (updaterOrValue) => {
      setCurrentProject((prev) => {
        if (!prev?.screens?.length) return prev;
        const nextTree = typeof updaterOrValue === "function" ? updaterOrValue(currentScreen?.tree ?? defaultTree()) : updaterOrValue;
        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          screens: prev.screens.map((s) =>
            s.id === selectedScreenId ? { ...s, tree: nextTree } : s
          ),
        };
      });
    },
    [selectedScreenId, currentScreen?.tree]
  );

  const getCurrentSnapshot = useCallback(
    () =>
      createSnapshot({
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
      }),
    [
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
    ]
  );
  const restore = useCallback(
    (snap) => {
      if (snap.tree) {
        setCurrentProject((prev) => {
          if (!prev?.screens?.length) return prev;
          const screenId = selectedScreenId || prev.screens[0]?.id;
          return {
            ...prev,
            screens: prev.screens.map((s) =>
              s.id === screenId ? { ...s, tree: snap.tree } : s
            ),
          };
        });
      }
      setDataModelState(snap.dataModel);
      setMockApiJsonState(snap.mockApiJson);
      setMockApiBindingsState(snap.mockApiBindings);
      setApiConfigMethodState(snap.apiConfigMethod);
      setApiUrlState(snap.apiUrl);
      setApiMethodState(snap.apiMethod);
      setLoadMorePageParamNameState(snap.loadMorePageParamName);
      setLoadMorePageParamInQueryState(snap.loadMorePageParamInQuery);
      setLoadMoreHasNextPagePathState(snap.loadMoreHasNextPagePath);
    },
    [
      selectedScreenId,
      setDataModelState,
      setMockApiJsonState,
      setMockApiBindingsState,
      setApiConfigMethodState,
      setApiUrlState,
      setApiMethodState,
      setLoadMorePageParamNameState,
      setLoadMorePageParamInQueryState,
      setLoadMoreHasNextPagePathState,
    ]
  );
  const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo(getCurrentSnapshot, restore);

  const setTree = useCallback(
    (arg) => {
      pushSnapshot();
      setTreeState(arg);
    },
    [pushSnapshot]
  );
  const setDataModel = useCallback(
    (arg) => {
      pushSnapshot();
      setDataModelState(arg);
    },
    [pushSnapshot]
  );
  const setMockApiJson = useCallback(
    (arg) => {
      pushSnapshot();
      setMockApiJsonState(arg);
    },
    [pushSnapshot]
  );
  const setMockApiBindings = useCallback(
    (arg) => {
      pushSnapshot();
      setMockApiBindingsState(arg);
    },
    [pushSnapshot]
  );
  const setApiConfigMethod = useCallback(
    (arg) => {
      pushSnapshot();
      setApiConfigMethodState(arg);
    },
    [pushSnapshot]
  );
  const setApiUrl = useCallback(
    (arg) => {
      pushSnapshot();
      setApiUrlState(arg);
    },
    [pushSnapshot]
  );
  const setApiMethod = useCallback(
    (arg) => {
      pushSnapshot();
      setApiMethodState(arg);
    },
    [pushSnapshot]
  );
  const setLoadMorePageParamName = useCallback(
    (arg) => {
      pushSnapshot();
      setLoadMorePageParamNameState(arg);
    },
    [pushSnapshot]
  );
  const setLoadMorePageParamInQuery = useCallback(
    (arg) => {
      pushSnapshot();
      setLoadMorePageParamInQueryState(arg);
    },
    [pushSnapshot]
  );
  const setLoadMoreHasNextPagePath = useCallback(
    (arg) => {
      pushSnapshot();
      setLoadMoreHasNextPagePathState(arg);
    },
    [pushSnapshot]
  );

  const selected = selectedId != null ? findNodeInTree(tree, selectedId) : null;

  useEffect(() => {
    if (!currentProject?.screens?.length) return;
    const hasSelected = selectedScreenId && currentProject.screens.some((s) => s.id === selectedScreenId);
    if (!hasSelected) setSelectedScreenId(currentProject.screens[0].id);
  }, [currentProject, selectedScreenId]);

  useEffect(() => {
    try {
      if (currentProject?.id) localStorage.setItem(STORAGE_KEY_PROJECT, JSON.stringify(currentProject));
    } catch (_) {}
  }, [currentProject]);

  /** Key for Canvas so it remounts when layout/size/margin/padding change (canvas and preview reflect in real time) */
  const canvasLayoutKey = (function getKey(n) {
    if (!n || !n.type) return "";
    let s = String(n.id ?? "");
    s += ":" + (n.alignment ?? "") + ":" + (n.spacing ?? "");
    s += ":" + (n.width ?? "") + ":" + (n.height ?? "") + ":" + (n.x ?? "") + ":" + (n.y ?? "");
    s += ":" + (n.layoutMode ?? "") + ":" + (n.autoResize ?? "");
    s += ":" + (n.marginTop ?? "") + ":" + (n.marginBottom ?? "") + ":" + (n.marginLeft ?? "") + ":" + (n.marginRight ?? "");
    s += ":" + (n.insetFromParentTop ?? "") + ":" + (n.insetFromParentLeft ?? "") + ":" + (n.insetFromParentBottom ?? "") + ":" + (n.insetFromParentRight ?? "");
    s += ":" + (n.paddingTop ?? "") + ":" + (n.paddingBottom ?? "") + ":" + (n.paddingHorizontal ?? "") + ":" + (n.paddingVertical ?? "");
    (n.children || []).forEach((c) => { s += "|" + getKey(c); });
    return s;
  })(tree);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_DATA_MAPPING,
        JSON.stringify({ dataModel, mockApiJson, mockApiBindings, apiConfigMethod, apiUrl, apiMethod, loadMorePageParamName, loadMorePageParamInQuery, loadMoreHasNextPagePath })
      );
    } catch (_) {}
  }, [dataModel, mockApiJson, mockApiBindings, apiConfigMethod, apiUrl, apiMethod, loadMorePageParamName, loadMorePageParamInQuery, loadMoreHasNextPagePath]);

  useEffect(() => {
    if (selectedId != null && selected == null) setSelectedId(null);
  }, [selectedId, selected]);

  useEffect(() => {
    const onDragStart = () => setIsDragging(true);
    const onDragEnd = () => setIsDragging(false);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragend", onDragEnd);
    return () => {
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragend", onDragEnd);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === "z" && mod && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
      } else if (e.key === "z" && mod && e.shiftKey) {
        e.preventDefault();
        if (canRedo) redo();
      } else if (e.key === "y" && mod) {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [canUndo, canRedo, undo, redo]);

  const moveNode = (nodeId, targetParentId, targetIndex) => {
    const { tree: treeWithoutNode, node } = removeNodeFromTree(tree, nodeId);
    if (!node) return;
    if (node.id === targetParentId) return;
    if (hasDescendant(node, targetParentId)) return;
    setTree(addNodeToTree(treeWithoutNode, targetParentId, node, targetIndex));
  };

  const addNode = (node) => {
    if (selected && isContainer(selected)) {
      updateNode({
        ...selected,
        children: [...(selected.children || []), node]
      });
    } else {
      setTree((prev) => ({ ...prev, children: [...(prev.children || []), node] }));
    }
  };

  const STYLE_AND_LAYOUT_KEYS = [
    "backgroundColor", "textColor", "color", "fontFamily", "fontSize", "fontWeight", "cornerRadius",
    "borderColor", "opacity", "blur", "foregroundColor",
    "width", "height", "x", "y",
    "paddingHorizontal", "paddingVertical", "paddingTop", "paddingBottom",
    "marginHorizontal", "marginVertical", "marginTop", "marginBottom", "marginLeft", "marginRight",
    "insetFromParentTop", "insetFromParentLeft", "insetFromParentBottom", "insetFromParentRight",
    "alignment", "spacing", "text", "numberOfLines", "title", "src", "alt", "contentMode", "useAsset", "assetBundleName", "assetImageName", "showLoadingIndicator", "items",
    "loadMoreEnabled", "loadMoreFooterLabel", "loadMoreLoadingLabel", "sectionGroupingEnabled", "listRowSpacing", "listSpacingAboveFirst", "listSpacingBelowLast",
    "placeholder", "isOn", "label", "value", "min", "max", "selection", "options",
    "progress", "indeterminate", "axis", "url",
    "fitToScreen", "autoResize", "layoutMode",
    "localizationEnabled", "localizationKey", "localizationDefaultValue",
    "accessibilityEnabled", "accessibilityIdentifier", "accessibilityLabel",
    "tag", "isUserInteractionEnabled", "isHidden", "automationIdentifier",
    "actionId", "actionEvent", "actionBoundNodeId", "actionBoundProperty", "actionBoundDataModelId",
    "gestures", "displayFormat", "screenId", "presentationStyle", "componentName", "fillRemainingWidth",
    ...getBottomSheetLayoutKeys(),
  ];

  const applyOneUpdate = (tree, updated) => {
    const targetId = updated.id != null ? String(updated.id) : null;
    if (targetId == null) return tree;
    const nodeInTree = findNodeInTree(tree, targetId);
    if (!nodeInTree) return tree;

    const merged = { ...nodeInTree, id: targetId };
    if (Array.isArray(updated.children)) {
      merged.children = updated.children;
    } else if (Array.isArray(nodeInTree.children)) {
      merged.children = nodeInTree.children;
    }
    for (const key of STYLE_AND_LAYOUT_KEYS) {
      if (key === "width" || key === "height") {
        if (key in updated) merged[key] = updated[key];
      } else if (updated[key] !== undefined) {
        merged[key] = updated[key];
      }
    }
    if (updated.alignment !== undefined) merged.alignment = updated.alignment;
    if (updated.spacing !== undefined) merged.spacing = updated.spacing;

    let replaced = false;
    const updateFn = (node) => {
      const nid = node.id != null ? String(node.id) : null;
      if (!replaced && nid === targetId) {
        replaced = true;
        return { ...merged };
      }
      return { ...node, children: (node.children || []).map(updateFn) };
    };
    return updateFn(tree);
  };

  const updateNode = (updated) => {
    if (updated?.id == null) return;
    setTree((prevTree) => applyOneUpdate(prevTree, updated));
  };

  /** Apply multiple node updates in one setTree (avoids batching issues in sheet mode). */
  const updateNodes = (updates) => {
    if (!Array.isArray(updates) || updates.length === 0) return;
    setTree((prevTree) =>
      updates.reduce((acc, updated) => applyOneUpdate(acc, updated), prevTree)
    );
  };

  const resetDataMappingToInitial = useCallback(() => {
    setDataModelState([]);
    setMockApiJsonState(null);
    setMockApiBindingsState([]);
    setApiConfigMethodState(null);
    setApiUrlState(null);
    setApiMethodState(null);
    setLoadMorePageParamNameState(null);
    setLoadMorePageParamInQueryState(false);
    setLoadMoreHasNextPagePathState(null);
  }, []);

  const resetDataMapping = useCallback(() => {
    pushSnapshot();
    resetDataMappingToInitial();
  }, [pushSnapshot, resetDataMappingToInitial]);

  const newProject = useCallback((projectName) => {
    try {
      localStorage.removeItem(STORAGE_KEY_PROJECT);
      localStorage.removeItem(STORAGE_KEY_DATA_MAPPING);
    } catch (_) {}
    pushSnapshot();
    const proj = defaultProject(projectName);
    setCurrentProject(proj);
    setSelectedScreenId(proj.screens[0]?.id ?? null);
    setSelectedId(null);
    setHighlightNodeId(null);
    resetDataMappingToInitial();
  }, [pushSnapshot, resetDataMappingToInitial]);

  const addScreen = useCallback((screenName) => {
    const name = typeof screenName === "string" && screenName.trim() ? screenName.trim() : `Screen ${(currentProject?.screens?.length || 0) + 1}`;
    const screen = createScreen(randomUUID(), name);
    setCurrentProject((prev) => {
      if (!prev?.screens) return prev;
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        screens: [...prev.screens, { ...screen, order: prev.screens.length }],
      };
    });
    setSelectedScreenId(screen.id);
    setSelectedId(null);
  }, [currentProject?.screens?.length]);

  const addScreenFromJson = useCallback(
    (screenName, loadedTree, dataMapping) => {
      if (!loadedTree || typeof loadedTree !== "object" || loadedTree.type !== "View") return;
      const out = normalizeNode(loadedTree);
      if (!out) return;
      if (out.id !== "root") out.id = "root";
      const name = typeof screenName === "string" && screenName.trim() ? screenName.trim() : `Screen ${(currentProject?.screens?.length || 0) + 1}`;
      const screen = createScreen(randomUUID(), name, out);
      setCurrentProject((prev) => {
        if (!prev?.screens) return prev;
        return {
          ...prev,
          updatedAt: new Date().toISOString(),
          screens: [...prev.screens, { ...screen, order: prev.screens.length }],
        };
      });
      setSelectedScreenId(screen.id);
      setSelectedId(null);
      setHighlightNodeId(null);
      if (dataMapping != null && typeof dataMapping === "object") {
        setDataModelState(Array.isArray(dataMapping.dataModel) ? dataMapping.dataModel : []);
        setMockApiJsonState(dataMapping.mockApiJson != null && typeof dataMapping.mockApiJson === "object" ? dataMapping.mockApiJson : null);
        setMockApiBindingsState(Array.isArray(dataMapping.mockApiBindings) ? dataMapping.mockApiBindings : []);
        setApiConfigMethodState(typeof dataMapping.apiConfigMethod === "string" && dataMapping.apiConfigMethod.trim() ? dataMapping.apiConfigMethod.trim() : null);
        setApiUrlState(typeof dataMapping.apiUrl === "string" ? dataMapping.apiUrl.trim() || null : null);
        setApiMethodState(typeof dataMapping.apiMethod === "string" && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(dataMapping.apiMethod) ? dataMapping.apiMethod : null);
        setLoadMorePageParamNameState(typeof dataMapping.loadMorePageParamName === "string" ? dataMapping.loadMorePageParamName.trim() || null : null);
        setLoadMorePageParamInQueryState(dataMapping.loadMorePageParamInQuery === true);
        setLoadMoreHasNextPagePathState(typeof dataMapping.loadMoreHasNextPagePath === "string" ? dataMapping.loadMoreHasNextPagePath.trim() || null : null);
      }
    },
    [currentProject?.screens?.length]
  );

  const deleteScreen = useCallback((screenId) => {
    const id = screenId != null ? String(screenId) : null;
    if (!id) return;
    setCurrentProject((prev) => {
      const screens = prev?.screens ?? [];
      if (screens.length <= 1) return prev;
      const nextScreens = screens.filter((s) => (s.id != null ? String(s.id) : null) !== id);
      if (nextScreens.length === screens.length) return prev;
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        screens: nextScreens.map((s, i) => ({ ...s, order: i })),
      };
    });
    setSelectedScreenId((prevId) => (prevId != null && String(prevId) === id ? null : prevId));
    setSelectedId(null);
  }, []);

  const updateScreenName = useCallback((screenId, name) => {
    if (!screenId) return;
    setCurrentProject((prev) => {
      if (!prev?.screens) return prev;
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        screens: prev.screens.map((s) => (s.id === screenId ? { ...s, name: name != null ? String(name).trim() : s.name } : s)),
      };
    });
  }, []);

  const openProject = useCallback(async (file) => {
    if (!file) return;
    const isZip = file.name.toLowerCase().endsWith(".zip");
    try {
      const buffer = await file.arrayBuffer();
      let project = null;
      let dataMapping = null;
      if (isZip) {
        const blob = new Blob([buffer], { type: "application/zip" });
        const result = await parseProjectFromZipBlob(blob);
        if (!result) return;
        project = result.project;
        dataMapping = result.dataMapping;
      } else {
        const text = new TextDecoder().decode(buffer);
        const obj = JSON.parse(text);
        project = parseProjectFromJSON(obj);
        dataMapping = getDataMappingFromProjectJSON(obj);
      }
      if (!project?.screens?.length) return;
      pushSnapshot();
      setCurrentProject(project);
      setSelectedScreenId(project.screens[0].id);
      setSelectedId(null);
      setHighlightNodeId(null);
      if (dataMapping) {
        setDataModelState(dataMapping.dataModel ?? []);
        setMockApiJsonState(dataMapping.mockApiJson ?? null);
        setMockApiBindingsState(dataMapping.mockApiBindings ?? []);
        setApiConfigMethodState(dataMapping.apiConfigMethod ?? null);
        setApiUrlState(dataMapping.apiUrl ?? null);
        setApiMethodState(dataMapping.apiMethod ?? null);
        setLoadMorePageParamNameState(dataMapping.loadMorePageParamName ?? null);
        setLoadMorePageParamInQueryState(dataMapping.loadMorePageParamInQuery ?? false);
        setLoadMoreHasNextPagePathState(dataMapping.loadMoreHasNextPagePath ?? null);
      } else {
        resetDataMappingToInitial();
      }
    } catch (e) {
      console.error("Open project failed", e);
    }
  }, [pushSnapshot, resetDataMappingToInitial]);

  const saveProject = useCallback(async () => {
    const dataMapping = {
      dataModel,
      mockApiJson,
      mockApiBindings,
      apiConfigMethod,
      apiUrl,
      apiMethod,
      loadMorePageParamName,
      loadMorePageParamInQuery,
      loadMoreHasNextPagePath,
    };
    await downloadProjectAsZip(currentProject, dataMapping);
  }, [currentProject, dataModel, mockApiJson, mockApiBindings, apiConfigMethod, apiUrl, apiMethod, loadMorePageParamName, loadMorePageParamInQuery, loadMoreHasNextPagePath]);

  const loadFromJson = useCallback(
    (loadedTree, dataMapping) => {
      if (!loadedTree || typeof loadedTree !== "object" || loadedTree.type !== "View") return;
      const out = normalizeNode(loadedTree);
      if (!out) return;
      if (out.id !== "root") out.id = "root";
      pushSnapshot();
      setTreeState(out);
      setSelectedId(null);
      setHighlightNodeId(null);
      if (dataMapping != null && typeof dataMapping === "object") {
        setDataModelState(Array.isArray(dataMapping.dataModel) ? dataMapping.dataModel : []);
        setMockApiJsonState(dataMapping.mockApiJson != null && typeof dataMapping.mockApiJson === "object" ? dataMapping.mockApiJson : null);
        setMockApiBindingsState(Array.isArray(dataMapping.mockApiBindings) ? dataMapping.mockApiBindings : []);
        setApiConfigMethodState(typeof dataMapping.apiConfigMethod === "string" && dataMapping.apiConfigMethod.trim() ? dataMapping.apiConfigMethod.trim() : null);
        setApiUrlState(typeof dataMapping.apiUrl === "string" ? dataMapping.apiUrl.trim() || null : null);
        setApiMethodState(typeof dataMapping.apiMethod === "string" && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(dataMapping.apiMethod) ? dataMapping.apiMethod : null);
        setLoadMorePageParamNameState(typeof dataMapping.loadMorePageParamName === "string" ? dataMapping.loadMorePageParamName.trim() || null : null);
        setLoadMorePageParamInQueryState(dataMapping.loadMorePageParamInQuery === true);
        setLoadMoreHasNextPagePathState(typeof dataMapping.loadMoreHasNextPagePath === "string" ? dataMapping.loadMoreHasNextPagePath.trim() || null : null);
      } else {
        resetDataMappingToInitial();
      }
    },
    [pushSnapshot, resetDataMappingToInitial]
  );

  const deleteNode = useCallback(
    (id) => {
      const idStr = id != null ? String(id) : null;
      const remove = (node) => ({
        ...node,
        children: (node.children || []).filter((child) => (child.id != null ? String(child.id) : null) !== idStr).map(remove),
      });
      setTree(remove(tree));
      setSelectedId(null);
    },
    [tree, setTree]
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <ProjectPanel
        currentProject={currentProject}
        selectedScreenId={selectedScreenId}
        currentScreenName={currentScreen?.name}
        onNewProject={newProject}
        onOpenProject={openProject}
        onSaveProject={saveProject}
        onAddScreen={addScreen}
        onAddScreenFromJson={addScreenFromJson}
        onDeleteScreen={deleteScreen}
        onSelectScreen={setSelectedScreenId}
        onOpenBoard={() => setShowBoard(true)}
        onLoadFromJson={loadFromJson}
        onOpenFigma={() => setShowFigmaPanel(true)}
        tree={tree}
        dataModel={dataModel}
        mockApiJson={mockApiJson}
        mockApiBindings={mockApiBindings}
        apiConfigMethod={apiConfigMethod}
        apiUrl={apiUrl}
        apiMethod={apiMethod}
        loadMorePageParamName={loadMorePageParamName}
        loadMorePageParamInQuery={loadMorePageParamInQuery}
        loadMoreHasNextPagePath={loadMoreHasNextPagePath}
        collapsed={projectPanelCollapsed}
        onToggleCollapsed={() => setProjectPanelCollapsed((v) => !v)}
      />
      <Sidebar
        tree={tree}
        selected={selected}
        onAdd={addNode}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />
      {showBoard ? (
        <Board
          project={currentProject}
          selectedScreenId={selectedScreenId}
          onSelectScreen={setSelectedScreenId}
          onClose={() => setShowBoard(false)}
          dataModel={dataModel}
        />
      ) : (
      <>
      <Canvas
        key={canvasLayoutKey}
        tree={tree}
        dataModel={dataModel}
        selectedNodeId={selectedId}
        onSelect={(node) => setSelectedId(node != null && node.id != null ? node.id : null)}
        onUpdate={updateNode}
        onMove={moveNode}
        isDragging={isDragging}
        onOpenPreview={() => setShowPreview(true)}
        deviceType={deviceType}
        onDeviceTypeChange={setDeviceType}
        highlightNodeId={highlightNodeId}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      {showPreview && (
        <PreviewScreen tree={tree} dataModel={dataModel} onClose={() => setShowPreview(false)} />
      )}
      {inspectorPanelCollapsed ? (
        <div className="w-10 shrink-0 h-full flex flex-col border-l border-gray-300 bg-gray-200">
          <button
            type="button"
            onClick={() => setInspectorPanelCollapsed(false)}
            className="flex-1 flex items-center justify-center text-gray-600 hover:bg-gray-300"
            title="Open Inspector & Tree"
          >
            ‹‹
          </button>
        </div>
      ) : (
        <aside className="shrink-0 h-full flex flex-col w-72 bg-gray-100 border-l border-gray-300 overflow-hidden relative z-20">
          <div className="shrink-0 flex border-b border-gray-300 bg-gray-200">
            <button
              type="button"
              onClick={() => setShowInspector((v) => !v)}
              className={`flex-1 py-2 px-3 text-sm font-medium ${showInspector ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
              title={showInspector ? "Hide Inspector" : "Show Inspector"}
            >
              Inspector {showInspector ? "▾" : "▸"}
            </button>
            <button
              type="button"
              onClick={() => setShowTree((v) => !v)}
              className={`flex-1 py-2 px-3 text-sm font-medium ${showTree ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
              title={showTree ? "Hide Tree" : "Show Tree"}
            >
              Tree {showTree ? "▾" : "▸"}
            </button>
            <button
              type="button"
              onClick={() => setInspectorPanelCollapsed(true)}
              className="p-2 text-gray-600 hover:bg-gray-300"
              title="Hide panel"
            >
              ››
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {showInspector && (
              <div className={`overflow-y-auto border-b border-gray-300 bg-gray-100 ${showTree ? "max-h-[50%] min-h-0 shrink-0" : "flex-1 min-h-0"}`}>
                <Inspector
                  key={selectedId ?? "none"}
                  tree={tree}
                  selected={selected}
                  dataModel={dataModel}
                  onUpdate={updateNode}
                  onDelete={deleteNode}
                  screenName={currentScreen?.name}
                  onScreenNameChange={selectedScreenId ? (name) => updateScreenName(selectedScreenId, name) : undefined}
                />
              </div>
            )}
            {showTree && (
              <div className={`flex-1 min-h-0 overflow-y-auto bg-white flex flex-col ${showInspector ? "" : "min-h-0"}`}>
                <div className="py-2 border-b border-gray-200 px-2 font-semibold text-sm text-gray-700 shrink-0">Canvas tree</div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <CanvasTree
                    tree={tree}
                    selectedId={selectedId}
                    onSelect={(node) => setSelectedId(node != null && node.id != null ? node.id : null)}
                    onMove={moveNode}
                  />
                </div>
              </div>
            )}
            {!showInspector && !showTree && (
              <div className="flex-1 flex items-center justify-center text-sm text-gray-500 p-4">
                Toggle Inspector or Tree to view
              </div>
            )}
          </div>
        </aside>
      )}
      <DataMappingPanel
        tree={tree}
        selectedId={selectedId}
        dataModel={dataModel}
        onDataModelChange={setDataModel}
        mockApiJson={mockApiJson}
        apiConfigMethod={apiConfigMethod}
        onApiConfigMethodChange={setApiConfigMethod}
        apiUrl={apiUrl}
        onApiUrlChange={setApiUrl}
        apiMethod={apiMethod}
        onApiMethodChange={setApiMethod}
        loadMorePageParamName={loadMorePageParamName}
        onLoadMorePageParamNameChange={setLoadMorePageParamName}
        loadMorePageParamInQuery={loadMorePageParamInQuery}
        onLoadMorePageParamInQueryChange={setLoadMorePageParamInQuery}
        loadMoreHasNextPagePath={loadMoreHasNextPagePath}
        onLoadMoreHasNextPagePathChange={setLoadMoreHasNextPagePath}
        onUpdateNode={updateNode}
        collapsed={dataMappingCollapsed}
        onToggleCollapsed={() => setDataMappingCollapsed((v) => !v)}
        onHighlightNode={setHighlightNodeId}
      />
      <MockResponsePanel
        tree={tree}
        selectedId={selectedId}
        dataModel={dataModel}
        onDataModelChange={setDataModel}
        mockApiJson={mockApiJson}
        onMockApiJsonChange={setMockApiJson}
        mockApiBindings={mockApiBindings}
        onMockApiBindingsChange={setMockApiBindings}
        onUpdateNode={updateNode}
        onUpdateNodes={updateNodes}
        collapsed={mockPanelCollapsed}
        onToggleCollapsed={() => setMockPanelCollapsed((v) => !v)}
      />
      {showFigmaPanel && (
        <FigmaImportPanel
          onImport={loadFromJson}
          onClose={() => setShowFigmaPanel(false)}
        />
      )}
      </>
      )}
    </div>
  );
}
