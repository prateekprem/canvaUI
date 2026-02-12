import { useRef, useCallback, useState, useEffect } from "react";
import { DRAG_TYPE } from "./DropZone";
import { getEnabledStyleKeysForControl } from "../schema/styles";

const MIN_WIDTH = 40;
const MIN_HEIGHT = 24;

function getEffectiveLayoutMode(node) {
  if (!node) return "autoLayout";
  if (node.layoutMode === "autoResize" || node.layoutMode === "autoLayout" || node.layoutMode === "freeForm") return node.layoutMode;
  return node.autoResize === true ? "autoResize" : "autoLayout";
}

export default function Resizable({ node, onUpdate, onSelect, children, parentLayout, isPreview = false, isSelected = false }) {
  const boxRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const layoutMode = getEffectiveLayoutMode(node);
  const autoResize = layoutMode === "autoResize";
  const freeForm = layoutMode === "freeForm";

  const width = autoResize
    ? "100%"
    : (node.width != null ? (typeof node.width === "number" ? `${node.width}px` : node.width) : freeForm ? "100%" : undefined);
  const height = autoResize
    ? "100%"
    : (node.height != null ? (typeof node.height === "number" ? `${node.height}px` : node.height) : freeForm ? "100%" : undefined);

  const handleResizeStart = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = boxRef.current != null ? boxRef.current.getBoundingClientRect() : null;
      if (!rect) return;
      const currentWidth = node.width ?? rect.width;
      const currentHeight = node.height ?? rect.height;
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: typeof currentWidth === "number" ? currentWidth : rect.width,
        height: typeof currentHeight === "number" ? currentHeight : rect.height,
      };
      setIsResizing(true);
    },
    [node.width, node.height]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isResizing) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      const newWidth = Math.max(MIN_WIDTH, Math.round(startRef.current.width + dx));
      const newHeight = Math.max(MIN_HEIGHT, Math.round(startRef.current.height + dy));
      onUpdate({ ...node, width: newWidth, height: newHeight, autoResize: false, layoutMode: "autoLayout" });
    },
    [isResizing, node, onUpdate]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isPreview || !autoResize || !onUpdate || !boxRef.current) return;
    const el = boxRef.current;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (w >= MIN_WIDTH && h >= MIN_HEIGHT && (node.width !== w || node.height !== h)) {
        onUpdate({ ...node, width: w, height: h });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [layoutMode, autoResize, isPreview, node, onUpdate]);

  const handleDragStart = useCallback((e) => {
    e.dataTransfer.setData(DRAG_TYPE, node.id);
    e.dataTransfer.effectAllowed = "move";
  }, [node.id]);

  const paddingH = node.paddingHorizontal ?? 0;
  const paddingV = node.paddingVertical ?? 0;
  const paddingTop = node.paddingTop ?? paddingV;
  const paddingBottom = node.paddingBottom ?? paddingV;
  const marginH = node.marginHorizontal ?? 0;
  const marginV = node.marginVertical ?? 0;
  const marginTop = node.marginTop ?? marginV;
  const marginBottom = node.marginBottom ?? marginV;
  const marginLeft = node.marginLeft ?? marginH;
  const marginRight = node.marginRight ?? marginH;
  const insetTop = node.insetFromParentTop ?? 0;
  const insetBottom = node.insetFromParentBottom ?? 0;
  const insetLeft = node.insetFromParentLeft ?? 0;
  const insetRight = node.insetFromParentRight ?? 0;
  const enabled = getEnabledStyleKeysForControl(node.type) ?? [];

  const bgRaw = node.backgroundColor;
  const hasBg = bgRaw != null && bgRaw !== "" && String(bgRaw).trim().toLowerCase() !== "transparent";
  const effectiveBg = hasBg ? String(bgRaw) : "transparent";
  const showBg = enabled.includes("backgroundColor") || hasBg;

  const cornerRadiusPx = enabled.includes("cornerRadius") ? (typeof node.cornerRadius === "number" ? node.cornerRadius : (node.cornerRadius != null ? Number(node.cornerRadius) : 0)) : null;
  const wrapperStyle = {
    ...(showBg && { backgroundColor: effectiveBg }),
    ...(cornerRadiusPx != null && { borderRadius: cornerRadiusPx }),
  };
  const contentStyle = {
    paddingLeft: paddingH,
    paddingRight: paddingH,
    paddingTop,
    paddingBottom,
    ...(showBg && { backgroundColor: effectiveBg }),
    ...(cornerRadiusPx != null && { borderRadius: cornerRadiusPx }),
    ...(enabled.includes("opacity") && { opacity: node.opacity ?? 1 }),
    ...(enabled.includes("blur") && node.blur > 0 && { filter: `blur(${node.blur}px)` }),
    ...(enabled.includes("borderColor") && node.borderColor && { border: `1px solid ${node.borderColor}` }),
  };

  const hasExplicitWidth = node.width != null && !autoResize && !freeForm;
  const hasExplicitHeight = node.height != null && !autoResize && !freeForm;
  const isSpacer = node.type === "Spacer";
  const layoutClass = isSpacer
    ? "flex-1 min-w-0 min-h-0 self-stretch"
    : freeForm
      ? "w-full h-full"
      : autoResize
        ? "flex-1 min-w-0 min-h-0 self-stretch w-full h-full"
        : parentLayout === "col"
          ? (hasExplicitHeight ? "flex-none w-full" : "flex-1 min-w-0 min-h-0 w-full")
          : parentLayout === "row"
            ? (hasExplicitWidth ? "flex-none" : "flex-none min-w-0")
            : "inline-block align-top";
  const handleSelect = !isPreview && onSelect ? (e) => { e.stopPropagation(); onSelect(node); } : undefined;

  const isFlexChild = !freeForm && (layoutClass.includes("flex-1") || layoutClass.includes("self-stretch"));
  const needsInnerFlex = isFlexChild || (hasExplicitHeight && !freeForm);

  return (
    <div
      ref={boxRef}
      data-node-id={node.id ?? undefined}
      className={`relative overflow-hidden ${layoutClass} ${(isFlexChild || (hasExplicitHeight && !freeForm)) ? "flex flex-col min-h-0" : ""}`}
      onClick={handleSelect}
      style={{
        ...(width != null && { width }),
        ...(height != null && { height }),
        minWidth: autoResize || freeForm || isSpacer ? 0 : MIN_WIDTH,
        minHeight: autoResize || freeForm || isSpacer ? 0 : MIN_HEIGHT,
        marginTop: freeForm ? 0 : marginTop + insetTop,
        marginBottom: freeForm ? 0 : marginBottom + insetBottom,
        marginLeft: freeForm ? 0 : marginLeft + insetLeft,
        marginRight: freeForm ? 0 : marginRight + insetRight,
        pointerEvents: "auto",
        ...wrapperStyle,
      }}
    >
      {!isPreview && !isResizing && (
        <div
          className={`absolute inset-0 pointer-events-none border-2 border-solid z-[2] ${isSelected ? "border-blue-500" : "border-slate-300"}`}
          style={cornerRadiusPx != null ? { borderRadius: cornerRadiusPx } : { borderRadius: 4 }}
          aria-hidden
        />
      )}
      <div
        className={`box-border relative z-[1] min-h-[24px] overflow-auto ${needsInnerFlex ? "flex-1 min-h-0 w-full" : "w-full h-full"} ${isPreview ? "" : "cursor-grab active:cursor-grabbing"}`}
        draggable={!isPreview}
        onDragStart={isPreview ? undefined : handleDragStart}
        style={contentStyle}
      >
        {children}
      </div>
      {!isPreview && !autoResize && !freeForm && !isSpacer && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Resize"
          onMouseDown={handleResizeStart}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize border-2 border-slate-400 hover:border-blue-500 bg-slate-200 hover:bg-blue-100 rounded-bl rounded-tr z-[100]"
          style={{ touchAction: "none" }}
        />
      )}
    </div>
  );
}
