import { Fragment } from "react";
import Resizable from "../components/Resizable";
import DropZone from "../components/DropZone";
import { DRAG_TYPE } from "../components/DropZone";
import { getEnabledStyleKeysForControl } from "../schema/styles";
import { getListItemsFromDataModel, getListItemDisplayValue } from "../utils/dataModel";
import { BOTTOM_SHEET_TYPE, ACTION_OPEN_BOTTOM_SHEET, renderBottomSheetContent } from "../features/bottomSheet";

function isFreeForm(node) {
  if (!node) return false;
  if (node.layoutMode === "freeForm") return true;
  return false;
}

/** Containers that render free-form children in an absolute overlay (no placeholder in flow). */
function containerHasFreeFormOverlay(node) {
  if (!node) return false;
  if (node.type === "View" && node.id !== "root") return true;
  if (node.type === "VStack" || node.type === "HStack" || node.type === "ZStack") return true;
  return false;
}

/** In preview only: when localization is on and default value is set, use it; otherwise use fallback. */
function displayTextInPreview(isPreview, node, fallback) {
  if (!isPreview) return fallback != null ? fallback : "";
  if (node.localizationEnabled && node.localizationDefaultValue != null && String(node.localizationDefaultValue).trim() !== "")
    return node.localizationDefaultValue;
  return fallback != null ? fallback : "";
}

/** View, VStack, HStack, ZStack (and List for row template, BottomSheet) can accept a dropped node as child. */
function isContainerType(type) {
  return type === "View" || type === "VStack" || type === "HStack" || type === "ZStack" || type === "List" || type === "ListItemContent" || type === BOTTOM_SHEET_TYPE;
}

