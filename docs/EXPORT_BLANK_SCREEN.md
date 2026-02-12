# Why the screen can be blank after export

The Swift runtime renders the **exported JSON** from the UI Builder. If the screen is blank, check the following against your exported file.

## 1. Root structure

- **Document** must have a `root` object. The runtime uses `document.root` as the single root node.
- **Root node** must have a `type` the runtime recognizes. Supported: `View`, `VStack`, `HStack`, `ZStack`, `Text`, `Button`, `Image`, `List`, `ListItemContent`, `ListItemText`, `TextField`, `Toggle`, `Slider`, `Picker`, `ProgressView`, `Divider`, `Link`, `SecureField`. Any other type falls back to rendering `children` only; if there are no children, the screen is blank.

## 2. Root is `View` with no children

- Export: when the canvas has **0 or 2+ top-level nodes**, the exporter creates a wrapper **View** with `id: "screen"` and `children` = those nodes.
- If the canvas had **no** top-level nodes, the exported root is a View with `children: []`.
- The Swift runtime draws a **VStack** of `children`. Empty `children` → empty VStack → **blank screen**.
- **Fix:** Ensure the canvas has at least one top-level node before export, or the runtime will show a “No content” placeholder when root is View with no children.

## 3. Root is `List` with no items and no row template

- Export: when the canvas has **exactly one** top-level node, that node becomes the root (no wrapper). So the root can be a **List**.
- The runtime renders a List using:
  - **Items:** from `dataMapping.dataModel` (entry with `boundNodeId` = list’s `id` and `boundProperty: "items"`) or from the node’s `items` array.
  - **Row template:** first element of the node’s `children` (e.g. `ListItemContent` or `ListItemText`).
- If **items** are empty (no binding or empty array) and the list has no static `items`, the List has 0 rows → **blank-looking list** (or full screen if the list is the only content).
- If the List has **no `children`** (no row template), the runtime still draws a List but with no template; combined with 0 items, you see nothing.
- **Fix:** For a list screen, ensure (1) the List has at least one child (row template), and (2) either bind the list’s “items” in Data Mapping to a data model entry filled by mock/API, or set static `items` on the List so there is at least one row.

## 4. Data model / mock not applied

- List **items** come from `dataMapping.dataModel`: the entry whose `boundNodeId` equals the List node’s `id` and `boundProperty` is `"items"`. That entry’s `value` must be an array (of strings or objects).
- If you use **mock API**, `dataMapping.mockApiBindings` must map an `apiPath` (e.g. `"data.items"`) to that data model entry’s `dataModelId`. When there is no live API config, the runtime applies `mockApiJson` on load; if the path or IDs don’t match, the list stays empty.
- **Fix:** In the builder, bind the List’s “items” to a data model field and (if using mock) add a mock binding from the mock JSON path to that field. Export and verify the JSON has the correct `boundNodeId` / `boundProperty` and `mockApiBindings`.

## 5. Decoding failures

- If the JSON uses keys the Swift decoder doesn’t expect (e.g. wrong casing when not using snake_case), or invalid types (e.g. string where number is expected), decoding can throw and the host app may show nothing or an error.
- **Fix:** Use the same format as the builder’s export (see `samples/ui-export-minimal.json`). The runtime tries default keys and snake_case; it does not accept arbitrary key names.

## Quick checklist

| Check | What to verify in exported JSON |
|-------|---------------------------------|
| Root exists | `root` is an object with `type` and (for View/VStack/etc.) `children` |
| Root type | `root.type` is one of the supported types |
| View has content | If `root.type === "View"`, `root.children` has at least one item (or you’ll see “No content”) |
| List has template | If `root.type === "List"`, `root.children` has at least one node (row template) |
| List has data | Either `root.items` has at least one item or `dataMapping.dataModel` has an entry with `boundNodeId` = list id, `boundProperty: "items"`, and a non-empty array `value`; if using mock, `mockApiBindings` targets that entry |

A minimal export that should render is in **`samples/ui-export-minimal.json`** (View root with one Text child).
