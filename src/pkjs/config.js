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
        "defaultValue": "Layout"
      },
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
      {
        "type": "text",
        "defaultValue": "Comic cover keeps a wide clock with a weather column. Stacked time puts hours above minutes. Timeline Peek uses a compact clock."
      }
    ]
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
        "type": "text",
        "id": "weather-status",
        "defaultValue": "Weather source: waiting for data"
      },
      {
        "type": "toggle",
        "messageKey": "FOLLOW_PEBBLE_UNITS",
        "defaultValue": true,
        "label": "Follow Pebble temperature units"
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
      },
      {
        "type": "text",
        "defaultValue": "Fahrenheit applies when Follow Pebble is off. Shared weather uses Pebble's saved locations; older apps use the phone's current location."
      },
      {
        "type": "select",
        "messageKey": "WEATHER_LOCATION",
        "defaultValue": "",
        "label": "Weather location",
        "options": [{"label": "First Pebble weather location", "value": ""}]
      }
    ]
  },
  {
    "type": "section",
    "items": [
      {
        "type": "heading",
        "defaultValue": "Weather details"
      },
      {
        "type": "toggle",
        "messageKey": "SHOW_DAILY_RANGE",
        "defaultValue": false,
        "label": "Show today's low and high"
      },
      {
        "type": "toggle",
        "messageKey": "SHOW_RAIN_CHANCE",
        "defaultValue": false,
        "label": "Show today's rain / snow chance"
      },
      {
        "type": "text",
        "defaultValue": "Uses Pebble's shared weather. L/H show today's low/high; P shows precipitation probability. Missing data stays hidden. Details hide while Timeline Peek is visible."
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
