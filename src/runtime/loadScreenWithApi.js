/**
 * Runtime helper: when the exported JSON is loaded, either (1) use URL + method from the doc
 * and call a method to get headers/body only, or (2) call a method to get the full response JSON.
 *
 * Two modes (controlled by whether API URL is set in the data model menu):
 *
 * A) URL + Method set in builder (optional in UI):
 *    - Frontend implements configMethod(doc) → { headers?, body? } only.
 *    - Runtime fetches doc.dataMapping.dataSource.url with doc's method and these headers/body.
 *
 * B) URL not set:
 *    - Frontend implements configMethod(doc) → { response } (the full JSON).
 *    - Runtime applies that response to the data model using bindings (no fetch).
 *
 * Usage:
 *   const { responseJson, applyBindings } = await loadScreenWithApi(doc, getConfig);
 *   setDataModel(applyBindings(currentDataModel));
 */

import { getValueAtPath } from "../utils/dataModel";

/**
 * @param {object} doc - Loaded UI export (doc.dataMapping.dataSource, mockApiBindings, dataModel).
 * @param {function(doc): { headers?, body? } | { response } | Promise<...>} getConfig - If URL is in doc: return { headers?, body? }. If no URL: return { response } (the JSON).
 * @returns {Promise<{ responseJson: object, applyBindings: (dataModel: array) => array }>}
 */
export async function loadScreenWithApi(doc, getConfig) {
    const dataMapping = doc && doc.dataMapping;
    const dataSource = dataMapping && dataMapping.dataSource;
    const configMethod = dataMapping && (dataMapping.apiConfigMethod || (dataSource && dataSource.configMethod));
    const url = (dataSource && dataSource.url) || dataMapping.apiUrl;
    const method = (dataSource && dataSource.method) || dataMapping.apiMethod || "GET";

    if (!configMethod || typeof configMethod !== "string") {
        throw new Error("loadScreenWithApi: doc has no dataMapping.apiConfigMethod (or dataSource.configMethod)");
    }

    const fn = getConfig || (typeof window !== "undefined" && window[configMethod]);
    if (typeof fn !== "function") {
        throw new Error(`loadScreenWithApi: config method "${configMethod}" is not a function`);
    }

    const config = await Promise.resolve(fn(doc));
    if (!config || typeof config !== "object") {
        throw new Error("loadScreenWithApi: config method must return an object");
    }

    let responseJson;

    if (url && url.trim()) {
        // Mode A: URL (and method) from doc; frontend supplies headers/body only
        const headers = config.headers || {};
        const body = config.body != null ? config.body : undefined;
        const response = await fetch(url.trim(), {
            method: method || "GET",
            headers,
            body,
        });
        if (!response.ok) {
            throw new Error(`loadScreenWithApi: fetch failed ${response.status} ${response.statusText}`);
        }
        responseJson = await response.json();
    } else {
        // Mode B: No URL in doc; frontend passes the response JSON
        if (config.response == null) {
            throw new Error("loadScreenWithApi: when URL is not set, config method must return { response } (the JSON)");
        }
        responseJson = config.response;
    }

    const bindings = Array.isArray(dataMapping.mockApiBindings) ? dataMapping.mockApiBindings : [];

    function applyBindings(currentDataModel) {
        const list = Array.isArray(currentDataModel) ? [...currentDataModel] : [];
        bindings.forEach(({ apiPath, dataModelId }) => {
            const value = getValueAtPath(responseJson, apiPath);
            if (value === undefined) return;
            const idx = list.findIndex((e) => e.id === dataModelId);
            if (idx >= 0) list[idx] = {...list[idx], value };
        });
        return list;
    }

    return { responseJson, applyBindings };
}