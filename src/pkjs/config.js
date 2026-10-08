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
      {
        "type": "heading",
        "defaultValue": "Colors"
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
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Time & temperature"
      },
      {
        "type": "toggle",
        "messageKey": "USE_12_HOUR",
        "defaultValue": false,
        "label": "12-hour time"
      },
      {
        "type": "toggle",
        "messageKey": "USE_FAHRENHEIT",
        "defaultValue": false,
        "label": "Temperature in Fahrenheit"
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Text size"
      },
      {
        "type": "toggle",
        "messageKey": "LARGE_TEXT",
        "defaultValue": false,
        "label": "Extra-large edge-to-edge text"
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
    "type": "submit",
    "defaultValue": "Save settings"
  }
];
