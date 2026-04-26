# Google Maps Track Widget — Overview
The **Google Maps Track widget** is a Mendix pluggable widget that embeds an interactive Google Maps instance inside a Mendix application. It is purpose-built for tracking and displaying multiple moving objects on a map in near real-time.

---

## Core Purpose
The widget consumes a Mendix data source — a list of objects — and renders each object as a positioned marker on the map. It is optimised for scenarios where objects move over time and their **positions**, **headings**, **speeds**, and **altitudes** need to be visualised simultaneously.

This provides operators with a live spatial view of assets across a geographic area.

---

## Marker System
Each marker is driven by configured Mendix attributes:
- Latitude  
- Longitude  
- Direction of travel  
- Ground speed  
- Altitude  

Markers animate smoothly between position updates using interpolation, ensuring movement appears fluid rather than jumping abruptly. Markers also rotate to reflect the current heading, providing an immediate visual cue about direction of travel.

A full icon system is supported:
- A configurable default marker image  
- Per-category icons to visually distinguish different object types  
- An optional marker label expression to display any Mendix string (such as a callsign, tail number, or asset ID) alongside each marker  

---

## Altitude Visualisation
When altitude data is present, markers can be colour-coded on a gradient scale from ground level upwards. Distinct palettes are used for **standard** and **satellite** map views.

An optional legend bar can be displayed directly on the map, enabling operators to interpret altitude colour coding at a glance.

---

## Interaction
Markers are fully interactive:

- **Single click** triggers a configurable Mendix action (for example, loading a detail panel or selecting a data grid row)
- **Double click** fires a separate track action
- **Deselect** fires a third action

This provides full control over the marker selection lifecycle.

Two special Mendix attributes allow external application logic to influence marker state:

- Flash a specific marker  
- Highlight a marker with a proximity ring  

This enables the map to respond dynamically to selections made elsewhere in the application.

---

## Map Configuration
Studio Pro exposes a wide range of configuration options, including:

- Minimum map dimensions  
- Default zoom level  
- Default centre coordinates  
- Google Maps API Key (via expression)  
- Google Maps Map ID (via expression)  

Using expressions allows keys and IDs to be stored securely as Mendix constants or retrieved dynamically at runtime.

An optional built-in map type selector allows users to switch between:

- Road map  
- Terrain  
- Satellite  
- Hybrid  

---

## Live Data
A configurable refresh interval automatically reloads the data source on a timer. This makes the widget suitable for live tracking scenarios where position updates are continuously received from external systems such as:

- ADS-B aircraft feeds  
- GPS telemetry providers  
- Drone fleet management platforms  

---

## Typical Use Cases
The widget is well suited for:

- Aviation tracking dashboards  
- Drone operations control centres  
- Maritime vessel monitoring  
- Emergency service fleet management  
- Logistics and asset tracking applications  

Any scenario requiring real-time monitoring of multiple moving assets on a single geographic display can benefit from this widget.
