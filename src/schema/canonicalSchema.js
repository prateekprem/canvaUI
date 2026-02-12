/**
 * Platform-agnostic canonical UI JSON schema.
 * Exports full UI controls and properties for SwiftUI/Android.
 * Style keys are derived from styles.js so all added properties are included.
 */

import { getDefaultStyle, STYLE_DEFINITIONS } from "./styles";
import { getBottomSheetTypeDefaults, bottomSheetToCanonical, bottomSheetFromCanonical } from "../features/bottomSheet";

export const SCHEMA_VERSION = "1.0";

/** Style keys from schema (single source of truth) + layout-only keys */
const STYLE_KEYS_FROM_DEFINITIONS = STYLE_DEFINITIONS.map((d) => d.key);
const LAYOUT_ONLY_KEYS = [
    "paddingHorizontal",
    "paddingVertical",
    "paddingTop",
    "paddingBottom",
    "marginHorizontal",
    "marginVertical",
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "insetFromParentTop",
    "insetFromParentLeft",
    "insetFromParentBottom",
    "insetFromParentRight",
    "width",
    "height",
    "x",
    "y",
    "autoResize",
    "layoutMode",
];
const STYLE_KEYS = [...STYLE_KEYS_FROM_DEFINITIONS, ...LAYOUT_ONLY_KEYS];

const DEFAULT_STYLE = getDefaultStyle();

/** Layout keys not in STYLE_DEFINITIONS: use these so exported JSON never has undefined */
const LAYOUT_DEFAULTS = {
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
    width: null,
    height: null,
    x: 0,
    y: 0,
    autoResize: false,
    layoutMode: "autoLayout",
};

/** Build full style object: node values + defaults so JSON has every property */
function pickStyle(node) {
    const style = {};
    for (const key of STYLE_KEYS) {
        let value = node[key];
        if (key === "textColor" && (value === undefined || value === null) && node.color != null)
            value = node.color;
        const fallback = DEFAULT_STYLE[key] !== undefined ? DEFAULT_STYLE[key] : LAYOUT_DEFAULTS[key];
        const raw = value !== undefined && value !== null ? value : fallback;
        style[key] = raw !== undefined && raw !== null ? raw : null;
    }
    return style;
}

/** Type-specific default values so exported JSON always includes every property */
const TYPE_DEFAULTS = {
    View: { children: [], fitToScreen: false, presentationStyle: "push", componentName: "" },
    VStack: { spacing: 12, alignment: "center", children: [] },
    HStack: { spacing: 12, alignment: "center", children: [] },
    ZStack: { alignment: "center", children: [] },
    Text: { text: "", alignment: "start", numberOfLines: 0, boundListItemProperty: "" },
    Button: { title: "", boundListItemProperty: "" },
    Image: { src: "", alt: "Image", contentMode: "contain", useAsset: false, assetBundleName: "", assetImageName: "", boundListItemProperty: "", showLoadingIndicator: false },
    List: { items: [], children: [], loadMoreEnabled: false, loadMoreFooterLabel: "Load more", loadMoreLoadingLabel: "Loading...", sectionGroupingEnabled: false, listRowSpacing: 0, listSpacingAboveFirst: 0, listSpacingBelowLast: 0 },
    ListItemContent: {},
    ListItemText: { itemProperty: "" },
    TextField: { placeholder: "Enter text", text: "" },
    Toggle: { isOn: false, label: "Toggle" },
    Slider: { value: 50, min: 0, max: 100 },
    Picker: { selection: "Option 1", options: ["Option 1", "Option 2", "Option 3"] },
    ProgressView: { progress: 0.5, indeterminate: false },
    Divider: { axis: "horizontal" },
    Spacer: {},
    Link: { url: "https://example.com", label: "Link" },
    SecureField: { placeholder: "Password", text: "" },
    ...getBottomSheetTypeDefaults(),
};

