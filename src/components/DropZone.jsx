import { useState } from "react";

const DRAG_TYPE = "application/x-ui-builder-node-id";

/** Minimum drop zone size (px) so it stays clickable when stack spacing is 0 */
const MIN_DROP_SIZE = 4;

/** Drop here to reorder or move components. When fill=true (e.g. ZStack), zone fills parent. */
export default function DropZone({ parentId, index, onMove, layout = "col", spacing, fill = false, siblingCount = 0 }) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const nodeId = e.dataTransfer.getData(DRAG_TYPE);
    if (!nodeId) return;
    onMove(nodeId, parentId, index);
  };

  const isEdgeZone = siblingCount >= 0 && (index === 0 || index === siblingCount);
  const baseSizePx = spacing != null ? Math.max(Number(spacing) || 0, MIN_DROP_SIZE) : 20;
  const sizePx = fill ? 0 : (isEdgeZone ? 0 : baseSizePx);
  const isRow = layout === "row";
  const edgeHitPadding = 6;
  const sizeStyle = fill
    ? { position: "absolute", inset: 0 }
    : isEdgeZone
      ? isRow
        ? { width: 0, minWidth: 0, paddingLeft: edgeHitPadding, paddingRight: edgeHitPadding, marginLeft: -edgeHitPadding, marginRight: -edgeHitPadding, overflow: "visible" }
        : { height: 0, minHeight: 0, paddingTop: edgeHitPadding, paddingBottom: edgeHitPadding, marginTop: -edgeHitPadding, marginBottom: -edgeHitPadding, overflow: "visible" }
      : isRow
        ? { minWidth: sizePx, width: sizePx }
        : { minHeight: sizePx, height: sizePx };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      title="Drop here to change position"
      className={`transition-colors flex items-center justify-center ${fill ? "pointer-events-auto" : "flex-shrink-0"} ${isOver ? "bg-blue-100 ring-1 ring-blue-400 rounded" : ""}`}
      style={sizeStyle}
      data-drop-zone
    />
  );
}

export { DRAG_TYPE };
