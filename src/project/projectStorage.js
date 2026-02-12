/**
 * Save project as a folder (zip with project.json + screens/<id>.json).
 * Open project from .zip or single .json file.
 */

import { projectManifest, normalizeProject } from "./projectModel";

const MANIFEST_FILENAME = "project.json";
const SCREENS_DIR = "screens";

/**
 * Build project as a single JSON (for single-file open/save or in-memory).
 * Full project: manifest + all screen trees.
 */
export function projectToSingleJSON(project, dataMapping = null) {
    if (!project || !Array.isArray(project.screens)) return null;
    const manifest = projectManifest(project);
    const payload = {
        ...manifest,
        screens: project.screens.map((s) => ({
            id: s.id,
            name: s.name,
            presentationStyle: s.presentationStyle,
            order: s.order,
            tree: s.tree,
        })),
    };
    if (dataMapping != null && typeof dataMapping === "object") {
        payload.dataMapping = dataMapping;
    }
    return payload;
}

/**
 * Parse a single project JSON (from file or from zip root project.json).
 * Returns normalized project or null.
 */
export function parseProjectFromJSON(obj) {
    if (!obj || typeof obj !== "object") return null;
    const screens = Array.isArray(obj.screens) ? obj.screens : [];
    const normalized = normalizeProject({
        id: obj.id,
        name: obj.name,
        createdAt: obj.createdAt,
        updatedAt: obj.updatedAt,
        screens: screens.map((s) => ({
            id: s.id,
            name: s.name,
            tree: s.tree,
            presentationStyle: s.presentationStyle,
            order: s.order,
        })),
    });
    return normalized;
}

/**
 * Extract data mapping from a loaded project JSON (if present).
 */
export function getDataMappingFromProjectJSON(obj) {
    if (!obj || typeof obj !== "object" || !obj.dataMapping) return null;
    const dm = obj.dataMapping;
    return {
        dataModel: Array.isArray(dm.dataModel) ? dm.dataModel : [],
        mockApiJson: dm.mockApiJson != null && typeof dm.mockApiJson === "object" ? dm.mockApiJson : null,
        mockApiBindings: Array.isArray(dm.mockApiBindings) ? dm.mockApiBindings : [],
        apiConfigMethod: dm.apiConfigMethod,
        apiUrl: dm.apiUrl,
        apiMethod: dm.apiMethod,
        loadMorePageParamName: dm.loadMorePageParamName,
        loadMorePageParamInQuery: dm.loadMorePageParamInQuery === true,
        loadMoreHasNextPagePath: dm.loadMoreHasNextPagePath,
    };
}

/**
 * Build a zip blob containing folder structure: project.json + screens/<id>.json
 * Uses dynamic import of JSZip so we can add it as optional dependency.
 */
export async function buildProjectZipBlob(project, dataMapping = null) {
    const JSZip = (await
        import ("jszip")).default;
    const zip = new JSZip();
    const manifest = projectManifest(project);
    const fullProject = projectToSingleJSON(project, dataMapping);
    zip.file(MANIFEST_FILENAME, JSON.stringify(fullProject, null, 2));
    const screensFolder = zip.folder(SCREENS_DIR);
    for (const screen of project.screens) {
        if (screen.id && screen.tree) {
            screensFolder.file(`${screen.id}.json`, JSON.stringify({ id: screen.id, name: screen.name, presentationStyle: screen.presentationStyle, order: screen.order, tree: screen.tree }, null, 2));
        }
    }
    return zip.generateAsync({ type: "blob" });
}

/**
 * Parse a zip file that contains project folder (project.json + screens/*.json).
 * Returns { project, dataMapping } or null.
 */
export async function parseProjectFromZipBlob(blob) {
    const JSZip = (await
        import ("jszip")).default;
    const zip = await JSZip.loadAsync(blob);
    const manifestFile = zip.file(MANIFEST_FILENAME);
    if (!manifestFile) return null;
    const manifestStr = await manifestFile.async("string");
    let obj;
    try {
        obj = JSON.parse(manifestStr);
    } catch (_) {
        return null;
    }
    const project = parseProjectFromJSON(obj);
    if (!project) return null;
    const dataMapping = getDataMappingFromProjectJSON(obj);
    return { project, dataMapping };
}

/**
 * Trigger download of project as a zip (folder).
 * Filename: <projectName>.uibuilder.zip or project.zip
 */
export async function downloadProjectAsZip(project, dataMapping = null, filename = null) {
    const blob = await buildProjectZipBlob(project, dataMapping);
    const name = (filename || (project.name || "project").replace(/[^\w\s-]/g, "").trim() || "project") + ".uibuilder.zip";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}