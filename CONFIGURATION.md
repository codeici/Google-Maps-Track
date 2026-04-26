# Google Maps Track — Configuration Reference

## Map Configuration

### Google API and Map ID

| Property | Type | Description |
|---|---|---|
| **API Key** | Expression | Your Google Maps JavaScript API key. Accepts a Mendix expression, allowing it to be stored as a constant or retrieved dynamically. |
| **Map ID** | Expression | Your Google Maps Map ID, used to enable advanced features such as Advanced Markers and Cloud-based map styling. Accepts a Mendix expression. |

### Map Size, Zoom Level and Position

| Property | Type | Default | Description |
|---|---|---|---|
| **Minimum Width (px)** | Integer | 400 | Minimum width of the map in pixels. |
| **Minimum Height (px)** | Integer | 300 | Minimum height of the map in pixels. |
| **Default Zoom Level** | Integer | 10 | Initial zoom level when the map loads (1–20). |
| **Default Latitude** | Decimal | 51.5074 | Map centre latitude used when no track data is loaded. |
| **Default Longitude** | Decimal | -0.1278 | Map centre longitude used when no track data is loaded. |

### Display Options

| Property | Type | Default | Description |
|---|---|---|---|
| **Show Altitude Legend** | Boolean | Yes | Displays a colour gradient legend bar on the map when **Colour by Altitude** is enabled. |
| **Show Map Type Selector** | Boolean | No | Shows the Google Maps built-in map type selector control, allowing users to switch between map types at runtime. |

---

## Track Data

### Data Source

| Property | Type | Description |
|---|---|---|
| **Track Data Source** | List datasource | The Mendix list of objects providing track point data. Each object represents one tracked entity. |
| **Refresh Interval (seconds)** | Integer | How frequently the data source is reloaded in seconds. Set to **0** to disable automatic refresh. |

### Data Attributes

| Property | Type | Required | Description |
|---|---|---|---|
| **Latitude** | Decimal attribute | Yes | Attribute containing the latitude of the tracked object. |
| **Longitude** | Decimal attribute | Yes | Attribute containing the longitude of the tracked object. |
| **Direction** | Decimal attribute | No | Direction of travel in degrees true north (0–360). Used to rotate the marker icon. |
| **Ground Speed** | Decimal attribute | No | Ground speed of the object. Displayed in the unit configured by the **Speed Unit** property. |
| **Speed Unit** | Enumeration | — | Unit for displaying ground speed. Options: **mph**, **km/h**, **Knots** (default: Knots). |
| **Vertical Rate** | Integer attribute | No | Rate of altitude change in feet per minute (readsb `baro_rate` or `geom_rate`). Used to extrapolate altitude between source updates so markers climb or descend smoothly. |
| **Track Rate** | Decimal attribute | No | Rate of heading change in degrees per second (readsb `track_rate`). Used to extrapolate heading through turns so rotating markers follow curved tracks rather than snapping between reports. |
| **Position Age** | Decimal attribute | No | Age of the reported position in seconds at ingest time (readsb `seen_pos`). Used to back-date positions for accurate dead reckoning and to drive marker staleness/opacity. |
| **Altitude** | String attribute | No | Altitude of the object. Accepts a numeric value (feet) or the string `ground`. Used for altitude colouring and display. |
| **Category** | String attribute | No | A category value used to select a category-specific marker icon. Must match a value defined in the **Category Icons** list. |
| **Unique ID** | String attribute | No | A stable unique identifier for the object (e.g. an ICAO hex code). Used by the Identify Marker and Proximity Marker features. |

---

## Marker Options

| Property | Type | Default | Description |
|---|---|---|---|
| **Default Marker Image** | Image | — | The marker icon used when no category-specific icon is matched. |
| **Marker Size (px)** | Integer | 32 | Base size of the marker icon in pixels before scale is applied. |
| **Default Marker Scale** | Decimal | 1.0 | Size multiplier for the default marker image. For example, `0.5` = half size, `2.0` = double size. |
| **Colour by Altitude** | Boolean | No | When enabled, marker colour is determined by the object's altitude value rather than its category. |
| **Marker Label** | Expression | — | An optional Mendix expression evaluated per marker, whose result is displayed as a text label alongside the icon. |