/** Serialize one node with full controls and properties (all properties always present) */
function nodeToCanonical(node) {
    if (!node || !node.type) return null;

    const out = {
        type: node.type,
        id: node.id != null ? node.id : null,
        style: pickStyle(node),
    };

    switch (node.type) {
        case "View":
            out.children = (node.children || []).map(nodeToCanonical).filter(Boolean);
            out.fitToScreen = node.fitToScreen != null ? node.fitToScreen : TYPE_DEFAULTS.View.fitToScreen;
            out.presentationStyle = node.presentationStyle != null && ["push", "present", "modal"].includes(node.presentationStyle) ? node.presentationStyle : TYPE_DEFAULTS.View.presentationStyle;
            break;
        case "VStack":
        case "HStack":
            out.spacing = node.spacing != null ? node.spacing : TYPE_DEFAULTS.VStack.spacing;
            out.alignment = node.alignment != null ? node.alignment : TYPE_DEFAULTS.VStack.alignment;
            out.children = (node.children || []).map(nodeToCanonical).filter(Boolean);
            break;
        case "ZStack":
            out.alignment = node.alignment != null ? node.alignment : TYPE_DEFAULTS.ZStack.alignment;
            out.children = (node.children || []).map(nodeToCanonical).filter(Boolean);
            break;
        case "Text":
            out.text = node.text != null ? node.text : TYPE_DEFAULTS.Text.text;
            out.alignment = node.alignment != null ? node.alignment : TYPE_DEFAULTS.Text.alignment;
            out.numberOfLines = typeof node.numberOfLines === "number" && node.numberOfLines >= 0 ? node.numberOfLines : TYPE_DEFAULTS.Text.numberOfLines;
            out.boundListItemProperty = node.boundListItemProperty != null ? String(node.boundListItemProperty) : TYPE_DEFAULTS.Text.boundListItemProperty;
            break;
        case "Button":
            out.title = node.title != null ? node.title : TYPE_DEFAULTS.Button.title;
            out.boundListItemProperty = node.boundListItemProperty != null ? String(node.boundListItemProperty) : TYPE_DEFAULTS.Button.boundListItemProperty;
            break;
        case "Image":
            out.src = node.src != null ? node.src : TYPE_DEFAULTS.Image.src;
            out.alt = node.alt != null ? node.alt : TYPE_DEFAULTS.Image.alt;
            out.contentMode = node.contentMode != null ? node.contentMode : TYPE_DEFAULTS.Image.contentMode;
            out.useAsset = node.useAsset === true;
            out.assetBundleName = node.assetBundleName != null ? node.assetBundleName : TYPE_DEFAULTS.Image.assetBundleName;
            out.assetImageName = node.assetImageName != null ? node.assetImageName : TYPE_DEFAULTS.Image.assetImageName;
            out.boundListItemProperty = node.boundListItemProperty != null ? String(node.boundListItemProperty) : TYPE_DEFAULTS.Image.boundListItemProperty;
            out.showLoadingIndicator = node.showLoadingIndicator === true;
            break;
        case "List":
            out.items = Array.isArray(node.items) ? node.items : TYPE_DEFAULTS.List.items;
            out.children = (node.children || []).map(nodeToCanonical).filter(Boolean);
            out.loadMoreEnabled = node.loadMoreEnabled === true;
            out.loadMoreFooterLabel = node.loadMoreFooterLabel != null ? String(node.loadMoreFooterLabel) : TYPE_DEFAULTS.List.loadMoreFooterLabel;
            out.loadMoreLoadingLabel = node.loadMoreLoadingLabel != null ? String(node.loadMoreLoadingLabel) : TYPE_DEFAULTS.List.loadMoreLoadingLabel;
            out.sectionGroupingEnabled = node.sectionGroupingEnabled === true;
            out.listRowSpacing = typeof node.listRowSpacing === "number" ? node.listRowSpacing : TYPE_DEFAULTS.List.listRowSpacing;
            out.listRowSpacingTop = typeof node.listRowSpacingTop === "number" ? node.listRowSpacingTop : TYPE_DEFAULTS.List.listRowSpacingTop;
            out.listRowSpacingBottom = typeof node.listRowSpacingBottom === "number" ? node.listRowSpacingBottom : TYPE_DEFAULTS.List.listRowSpacingBottom;
            break;
        case "ListItemContent":
            out.children = (node.children || []).map(nodeToCanonical).filter(Boolean);
            break;
        case "ListItemText":
            out.itemProperty = node.itemProperty != null ? String(node.itemProperty) : TYPE_DEFAULTS.ListItemText.itemProperty;
            break;
        case "TextField":
            out.placeholder = node.placeholder != null ? node.placeholder : TYPE_DEFAULTS.TextField.placeholder;
            out.text = node.text != null ? node.text : TYPE_DEFAULTS.TextField.text;
            break;
        case "Toggle":
            out.isOn = node.isOn === true;
            out.label = node.label != null ? node.label : TYPE_DEFAULTS.Toggle.label;
            break;
        case "Slider":
            out.value = node.value != null ? node.value : TYPE_DEFAULTS.Slider.value;
            out.min = node.min != null ? node.min : TYPE_DEFAULTS.Slider.min;
            out.max = node.max != null ? node.max : TYPE_DEFAULTS.Slider.max;
            break;
        case "Picker":
            out.selection = node.selection != null ? node.selection : (Array.isArray(node.options) && node.options[0] != null ? node.options[0] : TYPE_DEFAULTS.Picker.selection);
            out.options = Array.isArray(node.options) ? node.options : TYPE_DEFAULTS.Picker.options;
            break;
        case "ProgressView":
            out.progress = node.progress != null ? node.progress : TYPE_DEFAULTS.ProgressView.progress;
            out.indeterminate = node.indeterminate === true;
            break;
        case "Divider":
            out.axis = node.axis != null ? node.axis : TYPE_DEFAULTS.Divider.axis;
            break;
        case "Spacer":
            break;
        case "Link":
            out.url = node.url != null ? node.url : TYPE_DEFAULTS.Link.url;
            out.label = node.label != null ? node.label : TYPE_DEFAULTS.Link.label;
            break;
        case "SecureField":
            out.placeholder = node.placeholder != null ? node.placeholder : TYPE_DEFAULTS.SecureField.placeholder;
            out.text = node.text != null ? node.text : TYPE_DEFAULTS.SecureField.text;
            break;
        case "BottomSheet":
            bottomSheetToCanonical(node, out, nodeToCanonical);
            break;
        default:
            break;
    }

    // Localization and accessibility (all nodes)
    out.localizationEnabled = node.localizationEnabled === true;
    out.localizationKey = node.localizationKey != null ? String(node.localizationKey) : "";
    out.localizationDefaultValue = node.localizationDefaultValue != null ? String(node.localizationDefaultValue) : "";
    out.accessibilityEnabled = node.accessibilityEnabled === true;
    out.accessibilityIdentifier = node.accessibilityIdentifier != null ? String(node.accessibilityIdentifier) : "";
    out.accessibilityLabel = node.accessibilityLabel != null ? String(node.accessibilityLabel) : "";
    // Behavior (all nodes)
    out.tag = typeof node.tag === "number" && !Number.isNaN(node.tag) ? node.tag : 0;
    out.isUserInteractionEnabled = node.isUserInteractionEnabled !== false;
    out.isHidden = node.isHidden === true;
    out.automationIdentifier = node.automationIdentifier != null ? String(node.automationIdentifier) : "";
    // Action (all nodes)
    out.actionId = node.actionId != null ? String(node.actionId) : "";
    out.actionEvent = node.actionEvent != null ? String(node.actionEvent) : "";
    out.actionBoundNodeId = node.actionBoundNodeId != null ? String(node.actionBoundNodeId) : "";
    out.actionBoundProperty = node.actionBoundProperty != null ? String(node.actionBoundProperty) : "";
    out.actionBoundDataModelId = node.actionBoundDataModelId != null ? String(node.actionBoundDataModelId) : "";
    // Gestures (all nodes): array of { type, minDuration? }
    out.gestures = Array.isArray(node.gestures) ? node.gestures.map((g) => ({
        type: g && g.type != null ? String(g.type) : "tap",
        minDuration: typeof(g && g.minDuration) === "number" ? g.minDuration : undefined,
    })) : [];
    // Display format (all nodes): { type, pattern?, locale?, formatterId? }
    const df = node.displayFormat;
    out.displayFormat = df && typeof df === "object" && df.type ? { type: String(df.type), pattern: df.pattern != null ? String(df.pattern) : undefined, locale: df.locale != null ? String(df.locale) : undefined, formatterId: df.formatterId != null ? String(df.formatterId) : undefined } :
        null;
    // Layout: when inside HStack, take remaining width (screen width minus siblings)
    out.fillRemainingWidth = node.fillRemainingWidth === true;
    // Composite label (e.g. NavigationBar on HStack); any node can have componentName
    out.componentName = node.componentName != null ? String(node.componentName) : "";

    return out;
}

