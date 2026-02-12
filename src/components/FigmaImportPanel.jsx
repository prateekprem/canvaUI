import { useState, useCallback } from "react";
import {
  getFileKeyFromUrl,
  getNodeIdFromUrl,
  fetchFigmaFile,
  fetchFigmaImageUrls,
  getRootNodeFromFile,
} from "../figma/figmaApi";
import { figmaToCanonicalDocument } from "../figma/figmaToCanonical";
import { fromCanonicalJSON } from "../schema/canonicalSchema";

const STORAGE_TOKEN_KEY = "ui-builder-figma-token";

function collectNodeList(node, list = [], depth = 0) {
  if (!node) return list;
  list.push({
    id: node.id,
    name: node.name || node.type || "?",
    type: node.type,
    bounds: node.absoluteBoundingBox || node.absoluteRenderBounds,
    depth,
  });
  (node.children || []).forEach((c) => collectNodeList(c, list, depth + 1));
  return list;
}

/** Collect all node IDs from a Figma node tree (for image export). */
function collectNodeIds(node, ids = []) {
  if (!node || !node.id) return ids;
  ids.push(node.id);
  (node.children || []).forEach((c) => collectNodeIds(c, ids));
  return ids;
}

export default function FigmaImportPanel({ onImport, onClose }) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY) || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [convertedDoc, setConvertedDoc] = useState(null);

  const handleLoad = useCallback(async () => {
    setError(null);
    setFileData(null);
    setPreviewImageUrl(null);
    setConvertedDoc(null);
    const fileKey = getFileKeyFromUrl(url);
    if (!fileKey) {
      setError("Invalid Figma URL. Use figma.com/file/... or figma.com/design/...");
      return;
    }
    const t = token.trim();
    if (!t) {
      setError("Figma access token required. Get one from Figma → Settings → Personal access tokens.");
      return;
    }
    setLoading(true);
    try {
      const nodeId = getNodeIdFromUrl(url);
      const fileResponse = await fetchFigmaFile(fileKey, t, nodeId);
      const rootInfo = getRootNodeFromFile(fileResponse, nodeId);
      if (!rootInfo) {
        setError("No frame found in file.");
        setLoading(false);
        return;
      }
      setFileData({ fileResponse, rootNode: rootInfo.node, rootNodeId: rootInfo.nodeId });
      const { images } = await fetchFigmaImageUrls(fileKey, [rootInfo.nodeId], t, { scale: 2 });
      const imgUrl = images[rootInfo.nodeId];
      setPreviewImageUrl(imgUrl || null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [url, token]);

  const handleFigmaToCanvasJson = useCallback(async () => {
    if (!fileData || !fileData.rootNode || !url.trim() || !token.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const fileKey = getFileKeyFromUrl(url);
      const nodeIds = collectNodeIds(fileData.rootNode);
      const t = token.trim();
      let imageUrls = {};
      if (fileKey && nodeIds.length > 0) {
        try {
          const batchSize = 50;
          for (let i = 0; i < nodeIds.length; i += batchSize) {
            const batch = nodeIds.slice(i, i + batchSize);
            const { images } = await fetchFigmaImageUrls(fileKey, batch, t, { scale: 2, format: "png" });
            imageUrls = { ...imageUrls, ...images };
          }
        } catch (imgErr) {
          console.warn("Figma image export (optional):", imgErr.message);
        }
      }
      const doc = figmaToCanonicalDocument(fileData.rootNode, imageUrls);
      setConvertedDoc(doc);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [fileData, url, token]);

  const handleImportToCanvas = useCallback(() => {
    if (!convertedDoc || !onImport) return;
    try {
      const tree = fromCanonicalJSON(convertedDoc);
      const dataMapping = convertedDoc.dataMapping && typeof convertedDoc.dataMapping === "object"
        ? convertedDoc.dataMapping
        : null;
      onImport(tree, dataMapping);
      onClose && onClose();
    } catch (err) {
      setError(err.message || String(err));
    }
  }, [convertedDoc, onImport, onClose]);

  const nodeList = fileData && fileData.rootNode ? collectNodeList(fileData.rootNode) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-lg">Import from Figma</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Figma file URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://figma.com/file/..."
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Figma access token</label>
            <input
              type="password"
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                try { localStorage.setItem(STORAGE_TOKEN_KEY, e.target.value); } catch (_) {}
              }}
              placeholder="Paste token from Figma → Settings → Personal access tokens"
              className="w-full p-2 border border-gray-300 rounded text-sm"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>
          )}

          <button
            type="button"
            onClick={handleLoad}
            disabled={loading}
            className="w-full py-2 px-3 bg-slate-600 text-white text-sm font-medium rounded shadow hover:bg-slate-500 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load Figma file"}
          </button>

          {fileData && (
            <>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt="Figma preview"
                    className="max-w-full max-h-48 object-contain border border-gray-200 rounded"
                  />
                ) : (
                  <p className="text-sm text-gray-500">No preview image (optional)</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Properties (nodes)</h3>
                <ul className="border border-gray-200 rounded overflow-hidden max-h-32 overflow-y-auto text-xs">
                  {nodeList.slice(0, 50).map((n) => (
                    <li
                      key={n.id}
                      className="px-2 py-1 border-b border-gray-100 last:border-0 flex gap-2"
                      style={{ paddingLeft: 8 + n.depth * 12 }}
                    >
                      <span className="font-mono text-amber-700">{n.type}</span>
                      <span className="truncate">{n.name}</span>
                      {n.bounds && (
                        <span className="text-gray-400 shrink-0">
                          {Math.round(n.bounds.width)}×{Math.round(n.bounds.height)}
                        </span>
                      )}
                    </li>
                  ))}
                  {nodeList.length > 50 && (
                    <li className="px-2 py-1 text-gray-400">… and {nodeList.length - 50} more</li>
                  )}
                </ul>
              </div>
              <button
                type="button"
                onClick={handleFigmaToCanvasJson}
                className="w-full py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded shadow hover:bg-blue-500"
              >
                Figma to Canvas JSON
              </button>
            </>
          )}

          {convertedDoc && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">JSON created. Import to replace current canvas.</p>
              <button
                type="button"
                onClick={handleImportToCanvas}
                className="w-full py-2 px-3 bg-green-600 text-white text-sm font-medium rounded shadow hover:bg-green-500"
              >
                Import to Canvas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