### Category Icons

A repeatable list that maps category values to specific marker images. Each entry has:

| Property | Type | Description |
|---|---|---|
| **Category** | String | The category value to match (case-sensitive). Must match the value in the **Category** attribute. |
| **Icon** | Image | The marker image to display for objects in this category. |
| **Scale** | Decimal | Size multiplier for this icon (e.g. `0.5` = half size, `2.0` = double size). Default: 1.0. |

---

## Events

### Identify Marker

| Property | Type | Description |
|---|---|---|
| **Object ID to Identify** | String attribute | When this attribute is set to the **Unique ID** of a displayed marker, that marker will flash to visually identify itself on the map. |
| **Proximity Marker** | String attribute | When set to the **Unique ID** of a displayed marker, that marker is highlighted with a bright ring to indicate proximity or relevance. |

### On Click

| Property | Type | Description |
|---|---|---|
| **On Select** | Action | Executed when a marker is clicked to select it. |
| **On Deselect** | Action | Executed when an already-selected marker is clicked again to deselect it. |
| **On Track** | Action | Executed when a marker is double-clicked, regardless of its current selection state. |

---

## Dynamic SVG Marker Stroke and Fill

When the supplied marker icon is an SVG, the widget colours it at runtime instead of treating it as a static bitmap. This lets a single icon adapt its **fill** to data (altitude) and its **stroke** to the current map background, so markers stay legible on every base map.

### How it works

The widget fetches the SVG, inlines it into the marker DOM, and exposes two CSS custom properties on the marker container:

| CSS Variable | Drives | Set by the widget when… |
|---|---|---|
| `--marker-fill` | The SVG's body / fill colour | The marker is rendered or its altitude changes. |
| `--marker-stroke` | The SVG's outline / stroke colour | The map type changes (e.g. switching to Satellite). |

For these variables to take effect, your SVG paths must reference them, for example:

```xml
<path d="…"
      style="fill:var(--marker-fill, white);
             stroke:var(--marker-stroke, black);
             stroke-width:0.5;" />
```

The fallback values after the comma (`white`, `black`) are used in design tools and any context where the variables are not set — the widget always overrides them at runtime.

### Fill colour

The fill colour is chosen per marker:

- **Colour by Altitude — On**: `--marker-fill` is set from the altitude colour palette. Numeric altitudes are bucketed every 2,000 ft from a low-altitude warm colour up through a high-altitude cool colour. The string value `ground` resolves to grey (or white on satellite imagery).
- **Colour by Altitude — Off** (or altitude unknown): the fill defaults to the widget's neutral marker colour (`#2196f3`).
- A separate, brighter palette is used automatically when the map is in **Satellite** or **Hybrid** mode so colours remain visible against dark imagery.

If the marker icon is a non-SVG image (PNG, JPG), the widget falls back to a CSS mask + `background-color` technique — the fill still tracks altitude, but `--marker-stroke` has no effect because raster images have no outline to colour.

### Stroke colour

The stroke colour follows the **map type**, not the marker data, and is updated for every visible marker whenever the user switches base maps:

| Map Type | `--marker-stroke` | Rationale |
|---|---|---|
| Roadmap / Terrain | `rgba(11, 31, 51, 0.9)` | A near-black blue gives high contrast against pale road and terrain tiles. |
| Satellite / Hybrid | `rgba(0, 0, 0, 0.65)` | A softer black avoids harsh edges over busy aerial imagery. |

The widget listens to the map's `maptypeid_changed` event and rewrites `--marker-stroke` on every marker in place — no marker rebuild is required, so the change is instant.

### Authoring custom SVG markers

To take full advantage of dynamic colouring in your own SVG icons:

1. Use `fill:var(--marker-fill, <fallback>)` on every path that should follow the altitude colour.
2. Use `stroke:var(--marker-stroke, <fallback>)` on outline paths that should follow the map type.
3. Keep the SVG's `viewBox` square and centred — the widget rotates the icon around its centre using the **Direction** attribute.
4. Avoid hard-coded `fill` or `stroke` attributes on those paths; inline `style=` declarations take precedence over CSS variables only when no `var(...)` is used, so always wrap colours in `var(--marker-fill,…)` / `var(--marker-stroke,…)`.
