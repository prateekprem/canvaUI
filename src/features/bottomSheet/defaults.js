/**
 * Bottom Sheet default node. Used by defaultNode.createNode when type is BottomSheet.
 */

import { BOTTOM_SHEET_TYPE } from "./constants";

/**
 * @param {string} id
 * @param {Object} base - full default style/layout from getFullDefaults()
 * @returns {Object} new Bottom Sheet node
 */
export function getBottomSheetDefaultNode(id, base) {
    return {
        id,
        type: BOTTOM_SHEET_TYPE,
        children: [],
        sheetDetent: "medium",
        sheetDismissible: true,
        sheetShowHandle: true,
        sheetBackdropOpacity: 0.5,
        sheetDataMapping: null,
        ...base,
    };
}