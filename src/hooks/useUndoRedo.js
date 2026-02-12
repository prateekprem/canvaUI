import { useRef, useCallback, useState } from "react";

const MAX_HISTORY = 50;

/**
 * Snapshot of all undoable state (tree + screen data mapping).
 * Used for undo/redo history.
 */
export function createSnapshot(state) {
    return {
        tree: state.tree,
        dataModel: state.dataModel,
        mockApiJson: state.mockApiJson,
        mockApiBindings: state.mockApiBindings,
        apiConfigMethod: state.apiConfigMethod,
        apiUrl: state.apiUrl,
        apiMethod: state.apiMethod,
        loadMorePageParamName: state.loadMorePageParamName,
        loadMorePageParamInQuery: state.loadMorePageParamInQuery,
        loadMoreHasNextPagePath: state.loadMoreHasNextPagePath,
    };
}

/**
 * Deep-clone snapshot so history entries are immutable.
 */
function cloneSnapshot(snap) {
    return {
        tree: JSON.parse(JSON.stringify(snap.tree)),
        dataModel: snap.dataModel ? [...snap.dataModel] : [],
        mockApiJson: snap.mockApiJson != null && typeof snap.mockApiJson === "object" ? JSON.parse(JSON.stringify(snap.mockApiJson)) : null,
        mockApiBindings: snap.mockApiBindings ? [...snap.mockApiBindings] : [],
        apiConfigMethod: snap.apiConfigMethod,
        apiUrl: snap.apiUrl,
        apiMethod: snap.apiMethod,
        loadMorePageParamName: snap.loadMorePageParamName,
        loadMorePageParamInQuery: snap.loadMorePageParamInQuery,
        loadMoreHasNextPagePath: snap.loadMoreHasNextPagePath,
    };
}

/**
 * Hook for undo/redo over tree + data mapping.
 * - refs: { current: snapshot } ref that the caller keeps in sync with current state each render
 * - restore: (snapshot) => void — applies a snapshot (raw setters, no push)
 * Returns: { pushSnapshot, undo, redo, canUndo, canRedo }
 */
export function useUndoRedo(getCurrentSnapshot, restore) {
    const historyRef = useRef([]);
    const redoRef = useRef([]);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const updateFlags = useCallback(() => {
        setCanUndo(historyRef.current.length > 0);
        setCanRedo(redoRef.current.length > 0);
    }, []);

    const pushSnapshot = useCallback(() => {
        const snap = getCurrentSnapshot();
        const cloned = cloneSnapshot(snap);
        historyRef.current = [...historyRef.current.slice(-(MAX_HISTORY - 1)), cloned];
        redoRef.current = [];
        updateFlags();
    }, [getCurrentSnapshot, updateFlags]);

    const undo = useCallback(() => {
        if (historyRef.current.length === 0) return;
        const prev = historyRef.current.pop();
        redoRef.current = [...redoRef.current, cloneSnapshot(getCurrentSnapshot())];
        restore(prev);
        updateFlags();
    }, [getCurrentSnapshot, restore, updateFlags]);

    const redo = useCallback(() => {
        if (redoRef.current.length === 0) return;
        const next = redoRef.current.pop();
        historyRef.current = [...historyRef.current, cloneSnapshot(getCurrentSnapshot())];
        restore(next);
        updateFlags();
    }, [getCurrentSnapshot, restore, updateFlags]);

    return { pushSnapshot, undo, redo, canUndo, canRedo };
}