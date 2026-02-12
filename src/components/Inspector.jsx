import { getEnabledStylesForControl, getEffectiveDisplayValue } from "../schema/styles";
import { getDisplayName, getNodeDisplayName, getDescription } from "../schema/defaultNode";
import { getPathToNode } from "../utils/tree";
import { BOTTOM_SHEET_TYPE, BottomSheetInspectorSection, OpenBottomSheetActionBlock } from "../features/bottomSheet";

/** Horizontal separator between property groups (XIB-style) */
function InspectorSeparator() {
  return <hr className="my-3 border-gray-300" />;
}

/** Section heading for grouped properties */
function InspectorSection({ title, children }) {
  return (
    <div className="mb-3">
      {title && <h4 className="font-semibold text-sm text-gray-700 mb-2">{title}</h4>}
      {children}
    </div>
  );
}

/** Parse #RRGGBB or #RRGGBBAA or rgba(r,g,b,a) to { hex6, alpha 0-1 } */
function parseColorWithAlpha(value) {
  if (!value || value === "transparent") return { hex6: "#000000", alpha: 0 };
  const v = String(value).trim();
  if (v.startsWith("#")) {
    if (v.length === 9) {
      const alphaHex = v.slice(7, 9);
      return { hex6: v.slice(0, 7), alpha: parseInt(alphaHex, 16) / 255 };
    }
    return { hex6: v.length >= 7 ? v.slice(0, 7) : "#000000", alpha: 1 };
  }
  const rgba = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
  if (rgba) {
    const r = parseInt(rgba[1], 10);
    const g = parseInt(rgba[2], 10);
    const b = parseInt(rgba[3], 10);
    const a = rgba[4] != null ? parseFloat(rgba[4]) : 1;
    const hex6 = "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
    return { hex6, alpha: a };
  }
  return { hex6: "#000000", alpha: 1 };
}

/** Format hex6 + alpha to stored value (#RRGGBB or #RRGGBBAA). Use allowTransparent to output "transparent" when alpha is 0. */
function formatColorWithAlpha(hex6, alpha, allowTransparent = false) {
  const hex = hex6.startsWith("#") ? hex6 : "#" + hex6;
  const six = hex.length >= 7 ? hex.slice(0, 7) : "#000000";
  if (alpha >= 1) return six;
  if (alpha <= 0) return allowTransparent ? "transparent" : six + "00";
  const aHex = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return six + aHex;
}

