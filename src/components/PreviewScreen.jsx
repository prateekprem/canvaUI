import { useState, useEffect, useRef } from "react";
import RenderNode from "../renderer/RenderNode";
import { findNodeInTree } from "../utils/tree";

const DEVICE_FRAME_WIDTH = 390 + 12 * 2; // 414
const DEVICE_FRAME_HEIGHT = 844 + 10 * 2; // 864 (outer p-[10px])

/** Apply a node update to a tree (returns new tree). Used for interactive preview state. */
function applyPreviewUpdate(tree, updated) {
  const targetId = updated?.id != null ? String(updated.id) : null;
  if (!targetId || !tree) return tree;
  const nodeInTree = findNodeInTree(tree, targetId);
  if (!nodeInTree) return tree;
  const merged = { ...nodeInTree, ...updated, id: targetId };
  if (updated.children === undefined && nodeInTree.children) merged.children = nodeInTree.children;

  const updateFn = (node) => {
    if (node.id != null && String(node.id) === targetId) return { ...merged };
    return { ...node, children: (node.children || []).map(updateFn) };
  };
  return updateFn(tree);
}

/** iPhone-style simulator frame: bezel + status bar + screen area + home indicator */
const IPHONE_SCREEN_WIDTH = 390;
const IPHONE_SCREEN_HEIGHT = 844;
const IPHONE_BEZEL = 12;
const IPHONE_RADIUS = 44;
const STATUS_BAR_H = 48;
const HOME_INDICATOR_H = 32;
/** Content area = full screen minus status bar and home indicator (like safe area) */
const DEVICE_CONTENT_WIDTH = IPHONE_SCREEN_WIDTH;
const DEVICE_CONTENT_HEIGHT = IPHONE_SCREEN_HEIGHT - STATUS_BAR_H - HOME_INDICATOR_H;

