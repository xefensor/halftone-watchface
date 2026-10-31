module.exports = [
  {
    "type": "heading",
    "defaultValue": "Halftone Settings"
  },
  {
    "type": "text",
    "defaultValue": "Choose the colors and optional depth effects. The dithered bezel transition remains black."
  },
  {
    "type": "section",
    "items": [
      {"type": "heading", "defaultValue": "Layout"},
      {
        "type": "select",
        "messageKey": "LAYOUT_STYLE",
        "defaultValue": "0",
        "label": "Layout style",
        "options": [
          {"label": "Classic", "value": "0"},
          {"label": "Comic cover", "value": "1"},
          {"label": "Stacked time", "value": "2"}
        ]
      },
      {"type": "text", "defaultValue": "Classic: 1 centered; 2/3 above 4/5 in the bottom grid."},
      {"type": "text", "defaultValue": "Comic cover: 1 large at lower left, 5 above it; 2, 3 and 4 down the right."},
      {"type": "text", "defaultValue": "Stacked time: 5, 1, 2, 3 and 4 down the right; clock on the left."},
      {"type": "text", "defaultValue": "Timeline Peek shows only complication 1."}
    ]
  },
  {
    "type": "section",
    "items": [
      {"type": "heading", "defaultValue": "Colors"},
      {"type": "color", "messageKey": "BACKGROUND_COLOR", "defaultValue": "0xFF5500", "label": "Background color"},
      {"type": "color", "messageKey": "TEXT_COLOR", "defaultValue": "0xFFFFFF", "label": "Text color"}
    ]
  },
  {
    "type": "section",
    "items": [
      {"type": "heading", "defaultValue": "Time"},
      {"type": "toggle", "messageKey": "USE_12_HOUR", "defaultValue": false, "label": "12-hour time"}
    ]
  },
  {
    "type": "section",
    "items": [
      {"type": "heading", "defaultValue": "Complications"},
      {"type": "text", "id": "complications-status", "defaultValue": "Complications: waiting for Pebble"},
      {"type": "text", "defaultValue": "Choose slots 1–5 in the Pebble app under Settings → Complications. Empty slots keep their positions."},
      {"type": "text", "defaultValue": "Units come from Pebble and the selected plugin."}
    ]
  },
  {
    "type": "section",
    "items": [
      {"type": "heading", "defaultValue": "Text size"},
      {"type": "toggle", "messageKey": "LARGE_TEXT", "defaultValue": false, "label": "Extra-large edge-to-edge text"}
    ]
  },
  {
    "type": "section",
    "items": [
      {"type": "heading", "defaultValue": "Optical effects"},
      {"type": "toggle", "messageKey": "DEPTH_EFFECT", "defaultValue": false, "label": "4-step dot transition"},
      {"type": "toggle", "messageKey": "TEXT_SHADOW", "defaultValue": false, "label": "Floating text shadow"}
    ]
  },
  {"type": "submit", "defaultValue": "Save settings"}
];
