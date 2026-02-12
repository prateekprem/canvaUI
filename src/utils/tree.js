/** Compare ids consistently (string vs number from JSON restore) */
function idEq(a, b) {
    if (a == null && b == null) return true;
    if (a == null || b == null) return false;
    return String(a) === String(b);
}

/**
 * Remove a node by id from the tree. Returns { tree, node } (node is the removed one).
 */
export function removeNodeFromTree(tree, nodeId) {
    if (!tree) return { tree: null, node: null };

    const direct = (tree.children || []).findIndex((c) => idEq(c.id, nodeId));
    if (direct >= 0) {
        const node = tree.children[direct];
        const newChildren = [
            ...tree.children.slice(0, direct),
            ...tree.children.slice(direct + 1),
        ];
        return { tree: {...tree, children: newChildren }, node };
    }

    if (tree.children) {
        let removed = null;
        const newChildren = tree.children.map((child) => {
            const { tree: newChild, node } = removeNodeFromTree(child, nodeId);
            if (node) removed = node;
            return newChild;
        });
        if (removed) return { tree: {...tree, children: newChildren }, node: removed };
    }

    return { tree, node: null };
}

/**
 * Insert a node as a child of parentId at index. Returns new tree.
 */
export function addNodeToTree(tree, parentId, node, index) {
    if (idEq(tree.id, parentId)) {
        const children = [...(tree.children || [])];
        children.splice(Math.min(index, children.length), 0, node);
        return {...tree, children };
    }
    if (tree.children) {
        return {
            ...tree,
            children: tree.children.map((child) =>
                addNodeToTree(child, parentId, node, index)
            ),
        };
    }
    return tree;
}

/** True if `node` has a descendant with id `descendantId`. */
export function hasDescendant(node, descendantId) {
    if (!node) return false;
    if (idEq(node.id, descendantId)) return true;
    return (node.children || []).some((c) => hasDescendant(c, descendantId));
}

/** Find a node in the tree by id. Returns the node or null. */
export function findNodeInTree(tree, nodeId) {
    if (!tree) return null;
    const id = tree.id != null ? String(tree.id) : null;
    if (idEq(id, nodeId)) return tree;
    const children = tree.children || [];
    for (let i = 0; i < children.length; i++) {
        const found = findNodeInTree(children[i], nodeId);
        if (found) return found;
    }
    return null;
}

/** Find the parent of a node by id. Returns the parent node or null. */
export function findParentInTree(tree, nodeId) {
    if (!tree || !nodeId) return null;
    const children = tree.children || [];
    for (let i = 0; i < children.length; i++) {
        if (idEq(children[i].id, nodeId)) return tree;
        const found = findParentInTree(children[i], nodeId);
        if (found) return found;
    }
    return null;
}

/** Path from root to node (array of type names, e.g. ["View", "VStack", "Text"]). Empty if not found. */
export function getPathToNode(tree, nodeId, path = []) {
    if (!tree) return [];
    const type = tree.type || "View";
    const currentPath = [...path, type];
    if (idEq(tree.id, nodeId)) return currentPath;
    const children = tree.children || [];
    for (let i = 0; i < children.length; i++) {
        const found = getPathToNode(children[i], nodeId, currentPath);
        if (found.length > 0) return found;
    }
    return [];
}