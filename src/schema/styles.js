/**
 * Style architecture: central style list + per-control enable/disable in code.
 * - STYLE_DEFINITIONS: list of all available style properties (single source of truth).
 * - CONTROL_STYLE_KEYS: which style keys each control type has enabled.
 * - Inspector and renderer use these to show/apply only enabled styles.
 */

/** All style properties: key, label, input type, default, and optional constraints */
export const STYLE_DEFINITIONS = [{
        key: "fontFamily",
        label: "Font",
        type: "select",
        default: "system-ui",
        options: [
            { value: "system-ui", label: "System UI" },
            { value: "Inter", label: "Inter" },
            { value: "Roboto", label: "Roboto" },
            { value: "Open Sans", label: "Open Sans" },
            { value: "Lato", label: "Lato" },
            { value: "Georgia", label: "Georgia" },
            { value: "serif", label: "Serif" },
            { value: "monospace", label: "Monospace" },
        ],
    },
    {
        key: "fontSize",
        label: "Font size (px)",
        type: "number",
        default: 16,
        min: 8,
        max: 72,
    },
    {
        key: "fontWeight",
        label: "Font weight",
        type: "select",
        default: "normal",
        options: [
            { value: "normal", label: "Normal" },
            { value: "500", label: "Medium" },
            { value: "600", label: "Semibold" },
            { value: "bold", label: "Bold" },
        ],
    },
    {
        key: "textColor",
        label: "Text color",
        type: "color",
        default: "#000000",
    },
    {
        key: "backgroundColor",
        label: "Background color",
        type: "colorTransparent",
        default: "transparent",
    },
    {
        key: "foregroundColor",
        label: "Foreground color",
        type: "color",
        default: "",
    },
    {
        key: "borderColor",
        label: "Border color",
        type: "color",
        default: "",
    },
    {
        key: "cornerRadius",
        label: "Corner radius (px)",
        type: "number",
        default: 0,
        min: 0,
    },
    {
        key: "opacity",
        label: "Alpha / opacity",
        type: "range",
        default: 1,
        min: 0,
        max: 100,
        toValue: (v) => v / 100,
        fromValue: (v) => Math.round((v != null ? v : 1) * 100),
    },
    {
        key: "blur",
        label: "Blur (px)",
        type: "number",
        default: 0,
        min: 0,
    },
];

/** Controls that display text: enable font, fontSize, fontWeight, textColor */
const TEXT_STYLE_KEYS = ["fontFamily", "fontSize", "fontWeight", "textColor"];

/** Visual-only styles: enabled for most controls (Text uses textColor, not foregroundColor) */
const VISUAL_STYLE_KEYS = [
    "backgroundColor",
    "foregroundColor",
    "borderColor",
    "cornerRadius",
    "opacity",
    "blur",
];

/** Visual styles for Text: no foregroundColor (text uses textColor only) */
const TEXT_VISUAL_KEYS = ["backgroundColor", "borderColor", "cornerRadius", "opacity", "blur"];

/**
 * Per-control style enable list (in code).
 * Add/remove keys to enable/disable styles for each control type.
 */
export const CONTROL_STYLE_KEYS = {
    Text: [...TEXT_STYLE_KEYS, ...TEXT_VISUAL_KEYS],
    Button: [...TEXT_STYLE_KEYS, ...VISUAL_STYLE_KEYS],
    List: [...TEXT_STYLE_KEYS, ...VISUAL_STYLE_KEYS],
    ListItemContent: [...TEXT_STYLE_KEYS, ...TEXT_VISUAL_KEYS],
    Image: [...VISUAL_STYLE_KEYS],
    View: [...VISUAL_STYLE_KEYS],
    VStack: [...VISUAL_STYLE_KEYS],
    HStack: [...VISUAL_STYLE_KEYS],
    ZStack: [...VISUAL_STYLE_KEYS],
    TextField: [...TEXT_STYLE_KEYS, ...TEXT_VISUAL_KEYS],
    Toggle: [...TEXT_STYLE_KEYS, ...VISUAL_STYLE_KEYS],
    Slider: [...VISUAL_STYLE_KEYS],
    Picker: [...TEXT_STYLE_KEYS, ...VISUAL_STYLE_KEYS],
    ProgressView: [...VISUAL_STYLE_KEYS],
    Divider: ["backgroundColor", "borderColor", "opacity"],
    Spacer: [],
    Link: [...TEXT_STYLE_KEYS, ...VISUAL_STYLE_KEYS],
    SecureField: [...TEXT_STYLE_KEYS, ...TEXT_VISUAL_KEYS],
};

