module.exports = [
  {
    "type": "heading",
    "defaultValue": "Halftone Settings"
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Appearance"
      },
      {
        "type": "color",
        "messageKey": "BACKGROUND_COLOR",
        "defaultValue": "0xFF5500",
        "label": "Background color"
      },
      {
        "type": "color",
        "messageKey": "TEXT_COLOR",
        "defaultValue": "0xFFFFFF",
        "label": "Text color"
      },
      {
        "type": "toggle",
        "messageKey": "USE_12_HOUR",
        "defaultValue": false,
        "label": "12-hour time"
      },
      {
        "type": "toggle",
        "messageKey": "LARGE_TEXT",
        "defaultValue": false,
        "label": "Extra-large clock"
      },
      {
        "type": "toggle",
        "messageKey": "SHOW_STATUS",
        "defaultValue": true,
        "label": "Status indicators",
        "description": "Low watch or phone battery and lost connection."
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Complications"
      },
      {
        "type": "text",
        "defaultValue": "Choose slots 1 and 2 in Pebble → Settings → Complications."
      },
      {
        "type": "text",
        "defaultValue": "Complications 1 and 2 sit side by side. Both shrink above music or notifications."
      },
      {
        "type": "text",
        "defaultValue": "Units come from Pebble and the selected plugin."
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Dynamic content"
      },
      {
        "type": "toggle",
        "messageKey": "SHOW_MUSIC",
        "defaultValue": true,
        "label": "Show music while playing"
      },
      {
        "type": "toggle",
        "messageKey": "SHOW_NOTIFICATIONS",
        "defaultValue": false,
        "label": "New notifications",
        "description": "Allow notification access in Pebble. Only new notifications appear."
      },
      {
        "type": "toggle",
        "messageKey": "NOTIFICATION_PREVIEW",
        "defaultValue": false,
        "label": "Include message text"
      },
      {
        "type": "input",
        "messageKey": "NOTIFICATION_APPS",
        "defaultValue": "",
        "label": "Apps to show",
        "description": "Separate app names with commas. Empty means all allowed apps.",
        "attributes": {
          "type": "text",
          "maxlength": 160
        }
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Optical effects"
      },
      {
        "type": "toggle",
        "messageKey": "PANEL_TRANSITIONS",
        "defaultValue": true,
        "label": "Brief halftone transitions",
        "description": "Briefly dissolve the lower panel. The clock and border stay still."
      },
      {
        "type": "toggle",
        "messageKey": "DEPTH_EFFECT",
        "defaultValue": false,
        "label": "4-step dot transition"
      },
      {
        "type": "toggle",
        "messageKey": "TEXT_SHADOW",
        "defaultValue": false,
        "label": "Floating text shadow"
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Status & help"
      },
      {
        "type": "text",
        "id": "complications-status",
        "defaultValue": "Complications: waiting for Pebble"
      },
      {
        "type": "text",
        "id": "context-status",
        "defaultValue": "Dynamic content: waiting for Pebble"
      },
      {
        "type": "text",
        "defaultValue": "Timeline Peek keeps the clock and complication 1."
      }
    ]
  },
  {
    "type": "submit",
    "defaultValue": "Save settings"
  }
];
