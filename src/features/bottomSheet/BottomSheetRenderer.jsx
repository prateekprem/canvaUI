/**
 * Renders a Bottom Sheet node on the canvas/preview.
 * Kept in feature file; RenderNode.jsx only calls renderBottomSheetContent().
 */

import React from "react";
import RenderNode from "../../renderer/RenderNode";
import { BOTTOM_SHEET_TYPE } from "./constants";

/**
 * Render the bottom sheet node. In the builder this is a placeholder (card with handle);
 * in preview/runtime you would use real sheet behavior (overlay, drag, detents).
 * @param {Object} node - Bottom Sheet node
 * @param {Object} renderProps - same as RenderNode + optional containerDropOverlay (ReactNode), renderChildrenWithDropZones (function)
 * @returns {React.ReactNode}
 */
export function renderBottomSheetContent(node, renderProps) {
  if (!node || node.type !== BOTTOM_SHEET_TYPE) return null;

  const children = node.children || [];
  const showHandle = node.sheetShowHandle !== false;
  const padV = node.paddingVertical != null ? node.paddingVertical : 0;
  const padH = node.paddingHorizontal != null ? node.paddingHorizontal : 0;
  const containerPadding = {
    paddingTop: node.paddingTop != null ? node.paddingTop : padV,
    paddingBottom: node.paddingBottom != null ? node.paddingBottom : padV,
    paddingLeft: padH,
    paddingRight: padH,
  };

  const select = (e) => {
    if (renderProps.isPreview) return;
    e.stopPropagation();
    renderProps.onSelect(node);
  };

  const hasDropSlot = renderProps.containerDropOverlay != null && typeof renderProps.renderChildrenWithDropZones === "function";

  return (
    <div
      onClick={select}
      className="rounded-t-lg border-2 border-dashed border-amber-400 bg-amber-50/80 min-h-[120px] flex flex-col relative"
      style={{ ...containerPadding }}
      title="Bottom sheet (add content as children)"
    >
      {hasDropSlot && renderProps.containerDropOverlay}
      {showHandle && (
        <div className="flex justify-center py-1.5 mb-1">
          <div className="w-10 h-1 rounded-full bg-gray-400" aria-hidden />
        </div>
      )}
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        {hasDropSlot ? (
          renderProps.renderChildrenWithDropZones()
        ) : children.length === 0 ? (
          <p className="text-xs text-amber-700/80 italic p-2">Drop content here</p>
        ) : (
          children.map((child) => (
            <RenderNode
              key={child.id}
              node={child}
              dataModel={renderProps.dataModel}
              onSelect={renderProps.onSelect}
              onUpdate={renderProps.onUpdate}
              onMove={renderProps.onMove}
              parentLayout="col"
              isDragging={renderProps.isDragging}
              isPreview={renderProps.isPreview}
              listItemContext={renderProps.listItemContext}
              highlightNodeId={renderProps.highlightNodeId}
              selectedNodeId={renderProps.selectedNodeId}
            />
          ))
        )}
      </div>
    </div>
  );
}