/** Get style definitions that are enabled for a control type (order preserved) */
export function getEnabledStylesForControl(controlType) {
    const keys = CONTROL_STYLE_KEYS[controlType];
    if (!keys || !keys.length) return [];
    return keys
        .map((key) => STYLE_DEFINITIONS.find((d) => d.key === key))
        .filter(Boolean);
}

/** Build default style object from definitions (for createNode) */
export function getDefaultStyle() {
    return STYLE_DEFINITIONS.reduce((acc, d) => {
        acc[d.key] = d.default;
        return acc;
    }, {});
}

/** Get style keys enabled for a control type */
export function getEnabledStyleKeysForControl(controlType) {
    return CONTROL_STYLE_KEYS[controlType] != null ? CONTROL_STYLE_KEYS[controlType] : [];
}

/**
 * Pick from node only style values that are enabled for this control type.
 * Use when applying styles in Resizable/RenderNode so we only use enabled props.
 */
export function getStyleForNode(node) {
    if (!node) return {};
    const keys = getEnabledStyleKeysForControl(node.type);
    return keys.reduce((acc, key) => {
        if (node[key] !== undefined && node[key] !== null) acc[key] = node[key];
        return acc;
    }, {});
}

/** Defaults used by the renderer (RenderNode/Resizable) – single source of truth for “effective” display values */
const RENDERER_DEFAULTS = {
    fontFamily: "system-ui",
    fontSize: 16,
    fontWeight: "normal",
    textColor: "#000000",
    backgroundColor: "transparent",
    foregroundColor: "",
    borderColor: "",
    cornerRadius: 0,
    opacity: 1,
    blur: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    insetFromParentTop: 0,
    insetFromParentLeft: 0,
    insetFromParentBottom: 0,
    insetFromParentRight: 0,
};

/** Button uses blue background when stored value is transparent/empty (renderer behavior) */
const BUTTON_BACKGROUND_DEFAULT = "#3b82f6";

/**
 * Return the value the renderer would use for this node + key, so Inspector can show the same default as the canvas.
 */
export function getEffectiveDisplayValue(node, key, controlType) {
    if (!node) return undefined;
    const type = controlType || node.type;
    const raw = node[key];

    if (key === "textColor") return raw != null ? raw : (node.color != null ? node.color : RENDERER_DEFAULTS.textColor);
    if (key === "backgroundColor" && type === "Button") {
        if (raw != null && raw !== "" && String(raw).trim().toLowerCase() !== "transparent") return raw;
        return BUTTON_BACKGROUND_DEFAULT;
    }
    if (key === "backgroundColor") return raw != null ? raw : RENDERER_DEFAULTS.backgroundColor;
    if (RENDERER_DEFAULTS[key] !== undefined) return raw !== undefined && raw !== null ? raw : RENDERER_DEFAULTS[key];

    if (key === "alignment") return type === "Text" ? (raw != null ? raw : "start") : (raw != null ? raw : "center");
    if (key === "spacing") return raw !== undefined && raw !== null ? raw : 12;
    if (key === "contentMode") return raw != null ? raw : "contain";

    if (key === "paddingTop") return raw !== undefined && raw !== null ? raw : (node.paddingVertical != null ? node.paddingVertical : 0);
    if (key === "paddingBottom") return raw !== undefined && raw !== null ? raw : (node.paddingVertical != null ? node.paddingVertical : 0);
    if (key === "marginTop") return raw !== undefined && raw !== null ? raw : (node.marginVertical != null ? node.marginVertical : 0);
    if (key === "marginBottom") return raw !== undefined && raw !== null ? raw : (node.marginVertical != null ? node.marginVertical : 0);
    if (key === "marginLeft") return raw !== undefined && raw !== null ? raw : (node.marginHorizontal != null ? node.marginHorizontal : 0);
    if (key === "marginRight") return raw !== undefined && raw !== null ? raw : (node.marginHorizontal != null ? node.marginHorizontal : 0);
    if (key === "insetFromParentTop" || key === "insetFromParentLeft" || key === "insetFromParentBottom" || key === "insetFromParentRight")
        return raw !== undefined && raw !== null ? raw : 0;

    if (key === "placeholder") return raw != null ? raw : "";
    if (key === "isOn") return raw === true;
    if (key === "label") return raw != null ? raw : "";
    if (key === "value") return raw !== undefined && raw !== null ? raw : 50;
    if (key === "min") return raw !== undefined && raw !== null ? raw : 0;
    if (key === "max") return raw !== undefined && raw !== null ? raw : 100;
    if (key === "selection") return raw != null ? raw : "";
    if (key === "progress") return raw !== undefined && raw !== null ? raw : 0.5;
    if (key === "indeterminate") return raw === true;
    if (key === "axis") return raw != null ? raw : "horizontal";
    if (key === "url") return raw != null ? raw : "";

    return raw;
}