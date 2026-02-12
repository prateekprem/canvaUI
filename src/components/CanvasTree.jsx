import { useState } from "react";
import { getNodeDisplayName, CONTAINER_TYPES } from "../schema/defaultNode";
import { DRAG_TYPE } from "./DropZone";

function isContainer(type) {
  return type && CONTAINER_TYPES.includes(type);
}

function TreeNode({ node, selectedId, onSelect, onMove, depth = 0, parentId = null, index = 0, siblingCount = 1 }) {
  if (!node) return null;
  const [isDragOver, setIsDragOver] = useState(false);
  const isSelected = (node.id != null ? String(node.id) : null) === selectedId;
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const label = getNodeDisplayName(node);
  const paddingLeft = `${depth * 12 + 8}px`;
  const canMoveUp = parentId != null && index > 0;
  const canMoveDown = parentId != null && index < siblingCount - 1;
  const containerRow = isContainer(node.type);

  const handleMoveUp = (e) => {
    e.stopPropagation();
    if (onMove && canMoveUp) onMove(node.id, parentId, index - 1);
  };
  const handleMoveDown = (e) => {
    e.stopPropagation();
    if (onMove && canMoveDown) onMove(node.id, parentId, index + 1);
  };

  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData(DRAG_TYPE, node.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData(DRAG_TYPE);
    if (!draggedId || !onMove) return;
    if (draggedId === node.id) return;
    if (containerRow) {
      onMove(draggedId, node.id, children.length);
    } else {
      onMove(draggedId, parentId, index);
    }
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-0.5 rounded border-l-2 ${isSelected ? "bg-blue-100 border-blue-500" : "border-transparent"} ${isDragOver ? "ring-1 ring-blue-400 bg-blue-50" : ""} ${node.id !== "root" ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ paddingLeft }}
        draggable={node.id !== "root"}
        onDragStart={node.id !== "root" ? handleDragStart : undefined}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={containerRow ? "Drag to reorder; drop here to add as child" : "Drag to reorder"}
      >
        <button
          type="button"
          onClick={() => onSelect(node)}
          className={`flex-1 min-w-0 text-left py-1.5 px-2 rounded text-sm truncate flex items-center gap-1.5 ${isSelected ? "text-blue-900" : "hover:bg-gray-100"} ${node.id !== "root" ? "cursor-grab" : ""}`}
          title={node.type}
        >
          <span className="shrink-0 text-gray-400 text-xs">{hasChildren ? "▾" : "◦"}</span>
          <span className="font-medium truncate">{label}</span>
          {node.id !== "root" && (
            <span className="shrink-0 text-xs text-gray-400">({node.type})</span>
          )}
        </button>
        {parentId != null && (
          <span className="flex shrink-0 items-center gap-0.5 pr-1">
            <button
              type="button"
              onClick={handleMoveUp}
              disabled={!canMoveUp}
              title="Move up"
              className="p-1 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Move up"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={handleMoveDown}
              disabled={!canMoveDown}
              title="Move down"
              className="p-1 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Move down"
            >
              ▼
            </button>
          </span>
        )}
      </div>
      {hasChildren && (
        <div className="border-l border-gray-200 ml-2">
          {children.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              depth={depth + 1}
              parentId={node.id}
              index={i}
              siblingCount={children.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CanvasTree({ tree, selectedId, onSelect, onMove }) {
  const [rootDragOver, setRootDragOver] = useState(false);
  if (!tree) {
    return (
      <div className="p-4 text-sm text-gray-500">No tree</div>
    );
  }
  const topLevelNodes = tree.children || [];
  const isRootSelected = (selectedId != null ? String(selectedId) : null) === "root";

  const handleRootDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setRootDragOver(true);
  };
  const handleRootDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRootDragOver(false);
  };
  const handleRootDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setRootDragOver(false);
    const draggedId = e.dataTransfer.getData(DRAG_TYPE);
    if (!draggedId || !onMove) return;
    onMove(draggedId, "root", topLevelNodes.length);
  };

  return (
    <div className="p-2 overflow-y-auto">
      <div
        className={`flex items-center gap-0.5 rounded border-l-2 py-1.5 px-2 text-sm ${isRootSelected ? "bg-blue-100 border-blue-500" : "border-transparent hover:bg-gray-50"} ${rootDragOver ? "ring-1 ring-blue-400 bg-blue-50" : ""}`}
        style={{ paddingLeft: "8px" }}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
        title="Drop here to add as top-level"
      >
        <button
          type="button"
          onClick={() => onSelect(tree)}
          className="flex-1 min-w-0 text-left truncate flex items-center gap-1.5 text-gray-600"
          title="Canvas / screen settings (e.g. Fit to screen)"
        >
          <span className="shrink-0 text-gray-400 text-xs">◇</span>
          <span className="font-medium truncate">Canvas</span>
        </button>
      </div>
      {topLevelNodes.length === 0 ? (
        <div className="p-2 pl-6 text-xs text-gray-500">Drop components here or add from the left.</div>
      ) : (
        <div className="border-l border-gray-200 ml-2">
          {topLevelNodes.map((child, i) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onMove={onMove}
              depth={0}
              parentId={tree.id}
              index={i}
              siblingCount={topLevelNodes.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