/**
 * Screen-only data mapping: build a sanitized object for doc.dataMapping.
 * Must not include any bottom-sheet data; sheet data lives only in each BottomSheet node's sheetDataMapping.
 */
function buildScreenDataMappingForExport(screenDataMapping) {
    const dm = screenDataMapping != null && typeof screenDataMapping === "object" ? screenDataMapping : {};
    const dataModel = Array.isArray(dm.dataModel) ? dm.dataModel : [];
    const safeDataModel = dataModel.map((e) => {
        if (!e || typeof e !== "object") return null;
        const id = e.id != null ? String(e.id) : "";
        const name = e.name != null ? String(e.name) : "";
        const out = { id, name };
        if (Object.prototype.hasOwnProperty.call(e, "value") && e.value !== undefined) {
            if (e.value === null || typeof e.value === "string" || typeof e.value === "number" || typeof e.value === "boolean") out.value = e.value;
            else if (typeof e.value === "object") try { out.value = JSON.parse(JSON.stringify(e.value)); } catch { out.value = null; }
            else out.value = String(e.value);
        }
        if (e.boundNodeId != null && e.boundNodeId !== "") out.boundNodeId = String(e.boundNodeId);
        if (e.boundProperty != null && e.boundProperty !== "") out.boundProperty = String(e.boundProperty);
        return out;
    }).filter(Boolean);
    let mockApiJson = null;
    if (dm.mockApiJson != null && typeof dm.mockApiJson === "object") {
        try { mockApiJson = JSON.parse(JSON.stringify(dm.mockApiJson)); } catch { mockApiJson = null; }
    }
    const mockApiBindings = Array.isArray(dm.mockApiBindings) ?
        dm.mockApiBindings.map((b) => ({
            apiPath: b && b.apiPath != null ? String(b.apiPath) : "",
            dataModelId: b && b.dataModelId != null ? String(b.dataModelId) : "",
        })) : [];
    const configMethod = typeof dm.apiConfigMethod === "string" && dm.apiConfigMethod.trim() ? dm.apiConfigMethod.trim() : null;
    const apiUrl = typeof dm.apiUrl === "string" ? dm.apiUrl.trim() || null : null;
    const apiMethod = typeof dm.apiMethod === "string" && ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(dm.apiMethod) ? dm.apiMethod : null;
    const out = {
        dataModel: safeDataModel,
        mockApiJson,
        mockApiBindings,
        loadMorePageParamName: typeof dm.loadMorePageParamName === "string" ? dm.loadMorePageParamName.trim() || null : null,
        loadMorePageParamInQuery: dm.loadMorePageParamInQuery === true,
        loadMoreHasNextPagePath: typeof dm.loadMoreHasNextPagePath === "string" ? dm.loadMoreHasNextPagePath.trim() || null : null,
    };
    if (configMethod || apiUrl || apiMethod) {
        out.apiConfigMethod = configMethod;
        out.apiUrl = apiUrl;
        out.apiMethod = apiMethod;
        out.dataSource = { type: "api", configMethod, url: apiUrl, method: apiMethod };
    }
    return out;
}

