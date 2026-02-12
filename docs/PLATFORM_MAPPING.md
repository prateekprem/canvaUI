# Platform mapping: Canonical JSON → SwiftUI & Android

The UI builder exports a **platform-agnostic JSON** (`schemaVersion: "1.0"`). Use this document to draw the same UI natively on **SwiftUI** (iOS/macOS) and **Android** (Jetpack Compose or XML).

---

## JSON structure

```json
{
  "schemaVersion": "1.0",
  "root": {
    "type": "View" | "VStack" | "HStack" | "Text" | "Button" | "Image" | "List",
    "id": "uuid",
    "style": { ... },
    "children": [ ... ],
    ...
  }
}
```

- **Dimensions**: `paddingHorizontal`, `paddingVertical`, `width`, `height`, `cornerRadius`, `fontSize`, `spacing` are in **px** (logical pixels).
- **Colors**: `#RRGGBB` or `"transparent"`. Optional: `textColor`, `backgroundColor`, `foregroundColor`, `borderColor`.
- **Opacity**: `0`–`1` in `style.opacity`.

---

## View type → Native mapping

| Canonical type | SwiftUI | Android (Compose) | Android (XML) |
|----------------|---------|-------------------|---------------|
| **View**       | `Group { }` or container `View` | `Column` / `Box` (no layout) | `FrameLayout` / `ViewGroup` |
| **VStack**     | `VStack(alignment, spacing) { }` | `Column(verticalArrangement = Arrangement.spacedBy(spacing))` | `LinearLayout` vertical |
| **HStack**     | `HStack(alignment, spacing) { }` | `Row(horizontalArrangement = Arrangement.spacedBy(spacing))` | `LinearLayout` horizontal |
| **Text**       | `Text(text).font().foregroundColor()` | `Text(text, fontSize, color)` | `TextView` |
| **Button**     | `Button(action) { Text(title) }` | `Button(onClick) { Text(title) }` | `Button` + `android:text` |
| **Image**      | `AsyncImage(url) / Image().resizable().scaledToFit() etc.` | `AsyncImagePainter` / `Image(modifier).clip()` | `ImageView` + `scaleType` |
| **List**       | `List(items, id: \.self) { Text($0) }` | `LazyColumn { items(list) { Text(it) } }` | `ListView` / `RecyclerView` |

---

## Style → Native mapping

| Canonical style key | SwiftUI | Android (Compose) | Android (XML) |
|---------------------|---------|-------------------|---------------|
| `paddingHorizontal` | `.padding(.horizontal, px)` | `Modifier.padding(horizontal = px.dp)` | `android:paddingStart/End` or `padding` |
| `paddingVertical`  | `.padding(.vertical, px)` | `Modifier.padding(vertical = px.dp)` | `android:paddingTop/Bottom` |
| `backgroundColor`   | `.background(Color(hex) / .clear)` | `Modifier.background(Color(hex))` | `android:background` (color or drawable) |
| `textColor`        | `.foregroundColor(Color(hex))` | `Color(hex)` on Text | `android:textColor` |
| `fontFamily`       | `.font(.custom(name, size: fontSize))` | `FontFamily` + `Font(fontSize.sp)` | `android:fontFamily` + `textSize` |
| `fontSize`         | `.font(.system(size: CGFloat(px)))` | `Font(px.sp)` | `android:textSize` (sp) |
| `cornerRadius`     | `.cornerRadius(CGFloat(px))` | `RoundedCornerShape(px.dp)` | shape / `android:radius` / Material `Card` |
| `opacity`          | `.opacity(Double)` | `Modifier.alpha(Float)` | `android:alpha` |
| `borderColor`      | `.overlay(RoundedRectangle().stroke(Color(hex)))` | `Modifier.border(width, Color(hex), shape)` | `stroke` in drawable or `border` |
| `width` / `height` | `.frame(width:height:)` | `Modifier.width(height)(px.dp)` | `android:layout_width/height` |
| `contentMode` (Image) | `.scaledToFit()` / `.scaledToFill()` / `.fill()` etc. | `ContentScale.Fit` / `FillBounds` / `Crop` etc. | `android:scaleType` (fitCenter, centerCrop, etc.) |

---

## contentMode (Image) → Native

| Canonical value | SwiftUI | Android scaleType / ContentScale |
|-----------------|---------|----------------------------------|
| `contain`       | `.scaledToFit()` | `fitCenter` / `ContentScale.Fit` |
| `cover`         | `.scaledToFill()` | `centerCrop` / `ContentScale.Crop` |
| `fill`          | `.scaleEffect()` fill | `fitXY` / `ContentScale.FillBounds` |
| `none`          | no scaling | `center` / `ContentScale.None` |
| `scale-down`    | same as contain (no scale-up) | `centerInside` / scale-down equivalent |

---

## Example: consume JSON in SwiftUI

```swift
// Parse JSON and build View from root node
func view(from json: Data) -> some View {
  let doc = try? JSONDecoder().decode(UIDocument.self, from: json)
  return nodeView(doc?.root)
}

func nodeView(_ node: UINode?) -> some View {
  switch node?.type {
  case "VStack": return AnyView(VStack(alignment: .leading, spacing: CGFloat(node?.spacing ?? 0)) {
    ForEach(node?.children ?? []) { child in nodeView(child) }
  })
  case "Text": return AnyView(Text(node?.text ?? "").foregroundColor(color(node?.style?.textColor)))
  // ... Button, Image, HStack, View, List
  default: return AnyView(EmptyView())
  }
}
```

---

## Example: consume JSON on Android (Compose)

```kotlin
// Parse JSON and build Composable from root node
@Composable
fun UiFromJson(json: String) {
  val doc = Json.decodeFromString<UIDocument>(json)
  NodeComposable(doc.root)
}

@Composable
fun NodeComposable(node: UINode?) {
  when (node?.type) {
    "VStack" -> Column(verticalArrangement = Arrangement.spacedBy((node.spacing ?: 0).dp)) {
      node.children?.forEach { NodeComposable(it) }
    }
    "Text" -> Text(node.text ?: "", color = colorFromHex(node.style?.textColor))
    // ... Button, Image, HStack, View, List
  }
}
```

---

## Summary

- Export JSON from the builder via **Export JSON** (canonical format).
- Use **schemaVersion** to support future formats.
- **Same JSON** can drive both SwiftUI and Android; each platform maps types and styles as in the tables above.
- Convert **px** to **dp/sp** on Android and to **points** (or keep px) in SwiftUI as needed.