export default function RenderNode({ node, onSelect, onUpdate, onMove, parentLayout, isDragging = false, isPreview = false, listItemContext, highlightNodeId, selectedNodeId, dataModel, onPreviewAction, onPreviewOpenBottomSheet, previewListLoadMoreCounts, onPreviewLoadMore }) {
  if (!node) return null;

  const select = (e) => {
    if (isPreview) return;
    e.stopPropagation();
    onSelect(node);
  };

  const isOpenSheetAction = node.actionEvent === ACTION_OPEN_BOTTOM_SHEET && node.actionId;
  const handlePreviewClick = (e) => {
    if (!isPreview) return;
    e.stopPropagation();
    if (isOpenSheetAction && onPreviewOpenBottomSheet) {
      onPreviewOpenBottomSheet(node.actionId);
    } else if (onPreviewAction) {
      onPreviewAction(node);
    }
  };

  const children = node.children || [];
  const layout = node.type === "HStack" ? "row" : "col";
  const styleKeys = getEnabledStyleKeysForControl(node.type) != null ? getEnabledStyleKeysForControl(node.type) : [];

  const fontStyle = {};
  if (styleKeys.includes("fontFamily")) fontStyle.fontFamily = node.fontFamily != null ? node.fontFamily : "system-ui";
  if (styleKeys.includes("fontSize")) fontStyle.fontSize = node.fontSize != null ? node.fontSize : 16;
  if (styleKeys.includes("fontWeight")) fontStyle.fontWeight = node.fontWeight != null ? node.fontWeight : "normal";
  if (styleKeys.includes("textColor")) fontStyle.color = node.textColor != null ? node.textColor : (node.color != null ? node.color : "#000000");

  const isStack = node.type === "VStack" || node.type === "HStack";
  const isZStack = node.type === "ZStack";
  const dropSpacing = isStack ? node.spacing : undefined;

  const padV = node.paddingVertical != null ? node.paddingVertical : 0;
  const padH = node.paddingHorizontal != null ? node.paddingHorizontal : 0;
  const containerPadding = {
    paddingTop: node.paddingTop != null ? node.paddingTop : padV,
    paddingBottom: node.paddingBottom != null ? node.paddingBottom : padV,
    paddingLeft: padH,
    paddingRight: padH,
  };

  const freeFormChildren = children.filter(isFreeForm);

  const renderFreeFormOverlay = () => {
    if (freeFormChildren.length === 0) return null;
    return (
      <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 100, paddingTop: containerPadding.paddingTop, paddingBottom: containerPadding.paddingBottom, paddingLeft: containerPadding.paddingLeft, paddingRight: containerPadding.paddingRight }}>
        {freeFormChildren.map((child) => (
          <div
            key={child.id}
            className="pointer-events-auto"
            style={{
              position: "absolute",
              left: child.x != null ? child.x : 0,
              top: child.y != null ? child.y : 0,
              width: typeof child.width === "number" ? child.width : (child.width != null ? child.width : 100),
              height: typeof child.height === "number" ? child.height : (child.height != null ? child.height : 100),
              minWidth: 40,
              minHeight: 24,
            }}
          >
            <RenderNode
              node={child}
              dataModel={dataModel}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onMove={onMove}
              parentLayout={layout}
              isDragging={isDragging}
              isPreview={isPreview}
              listItemContext={listItemContext}
              highlightNodeId={highlightNodeId}
              selectedNodeId={selectedNodeId}
              onPreviewAction={onPreviewAction}
              onPreviewOpenBottomSheet={onPreviewOpenBottomSheet}
              previewListLoadMoreCounts={previewListLoadMoreCounts}
              onPreviewLoadMore={onPreviewLoadMore}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderDropZonesAndChildren = () => (
    <>
      {children.map((child, i) => (
        <Fragment key={child.id}>
          {!isPreview && (
            <DropZone
              key={`drop-${node.id}-${i}`}
              parentId={node.id}
              index={i}
              onMove={onMove}
              layout={layout}
              spacing={dropSpacing}
              siblingCount={children.length}
            />
          )}
          {isFreeForm(child) ? (
            containerHasFreeFormOverlay(node) ? null : (
              <div key={child.id} style={{ width: 0, minWidth: 0, height: 0, minHeight: 0, overflow: "visible" }} aria-hidden />
            )
          ) : (node.type === "HStack" && child.fillRemainingWidth) ? (
            <div style={{ flex: 1, minWidth: 0 }} className="min-h-0 flex items-stretch">
              <RenderNode
                node={child}
                dataModel={dataModel}
                onSelect={onSelect}
                onUpdate={onUpdate}
                onMove={onMove}
                parentLayout={layout}
                isDragging={isDragging}
                isPreview={isPreview}
                listItemContext={listItemContext}
                highlightNodeId={highlightNodeId}
                selectedNodeId={selectedNodeId}
                onPreviewAction={onPreviewAction}
                onPreviewOpenBottomSheet={onPreviewOpenBottomSheet}
              previewListLoadMoreCounts={previewListLoadMoreCounts}
              onPreviewLoadMore={onPreviewLoadMore}
              />
            </div>
          ) : (
            <RenderNode
              node={child}
              dataModel={dataModel}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onMove={onMove}
              parentLayout={layout}
              isDragging={isDragging}
              isPreview={isPreview}
              listItemContext={listItemContext}
              highlightNodeId={highlightNodeId}
              selectedNodeId={selectedNodeId}
              onPreviewAction={onPreviewAction}
              onPreviewOpenBottomSheet={onPreviewOpenBottomSheet}
              previewListLoadMoreCounts={previewListLoadMoreCounts}
              onPreviewLoadMore={onPreviewLoadMore}
            />
          )}
        </Fragment>
      ))}
      {!isPreview && (
        <DropZone
          key={`drop-${node.id}-${children.length}`}
          parentId={node.id}
          index={children.length}
          onMove={onMove}
          layout={layout}
          spacing={dropSpacing}
          siblingCount={children.length}
        />
      )}
    </>
  );

  const handleContainerDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nodeId = e.dataTransfer.getData(DRAG_TYPE);
    if (!nodeId || nodeId === node.id) return;
    onMove(nodeId, node.id, children.length);
  };

  const containerDropOverlay =
    !isPreview &&
    isDragging &&
    isContainerType(node.type) &&
    node.id !== "root" &&
    onMove ? (
      <div
        className="absolute inset-0 z-[50] flex items-center justify-center bg-blue-50/70 rounded border-2 border-dashed border-blue-400 pointer-events-auto"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={handleContainerDrop}
        title="Drop to add as child"
      >
        <span className="text-blue-600 text-sm font-medium">Drop to add as child</span>
      </div>
    ) : null;

  const renderViewWithFreeForm = () => (
    <div className="h-full min-h-[2rem] flex flex-col items-stretch relative" style={containerPadding} onClick={select}>
      {containerDropOverlay}
      <div className="h-full min-h-0 flex flex-col items-stretch flex-1">
        {renderDropZonesAndChildren()}
      </div>
      {renderFreeFormOverlay()}
    </div>
  );

  let content;
  switch (node.type) {
    case "Text": {
      const textAlign = node.alignment === "end" ? "right" : node.alignment === "center" ? "center" : "left";
      const lines = typeof node.numberOfLines === "number" && node.numberOfLines > 0 ? node.numberOfLines : undefined;
      const lineClampStyle = lines != null
        ? { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }
        : {};
      const verticalCenterStyle =
        lines == null
          ? { display: "flex", alignItems: "center", justifyContent: textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start" }
          : {};
      content = (
        <p
          onClick={select}
          style={{ ...fontStyle, textAlign, ...lineClampStyle, ...verticalCenterStyle }}
          className="h-full min-h-[1.5rem]"
        >
          {listItemContext != null && node.boundListItemProperty
            ? getListItemDisplayValue(listItemContext.listItem, node.boundListItemProperty)
            : displayTextInPreview(isPreview, node, node.text)}
        </p>
      );
      break;
    }

    case "Button": {
      const btnBgRaw = node.backgroundColor;
      const btnBg = (styleKeys.includes("backgroundColor") && btnBgRaw != null && btnBgRaw !== "" && String(btnBgRaw).trim().toLowerCase() !== "transparent")
        ? btnBgRaw
        : "#3b82f6";
      content = (
        <button
          type="button"
          onClick={(e) => {
            if (isPreview) handlePreviewClick(e);
            else select(e);
          }}
          style={{
            ...fontStyle,
            backgroundColor: btnBg,
            color: (node.textColor != null ? node.textColor : node.color) || "#ffffff",
            borderColor: styleKeys.includes("borderColor") ? (node.borderColor || "transparent") : "transparent",
            borderRadius: styleKeys.includes("cornerRadius") ? (node.cornerRadius != null ? node.cornerRadius : 0) : undefined,
          }}
          className="w-full h-full min-h-[2.5rem] rounded border"
        >
          {listItemContext != null && node.boundListItemProperty
            ? getListItemDisplayValue(listItemContext.listItem, node.boundListItemProperty)
            : displayTextInPreview(isPreview, node, node.title)}
        </button>
      );
      break;
    }

    case "Image": {
      const useAsset = node.useAsset === true;
      const assetLabel = useAsset && (node.assetImageName || node.assetBundleName)
        ? [node.assetBundleName || "Main", node.assetImageName].filter(Boolean).join(" / ")
        : null;
      const imgSrc = listItemContext != null && node.boundListItemProperty
        ? getListItemDisplayValue(listItemContext.listItem, node.boundListItemProperty)
        : (node.src != null ? node.src : "");
      content = (
        <div
          onClick={select}
          className="h-full min-h-[2rem] w-full flex items-center justify-center overflow-hidden"
          style={styleKeys.includes("cornerRadius") ? { borderRadius: node.cornerRadius != null ? node.cornerRadius : 0 } : undefined}
        >
          {useAsset ? (
            <span style={fontStyle} className="text-slate-500 text-center text-xs">
              {assetLabel ? `Asset: ${assetLabel}` : "Asset (set name)"}
            </span>
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={node.alt != null ? node.alt : "Image"}
              draggable={false}
              className="max-w-full max-h-full w-full h-full"
              style={{ objectFit: node.contentMode != null ? node.contentMode : "contain" }}
            />
          ) : (
            <span style={fontStyle} className="text-slate-400">No image URL</span>
          )}
        </div>
      );
      break;
    }

    case "View":
      content = renderViewWithFreeForm();
      break;

    case "BottomSheet":
      content = renderBottomSheetContent(node, {
        dataModel,
        onSelect,
        onUpdate,
        onMove,
        isDragging,
        isPreview,
        listItemContext,
        highlightNodeId,
        selectedNodeId,
        containerDropOverlay,
        renderChildrenWithDropZones: renderDropZonesAndChildren,
      });
      break;

    case "VStack":
    case "HStack": {
      const align = node.alignment != null && node.alignment !== "" ? node.alignment : "center";
      const alignItems = align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center";
      const stackSpacing = node.spacing != null ? node.spacing : 12;
      content = (
        <div
          key={!isPreview ? `stack-${node.id}-${align}-${stackSpacing}` : undefined}
          onClick={select}
          className={`h-full flex relative flex-nowrap ${node.type === "HStack" ? "flex-row" : "flex-col"}`}
          style={{ gap: stackSpacing, alignItems, ...containerPadding }}
        >
          {containerDropOverlay}
          {renderDropZonesAndChildren()}
          {renderFreeFormOverlay()}
        </div>
      );
      break;
    }

    case "ZStack": {
      const zAlign = node.alignment != null ? node.alignment : "center";
      const justifyContent =
        zAlign === "start" || zAlign === "leading" ? "flex-start" : zAlign === "end" || zAlign === "trailing" ? "flex-end" : "center";
      const alignItems =
        zAlign === "start" ? "flex-start" : zAlign === "end" ? "flex-end" : "center";
      const alignStyle = { display: "flex", justifyContent, alignItems };
      content = (
        <div
          onClick={select}
          className="absolute inset-0 min-h-[4rem]"
          style={containerPadding}
        >
          {!isPreview && (
            <div
              className="absolute inset-0"
              style={{ zIndex: isDragging ? 9999 : 0, ...containerPadding }}
            >
              <div className="w-full h-full relative">
                <DropZone
                  parentId={node.id}
                  index={children.length}
                  onMove={onMove}
                  layout="col"
                  fill
                />
              </div>
            </div>
          )}
          {children.map((child, i) =>
            isFreeForm(child) ? (
              <Fragment key={child.id} />
            ) : (
              <div
                key={child.id}
                className="absolute inset-0 flex pointer-events-none"
                style={{ zIndex: isPreview ? i : 10 + i, ...alignStyle, ...containerPadding }}
              >
                <div className="pointer-events-auto flex min-w-[2rem] min-h-[2rem]" style={alignStyle}>
            <RenderNode
              node={child}
              dataModel={dataModel}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onMove={onMove}
              parentLayout="col"
              isDragging={isDragging}
              isPreview={isPreview}
              listItemContext={listItemContext}
              highlightNodeId={highlightNodeId}
              selectedNodeId={selectedNodeId}
              onPreviewAction={onPreviewAction}
              onPreviewOpenBottomSheet={onPreviewOpenBottomSheet}
              previewListLoadMoreCounts={previewListLoadMoreCounts}
              onPreviewLoadMore={onPreviewLoadMore}
                  />
                </div>
              </div>
            )
          )}
          {renderFreeFormOverlay()}
        </div>
      );
      break;
    }

    case "List": {
      const template = node.children && node.children[0];
      const baseItems = getListItemsFromDataModel(dataModel, node);
      const loadMoreCount = isPreview && node.loadMoreEnabled && previewListLoadMoreCounts && typeof previewListLoadMoreCounts[node.id] === "number" ? previewListLoadMoreCounts[node.id] : 0;
      const items = loadMoreCount > 0 && Array.isArray(baseItems) && baseItems.length > 0
        ? baseItems.concat(Array(loadMoreCount).fill(null).flatMap(() => baseItems))
        : baseItems;
      const rowSpacing = typeof node.listRowSpacing === "number" ? Math.max(0, node.listRowSpacing) : 0;
      const spacingAboveFirst = typeof node.listSpacingAboveFirst === "number" ? Math.max(0, node.listSpacingAboveFirst) : 0;
      const spacingBelowLast = typeof node.listSpacingBelowLast === "number" ? Math.max(0, node.listSpacingBelowLast) : 0;
      const showLoadMoreFooter = isPreview && node.loadMoreEnabled === true && onPreviewLoadMore;
      content = (
        <>
          <ul
            onClick={select}
            className="h-full border overflow-auto list-none pl-0 ml-0"
            style={{
              ...containerPadding,
              ...(styleKeys.includes("borderColor") && node.borderColor ? { borderColor: node.borderColor } : {}),
            }}
          >
            {template
              ? items.map((item, i) => {
                  const isFirst = i === 0;
                  const isLast = i === items.length - 1 && !showLoadMoreFooter;
                  const liStyle = {
                    ...(isFirst ? { marginTop: spacingAboveFirst } : {}),
                    ...(i < items.length - 1 ? { marginBottom: rowSpacing } : {}),
                    ...(isLast ? { marginBottom: spacingBelowLast } : {}),
                  };
                  return (
                    <li key={i} className="border-b border-gray-200 last:border-b-0" style={liStyle}>
                      <RenderNode
                        node={template}
                        dataModel={dataModel}
                        onSelect={onSelect}
                        onUpdate={onUpdate}
                        onMove={onMove}
                        parentLayout="col"
                        isDragging={isDragging}
                        isPreview={isPreview}
                        listItemContext={{ listItem: item, listIndex: i }}
                        highlightNodeId={highlightNodeId}
                        selectedNodeId={selectedNodeId}
                        onPreviewAction={onPreviewAction}
                        onPreviewOpenBottomSheet={onPreviewOpenBottomSheet}
                        previewListLoadMoreCounts={previewListLoadMoreCounts}
                        onPreviewLoadMore={onPreviewLoadMore}
                      />
                    </li>
                  );
                })
              : items.map((item, i) => {
                  const isFirst = i === 0;
                  const isLast = i === items.length - 1 && !showLoadMoreFooter;
                  const liStyle = {
                    ...fontStyle,
                    ...(isFirst ? { marginTop: spacingAboveFirst } : {}),
                    ...(i < items.length - 1 ? { marginBottom: rowSpacing } : {}),
                    ...(isLast ? { marginBottom: spacingBelowLast } : {}),
                  };
                  return (
                    <li key={i} className="border-b" style={liStyle}>
                      {getListItemDisplayValue(item, null)}
                    </li>
                  );
                })}
            {showLoadMoreFooter && (
              <li className="border-t border-gray-200 shrink-0">
                <button
                  type="button"
                  className="w-full py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreviewLoadMore(node.id);
                  }}
                >
                  {node.loadMoreFooterLabel ?? "Load more"}
                </button>
              </li>
            )}
          </ul>
        </>
      );
      break;
    }

    case "ListItemContent": {
      const itemChildren = node.children || [];
      if (itemChildren.length > 0) {
        content = (
          <div onClick={isPreview ? handlePreviewClick : select} className="relative flex flex-row flex-wrap items-center gap-2 min-h-[2rem] w-full cursor-pointer" style={containerPadding}>
            {containerDropOverlay}
            {itemChildren.map((child, i) => (
              <Fragment key={child.id}>
                {!isPreview && (
                  <DropZone parentId={node.id} index={i} onMove={onMove} layout="row" spacing={8} siblingCount={itemChildren.length} />
                )}
                <RenderNode
                  node={child}
                  dataModel={dataModel}
                  onSelect={onSelect}
                  onUpdate={onUpdate}
                  onMove={onMove}
                  parentLayout="row"
                  isDragging={isDragging}
                  isPreview={isPreview}
                  listItemContext={listItemContext}
                  highlightNodeId={highlightNodeId}
                  selectedNodeId={selectedNodeId}
                  onPreviewAction={onPreviewAction}
                  onPreviewOpenBottomSheet={onPreviewOpenBottomSheet}
              previewListLoadMoreCounts={previewListLoadMoreCounts}
              onPreviewLoadMore={onPreviewLoadMore}
                />
              </Fragment>
            ))}
            {!isPreview && (
              <DropZone parentId={node.id} index={itemChildren.length} onMove={onMove} layout="row" spacing={8} siblingCount={itemChildren.length} />
            )}
          </div>
        );
      } else {
        const display =
          listItemContext != null && listItemContext.listItem !== undefined && listItemContext.listItem !== null
            ? (typeof listItemContext.listItem === "object"
              ? (listItemContext.listItem.text != null ? listItemContext.listItem.text : listItemContext.listItem.title != null ? listItemContext.listItem.title : listItemContext.listItem.label != null ? listItemContext.listItem.label : JSON.stringify(listItemContext.listItem))
              : String(listItemContext.listItem))
            : "(no list context)";
        content = (
          <p onClick={isPreview ? handlePreviewClick : select} style={fontStyle} className="h-full min-h-[1.5rem] cursor-pointer">
            {display}
          </p>
        );
      }
      break;
    }

    case "ListItemText": {
      const listItem = listItemContext != null ? listItemContext.listItem : undefined;
      const display = listItem != null
        ? getListItemDisplayValue(listItem, node.itemProperty || null)
        : "(list item)";
      content = (
        <span onClick={select} style={fontStyle} className="min-h-[1.5rem] inline-block">
          {display}
        </span>
      );
      break;
    }

    case "TextField":
      content = (
        <input
          type="text"
          onClick={select}
          value={node.text != null ? node.text : ""}
          readOnly={isPreview && !onUpdate}
          onChange={onUpdate ? (e) => onUpdate({ ...node, text: e.target.value }) : undefined}
          placeholder={displayTextInPreview(isPreview, node, node.placeholder != null ? node.placeholder : "Enter text")}
          className="w-full min-h-[2rem] border border-gray-300 rounded bg-white"
          style={fontStyle}
        />
      );
      break;

    case "Toggle":
      content = (
        <label onClick={select} className="flex items-center gap-2 cursor-pointer min-h-[2rem] w-full">
          <input
            type="checkbox"
            checked={node.isOn === true}
            readOnly={isPreview && !onUpdate}
            onChange={onUpdate ? (e) => onUpdate({ ...node, isOn: e.target.checked }) : undefined}
            className="w-10 h-6 rounded-full border-2 border-gray-300 appearance-none bg-gray-200 checked:bg-blue-500 checked:border-blue-500 transition-colors"
            style={{ boxSizing: "border-box" }}
          />
          <span style={fontStyle} className="text-sm">{displayTextInPreview(isPreview, node, node.label != null ? node.label : "Toggle") || " "}</span>
        </label>
      );
      break;

    case "Slider":
      content = (
        <div onClick={select} className="flex items-center gap-2 w-full min-h-[2rem]">
          <input
            type="range"
            min={node.min != null ? node.min : 0}
            max={node.max != null ? node.max : 100}
            value={node.value != null ? node.value : 50}
            readOnly={isPreview && !onUpdate}
            onChange={onUpdate ? (e) => onUpdate({ ...node, value: Number(e.target.value) }) : undefined}
            className="flex-1 h-2 rounded-full appearance-none bg-gray-200 accent-blue-500"
          />
          <span style={fontStyle} className="text-sm w-10 shrink-0">{node.value != null ? node.value : 50}</span>
        </div>
      );
      break;

    case "Picker":
      content = (
        <select
          onClick={select}
          value={node.selection != null ? node.selection : ""}
          readOnly={isPreview && !onUpdate}
          disabled={isPreview && !onUpdate}
          onChange={onUpdate ? (e) => onUpdate({ ...node, selection: e.target.value }) : undefined}
          className="w-full min-h-[2.5rem] border border-gray-300 rounded bg-white"
          style={fontStyle}
        >
          {(Array.isArray(node.options) ? node.options : ["Option 1", "Option 2", "Option 3"]).map((opt, i) => (
            <option key={i} value={opt}>{opt}</option>
          ))}
        </select>
      );
      break;

    case "ProgressView":
      content = (
        <div onClick={select} className="w-full min-h-[2rem] flex items-center">
          {node.indeterminate === true ? (
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-blue-500" title="Indeterminate progress" />
            </div>
          ) : (
            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, (node.progress != null ? node.progress : 0.5) * 100))}%` }}
              />
            </div>
          )}
        </div>
      );
      break;

    case "Divider":
      content = (
        <div
          onClick={select}
          className={`flex-shrink-0 ${(node.axis != null ? node.axis : "horizontal") === "vertical" ? "w-px self-stretch min-h-[24px]" : "h-px w-full min-w-[24px]"}`}
          style={{
            backgroundColor: styleKeys.includes("backgroundColor") && node.backgroundColor ? node.backgroundColor : "#d1d5db",
            opacity: styleKeys.includes("opacity") ? (node.opacity != null ? node.opacity : 1) : 1,
          }}
        />
      );
      break;

    case "Spacer":
      content = (
        <div
          onClick={select}
          className="flex-1 min-w-0 min-h-0 self-stretch"
          title="Spacer"
          style={!isPreview ? { minHeight: 24, background: "repeating-linear-gradient(-45deg, transparent, transparent 6px, rgba(148,163,184,0.15) 6px, rgba(148,163,184,0.15) 8px)" } : {}}
        />
      );
      break;

    case "Link":
      content = (
        <a
          href={node.url != null ? node.url : "#"}
          onClick={(e) => { if (!isPreview) { e.preventDefault(); onSelect && onSelect(node); } }}
          target={isPreview ? "_blank" : undefined}
          rel={isPreview ? "noopener noreferrer" : undefined}
          className="min-h-[1.5rem] inline-flex items-center text-blue-600 underline hover:text-blue-800 cursor-pointer"
          style={fontStyle}
        >
          {displayTextInPreview(isPreview, node, node.label != null ? node.label : "Link") || " "}
        </a>
      );
      break;

    case "SecureField":
      content = (
        <input
          type="password"
          onClick={select}
          value={node.text != null ? node.text : ""}
          readOnly={isPreview && !onUpdate}
          onChange={onUpdate ? (e) => onUpdate({ ...node, text: e.target.value }) : undefined}
          placeholder={displayTextInPreview(isPreview, node, node.placeholder != null ? node.placeholder : "Password")}
          className="w-full min-h-[2rem] border border-gray-300 rounded bg-white"
          style={fontStyle}
        />
      );
      break;

    default:
      return null;
  }

  /* Canvas view (root): not part of the screen — no styled View, only drop zones + children. */
  if (node.id === "root") {
    return (
      <div className="h-full w-full flex flex-col min-h-0">
        {renderDropZonesAndChildren()}
      </div>
    );
  }

  const isSelected = !isPreview && selectedNodeId != null && String(node.id) === String(selectedNodeId);
  const wrapped = (
    <Resizable node={node} onUpdate={onUpdate} onSelect={onSelect} parentLayout={parentLayout} isPreview={isPreview} isSelected={isSelected}>
      {content}
    </Resizable>
  );

  /* Apply hidden, user interaction, accessibility, tag only in preview (not on canvas). */
  const behaviorWrapped =
    isPreview &&
    (node.isHidden === true ||
      node.isUserInteractionEnabled === false ||
      (node.accessibilityEnabled && (node.accessibilityLabel || node.accessibilityIdentifier)) ||
      node.automationIdentifier ||
      node.tag != null)
      ? (() => {
          const isHidden = node.isHidden === true;
          const noInteraction = node.isUserInteractionEnabled === false;
          const a11yLabel = node.accessibilityEnabled && node.accessibilityLabel ? node.accessibilityLabel : undefined;
          const a11yId = node.accessibilityEnabled && node.accessibilityIdentifier ? node.accessibilityIdentifier : (node.automationIdentifier || undefined);
          return (
            <div
              style={{
                display: isHidden ? "none" : undefined,
                pointerEvents: noInteraction ? "none" : undefined,
              }}
              aria-label={a11yLabel || undefined}
              data-accessibility-identifier={a11yId || undefined}
              data-tag={node.tag != null ? node.tag : undefined}
            >
              {wrapped}
            </div>
          );
        })()
      : wrapped;

  const isHighlighted = !isPreview && highlightNodeId != null && String(node.id) === String(highlightNodeId);
  if (isHighlighted) {
    return (
      <div className="ring-2 ring-amber-400 ring-offset-1 rounded z-[5]" style={{ boxSizing: "border-box" }} title="Data mapping highlight">
        {behaviorWrapped}
      </div>
    );
  }
  return behaviorWrapped;
}
