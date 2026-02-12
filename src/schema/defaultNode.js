import { getDefaultStyle } from "./styles";
import { BOTTOM_SHEET_DISPLAY_NAME, BOTTOM_SHEET_DESCRIPTION, getBottomSheetDefaultNode } from "../features/bottomSheet";
import { randomUUID } from "../utils/uuid";

/** SwiftUI-style: View, VStack, HStack, ZStack, List, ListItemContent (table cell), BottomSheet are containers */
export const CONTAINER_TYPES = ["View", "VStack", "HStack", "ZStack", "List", "ListItemContent", "BottomSheet"];
export const isContainer = (node) => node && CONTAINER_TYPES.includes(node.type);

/** Composite component names (View with componentName) → display label */
export const COMPONENT_DISPLAY_NAMES = {
    NavigationBar: "Navigation bar",
    View: "Container",
    VStack: "Vertical stack",
    HStack: "Horizontal stack",
    ZStack: "Z stack",
    Text: "Text",
    Button: "Button",
    Image: "Image",
    List: "List",
    BottomSheet: BOTTOM_SHEET_DISPLAY_NAME,
    ListItemContent: "Table cell",
    ListItemText: "Item text",
    TextField: "Text field",
    Toggle: "Toggle",
    Slider: "Slider",
    Picker: "Picker",
    ProgressView: "Progress",
    Divider: "Divider",
    Spacer: "Spacer",
    Link: "Link",
    SecureField: "Secure field",
};

/** Short descriptions for the Sidebar / Inspector */
export const COMPONENT_DESCRIPTIONS = {
    NavigationBar: "Full-width bar with left button, title text, and right button (exports as View tree)",
    View: "A box that holds other elements",
    VStack: "Stack items top to bottom",
    HStack: "Stack items left to right",
    ZStack: "Stack items on top of each other",
    Text: "A line of text",
    Button: "A tappable button",
    Image: "A picture from a URL",
    List: "A list of items (add a row template as child)",
    BottomSheet: BOTTOM_SHEET_DESCRIPTION,
    ListItemContent: "Table cell — add controls inside (Item text, Text, Button, etc.)",
    ListItemText: "Shows current row’s item (use inside Table cell)",
    TextField: "Single-line text input",
    Toggle: "On/off switch",
    Slider: "Value slider with range",
    Picker: "Selection from options",
    ProgressView: "Progress bar (determinate or indeterminate)",
    Divider: "Horizontal or vertical line",
    Spacer: "Flexible space (use inside VStack or HStack)",
    Link: "URL link with label",
    SecureField: "Password text input",
};

export function getDisplayName(type) {
    return COMPONENT_DISPLAY_NAMES[type] != null ? COMPONENT_DISPLAY_NAMES[type] : type;
}

/** Display name for a node: uses componentName for composites (e.g. NavigationBar), else type-based name. */
export function getNodeDisplayName(node) {
    if (!node) return "";
    if (node.componentName && COMPONENT_DISPLAY_NAMES[node.componentName] != null)
        return COMPONENT_DISPLAY_NAMES[node.componentName];
    if (node.type === "Text") return (node.text || "Text").slice(0, 30);
    if (node.type === "Button") return (node.title || "Button").slice(0, 30);
    return getDisplayName(node.type);
}

export function getDescription(type) {
    return COMPONENT_DESCRIPTIONS[type] != null ? COMPONENT_DESCRIPTIONS[type] : "";
}

/** Layout modes (Apple-style): Auto Layout (flow), Auto Resize (fill parent), Free Form (fixed frame) */
export const LAYOUT_MODES = ["autoLayout", "autoResize", "freeForm"];

/** Default style from central style list (styles.js) – call fresh so new nodes always get all current keys */
function getFullDefaults() {
    const style = getDefaultStyle();
    const padding = { paddingHorizontal: 0, paddingVertical: 0, paddingTop: 0, paddingBottom: 0 };
    const margin = { marginHorizontal: 0, marginVertical: 0, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 };
    const inset = { insetFromParentTop: 0, insetFromParentLeft: 0, insetFromParentBottom: 0, insetFromParentRight: 0 };
    const layout = { layoutMode: "autoLayout", x: 0, y: 0, autoResize: false };
    const localization = { localizationEnabled: false, localizationKey: "", localizationDefaultValue: "" };
    const accessibility = { accessibilityEnabled: false, accessibilityIdentifier: "", accessibilityLabel: "" };
    const behavior = { tag: 0, isUserInteractionEnabled: true, isHidden: false, automationIdentifier: "" };
    const action = { actionId: "", actionEvent: "", actionBoundNodeId: "", actionBoundProperty: "", actionBoundDataModelId: "" };
    const gestures = { gestures: [] };
    const displayFormat = { displayFormat: null };
    return {...style, ...padding, ...margin, ...inset, ...layout, ...localization, ...accessibility, ...behavior, ...action, ...gestures, ...displayFormat };
}

