/**
 * Data model & mock API helpers.
 * Bindable = controls that hold user/data values (not layout-only).
 */

/** Control types that have bindable properties (no View, VStack, HStack, ZStack) */
export const BINDABLE_TYPES = [
    "Text", "Button", "Image", "TextField", "Toggle", "Slider",
    "Picker", "ProgressView", "Link", "SecureField", "List",
];

/** For each type: which props can be bound to the data model */
export const BINDABLE_PROPERTIES = {
    Text: [{ key: "text", label: "Text" }],
    Button: [{ key: "title", label: "Title" }],
    Image: [{ key: "src", label: "Image URL" }, { key: "alt", label: "Alt text" }],
    TextField: [{ key: "text", label: "Text" }, { key: "placeholder", label: "Placeholder" }],
    Toggle: [{ key: "label", label: "Label" }, { key: "isOn", label: "On" }],
    Slider: [{ key: "value", label: "Value" }],
    Picker: [{ key: "selection", label: "Selection" }, { key: "options", label: "Options" }],
    ProgressView: [{ key: "progress", label: "Progress" }],
    Link: [{ key: "label", label: "Label" }, { key: "url", label: "URL" }],
    SecureField: [{ key: "text", label: "Text" }, { key: "placeholder", label: "Placeholder" }],
    List: [{ key: "items", label: "Items" }],
};

export function getBindablePropsForType(type) {
    return BINDABLE_PROPERTIES[type] || [];
}

/** Exactly one primary property KEY per type (string). Used for drop-to-bind so only 1 entry is created. */
export const PRIMARY_PROP_KEY_BY_TYPE = {
    Text: "text",
    Button: "title",
    Image: "src",
    TextField: "text",
    Toggle: "label",
    Slider: "value",
    Picker: "selection",
    ProgressView: "progress",
    Link: "label",
    SecureField: "text",
    List: "items",
};

/** Primary bindable property only (one per control when dropping from canvas). */
export function getPrimaryBindablePropForType(type) {
    const key = PRIMARY_PROP_KEY_BY_TYPE[type];
    if (!key) return null;
    const props = BINDABLE_PROPERTIES[type];
    const found = props && props.find((p) => p.key === key);
    return found ? found : (props && props[0] ? props[0] : null);
}

/** Get current value from node for a property (for display/default) */
export function getNodePropValue(node, propKey) {
    if (!node) return undefined;
    const v = node[propKey];
    if (propKey === "options" && Array.isArray(v)) return v;
    if (propKey === "items" && Array.isArray(v)) return v;
    if (propKey === "isOn") return v === true;
    return v != null ? v : "";
}

/** Build a short content preview for a node (for identification in data mapping) */
export function getControlPreview(node, propKey) {
    if (!node) return "";
    const t = node.type;
    if (propKey === "text") return (node.text != null && node.text !== "") ? `"${String(node.text).slice(0, 24)}${String(node.text).length > 24 ? "…" : ""}"` : "(empty)";
    if (propKey === "title") return (node.title != null && node.title !== "") ? `"${String(node.title).slice(0, 24)}…"` : "(empty)";
    if (propKey === "label") return (node.label != null && node.label !== "") ? `"${String(node.label).slice(0, 20)}…"` : "(no label)";
    if (propKey === "placeholder") return (node.placeholder != null && node.placeholder !== "") ? `"${String(node.placeholder).slice(0, 20)}…"` : "(none)";
    if (propKey === "src") return (node.src && String(node.src).trim()) ? "URL set" : "(no URL)";
    if (propKey === "url") return (node.url && String(node.url).trim()) ? "URL set" : "(no URL)";
    if (propKey === "value" || propKey === "progress") return String(node[propKey] != null ? node[propKey] : "");
    if (propKey === "isOn") return node.isOn ? "On" : "Off";
    if (propKey === "selection") return (node.selection != null && node.selection !== "") ? `"${String(node.selection).slice(0, 16)}…"` : "(none)";
    if (propKey === "options") return Array.isArray(node.options) ? `${node.options.length} options` : "0 options";
    if (propKey === "items") return Array.isArray(node.items) ? `${node.items.length} items` : "0 items";
    return "";
}

/** Collect all bindable (nodeId, type, propKey, label, currentValue, pathLabels, preview) from tree */
export function collectBindableFromTree(tree, acc = [], getPath = null) {
    if (!tree) return acc;
    const visit = (node) => {
        if (!node || !node.id) return;
        const type = node.type;
        const props = getBindablePropsForType(type);
        const pathArr = typeof getPath === "function" ? getPath(tree, node.id) : [];
        const pathLabel = pathArr.length > 0 ? pathArr.join(" › ") : type;
        for (const { key, label }
            of props) {
            const currentValue = getNodePropValue(node, key);
            const preview = getControlPreview(node, key);
            const shortType = type === "ListItemContent" ? "Item content" : type;
            const displayLabel = preview ? `${shortType} · ${label}: ${preview}` : `${shortType} · ${label}`;
            acc.push({
                nodeId: node.id,
                nodeType: type,
                propKey: key,
                propLabel: label,
                label: displayLabel,
                pathLabel,
                preview,
                currentValue,
            });
        }
        (node.children || []).forEach(visit);
    };
    (tree.children || []).forEach(visit);
    return acc;
}

/** Get value at JSON path (e.g. "user.name" or "items[0].title") */
export function getValueAtPath(obj, path) {
    if (obj == null || path == null || path === "") return undefined;
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    let current = obj;
    for (const p of parts) {
        if (current == null) return undefined;
        const num = /^\d+$/.test(p) ? parseInt(p, 10) : p;
        current = current[num];
    }
    return current;
}

/** Resolve list items array for a List node: from data model binding (entry with boundNodeId=list.id, boundProperty="items") or node.items */
export function getListItemsFromDataModel(dataModel, listNode) {
    if (!listNode || listNode.type !== "List") return null;
    const entry = (dataModel || []).find(
        (e) => e && e.boundNodeId != null && String(e.boundNodeId) === String(listNode.id) && e.boundProperty === "items"
    );
    const value = entry && entry.value;
    if (Array.isArray(value)) return value;
    return Array.isArray(listNode.items) ? listNode.items : [];
}

/** Get display value from list item (object or primitive). If itemProperty given, use path (supports "key" or "nested.key"); else text/title/label or string */
export function getListItemDisplayValue(item, itemProperty) {
    if (item == null) return "";
    if (itemProperty != null && itemProperty !== "" && typeof item === "object" && !Array.isArray(item)) {
        const v = itemProperty.includes(".") ? getValueAtPath(item, itemProperty) : item[itemProperty];
        return v != null ? String(v) : "";
    }
    if (typeof item === "object" && item !== null) return item.text != null ? item.text : (item.title != null ? item.title : (item.label != null ? item.label : JSON.stringify(item)));
    return String(item);
}

/** Set value at path (creates nested objects); returns new object */
export function setValueAtPath(obj, path, value) {
    if (path == null || path === "") return obj;
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
    const root = {...obj };
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        const nextKey = parts[i + 1];
        const nextNum = /^\d+$/.test(nextKey);
        if (current[p] == null) current[p] = nextNum ? [] : {};
        current[p] = Array.isArray(current[p]) ? [...current[p]] : {...current[p] };
        current = current[p];
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(current)) current[parseInt(last, 10)] = value;
    else current[last] = value;
    return root;
}