export default function PreviewScreen({ tree, dataModel, onClose }) {
  const [localTree, setLocalTree] = useState(tree);
  const [toast, setToast] = useState(null);
  const [openSheetId, setOpenSheetId] = useState(null);
  const [previewListLoadMoreCounts, setPreviewListLoadMoreCounts] = useState({});
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  useEffect(() => {
    setLocalTree(tree);
  }, [tree]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const s = Math.min(w / DEVICE_FRAME_WIDTH, h / DEVICE_FRAME_HEIGHT, 1);
      setScale(s);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const handlePreviewUpdate = (updated) => {
    if (updated?.id == null) return;
    setLocalTree((prev) => applyPreviewUpdate(prev, updated));
  };

  const handlePreviewAction = (node) => {
    const title = node?.title ?? node?.text ?? "Button";
    setToast(typeof title === "string" ? title : "Tapped");
  };

  const handlePreviewOpenBottomSheet = (sheetId) => {
    setOpenSheetId(sheetId);
  };

  const handlePreviewLoadMore = (listId) => {
    setPreviewListLoadMoreCounts((prev) => ({ ...prev, [listId]: (prev[listId] || 0) + 1 }));
  };

  const sheetNode = openSheetId ? findNodeInTree(localTree, openSheetId) : null;

  if (!tree) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
          <p className="text-gray-500 mb-4">No content to preview</p>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="relative bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh] w-full max-w-4xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-100">
          <span className="text-sm font-medium text-gray-700">Preview — iPhone</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-gray-200 hover:bg-gray-300 rounded border border-gray-300"
          >
            Close
          </button>
        </div>
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-hidden p-4 bg-gray-50 flex items-center justify-center"
        >
          {/* iPhone simulator frame — scaled to fit, no scroll */}
          <div
            className="flex-shrink-0 bg-black rounded-[3rem] p-[10px] shadow-2xl"
            style={{
              width: DEVICE_FRAME_WIDTH,
              height: DEVICE_FRAME_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <div
              className="relative bg-black overflow-hidden flex flex-col"
              style={{
                width: IPHONE_SCREEN_WIDTH,
                height: IPHONE_SCREEN_HEIGHT,
                borderRadius: IPHONE_RADIUS - 4,
              }}
            >
              {/* Status bar area */}
              <div
                className="shrink-0 flex items-end justify-center pb-1 bg-white"
                style={{ height: STATUS_BAR_H }}
              >
                <div className="w-24 h-6 rounded-full bg-black" title="Dynamic Island" />
              </div>
              {/* Screen content: only UI children, not the canvas view */}
              <div
                className="shrink-0 overflow-hidden bg-white"
                style={{
                  width: DEVICE_CONTENT_WIDTH,
                  height: DEVICE_CONTENT_HEIGHT,
                }}
              >
                <div
                  className={`overflow-auto flex flex-col min-h-0 ${localTree.fitToScreen ? "w-full h-full" : ""}`}
                  style={
                    localTree.fitToScreen
                      ? { width: "100%", height: "100%" }
                      : { width: DEVICE_CONTENT_WIDTH, height: DEVICE_CONTENT_HEIGHT, minWidth: DEVICE_CONTENT_WIDTH, minHeight: DEVICE_CONTENT_HEIGHT }
                  }
                >
                  {(localTree.children || []).length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">Empty screen</div>
                  ) : (
                    (localTree.children || []).map((child) => (
                      <RenderNode
                        key={child.id}
                        node={child}
                        dataModel={dataModel}
                        isPreview
                        onUpdate={handlePreviewUpdate}
                        onPreviewAction={handlePreviewAction}
                        onPreviewOpenBottomSheet={handlePreviewOpenBottomSheet}
                        previewListLoadMoreCounts={previewListLoadMoreCounts}
                        onPreviewLoadMore={handlePreviewLoadMore}
                      />
                    ))
                  )}
                </div>
              </div>
              {/* Home indicator */}
              <div
                className="shrink-0 flex items-center justify-center bg-white"
                style={{ height: HOME_INDICATOR_H }}
              >
                <div className="w-32 h-1 rounded-full bg-gray-300" />
              </div>

              {/* Toast and bottom sheet: inside device frame only */}
              {toast && (
                <div
                  className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs shadow-lg z-10"
                  style={{ maxWidth: IPHONE_SCREEN_WIDTH - 32 }}
                >
                  Tapped: {toast}
                </div>
              )}
              {sheetNode && (
                <div
                  className="absolute inset-0 z-20 flex flex-col justify-end bg-black/40"
                  style={{ borderRadius: `0 0 ${IPHONE_RADIUS - 4}px ${IPHONE_RADIUS - 4}px` }}
                  onClick={() => setOpenSheetId(null)}
                  role="presentation"
                >
                  <div
                    className="bg-white rounded-t-2xl shadow-2xl overflow-hidden flex flex-col"
                    style={{ maxHeight: "80%", width: IPHONE_SCREEN_WIDTH }}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="Bottom sheet"
                  >
                    <div className="shrink-0 flex justify-center py-2 border-b border-gray-200">
                      <div className="w-10 h-1 rounded-full bg-gray-300" aria-hidden />
                    </div>
                    <div className="flex-1 min-h-0 overflow-auto p-4">
                      {(sheetNode.children || []).length === 0 ? (
                        <p className="text-sm text-gray-500">Empty sheet</p>
                      ) : (
                        (sheetNode.children || []).map((child) => (
                    <RenderNode
                      key={child.id}
                      node={child}
                      dataModel={dataModel}
                      isPreview
                      onUpdate={handlePreviewUpdate}
                      onPreviewAction={handlePreviewAction}
                      onPreviewOpenBottomSheet={handlePreviewOpenBottomSheet}
                      previewListLoadMoreCounts={previewListLoadMoreCounts}
                      onPreviewLoadMore={handlePreviewLoadMore}
                    />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
