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
      {"type": "heading", "defaultValue": "Adaptive layout"},
      {"type": "text", "defaultValue": "The clock stays in place. Complication 1 is larger and stays visible; music and new notifications replace complication 2."},
      {"type": "text", "defaultValue": "Timeline Peek keeps the clock and complication 1; complication 2, music and notification summaries hide."}
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
      {"type": "heading", "defaultValue": "Dynamic content"},
      {"type": "text", "id": "context-status", "defaultValue": "Dynamic content: waiting for Pebble"},
      {"type": "toggle", "messageKey": "SHOW_MUSIC", "defaultValue": true, "label": "Show music while playing"},
      {"type": "toggle", "messageKey": "SHOW_NOTIFICATIONS", "defaultValue": false, "label": "Show new notification summaries"},
      {"type": "toggle", "messageKey": "NOTIFICATION_PREVIEW", "defaultValue": false, "label": "Include message text"},
      {"type": "input", "messageKey": "NOTIFICATION_APPS", "defaultValue": "", "label": "Apps to show", "attributes": {"type": "text", "maxlength": 160}},
      {"type": "text", "defaultValue": "App names separated by commas, for example Signal, WhatsApp. Leave empty for all allowed apps."},
      {"type": "text", "defaultValue": "Uses notifications currently on the phone. Existing notifications are not replayed. Allow access in Pebble."},
      {"type": "toggle", "messageKey": "SHOW_STATUS", "defaultValue": true, "label": "Show low battery and connection indicators"}
    ]
  },
  {
    "type": "section",
    "items": [
      {"type": "heading", "defaultValue": "Complications"},
      {"type": "text", "id": "complications-status", "defaultValue": "Complications: waiting for Pebble"},
      {"type": "text", "defaultValue": "Choose slots 1 and 2 in the Pebble app under Settings → Complications. Halftone ignores the other slots."},
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
      {"type": "toggle", "messageKey": "PANEL_TRANSITIONS", "defaultValue": true, "label": "Brief halftone transitions"},
      {"type": "text", "defaultValue": "Animate panel changes briefly. The clock and border stay still."},
      {"type": "toggle", "messageKey": "DEPTH_EFFECT", "defaultValue": false, "label": "4-step dot transition"},
      {"type": "toggle", "messageKey": "TEXT_SHADOW", "defaultValue": false, "label": "Floating text shadow"}
    ]
  },
  {"type": "submit", "defaultValue": "Save settings"}
];
