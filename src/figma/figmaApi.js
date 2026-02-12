/**
 * Figma REST API helpers.
 * Requires a Figma personal access token (from Figma → Settings → Personal access tokens).
 * Set VITE_FIGMA_ACCESS_TOKEN in .env or pass token when calling.
 */

const FIGMA_API_BASE = "https://api.figma.com/v1";

/**
 * Extract file key from Figma URL.
 * Supports: figma.com/file/<key>, figma.com/design/<key>, figma.com/proto/<key>
 * @param {string} url
 * @returns {string|null}
 */
export function getFileKeyFromUrl(url) {
    if (!url || typeof url !== "string") return null;
    const trimmed = url.trim();
    const match = trimmed.match(/figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

/**
 * Extract node ID from Figma URL query (e.g. ?node-id=1-2).
 * Figma uses hyphenated node IDs; API expects comma-separated for multiple.
 * @param {string} url
 * @returns {string|null}
 */
export function getNodeIdFromUrl(url) {
    if (!url || typeof url !== "string") return null;
    const u = new URL(url.trim(), "https://figma.com");
    const nodeId = u.searchParams.get("node-id") || u.searchParams.get("node_id");
    if (!nodeId) return null;
    return nodeId.replace(/^node-/, "").trim();
}

/**
 * Fetch Figma file (document) with optional node ID to get a specific node.
 * @param {string} fileKey - from getFileKeyFromUrl
 * @param {string} [token] - Figma access token (or use import.meta.env.VITE_FIGMA_ACCESS_TOKEN)
 * @param {string} [nodeId] - optional node ID for deep link
 * @returns {Promise<object>} Figma file response { name, document, ... }
 */
export async function fetchFigmaFile(fileKey, token, nodeId) {
    const t = token || (typeof
        import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_FIGMA_ACCESS_TOKEN);
    if (!t) throw new Error("Figma access token required. Set VITE_FIGMA_ACCESS_TOKEN in .env or pass token.");
    const idsParam = nodeId ? encodeURIComponent(urlNodeIdToApiId(nodeId)) : null;
    const url = idsParam ?
        `${FIGMA_API_BASE}/files/${fileKey}?ids=${idsParam}` :
        `${FIGMA_API_BASE}/files/${fileKey}`;
    const res = await fetch(url, {
        method: "GET",
        headers: { "X-Figma-Token": t },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Figma API error ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
}

/**
 * Get image URL for a node (or multiple). Renders the node as PNG.
 * @param {string} fileKey
 * @param {string|string[]} nodeIds - one or more node IDs
 * @param {string} [token]
 * @param {{ format?: string; scale?: number }} [opts] - format: png, jpg, svg; scale: 1, 2, 4
 * @returns {Promise<{ images: Record<string, string> }>} nodeId -> image URL
 */
export async function fetchFigmaImageUrls(fileKey, nodeIds, token, opts = {}) {
    const t = token || (typeof
        import.meta !== "undefined" &&
        import.meta.env &&
        import.meta.env.VITE_FIGMA_ACCESS_TOKEN);
    if (!t) throw new Error("Figma access token required.");
    const ids = Array.isArray(nodeIds) ? nodeIds : [nodeIds];
    const format = opts.format || "png";
    const scale = opts.scale || 2;
    const params = new URLSearchParams({ ids: ids.join(","), format, scale: String(scale) });
    const res = await fetch(`${FIGMA_API_BASE}/images/${fileKey}?${params}`, {
        method: "GET",
        headers: { "X-Figma-Token": t },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Figma Images API error ${res.status}: ${text || res.statusText}`);
    }
    const data = await res.json();
    return { images: data.images || {} };
}

/** Figma URL uses hyphens (16608-6017); API uses colons (16608:6017). Normalize for lookup. */
function urlNodeIdToApiId(urlNodeId) {
    const s = String(urlNodeId).replace(/%2D/gi, "-").trim();
    return s.replace(/-/g, ":");
}

/**
 * Get the root node to render (first page, first frame, or specified node).
 * @param {object} fileResponse - from fetchFigmaFile
 * @param {string|null} [preferNodeId] - optional node ID from URL (hyphenated, e.g. "1-2")
 * @returns {{ node: object; nodeId: string }|null}
 */
export function getRootNodeFromFile(fileResponse, preferNodeId) {
    const doc = fileResponse && fileResponse.document;
    if (!doc || !doc.children || doc.children.length === 0) return null;
    if (preferNodeId) {
        const apiId = urlNodeIdToApiId(preferNodeId);
        const found = findNodeById(doc, apiId);
        if (found) return { node: found, nodeId: found.id };
    }
    const firstPage = doc.children[0];
    if (!firstPage.children || firstPage.children.length === 0) return null;
    const firstFrame = firstPage.children[0];
    return { node: firstFrame, nodeId: firstFrame.id };
}

function findNodeById(node, id) {
    if (!node) return null;
    if (String(node.id) === String(id)) return node;
    const children = node.children;
    if (!children) return null;
    for (const c of children) {
        const found = findNodeById(c, id);
        if (found) return found;
    }
    return null;
}