/**
 * Convert the builder tree to full canonical JSON (all UI controls and properties).
 * Data mapping and mock JSON/bindings are separate for screen vs bottom sheet:
 * - Screen: doc.dataMapping is SCREEN-only (from the second argument). Used for the main screen API and data model.
 * - Bottom sheet: each BottomSheet node in root has its own sheetDataMapping (sheet-only). Never mixed with screen.
 * Canvas view is not exported. When there is exactly one top-level component, export it as root.
 */
export function toCanonicalJSON(tree, screenDataMapping) {
    if (!tree) return null;
    const children = tree.children || [];
    let rootNode;
    if (children.length === 1) {
        rootNode = {...children[0], fitToScreen: tree.fitToScreen, presentationStyle: tree.presentationStyle != null ? tree.presentationStyle : "push" };
    } else {
        rootNode = {
            ...tree,
            id: "screen",
            children,
            presentationStyle: tree.presentationStyle != null ? tree.presentationStyle : "push",
        };
    }
    const doc = {
        schemaVersion: SCHEMA_VERSION,
        root: nodeToCanonical(rootNode),
    };
    const dm = screenDataMapping != null && typeof screenDataMapping === "object" ? screenDataMapping : {};
    const sid = typeof tree.screenId === "string" ? tree.screenId : dm.screenId;
    doc.screenId = sid != null && sid !== "" ? sid : "";
    doc.dataMapping = buildScreenDataMappingForExport(screenDataMapping);
    return doc;
}