/** Renders one style field from the style list (type: select, number, color, colorTransparent, range) */
function StyleField({ def, value, onChange, storedValue }) {
  const raw = value ?? def.default;
  const stored = storedValue !== undefined ? storedValue : value;
  const inputClass = "w-full p-2 border rounded";
  const labelClass = "block text-sm mb-1";

  if (def.type === "select") {
    return (
      <>
        <label className={labelClass}>{def.label}</label>
        <select value={raw} onChange={(e) => onChange(e.target.value)} className={inputClass + " mb-2"}>
          {def.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </>
    );
  }

  if (def.type === "number") {
    return (
      <>
        <label className={labelClass}>{def.label}</label>
        <input
          type="number"
          min={def.min}
          max={def.max}
          value={raw}
          onChange={(e) => onChange(Number(e.target.value))}
          className={inputClass + " mb-2"}
        />
      </>
    );
  }

  if (def.type === "color") {
    const { hex6, alpha } = parseColorWithAlpha(raw);
    const parsedStored = parseColorWithAlpha(stored);
    const alphaPct = Math.round(alpha * 100);
    const alphaForNewPick = alpha <= 0 ? 1 : alpha;
    const isClear = (stored == null || stored === "") || parsedStored.alpha === 0;
    return (
      <>
        <label className={labelClass}>{def.label}</label>
        <div className="border border-slate-300 rounded p-2 mb-2 bg-white">
          <div className="flex gap-2 items-center">
            {isClear ? (
              <div className="relative w-10 h-8 flex-shrink-0 rounded border border-slate-300 overflow-hidden">
                <div className="absolute inset-0 color-swatch-transparent" title="No color" />
                <input
                  type="color"
                  value="#000000"
                  onChange={(e) => onChange(formatColorWithAlpha(e.target.value, alphaForNewPick))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick color"
                />
              </div>
            ) : (
              <input
                type="color"
                value={hex6}
                onChange={(e) => onChange(formatColorWithAlpha(e.target.value, alphaForNewPick))}
                className="w-10 h-8 p-0 border border-slate-300 rounded cursor-pointer flex-shrink-0"
                title="Pick color"
              />
            )}
            <input
              type="text"
              value={raw ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder={["foregroundColor", "borderColor"].includes(def.key) ? "none" : "#hex or #hexAA"}
              className={"flex-1 min-w-0 p-2 border border-slate-300 rounded font-mono text-sm " + inputClass}
            />
          </div>
          <div className="mt-2">
            <label className="text-xs text-gray-600">Alpha</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={alphaPct}
                onChange={(e) => onChange(formatColorWithAlpha(hex6, Number(e.target.value) / 100))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">{alphaPct}%</span>
            </div>
          </div>
          {!raw ? (
            <span className="mt-1.5 text-xs text-slate-500">Clear color (default)</span>
          ) : (
            <button type="button" onClick={() => onChange("")} className="mt-1.5 text-xs text-slate-500 hover:underline">
              Clear color
            </button>
          )}
        </div>
      </>
    );
  }

  if (def.type === "colorTransparent") {
    const { hex6, alpha } = parseColorWithAlpha(raw);
    const parsedStored = parseColorWithAlpha(stored ?? def.default);
    const alphaPct = Math.round(alpha * 100);
    const alphaForNewPick = alpha <= 0 ? 1 : alpha;
    const isTransparent =
      (stored === "transparent" || stored === "" || stored == null) ||
      (String(stored || "").trim().toLowerCase() === "transparent") ||
      parsedStored.alpha === 0;
    return (
      <>
        <label className={labelClass}>{def.label}</label>
        <div className="border border-slate-300 rounded p-2 mb-2 bg-white">
          <div className="flex gap-2 items-center">
            {isTransparent ? (
              <div className="relative w-10 h-8 flex-shrink-0 rounded border border-slate-300 overflow-hidden">
                <div className="absolute inset-0 color-swatch-transparent" title="Transparent" />
                <input
                  type="color"
                  value="#ffffff"
                  onChange={(e) => onChange(formatColorWithAlpha(e.target.value, alphaForNewPick))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="Pick color"
                />
              </div>
            ) : (
              <input
                type="color"
                value={hex6}
                onChange={(e) => onChange(formatColorWithAlpha(e.target.value, alphaForNewPick))}
                className="w-10 h-8 p-0 border border-slate-300 rounded cursor-pointer flex-shrink-0"
                title="Pick color"
              />
            )}
            <input
              type="text"
              value={raw ?? "transparent"}
              onChange={(e) => onChange(e.target.value)}
              placeholder="transparent or #hex or #hexAA"
              className={"flex-1 min-w-0 p-2 border border-slate-300 rounded font-mono text-sm " + inputClass}
            />
          </div>
          <div className="mt-2">
            <label className="text-xs text-gray-600">Alpha</label>
            <div className="flex gap-2 items-center">
              <input
                type="range"
                min={0}
                max={100}
                value={alphaPct}
                onChange={(e) => onChange(formatColorWithAlpha(isTransparent ? "#ffffff" : hex6, Number(e.target.value) / 100, true))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">{alphaPct}%</span>
            </div>
          </div>
          {isTransparent ? (
            <span className="mt-1.5 text-xs text-slate-500">Clear color (default)</span>
          ) : (
            <button type="button" onClick={() => onChange("transparent")} className="mt-1.5 text-xs text-slate-500 hover:underline">
              Clear color
            </button>
          )}
        </div>
      </>
    );
  }

  if (def.type === "range") {
    const displayValue = def.fromValue ? def.fromValue(raw) : raw;
    const handleChange = (e) => onChange(def.toValue ? def.toValue(Number(e.target.value)) : Number(e.target.value));
    return (
      <>
        <label className={labelClass}>{def.label} (0–100)</label>
        <input
          type="range"
          min={def.min ?? 0}
          max={def.max ?? 100}
          value={displayValue}
          onChange={handleChange}
          className="w-full mb-1"
        />
        <span className="text-xs text-gray-500">{displayValue}%</span>
      </>
    );
  }

  return null;
}

function isRootLevelView(tree, selected) {
  if (!tree || !selected || selected.id === "root") return false;
  const children = tree.children || [];
  return children.some((c) => (c.id != null ? String(c.id) : null) === (selected.id != null ? String(selected.id) : null));
}

/** Effective layout mode: layoutMode if set, else infer from legacy autoResize */
function getEffectiveLayoutMode(node) {
  if (!node) return "autoLayout";
  if (node.layoutMode === "autoResize" || node.layoutMode === "autoLayout" || node.layoutMode === "freeForm") return node.layoutMode;
  return node.autoResize === true ? "autoResize" : "autoLayout";
}

export default function Inspector({ tree, selected, dataModel, onUpdate, onDelete, screenName, onScreenNameChange }) {
  if (!selected) {
    return <div className="w-72 min-h-full bg-gray-100 p-4">No selection</div>;
  }

  const update = (keyOrPatch, value) => {
    const id = selected != null ? selected.id : undefined;
    if (id == null) return;
    if (typeof keyOrPatch === "object" && keyOrPatch !== null && value === undefined) {
      onUpdate({ ...selected, id: String(id), ...keyOrPatch });
    } else {
      onUpdate({ ...selected, id: String(id), [keyOrPatch]: value });
    }
  };

  const enabledStyles = getEnabledStylesForControl(selected.type);

  const isCanvasRoot = selected.id === "root";
  return (
    <div className="w-72 min-h-full bg-gray-100 p-4">
      <h3 className="font-bold mb-1">{isCanvasRoot ? "Canvas" : getNodeDisplayName(selected)}</h3>
      {isCanvasRoot ? (
        <p className="text-xs text-gray-500 mb-3">Screen settings. Not a component — your components are listed below in the tree.</p>
      ) : getDescription(selected.type) ? (
        <p className="text-xs text-gray-500 mb-3">{getDescription(selected.type)}</p>
      ) : null}

      {isCanvasRoot && onScreenNameChange != null && (
        <>
          <InspectorSection title="Screen">
            <label className="block text-sm mb-1">Screen name</label>
            <input
              value={screenName ?? ""}
              onChange={(e) => onScreenNameChange(e.target.value)}
              placeholder="Screen name (label in panel)"
              className="w-full p-2 border rounded text-sm bg-white mb-2"
              title="Label shown in the left panel screen list"
            />
          </InspectorSection>
          <InspectorSeparator />
        </>
      )}

      {/* Identity (XIB-style) */}
      {!isCanvasRoot && (
        <>
          <InspectorSeparator />
          <InspectorSection title="Identity">
            <label className="block text-sm mb-1">Object ID</label>
            <input
              value={selected.id ?? ""}
              onChange={e => update("id", e.target.value)}
              placeholder="Unique ID"
              className="w-full p-2 border rounded text-xs font-mono bg-white mb-2"
            />
            <label className="block text-sm mb-1">Tag</label>
            <input
              type="number"
              min={0}
              value={selected.tag ?? 0}
              onChange={e => update("tag", e.target.value === "" ? 0 : parseInt(e.target.value, 10) || 0)}
              placeholder="0"
              className="w-full p-2 border rounded text-xs bg-white"
              title="Numeric tag for runtime / automation"
            />
          </InspectorSection>
        </>
      )}

      <InspectorSeparator />
      <InspectorSection title="Content">
      {/* TEXT */}
      {selected.type === "Text" && (
        <>
          <label className="block text-sm mb-1">Text</label>
          <input
            value={getEffectiveDisplayValue(selected, "text", "Text") ?? ""}
            onChange={e => update("text", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Alignment</label>
          <select
            value={getEffectiveDisplayValue(selected, "alignment", "Text") ?? "start"}
            onChange={e => update("alignment", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          >
            <option value="start">Leading (left)</option>
            <option value="center">Center</option>
            <option value="end">Trailing (right)</option>
          </select>
          <label className="block text-sm mb-1">Number of lines</label>
          <input
            type="number"
            min={0}
            value={getEffectiveDisplayValue(selected, "numberOfLines", "Text") ?? 0}
            onChange={e => update("numberOfLines", Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full p-2 border rounded mb-3"
            title="0 = unlimited"
          />
          <p className="text-xs text-gray-500 -mt-2 mb-3">0 = unlimited</p>
          <label className="block text-sm mb-1">Bind to list item property</label>
          <input
            value={selected.boundListItemProperty ?? ""}
            onChange={e => update("boundListItemProperty", e.target.value)}
            placeholder="e.g. name, title (when inside list row)"
            className="w-full p-2 border rounded mb-2"
            title="When inside a list row, show this property of each array item instead of Text"
          />
          <p className="text-xs text-gray-500 -mt-2 mb-3">Optional. When inside a list row, display this key from the array item.</p>
        </>
      )}

      {/* BUTTON */}
      {selected.type === "Button" && (
        <>
          <label className="block text-sm mb-1">Title</label>
          <input
            value={getEffectiveDisplayValue(selected, "title", "Button") ?? "Tap Me"}
            onChange={e => update("title", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Bind to list item property</label>
          <input
            value={selected.boundListItemProperty ?? ""}
            onChange={e => update("boundListItemProperty", e.target.value)}
            placeholder="e.g. title (when inside list row)"
            className="w-full p-2 border rounded"
            title="When inside a list row, show this property of each array item as button title"
          />
          <p className="text-xs text-gray-500 mt-0.5 mb-2">Optional. When inside a list row, use this key from the array item.</p>
        </>
      )}

      {/* IMAGE */}
      {selected.type === "Image" && (
        <>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={selected.useAsset === true}
              onChange={e => update("useAsset", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 shrink-0"
            />
            <span className="text-sm font-medium">Pick from asset</span>
          </label>
          {selected.useAsset ? (
            <>
              <label className="block text-sm mb-1">Bundle name</label>
              <input
                type="text"
                placeholder="Main (leave empty for main bundle)"
                value={getEffectiveDisplayValue(selected, "assetBundleName", "Image") ?? ""}
                onChange={e => update("assetBundleName", e.target.value)}
                className="w-full p-2 border rounded mb-2"
              />
              <label className="block text-sm mb-1">Image name</label>
              <input
                type="text"
                placeholder="e.g. my_icon"
                value={getEffectiveDisplayValue(selected, "assetImageName", "Image") ?? ""}
                onChange={e => update("assetImageName", e.target.value)}
                className="w-full p-2 border rounded mb-2"
              />
            </>
          ) : (
            <>
              <label className="block text-sm mb-1">Image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={getEffectiveDisplayValue(selected, "src", "Image") ?? ""}
                onChange={e => update("src", e.target.value)}
                className="w-full p-2 border rounded mb-2"
              />
            </>
          )}
          <label className="block text-sm mb-1">Alt text</label>
          <input
            value={getEffectiveDisplayValue(selected, "alt", "Image") ?? "Image"}
            onChange={e => update("alt", e.target.value)}
            placeholder="Description for accessibility"
            className="w-full p-2 border rounded mb-2"
          />
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={selected.showLoadingIndicator === true}
              onChange={e => update("showLoadingIndicator", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 shrink-0"
            />
            <span className="text-sm font-medium">Show loading indicator (ProgressView while image loads)</span>
          </label>
          <label className="block text-sm mb-1">Content mode</label>
          <select
            value={getEffectiveDisplayValue(selected, "contentMode", "Image") ?? "contain"}
            onChange={e => update("contentMode", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          >
            <option value="contain">Scale to Fit</option>
            <option value="cover">Scale to Fill</option>
            <option value="fill">Fill</option>
            <option value="none">None</option>
            <option value="scale-down">Scale Down</option>
          </select>
          <label className="block text-sm mb-1">Bind to list item property</label>
          <input
            value={selected.boundListItemProperty ?? ""}
            onChange={e => update("boundListItemProperty", e.target.value)}
            placeholder="e.g. imageUrl (when inside list row)"
            className="w-full p-2 border rounded"
            title="When inside a list row, use this property of each array item as image URL"
          />
          <p className="text-xs text-gray-500 mt-0.5 mb-2">Optional. When inside a list row, use this key as the image URL.</p>
        </>
      )}

      {/* LIST */}
      {selected.type === "List" && (
        <>
          <label className="block text-sm mb-1">List items (one per line)</label>
          <textarea
            value={Array.isArray(selected.items) ? selected.items.join("\n") : (selected.items != null ? String(selected.items) : "")}
            onChange={e => update("items", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
            rows={4}
            placeholder="Item 1&#10;Item 2&#10;Item 3"
            className="w-full p-2 border rounded font-mono text-sm mb-2"
          />
          <p className="text-xs text-gray-500 mb-2">Default rows above. To drive the list from JSON, bind this List’s <strong>Items</strong> to a data model path in <strong>Data Mapping</strong>.</p>
          <p className="text-xs text-gray-500 mb-3">Add one child (e.g. a Table cell) as the row template; put Item text, Text, Button, or Image inside and optionally bind to list item properties.</p>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={selected.sectionGroupingEnabled === true}
              onChange={e => update("sectionGroupingEnabled", e.target.checked)}
            />
            <span className="text-sm font-medium">Section grouping (Swift)</span>
          </label>
          <p className="text-xs text-gray-500 mb-3">When on, list renders with section/grouped style in Swift. Off = plain list (default).</p>
          <label className="block text-sm mb-1">Spacing between rows (px)</label>
          <input
            type="number"
            min={0}
            value={selected.listRowSpacing != null ? selected.listRowSpacing : 0}
            onChange={e => update("listRowSpacing", Math.max(0, Number(e.target.value)))}
            className="w-full p-1.5 border rounded text-sm mb-2"
            title="Gap between list rows / table cells"
          />
          <label className="block text-sm mb-1">Space above first row (px)</label>
          <input
            type="number"
            min={0}
            value={selected.listSpacingAboveFirst != null ? selected.listSpacingAboveFirst : 0}
            onChange={e => update("listSpacingAboveFirst", Math.max(0, Number(e.target.value)))}
            className="w-full p-1.5 border rounded text-sm mb-2"
            title="Space above the first list cell"
          />
          <label className="block text-sm mb-1">Space below last row (px)</label>
          <input
            type="number"
            min={0}
            value={selected.listSpacingBelowLast != null ? selected.listSpacingBelowLast : 0}
            onChange={e => update("listSpacingBelowLast", Math.max(0, Number(e.target.value)))}
            className="w-full p-1.5 border rounded text-sm mb-3"
            title="Space below the last list cell"
          />
          <div className="border-t border-gray-200 pt-3 mt-2">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={selected.loadMoreEnabled === true}
                onChange={e => update("loadMoreEnabled", e.target.checked)}
              />
              <span className="text-sm font-medium">Load more</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">Show a footer to load next page. Set page param in <strong>Data Mapping → API &amp; Load more</strong>.</p>
            <label className="block text-xs text-gray-500 mb-0.5">Footer button label</label>
            <input
              type="text"
              value={selected.loadMoreFooterLabel ?? "Load more"}
              onChange={e => update("loadMoreFooterLabel", e.target.value)}
              className="w-full p-1.5 border rounded text-sm mb-2"
            />
            <label className="block text-xs text-gray-500 mb-0.5">Loading label</label>
            <input
              type="text"
              value={selected.loadMoreLoadingLabel ?? "Loading..."}
              onChange={e => update("loadMoreLoadingLabel", e.target.value)}
              className="w-full p-1.5 border rounded text-sm"
            />
          </div>
        </>
      )}

      {/* LIST ITEM CONTENT */}
      {selected.type === "ListItemContent" && (
        <p className="text-sm text-gray-600 mb-2">Displays the current list item when used inside a List row template. Style controls the text appearance.</p>
      )}

      {/* TEXTFIELD */}
      {selected.type === "TextField" && (
        <>
          <label className="block text-sm mb-1">Placeholder</label>
          <input
            value={getEffectiveDisplayValue(selected, "placeholder", "TextField") ?? ""}
            onChange={e => update("placeholder", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Default text</label>
          <input
            value={getEffectiveDisplayValue(selected, "text", "TextField") ?? ""}
            onChange={e => update("text", e.target.value)}
            className="w-full p-2 border rounded"
          />
        </>
      )}

      {/* TOGGLE */}
      {selected.type === "Toggle" && (
        <>
          <label className="block text-sm mb-1">Label</label>
          <input
            value={getEffectiveDisplayValue(selected, "label", "Toggle") ?? "Toggle"}
            onChange={e => update("label", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={getEffectiveDisplayValue(selected, "isOn", "Toggle") === true}
              onChange={e => update("isOn", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">On by default</span>
          </label>
        </>
      )}

      {/* SLIDER */}
      {selected.type === "Slider" && (
        <>
          <label className="block text-sm mb-1">Value</label>
          <input
            type="number"
            value={getEffectiveDisplayValue(selected, "value", "Slider") ?? 50}
            onChange={e => update("value", Number(e.target.value))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Min</label>
          <input
            type="number"
            value={getEffectiveDisplayValue(selected, "min", "Slider") ?? 0}
            onChange={e => update("min", Number(e.target.value))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Max</label>
          <input
            type="number"
            value={getEffectiveDisplayValue(selected, "max", "Slider") ?? 100}
            onChange={e => update("max", Number(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </>
      )}

      {/* PICKER */}
      {selected.type === "Picker" && (
        <>
          <label className="block text-sm mb-1">Selection</label>
          <input
            value={getEffectiveDisplayValue(selected, "selection", "Picker") ?? ""}
            onChange={e => update("selection", e.target.value)}
            placeholder="Selected value"
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Options (one per line)</label>
          <textarea
            value={Array.isArray(selected.options) ? selected.options.join("\n") : (selected.options != null ? String(selected.options) : "Option 1\nOption 2\nOption 3")}
            onChange={e => update("options", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))}
            rows={4}
            placeholder="Option 1&#10;Option 2"
            className="w-full p-2 border rounded font-mono text-sm"
          />
        </>
      )}

      {/* PROGRESSVIEW */}
      {selected.type === "ProgressView" && (
        <>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={getEffectiveDisplayValue(selected, "indeterminate", "ProgressView") === true}
              onChange={e => update("indeterminate", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Indeterminate (spinner)</span>
          </label>
          {!getEffectiveDisplayValue(selected, "indeterminate", "ProgressView") && (
            <>
              <label className="block text-sm mb-1">Progress (0–1)</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={getEffectiveDisplayValue(selected, "progress", "ProgressView") ?? 0.5}
                onChange={e => update("progress", Math.max(0, Math.min(1, Number(e.target.value))))}
                className="w-full p-2 border rounded"
              />
            </>
          )}
        </>
      )}

      {/* DIVIDER */}
      {selected.type === "Divider" && (
        <>
          <label className="block text-sm mb-1">Axis</label>
          <select
            value={getEffectiveDisplayValue(selected, "axis", "Divider") ?? "horizontal"}
            onChange={e => update("axis", e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </>
      )}

      {/* SPACER */}
      {selected.type === "Spacer" && (
        <p className="text-sm text-gray-500">
          Expands to fill available space in a VStack or HStack. No properties to edit.
        </p>
      )}

      {/* LINK */}
      {selected.type === "Link" && (
        <>
          <label className="block text-sm mb-1">URL</label>
          <input
            type="url"
            value={getEffectiveDisplayValue(selected, "url", "Link") ?? ""}
            onChange={e => update("url", e.target.value)}
            placeholder="https://..."
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Label</label>
          <input
            value={getEffectiveDisplayValue(selected, "label", "Link") ?? "Link"}
            onChange={e => update("label", e.target.value)}
            className="w-full p-2 border rounded"
          />
        </>
      )}

      {/* SECUREFIELD */}
      {selected.type === BOTTOM_SHEET_TYPE && <BottomSheetInspectorSection selected={selected} update={update} />}
      {selected.type === "SecureField" && (
        <>
          <label className="block text-sm mb-1">Placeholder</label>
          <input
            value={getEffectiveDisplayValue(selected, "placeholder", "SecureField") ?? "Password"}
            onChange={e => update("placeholder", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Default text</label>
          <input
            type="password"
            value={getEffectiveDisplayValue(selected, "text", "SecureField") ?? ""}
            onChange={e => update("text", e.target.value)}
            className="w-full p-2 border rounded"
          />
        </>
      )}

      {/* CONTAINERS (View, VStack, HStack, ZStack, List) — not for canvas root */}
      {!isCanvasRoot && (selected.type === "View" || selected.type === "VStack" || selected.type === "HStack" || selected.type === "ZStack") && (
        <p className="text-sm text-gray-600 mb-2">
          {(selected.children || []).length} item(s) inside. Add more from the left panel.
        </p>
      )}
      {!isCanvasRoot && selected.type === "List" && (
        <p className="text-sm text-gray-600 mb-2">
          {(selected.children || []).length} row template(s). Add a <strong>Table cell</strong> first, then add controls inside it (Item text, Text, Button, etc.).
        </p>
      )}
      {!isCanvasRoot && selected.type === "ListItemContent" && (
        <p className="text-sm text-gray-600 mb-2">
          {(selected.children || []).length} control(s) in this cell. Add <strong>Item text</strong>, Text, Button, Image, etc. from the left panel.
        </p>
      )}
      {!isCanvasRoot && selected.type === "ListItemText" && (
        <>
          <p className="text-sm text-gray-500 mb-2">
            Displays the current row’s item. Use inside a Table cell.
          </p>
          <label className="block text-sm mb-1">Item property</label>
          <input
            value={selected.itemProperty ?? ""}
            onChange={e => update("itemProperty", e.target.value)}
            placeholder="e.g. name, title, text"
            className="w-full p-2 border rounded mb-2"
            title="Key on each array item to display (leave empty for text/title/label or string)"
          />
          <p className="text-xs text-gray-500 -mt-1">Key from the list array item to show. Empty = auto (text/title/label or string).</p>
        </>
      )}
      </InspectorSection>

      <InspectorSeparator />
      <InspectorSection title="Layout">
      {/* Fit to screen: show for Canvas (root) or for root-level view */}
      {selected.id === "root" && (
        <>
          <div className="mb-3">
            <label className="block text-sm mb-1">Screen ID</label>
            <input
              value={selected.screenId ?? ""}
              onChange={e => update("screenId", e.target.value)}
              placeholder="e.g. reward_home"
              className="w-full p-2 border rounded text-sm bg-white"
              title="Identifies this screen for actions and formatting (single VC uses this to route)"
            />
            <p className="text-xs text-gray-500 mt-0.5">Used by runtime to route actions and formatters.</p>
          </div>
          <div className="mb-3">
            <label className="block text-sm mb-1">Screen presentation</label>
            <select
              value={getEffectiveDisplayValue(selected, "presentationStyle", "View") ?? "push"}
              onChange={e => update("presentationStyle", e.target.value)}
              className="w-full p-2 border rounded text-sm bg-white"
              title="How this screen is presented when navigated to: push (nav stack), present (fullScreenCover), or modal (sheet)"
            >
              <option value="push">Push (navigation stack)</option>
              <option value="present">Present (full screen)</option>
              <option value="modal">Modal (sheet)</option>
            </select>
            <p className="text-xs text-gray-500 mt-0.5">Push, present, or modal when opening this screen.</p>
          </div>
        </>
      )}
      {(selected.id === "root" || isRootLevelView(tree, selected)) && (
        <div className="mt-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={(selected.id === "root" ? selected.fitToScreen : (tree && tree.fitToScreen)) === true}
              onChange={(e) => {
                const value = e.target.checked;
                if (selected.id === "root") {
                  update("fitToScreen", value);
                } else if (tree) {
                  onUpdate({ ...tree, id: "root", fitToScreen: value });
                }
              }}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">Fit to screen</span>
          </label>
          <p className="text-xs text-gray-500 mt-0.5 ml-6">Root view fills the device frame (Mobile/Web).</p>
        </div>
      )}

      {/* STACKS (VStack, HStack) */}
      {(selected.type === "VStack" || selected.type === "HStack") && (
        <>
          <label className="block text-sm mb-1">Alignment</label>
          <select
            value={getEffectiveDisplayValue(selected, "alignment", selected.type) ?? "center"}
            onChange={e => update("alignment", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          >
            {selected.type === "VStack" ? (
              <>
                <option value="start">Leading</option>
                <option value="center">Center</option>
                <option value="end">Trailing</option>
              </>
            ) : (
              <>
                <option value="start">Top</option>
                <option value="center">Center</option>
                <option value="end">Bottom</option>
              </>
            )}
          </select>
          <label className="block text-sm mb-1">Spacing between items (px)</label>
          <input
            type="number"
            min={0}
            value={getEffectiveDisplayValue(selected, "spacing", selected.type) ?? 12}
            onChange={e => update("spacing", Math.max(0, Number(e.target.value)))}
            className="w-full p-2 border rounded"
            title="Gap between child controls"
          />
        </>
      )}

      {/* ZStack alignment */}
      {selected.type === "ZStack" && (
        <>
          <label className="block text-sm mb-1">Alignment</label>
          <select
            value={getEffectiveDisplayValue(selected, "alignment", "ZStack") ?? "center"}
            onChange={e => update("alignment", e.target.value)}
            className="w-full p-2 border rounded mb-2"
          >
            <option value="start">Leading (top-left)</option>
            <option value="center">Center</option>
            <option value="end">Trailing (bottom-right)</option>
          </select>
        </>
      )}

      {/* SPACING – space from other controls (margin: top/bottom/left/right); negative allowed */}
      {selected.id !== "root" && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <h4 className="font-semibold text-sm mb-1">Spacing from other controls</h4>
          <p className="text-xs text-gray-500 mb-2">Margin (space outside this control). Use negative to overlap.</p>
          <label className="block text-sm mb-1">Top (px)</label>
          <input
            type="number"
            value={getEffectiveDisplayValue(selected, "marginTop", selected.type) ?? 0}
            onChange={e => update("marginTop", Number(e.target.value))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Bottom (px)</label>
          <input
            type="number"
            value={getEffectiveDisplayValue(selected, "marginBottom", selected.type) ?? 0}
            onChange={e => update("marginBottom", Number(e.target.value))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Left (px)</label>
          <input
            type="number"
            value={getEffectiveDisplayValue(selected, "marginLeft", selected.type) ?? 0}
            onChange={e => update("marginLeft", Number(e.target.value))}
            className="w-full p-2 border rounded mb-2"
          />
          <label className="block text-sm mb-1">Right (px)</label>
          <input
            type="number"
            value={getEffectiveDisplayValue(selected, "marginRight", selected.type) ?? 0}
            onChange={e => update("marginRight", Number(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>
      )}

      {/* INSET FROM PARENT – padding from parent edges (e.g. 16pt from all sides) */}
      {selected.id !== "root" && (
        <div className="mt-3 pt-3 border-t border-gray-300">
          <h4 className="font-semibold text-sm mb-1">Inset from parent (px)</h4>
          <p className="text-xs text-gray-500 mb-2">Distance from parent&apos;s edges. Use with Auto Resize for &quot;fill with padding&quot;.</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Top</label>
              <input
                type="number"
                min={0}
                value={getEffectiveDisplayValue(selected, "insetFromParentTop", selected.type) ?? 0}
                onChange={e => update("insetFromParentTop", Number(e.target.value))}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Bottom</label>
              <input
                type="number"
                min={0}
                value={getEffectiveDisplayValue(selected, "insetFromParentBottom", selected.type) ?? 0}
                onChange={e => update("insetFromParentBottom", Number(e.target.value))}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Left</label>
              <input
                type="number"
                min={0}
                value={getEffectiveDisplayValue(selected, "insetFromParentLeft", selected.type) ?? 0}
                onChange={e => update("insetFromParentLeft", Number(e.target.value))}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Right</label>
              <input
                type="number"
                min={0}
                value={getEffectiveDisplayValue(selected, "insetFromParentRight", selected.type) ?? 0}
                onChange={e => update("insetFromParentRight", Number(e.target.value))}
                className="w-full p-2 border rounded text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* PADDING (all components); skip for canvas root; negative allowed */}
      {!isCanvasRoot && (
      <div className="mt-3">
        <label className="block text-sm mb-1">Padding horizontal (px)</label>
        <input
          type="number"
          value={getEffectiveDisplayValue(selected, "paddingHorizontal", selected.type) ?? 0}
          onChange={e => update("paddingHorizontal", Number(e.target.value))}
          className="w-full p-2 border rounded mb-2"
        />
        <label className="block text-sm mb-1">Padding vertical (px)</label>
        <input
          type="number"
          value={getEffectiveDisplayValue(selected, "paddingVertical", selected.type) ?? 0}
          onChange={e => update("paddingVertical", Number(e.target.value))}
          className="w-full p-2 border rounded mb-2"
        />
        <label className="block text-sm mb-1">Padding top (px)</label>
        <input
          type="number"
          value={getEffectiveDisplayValue(selected, "paddingTop", selected.type) ?? 0}
          onChange={e => update("paddingTop", Number(e.target.value))}
          className="w-full p-2 border rounded mb-2"
        />
        <label className="block text-sm mb-1">Padding bottom (px)</label>
        <input
          type="number"
          value={getEffectiveDisplayValue(selected, "paddingBottom", selected.type) ?? 0}
          onChange={e => update("paddingBottom", Number(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>
      )}

      {/* LAYOUT MODE (Apple-style) + SIZE – Auto Layout / Auto Resize / Free Form */}
      {selected.id !== "root" && (
        <>
          <div className="mt-3 pt-3 border-t border-gray-300">
            <h4 className="font-semibold text-sm mb-1">Layout</h4>
            <label className="block text-sm mb-1">Mode</label>
            <select
              value={getEffectiveLayoutMode(selected)}
              onChange={e => {
                const v = e.target.value;
                onUpdate({
                  ...selected,
                  id: selected.id != null ? String(selected.id) : undefined,
                  layoutMode: v,
                  autoResize: v === "autoResize",
                });
              }}
              className="w-full p-2 border rounded mb-1"
            >
              <option value="autoLayout">Auto Layout</option>
              <option value="autoResize">Auto Resize</option>
              <option value="freeForm">Free Form</option>
            </select>
            <p className="text-xs text-gray-500 mb-2">
              {getEffectiveLayoutMode(selected) === "autoLayout" && "Flow in parent; size by content or set width/height."}
              {getEffectiveLayoutMode(selected) === "autoResize" && "Fill parent edge-to-edge; size updates automatically."}
              {getEffectiveLayoutMode(selected) === "freeForm" && "Fixed position (x, y) and size; place anywhere in parent."}
            </p>
          </div>
          {getEffectiveLayoutMode(selected) === "freeForm" && (
            <>
              <label className="block text-sm mb-1">X (px)</label>
              <input
                type="number"
                value={selected.x ?? 0}
                onChange={e => update("x", Number(e.target.value))}
                className="w-full p-2 border rounded mb-2"
              />
              <label className="block text-sm mb-1">Y (px)</label>
              <input
                type="number"
                value={selected.y ?? 0}
                onChange={e => update("y", Number(e.target.value))}
                className="w-full p-2 border rounded mb-2"
              />
            </>
          )}
          <label className="block text-sm mb-1">Width (px)</label>
          <input
            type="number"
            min={getEffectiveLayoutMode(selected) === "freeForm" ? 1 : 40}
            placeholder="auto"
            value={selected.width ?? ""}
            onChange={e => update("width", e.target.value === "" ? undefined : Number(e.target.value))}
            className="w-full p-2 border rounded mb-2"
            readOnly={getEffectiveLayoutMode(selected) === "autoResize"}
            title={getEffectiveLayoutMode(selected) === "autoResize" ? "Driven by parent when Auto Resize is on" : undefined}
          />
          <label className="block text-sm mb-1">Height (px)</label>
          <input
            type="number"
            min={getEffectiveLayoutMode(selected) === "freeForm" ? 1 : 24}
            placeholder="auto"
            value={selected.height ?? ""}
            onChange={e => update("height", e.target.value === "" ? undefined : Number(e.target.value))}
            className="w-full p-2 border rounded"
            readOnly={getEffectiveLayoutMode(selected) === "autoResize"}
            title={getEffectiveLayoutMode(selected) === "autoResize" ? "Driven by parent when Auto Resize is on" : undefined}
          />
        </>
      )}

      </InspectorSection>

      <InspectorSeparator />
      {/* STYLE – from style list; skip for canvas root (not a component) */}
      {!isCanvasRoot && enabledStyles.length > 0 && (
        <InspectorSection title="Style">
          {enabledStyles.map((def) => (
            <StyleField
              key={def.key}
              def={def}
              value={getEffectiveDisplayValue(selected, def.key, selected.type) ?? def.default}
              storedValue={selected[def.key]}
              onChange={(value) => update(def.key, value)}
            />
          ))}
        </InspectorSection>
      )}

      <InspectorSeparator />
      {/* LOCALIZATION */}
      {!isCanvasRoot && (
        <InspectorSection title="Localization">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={selected.localizationEnabled === true}
              onChange={e => update("localizationEnabled", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">Localization on</span>
          </label>
          {selected.localizationEnabled && (
            <>
              <label className="block text-sm mb-1">Key</label>
              <input
                value={selected.localizationKey ?? ""}
                onChange={e => update("localizationKey", e.target.value)}
                placeholder="e.g. welcome.title"
                className="w-full p-2 border rounded text-sm mb-2"
              />
              <label className="block text-sm mb-1">Default value</label>
              <input
                value={selected.localizationDefaultValue ?? ""}
                onChange={e => update("localizationDefaultValue", e.target.value)}
                placeholder="Fallback text"
                className="w-full p-2 border rounded text-sm"
              />
            </>
          )}
        </InspectorSection>
      )}

      <InspectorSeparator />
      {/* ACCESSIBILITY */}
      {!isCanvasRoot && (
        <InspectorSection title="Accessibility">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={selected.accessibilityEnabled === true}
              onChange={e => update("accessibilityEnabled", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">Accessibility on</span>
          </label>
          {selected.accessibilityEnabled && (
            <>
              <label className="block text-sm mb-1">Accessibility ID</label>
              <input
                value={selected.accessibilityIdentifier ?? ""}
                onChange={e => update("accessibilityIdentifier", e.target.value)}
                placeholder="e.g. submitButton"
                className="w-full p-2 border rounded text-sm mb-2"
              />
              <label className="block text-sm mb-1">Value (label)</label>
              <input
                value={selected.accessibilityLabel ?? ""}
                onChange={e => update("accessibilityLabel", e.target.value)}
                placeholder="VoiceOver / automation label"
                className="w-full p-2 border rounded text-sm"
              />
            </>
          )}
        </InspectorSection>
      )}

      <InspectorSeparator />
      {/* ACTION */}
      {!isCanvasRoot && (
        <InspectorSection title="Action">
          <OpenBottomSheetActionBlock tree={tree} selected={selected} update={update} />
          <p className="text-xs text-gray-500 mb-2">When the user taps this control, the host app receives an action. You can send a value from your API (e.g. deeplink URL) by picking a <strong>separate</strong> data field below — use one that holds the action value, not the field used for the control&apos;s title or text.</p>
          <label className="block text-sm mb-1">Control ID</label>
          <p className="text-xs text-gray-500 mb-1">Stable id so the host app knows which control was tapped (e.g. submit_btn, back_btn).</p>
          <input
            value={selected.actionId ?? ""}
            onChange={e => update("actionId", e.target.value)}
            placeholder="e.g. submit_btn"
            className="w-full p-2 border rounded text-sm mb-2 bg-white"
          />
          <label className="block text-sm mb-1">Event name</label>
          <p className="text-xs text-gray-500 mb-1">Custom event the host app can switch on for logic (e.g. form.submit, open_rewards).</p>
          <input
            value={selected.actionEvent ?? ""}
            onChange={e => update("actionEvent", e.target.value)}
            placeholder="e.g. form.submit"
            className="w-full p-2 border rounded text-sm mb-2 bg-white"
          />
          <label className="block text-sm mb-1">Action value from (API / data)</label>
          <p className="text-xs text-gray-500 mb-1">Data field whose <strong>value</strong> is sent as the action value (e.g. deeplink URL). In Data Mapping, create a field for this (e.g. &quot;Deeplink&quot;) and bind it from the API — do not use the same field as the control&apos;s title.</p>
          <select
            value={selected.actionBoundDataModelId ?? ""}
            onChange={e => update("actionBoundDataModelId", e.target.value)}
            className="w-full p-2 border rounded text-sm mb-2 bg-white"
          >
            <option value="">None</option>
            {(dataModel || []).filter(Boolean).map((entry) => (
              <option key={entry.id ?? ""} value={entry.id ?? ""}>{entry.name ?? entry.id ?? ""}</option>
            ))}
          </select>
          {(() => {
            const path = getPathToNode(tree, selected != null ? selected.id : undefined);
            const insideList = path.length > 0 && path.slice(0, -1).includes("List");
            if (!insideList) return null;
            return (
              <>
                <label className="block text-sm mb-1">List row key (overrides above)</label>
                <input
                  value={selected.actionBoundProperty ?? ""}
                  onChange={e => update("actionBoundProperty", e.target.value)}
                  placeholder="e.g. deeplink"
                  className="w-full p-2 border rounded text-sm bg-white"
                  title="Property on each list item that holds the action value (e.g. deeplink)"
                />
              </>
            );
          })()}
        </InspectorSection>
      )}

      <InspectorSeparator />
      {/* GESTURES */}
      {!isCanvasRoot && (
        <InspectorSection title="Gestures">
          <p className="text-xs text-gray-500 mb-2">Add tap or long press; runtime will fire the action handler.</p>
          {(selected.gestures || []).map((g, i) => (
            <div key={i} className="flex items-center gap-2 mb-2 p-2 border border-gray-200 rounded bg-white">
              <select
                value={g.type ?? "tap"}
                onChange={e => {
                  const next = [...(selected.gestures || [])];
                  next[i] = { ...next[i], type: e.target.value };
                  if (e.target.value === "longPress" && next[i].minDuration == null) next[i].minDuration = 0.5;
                  update("gestures", next);
                }}
                className="flex-1 p-1.5 border rounded text-sm"
              >
                <option value="tap">Tap</option>
                <option value="longPress">Long press</option>
              </select>
              {(g.type === "longPress" || ((selected.gestures || [])[i] && (selected.gestures || [])[i].type === "longPress")) && (
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={((selected.gestures || [])[i] && (selected.gestures || [])[i].minDuration != null) ? (selected.gestures || [])[i].minDuration : 0.5}
                  onChange={e => {
                    const next = [...(selected.gestures || [])];
                    next[i] = { ...next[i], minDuration: Number(e.target.value) || 0.5 };
                    update("gestures", next);
                  }}
                  className="w-16 p-1.5 border rounded text-sm"
                  title="Min duration (seconds)"
                />
              )}
              <button type="button" onClick={() => update("gestures", (selected.gestures || []).filter((_, j) => j !== i))} className="text-red-600 text-sm shrink-0">Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => update("gestures", [...(selected.gestures || []), { type: "tap" }])} className="text-sm text-blue-600 hover:underline">+ Add gesture</button>
        </InspectorSection>
      )}

      <InspectorSeparator />
      {/* DISPLAY FORMAT */}
      {!isCanvasRoot && (
        <InspectorSection title="Display format">
          <label className="block text-sm mb-1">Format type</label>
          <select
            value={(selected.displayFormat && selected.displayFormat.type) || "none"}
            onChange={e => {
              const t = e.target.value;
              if (t === "none") update("displayFormat", null);
              else update("displayFormat", { ...(selected.displayFormat || {}), type: t });
            }}
            className="w-full p-2 border rounded text-sm mb-2 bg-white"
          >
            <option value="none">None</option>
            <option value="date">Date</option>
            <option value="number">Number</option>
            <option value="currency">Currency</option>
            <option value="custom">Custom (formatter ID)</option>
          </select>
          {selected.displayFormat && selected.displayFormat.type !== "none" && (
            <>
              {(selected.displayFormat.type === "date" || selected.displayFormat.type === "number" || selected.displayFormat.type === "currency") && (
                <>
                  <label className="block text-sm mb-1">Pattern</label>
                  <input
                    value={selected.displayFormat.pattern ?? ""}
                    onChange={e => update("displayFormat", { ...selected.displayFormat, pattern: e.target.value })}
                    placeholder={selected.displayFormat.type === "date" ? "MMM d, yyyy" : "#,##0.00"}
                    className="w-full p-2 border rounded text-sm mb-2 bg-white"
                  />
                  <label className="block text-sm mb-1">Locale</label>
                  <input
                    value={selected.displayFormat.locale ?? ""}
                    onChange={e => update("displayFormat", { ...selected.displayFormat, locale: e.target.value })}
                    placeholder="e.g. en_IN"
                    className="w-full p-2 border rounded text-sm mb-2 bg-white"
                  />
                </>
              )}
              {selected.displayFormat.type === "custom" && (
                <>
                  <label className="block text-sm mb-1">Formatter ID</label>
                  <input
                    value={selected.displayFormat.formatterId ?? ""}
                    onChange={e => update("displayFormat", { ...selected.displayFormat, formatterId: e.target.value })}
                    placeholder="e.g. currencyINR"
                    className="w-full p-2 border rounded text-sm bg-white"
                    title="Host app registers formatter by this id"
                  />
                </>
              )}
            </>
          )}
        </InspectorSection>
      )}

      <InspectorSeparator />
      {/* BEHAVIOR */}
      {!isCanvasRoot && (
        <InspectorSection title="Behavior">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={selected.isUserInteractionEnabled !== false}
              onChange={e => update("isUserInteractionEnabled", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">User interaction enabled</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={selected.isHidden === true}
              onChange={e => update("isHidden", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm font-medium">Hidden</span>
          </label>
          <label className="block text-sm mb-1">Automation ID</label>
          <input
            value={selected.automationIdentifier ?? ""}
            onChange={e => update("automationIdentifier", e.target.value)}
            placeholder="e.g. submit_button"
            className="w-full p-2 border rounded text-sm"
            title="Semantic / automation ID (can differ from accessibility ID)"
          />
        </InspectorSection>
      )}

      <InspectorSeparator />
      {/* DELETE */}
      {selected.id !== "root" && (
        <button
          onClick={() => onDelete(selected.id)}
          className="mt-2 w-full bg-red-500 text-white py-2 rounded"
        >
          Delete Component
        </button>
      )}
    </div>
  );
}
