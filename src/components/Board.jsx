import { useState } from "react";
import RenderNode from "../renderer/RenderNode";

const PREVIEW_WIDTH = 120;
const PREVIEW_HEIGHT = 180;
const DEVICE_W = 390;
const DEVICE_H = 600;
const PREVIEW_SCALE = Math.min(PREVIEW_WIDTH / DEVICE_W, PREVIEW_HEIGHT / DEVICE_H);

/** Small thumbnail that renders a screen's tree at scaled size */
function ScreenPreviewThumb({ tree, dataModel }) {
  const children = tree?.children ?? [];
  return (
    <div
      className="bg-white overflow-hidden relative"
      style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
    >
      <div
        className="absolute left-0 top-0 bg-white"
        style={{
          width: DEVICE_W,
          height: DEVICE_H,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: "top left",
        }}
      >
        {children.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs" style={{ width: DEVICE_W, height: DEVICE_H }}>Empty</div>
        ) : (
          <div className="bg-white" style={{ width: DEVICE_W, minHeight: DEVICE_H }}>
            {children.map((child) => (
              <RenderNode key={child.id} node={child} dataModel={dataModel || []} isPreview />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];
const DEFAULT_ZOOM_INDEX = 2; // 1

/** Storyboard-like view: list of all screens in the project. Click a screen to select it. */
export default function Board({ project, selectedScreenId, onSelectScreen, onClose, dataModel }) {
  const screens = project?.screens ?? [];
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const zoom = ZOOM_LEVELS[zoomIndex];
  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-gray-50 relative">
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-300 bg-white">
        <span className="font-semibold text-gray-800">Board</span>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-sm font-medium bg-slate-600 text-white rounded hover:bg-slate-500"
        >
          Close board
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 min-h-0">
        <div
          className="flex flex-wrap gap-4 transition-transform duration-150"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          {screens.length === 0 ? (
            <p className="text-gray-500 text-sm">No screens. Add a screen from the Project panel.</p>
          ) : (
            screens.map((screen) => {
              const isSelected = screen.id === selectedScreenId;
              const tree = screen.tree;
              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => onSelectScreen(screen.id)}
                  className={`shrink-0 rounded-xl border-2 overflow-hidden text-left transition-colors flex flex-col ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="shrink-0 overflow-hidden rounded-t-lg bg-gray-100" style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}>
                    <ScreenPreviewThumb tree={tree} dataModel={dataModel} />
                  </div>
                  <div className="shrink-0 px-3 py-2 border-t border-gray-100">
                    <div className="font-medium text-gray-900 truncate text-sm" title={screen.name}>
                      {screen.name || "Unnamed"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-0 rounded-full border border-gray-300 bg-white shadow-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          disabled={!canZoomOut}
          className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <span className="text-lg font-medium leading-none">−</span>
        </button>
        <div className="w-px bg-gray-200" />
        <button
          type="button"
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          disabled={!canZoomIn}
          className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <span className="text-lg font-medium leading-none">+</span>
        </button>
      </div>
    </div>
  );
}
