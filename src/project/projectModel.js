/**
 * Project and screen model for multi-screen apps.
 * Each project has a folder structure when saved: project.json + screens/<screenId>.json
 */

import { randomUUID } from "../utils/uuid";

const CONTAINER_TYPES = ["View", "VStack", "HStack", "ZStack", "BottomSheet"];

function normalizeNode(node) {
    if (!node || typeof node !== "object") return null;
    const out = {...node };
    if (typeof out.id !== "string") out.id = out.id != null ? String(out.id) : "root";
    if (typeof out.type !== "string") return null;
    if (CONTAINER_TYPES.includes(out.type)) {
        out.children = Array.isArray(out.children) ? out.children.map(normalizeNode).filter(Boolean) : [];
    }
    return out;
}

/** Default root tree for a single screen */
export function defaultTree() {
    return {
        id: "root",
        type: "View",
        children: [],
        screenId: "",
        presentationStyle: "push",
    };
}

/** Create a new screen object */
export function createScreen(id = randomUUID(), name = "Screen", tree = null) {
    return {
        id,
        name,
        tree: tree ? normalizeNode(tree) : defaultTree(),
        presentationStyle: "push",
        order: 0,
    };
}

/** Create a new project with one default screen. Optional projectName for the project. */
export function defaultProject(projectName) {
    const screen = createScreen(randomUUID(), "Screen 1");
    return {
        id: randomUUID(),
        name: typeof projectName === "string" && projectName.trim() ? projectName.trim() : "Untitled Project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        screens: [screen],
    };
}

/** Get project manifest for saving (ids, names, order – no trees) */
export function projectManifest(project) {
    if (!project || !Array.isArray(project.screens)) return null;
    return {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        screens: project.screens.map((s) => ({
            id: s.id,
            name: s.name,
            presentationStyle: s.presentationStyle != null ? s.presentationStyle : "push",
            order: s.order != null ? s.order : 0,
        })),
    };
}

/** Validate and normalize a loaded project */
export function normalizeProject(raw) {
    if (!raw || typeof raw !== "object" || !raw.id) return null;
    const screens = Array.isArray(raw.screens) ? raw.screens : [];
    const normalized = {
        id: String(raw.id),
        name: typeof raw.name === "string" ? raw.name : "Untitled Project",
        createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
        screens: screens.map((s, i) => {
            const tree = s.tree && typeof s.tree === "object" ? normalizeNode(s.tree) : defaultTree();
            if (tree && tree.id !== "root") tree.id = "root";
            return {
                id: s.id != null ? String(s.id) : randomUUID(),
                name: typeof s.name === "string" ? s.name : `Screen ${i + 1}`,
                tree: tree || defaultTree(),
                presentationStyle: s.presentationStyle && ["push", "present", "modal"].includes(s.presentationStyle) ? s.presentationStyle : "push",
                order: typeof s.order === "number" ? s.order : i,
            };
        }),
    };
    if (normalized.screens.length === 0) {
        normalized.screens.push(createScreen(randomUUID(), "Screen 1"));
    }
    return normalized;
}