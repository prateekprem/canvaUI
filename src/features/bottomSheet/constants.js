/**
 * Bottom Sheet feature constants and keys.
 * Other modules use these to integrate without hardcoding strings.
 */

export const BOTTOM_SHEET_TYPE = "BottomSheet";

/** Action event value: when set on a control (e.g. Button), opening the referenced sheet. */
export const ACTION_OPEN_BOTTOM_SHEET = "openBottomSheet";

export const DETENT_OPTIONS = [
    { value: "small", label: "Small (peek)" },
    { value: "medium", label: "Half" },
    { value: "large", label: "Full" },
];

/** Keys to merge into STYLE_AND_LAYOUT_KEYS so sheet props persist on update. */
export function getBottomSheetLayoutKeys() {
    return [
        "sheetDetent",
        "sheetDismissible",
        "sheetShowHandle",
        "sheetBackdropOpacity",
        "sheetDataMapping",
        "actionId",
        "actionEvent",
    ];
}

/** Display name for Sidebar / Inspector. */
export const BOTTOM_SHEET_DISPLAY_NAME = "Bottom sheet";

/** Short description for Sidebar / Inspector. */
export const BOTTOM_SHEET_DESCRIPTION = "Modal sheet from bottom; has its own data mapping and can be opened by controls (e.g. Button with action Open bottom sheet).";