export const defaultStyle = getDefaultStyle();

export const createNode = (type) => {
    const id = randomUUID();
    const base = getFullDefaults();

    switch (type) {
        case "Text":
            return { id, type: "Text", text: "Hello", alignment: "start", numberOfLines: 0, color: "#111111", boundListItemProperty: "", ...base };

        case "Button":
            return { id, type: "Button", title: "Tap Me", boundListItemProperty: "", gestures: [{ type: "tap" }], ...base };

        case "Image":
            return { id, type: "Image", src: "", alt: "Image", contentMode: "contain", useAsset: false, assetBundleName: "", assetImageName: "", boundListItemProperty: "", showLoadingIndicator: false, ...base };

        case "View":
            return { id, type: "View", children: [], ...base, backgroundColor: "#ffffff", presentationStyle: "push" };

        case "VStack":
        case "HStack":
            return { id, type, spacing: 12, alignment: "center", children: [], ...base, backgroundColor: "#ffffff" };

        case "ZStack":
            return { id, type: "ZStack", alignment: "center", children: [], ...base, backgroundColor: "#ffffff" };

        case "List":
            return { id, type: "List", items: ["Item 1", "Item 2", "Item 3"], children: [], loadMoreEnabled: false, loadMoreFooterLabel: "Load more", loadMoreLoadingLabel: "Loading...", sectionGroupingEnabled: false, listRowSpacing: 0, listSpacingAboveFirst: 0, listSpacingBelowLast: 0, ...base };

        case "BottomSheet":
            return getBottomSheetDefaultNode(id, base);

        case "ListItemContent":
            return { id, type: "ListItemContent", children: [], ...base };
        case "ListItemText":
            return { id, type: "ListItemText", itemProperty: "", ...base };

        case "TextField":
            return { id, type: "TextField", placeholder: "Enter text", text: "", ...base };

        case "Toggle":
            return { id, type: "Toggle", isOn: false, label: "Toggle", ...base };

        case "Slider":
            return { id, type: "Slider", value: 50, min: 0, max: 100, ...base };

        case "Picker":
            return { id, type: "Picker", selection: "Option 1", options: ["Option 1", "Option 2", "Option 3"], ...base };

        case "ProgressView":
            return { id, type: "ProgressView", progress: 0.5, indeterminate: false, ...base };

        case "Divider":
            return { id, type: "Divider", axis: "horizontal", ...base };

        case "Spacer":
            return { id, type: "Spacer", ...base };

        case "Link":
            return { id, type: "Link", url: "https://example.com", label: "Link", ...base };

        case "SecureField":
            return { id, type: "SecureField", placeholder: "Password", text: "", ...base };

        default:
            return null;
    }
};

/**
 * Creates a composite NavigationBar: a single HStack (70px) containing
 * left ZStack (70px, Image + Button), center Text, right ZStack (70px, Image + Button).
 * No View or VStack wrapper; the HStack is the nav bar and is added directly to the canvas.
 */
const NAV_BAR_BUTTON_SIZE = 44;

export function createNavigationBarNode() {
    const leftImage = createNode("Image");
    leftImage.src = "";
    leftImage.alt = "Left";
    leftImage.width = NAV_BAR_BUTTON_SIZE;
    leftImage.height = NAV_BAR_BUTTON_SIZE;
    const leftButton = createNode("Button");
    leftButton.title = "";
    leftButton.width = NAV_BAR_BUTTON_SIZE;
    leftButton.height = NAV_BAR_BUTTON_SIZE;
    const leftZStack = createNode("ZStack");
    leftZStack.width = 70;
    leftZStack.height = 70;
    leftZStack.children = [leftImage, leftButton];

    const titleText = createNode("Text");
    titleText.text = "Title";
    titleText.alignment = "center";
    titleText.fillRemainingWidth = true;

    const rightImage = createNode("Image");
    rightImage.src = "";
    rightImage.alt = "Right";
    rightImage.width = NAV_BAR_BUTTON_SIZE;
    rightImage.height = NAV_BAR_BUTTON_SIZE;
    const rightButton = createNode("Button");
    rightButton.title = "";
    rightButton.width = NAV_BAR_BUTTON_SIZE;
    rightButton.height = NAV_BAR_BUTTON_SIZE;
    const rightZStack = createNode("ZStack");
    rightZStack.width = 70;
    rightZStack.height = 70;
    rightZStack.alignment = "trailing";
    rightZStack.children = [rightImage, rightButton];

    const hstack = createNode("HStack");
    hstack.componentName = "NavigationBar";
    hstack.spacing = 0;
    hstack.alignment = "center";
    hstack.height = 70;
    hstack.children = [leftZStack, titleText, rightZStack];
    return hstack;
}