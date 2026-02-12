import RenderNode from "../renderer/RenderNode";

/** Mobile (iPhone) frame dimensions */
const MOBILE_SCREEN_WIDTH = 390;
const MOBILE_SCREEN_HEIGHT = 844;
const MOBILE_BEZEL = 12;
const MOBILE_RADIUS = 44;
const MOBILE_STATUS_BAR_H = 48;
const MOBILE_HOME_INDICATOR_H = 32;
const MOBILE_CONTENT_WIDTH = MOBILE_SCREEN_WIDTH;
const MOBILE_CONTENT_HEIGHT = MOBILE_SCREEN_HEIGHT - MOBILE_STATUS_BAR_H - MOBILE_HOME_INDICATOR_H;

/** Web (browser) frame dimensions */
const WEB_CONTENT_WIDTH = 800;
const WEB_CONTENT_HEIGHT = 600;
const WEB_CHROME_H = 40;

export default function Canvas({ tree, dataModel, selectedNodeId, onSelect, onUpdate, onMove, isDragging = false, onOpenPreview, deviceType = "mobile", onDeviceTypeChange, highlightNodeId, onUndo, onRedo, canUndo = false, canRedo = false }) {
  const fitToScreen = tree && tree.fitToScreen === true;
  const contentWrapperStyle = deviceType === "web"
    ? { width: WEB_CONTENT_WIDTH, height: WEB_CONTENT_HEIGHT, minWidth: WEB_CONTENT_WIDTH, minHeight: WEB_CONTENT_HEIGHT }
    : { width: MOBILE_CONTENT_WIDTH, height: MOBILE_CONTENT_HEIGHT, minWidth: MOBILE_CONTENT_WIDTH, minHeight: MOBILE_CONTENT_HEIGHT };

  const drawableArea = deviceType === "web" ? (
    <div
      className="bg-white overflow-auto border-x border-b border-gray-300 relative"
      style={{ width: WEB_CONTENT_WIDTH, height: WEB_CONTENT_HEIGHT }}
    >
      <div className={`box-border ${fitToScreen ? "absolute inset-0" : ""}`} style={fitToScreen ? undefined : contentWrapperStyle}>
        <RenderNode
          node={tree}
          dataModel={dataModel}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          onUpdate={onUpdate}
          onMove={onMove}
          isDragging={isDragging}
          highlightNodeId={highlightNodeId}
        />
      </div>
    </div>
  ) : (
    <div
      className="bg-black overflow-hidden flex flex-col"
      style={{ width: MOBILE_SCREEN_WIDTH, height: MOBILE_SCREEN_HEIGHT, borderRadius: MOBILE_RADIUS - 4 }}
    >
      <div
        className="shrink-0 flex items-end justify-center pb-1 bg-white"
        style={{ height: MOBILE_STATUS_BAR_H }}
      >
        <div className="w-24 h-6 rounded-full bg-black" title="Dynamic Island" />
      </div>
      <div
        className="shrink-0 overflow-auto bg-white relative"
        style={{ width: MOBILE_CONTENT_WIDTH, height: MOBILE_CONTENT_HEIGHT }}
      >
        <div className={`box-border ${fitToScreen ? "absolute inset-0 w-full h-full" : ""}`} style={fitToScreen ? undefined : contentWrapperStyle}>
          <RenderNode
            node={tree}
            dataModel={dataModel}
            selectedNodeId={selectedNodeId}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onMove={onMove}
            isDragging={isDragging}
            highlightNodeId={highlightNodeId}
          />
        </div>
      </div>
      <div
        className="shrink-0 flex items-center justify-center bg-white"
        style={{ height: MOBILE_HOME_INDICATOR_H }}
      >
        <div className="w-32 h-1 rounded-full bg-gray-300" />
      </div>
    </div>
  );

  const deviceFrame = deviceType === "web" ? (
    <div className="bg-gray-200 rounded-t-lg overflow-hidden shadow-lg border border-gray-300" style={{ width: WEB_CONTENT_WIDTH + 2 }}>
      <div className="h-8 px-3 flex items-center gap-2 bg-gray-100 border-b border-gray-300">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 bg-white rounded text-xs text-gray-400 border border-gray-200 max-w-[280px] w-full truncate text-center">
            https://example.com
          </div>
        </div>
      </div>
      {drawableArea}
    </div>
  ) : (
    <div
      className="flex-shrink-0 bg-black rounded-[3rem] p-[10px] shadow-2xl"
      style={{ width: MOBILE_SCREEN_WIDTH + MOBILE_BEZEL * 2 }}
    >
      {drawableArea}
    </div>
  );

  return (
    <div className="flex-1 relative p-6 bg-gray-100 overflow-auto">
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-300 bg-white shadow-sm">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="px-3 py-2 text-sm font-medium border-r border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="px-3 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              Redo
            </button>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-gray-300 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => onDeviceTypeChange && onDeviceTypeChange("mobile")}
              className={`px-4 py-2 text-sm font-medium ${deviceType === "mobile" ? "bg-slate-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              title="Mobile device frame"
            >
              Mobile
            </button>
            <button
              type="button"
              onClick={() => onDeviceTypeChange && onDeviceTypeChange("web")}
              className={`px-4 py-2 text-sm font-medium ${deviceType === "web" ? "bg-slate-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
              title="Web / browser frame"
            >
              Web
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPreview}
          className="px-3 py-2 text-sm font-medium bg-slate-600 hover:bg-slate-700 text-white rounded shadow border border-slate-500"
          title="Open preview"
        >
          Preview
        </button>
      </div>
      <div className="pt-14 flex items-start justify-center min-h-full">
        {deviceFrame}
      </div>
    </div>
  );
}
