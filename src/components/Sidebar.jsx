import { useState, useMemo } from "react";
import { createNode, createNavigationBarNode, isContainer, getDisplayName, getDescription, COMPONENT_DISPLAY_NAMES, COMPONENT_DESCRIPTIONS } from "../schema/defaultNode";
import { BOTTOM_SHEET_TYPE } from "../features/bottomSheet";

/** View is not listed — canvas always has a root View by default; users add content inside it. */
const ALL_COMPONENTS = ["Text", "Button", "Image", "VStack", "HStack", "ZStack", "List", BOTTOM_SHEET_TYPE, "ListItemContent", "ListItemText", "TextField", "Toggle", "Slider", "Picker", "ProgressView", "Divider", "Spacer", "Link", "SecureField"];

export default function Sidebar({ tree, selected, onAdd, collapsed, onToggleCollapsed }) {
  const [searchQuery, setSearchQuery] = useState("");
  const filteredComponents = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return ALL_COMPONENTS;
    return ALL_COMPONENTS.filter((type) => {
      const name = getDisplayName(type).toLowerCase();
      return name.includes(q) || type.toLowerCase().includes(q);
    });
  }, [searchQuery]);
  const addTargetLabel = selected && isContainer(selected)
    ? getDisplayName(selected.type)
    : "canvas";

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 h-full flex flex-col border-r border-gray-300 bg-gray-200">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex-1 flex items-center justify-center text-gray-600 hover:bg-gray-300"
          title="Open Controls panel"
        >
          ››
        </button>
      </div>
    );
  }

  return (
    <div className="w-60 shrink-0 h-full min-h-0 bg-gray-100 border-r border-gray-300 flex flex-col overflow-hidden">
      <div className="shrink-0 flex items-center justify-between border-b border-gray-300 bg-gray-200 px-2 py-1.5">
        <h3 className="font-bold text-sm text-gray-800">Add to layout</h3>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1 text-gray-600 hover:bg-gray-300 rounded"
          title="Hide Controls panel"
        >
          ‹‹
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden p-4">
        <p className="text-xs text-gray-500 mb-2 shrink-0">
          New items go into: <strong>{addTargetLabel}</strong>
        </p>

        <div className="mb-2">
          <input
            type="search"
            placeholder="Search controls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            aria-label="Search controls"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1 -mr-1">
          <button
            type="button"
            onClick={() => onAdd(createNavigationBarNode())}
            title={COMPONENT_DESCRIPTIONS.NavigationBar || "Full-width bar with left button, title text, and right button"}
            className="w-full p-2 bg-indigo-50 border border-indigo-200 rounded shadow hover:bg-indigo-100 text-left shrink-0"
          >
            <span className="font-medium">{COMPONENT_DISPLAY_NAMES.NavigationBar || "Navigation bar"}</span>
          </button>
          {filteredComponents.length === 0 ? (
            <p className="text-xs text-gray-500 py-2">No controls match &quot;{searchQuery}&quot;</p>
          ) : (
            filteredComponents.map((type) => (
              <button
                key={type}
                onClick={() => onAdd(createNode(type))}
                title={getDescription(type)}
                className="w-full p-2 bg-white rounded shadow hover:bg-gray-50 text-left shrink-0"
              >
                <span className="font-medium">{getDisplayName(type)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