/**
 * Parse canonical JSON back into builder tree (for import).
 * Returns a canvas root (id: "root") whose children are the file's top-level content.
 * - If file root is a wrapper (id "screen" or multiple children): use its children as canvas root children.
 * - If file root is a single component (one view in file): use it as the only child of the canvas root.
 */
export function fromCanonicalJSON(doc) {
    if (!doc || !doc.root) return null;
    const fileRoot = doc.root;
    const isWrapper = fileRoot.id === "screen" || (fileRoot.type === "View" && Array.isArray(fileRoot.children) && fileRoot.children.length > 1);
    const children = isWrapper ?
        (fileRoot.children || []).map(nodeFromCanonical).filter(Boolean) : [nodeFromCanonical(fileRoot)].filter(Boolean);
    const presentationStyle = fileRoot.presentationStyle != null && ["push", "present", "modal"].includes(fileRoot.presentationStyle) ? fileRoot.presentationStyle : "push";
    return {
        id: "root",
        type: "View",
        children,
        fitToScreen: fileRoot.fitToScreen === true,
        screenId: typeof doc.screenId === "string" ? doc.screenId : "",
        presentationStyle,
    };
}

/** Restore node from canonical JSON; all type-specific and style properties applied with defaults when missing */
function nodeFromCanonical(n) {
    if (!n || !n.type) return null;
    const node = {
        id: n.id != null ? n.id : randomUUID(),
        type: n.type,
        ...(n.style || {}),
    };
    if (n.type === "View" || n.type === "VStack" || n.type === "HStack" || n.type === "ZStack" || n.type === "List" || n.type === "ListItemContent" || n.type === "BottomSheet") {
        node.children = (n.children || []).map(nodeFromCanonical).filter(Boolean);
    }
    if (n.type === "View") {
        node.fitToScreen = n.fitToScreen != null ? n.fitToScreen : false;
        node.presentationStyle = n.presentationStyle != null && ["push", "present", "modal"].includes(n.presentationStyle) ? n.presentationStyle : "push";
    }
    if (n.type === "VStack" || n.type === "HStack") {
        node.spacing = n.spacing != null ? n.spacing : 12;
        node.alignment = n.alignment != null ? n.alignment : "center";
    }
    if (n.type === "ZStack") node.alignment = n.alignment != null ? n.alignment : "center";
    if (n.type === "Text") {
        node.text = n.text != null ? n.text : "Hello";
        node.alignment = n.alignment != null ? n.alignment : "start";
        node.numberOfLines = typeof n.numberOfLines === "number" && n.numberOfLines >= 0 ? n.numberOfLines : 0;
        node.boundListItemProperty = n.boundListItemProperty != null ? String(n.boundListItemProperty) : "";
    }
    if (n.type === "Button") {
        node.title = n.title != null ? n.title : "Tap Me";
        node.boundListItemProperty = n.boundListItemProperty != null ? String(n.boundListItemProperty) : "";
    }
    if (n.type === "Image") {
        node.src = n.src != null ? n.src : "";
        node.alt = n.alt != null ? n.alt : "Image";
        node.contentMode = n.contentMode != null ? n.contentMode : "contain";
        node.useAsset = n.useAsset === true;
        node.assetBundleName = n.assetBundleName != null ? n.assetBundleName : "";
        node.assetImageName = n.assetImageName != null ? n.assetImageName : "";
        node.boundListItemProperty = n.boundListItemProperty != null ? String(n.boundListItemProperty) : "";
        node.showLoadingIndicator = n.showLoadingIndicator === true;
    }
    if (n.type === "List") {
        node.items = Array.isArray(n.items) ? n.items : ["Item 1", "Item 2", "Item 3"];
        node.loadMoreEnabled = n.loadMoreEnabled === true;
        node.loadMoreFooterLabel = n.loadMoreFooterLabel != null ? String(n.loadMoreFooterLabel) : "Load more";
        node.loadMoreLoadingLabel = n.loadMoreLoadingLabel != null ? String(n.loadMoreLoadingLabel) : "Loading...";
        node.sectionGroupingEnabled = n.sectionGroupingEnabled === true;
        node.listRowSpacing = typeof n.listRowSpacing === "number" ? n.listRowSpacing : 0;
        node.listSpacingAboveFirst = typeof n.listSpacingAboveFirst === "number" ? n.listSpacingAboveFirst : 0;
        node.listSpacingBelowLast = typeof n.listSpacingBelowLast === "number" ? n.listSpacingBelowLast : 0;
    }
    if (n.type === "ListItemText") {
        node.itemProperty = n.itemProperty != null ? String(n.itemProperty) : "";
    }
    if (n.type === "TextField") {
        node.placeholder = n.placeholder != null ? n.placeholder : "Enter text";
        node.text = n.text != null ? n.text : "";
    }
    if (n.type === "Toggle") {
        node.isOn = n.isOn === true;
        node.label = n.label != null ? n.label : "Toggle";
    }
    if (n.type === "Slider") {
        node.value = n.value != null ? n.value : 50;
        node.min = n.min != null ? n.min : 0;
        node.max = n.max != null ? n.max : 100;
    }
    if (n.type === "Picker") {
        node.selection = n.selection != null ? n.selection : "Option 1";
        node.options = Array.isArray(n.options) ? n.options : ["Option 1", "Option 2", "Option 3"];
    }
    if (n.type === "ProgressView") {
        node.progress = n.progress != null ? n.progress : 0.5;
        node.indeterminate = n.indeterminate === true;
    }
    if (n.type === "Divider") node.axis = n.axis != null ? n.axis : "horizontal";
    if (n.type === "Spacer") { /* no extra props */ }
    if (n.type === "Link") {
        node.url = n.url != null ? n.url : "https://example.com";
        node.label = n.label != null ? n.label : "Link";
    }
    if (n.type === "SecureField") {
        node.placeholder = n.placeholder != null ? n.placeholder : "Password";
        node.text = n.text != null ? n.text : "";
    }
    if (n.type === "BottomSheet") {
        bottomSheetFromCanonical(n, node);
    }
    // Localization and accessibility (all nodes)
    node.localizationEnabled = n.localizationEnabled === true;
    node.localizationKey = n.localizationKey != null ? String(n.localizationKey) : "";
    node.localizationDefaultValue = n.localizationDefaultValue != null ? String(n.localizationDefaultValue) : "";
    node.accessibilityEnabled = n.accessibilityEnabled === true;
    node.accessibilityIdentifier = n.accessibilityIdentifier != null ? String(n.accessibilityIdentifier) : "";
    node.accessibilityLabel = n.accessibilityLabel != null ? String(n.accessibilityLabel) : "";
    // Behavior (all nodes)
    node.tag = typeof n.tag === "number" && !Number.isNaN(n.tag) ? n.tag : 0;
    node.isUserInteractionEnabled = n.isUserInteractionEnabled !== false;
    node.isHidden = n.isHidden === true;
    node.automationIdentifier = n.automationIdentifier != null ? String(n.automationIdentifier) : "";
    // Action (all nodes)
    node.actionId = n.actionId != null ? String(n.actionId) : "";
    node.actionEvent = n.actionEvent != null ? String(n.actionEvent) : "";
    node.actionBoundNodeId = n.actionBoundNodeId != null ? String(n.actionBoundNodeId) : "";
    node.actionBoundProperty = n.actionBoundProperty != null ? String(n.actionBoundProperty) : "";
    node.actionBoundDataModelId = n.actionBoundDataModelId != null ? String(n.actionBoundDataModelId) : "";
    // Gestures
    node.gestures = Array.isArray(n.gestures) ? n.gestures.map((g) => ({
        type: g && g.type != null ? String(g.type) : "tap",
        minDuration: typeof(g && g.minDuration) === "number" ? g.minDuration : undefined,
    })) : [];
    // Display format
    const ndf = n.displayFormat;
    node.displayFormat = ndf && typeof ndf === "object" && ndf.type ? { type: String(ndf.type), pattern: ndf.pattern != null ? String(ndf.pattern) : undefined, locale: ndf.locale != null ? String(ndf.locale) : undefined, formatterId: ndf.formatterId != null ? String(ndf.formatterId) : undefined } :
        null;
    node.fillRemainingWidth = n.fillRemainingWidth === true;
    node.componentName = n.componentName != null ? String(n.componentName) : "";
    return node;
}