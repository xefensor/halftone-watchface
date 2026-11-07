'use strict';

// Clay retains the established preference keys. Page-only choices translate to
// these fields, so notification privacy remains compatible with earlier builds.
module.exports = [
  {type:'heading',defaultValue:'Halftone'},
  {type:'text',id:'halftone-intro',defaultValue:'Choose colours and what appears on your watch.'},
  {type:'section',items:[
    {type:'heading',defaultValue:'Appearance'},
    {type:'text',id:'halftone-preview',defaultValue:'Layout & colour preview'},
    {type:'text',id:'halftone-theme',defaultValue:'Theme'},
    {type:'color',messageKey:'BACKGROUND_COLOR',defaultValue:'0xFF5500',label:'Background color',layout:'COLOR',sunlight:false},
    {type:'color',messageKey:'TEXT_COLOR',defaultValue:'0xFFFFFF',label:'Text color',layout:'COLOR',sunlight:false},
    {type:'color',messageKey:'ACCENT_COLOR',defaultValue:'0x55AAFF',label:'Accent color',description:'Color for reading symbols and rain gauges.',layout:'COLOR',sunlight:false},
    {type:'text',id:'halftone-contrast',defaultValue:''},
    {type:'text',id:'halftone-palette-code',defaultValue:'Share colours'},
    {type:'toggle',messageKey:'NIGHT_PALETTE',defaultValue:false,label:'Quiet Time colours',description:'Use these watch colours while Pebble Quiet Time is active.'},
    {type:'color',messageKey:'NIGHT_BACKGROUND_COLOR',defaultValue:'0x000000',label:'Quiet Time background',layout:'COLOR',sunlight:false},
    {type:'color',messageKey:'NIGHT_TEXT_COLOR',defaultValue:'0xFFFFFF',label:'Quiet Time text',layout:'COLOR',sunlight:false},
    {type:'color',messageKey:'NIGHT_ACCENT_COLOR',defaultValue:'0x55AAFF',label:'Quiet Time accent',layout:'COLOR',sunlight:false},
    {type:'select',messageKey:'CLOCK_FORMAT',defaultValue:0,label:'Time format',serializeValueAs:'integer',options:[
      {label:'Follow Pebble',value:0},{label:'12-hour time',value:12},{label:'24-hour time',value:24}
    ]},
    {type:'toggle',messageKey:'ANIMATIONS',defaultValue:true,label:'Animations',description:'Short transitions when activities change.'},
    {"type": "toggle", "messageKey": "LARGE_TEXT", "defaultValue": false, "label": "Big text", "description": "Enlarges the clock, date and both complications. Text fits automatically when Timeline Peek, music or notifications need space."},
{"type": "toggle", "messageKey": "PANEL_TRANSITIONS", "defaultValue": true, "label": "Brief halftone transitions", "description": "Briefly dissolve the lower panel. The clock and border stay still."},
{"type": "toggle", "messageKey": "DEPTH_EFFECT", "defaultValue": false, "label": "4-step dot transition"},
{"type": "toggle", "messageKey": "TEXT_SHADOW", "defaultValue": false, "label": "Floating text shadow"},
    {type:'toggle',messageKey:'SHOW_STATUS',defaultValue:true,label:'Status indicators',description:'Low watch or phone battery and lost connection.'},
    {type:'text',defaultValue:'Language follows your watch.'}
  ]},
  {type:'section',items:[
    {type:'heading',defaultValue:'Content & priority'},
    {type:'text',id:'halftone-readings',defaultValue:'Your two readings'},
    {type:'text',id:'halftone-reading-help',defaultValue:'Choose slots 1 and 2 in Pebble → Settings → Complications.'},
    {type:'toggle',messageKey:'SHOW_ACTIVITIES',defaultValue:true,label:'Show activity plugins',description:'Show activities from installed plugins. Music and Notifications have their own switches in the list below.'},
    {type:'text',id:'halftone-activity-order',defaultValue:'Activity priority'},
    {type:'toggle',messageKey:'SHOW_MUSIC',defaultValue:true,label:'Show music while playing'},
    {type:'text',id:'halftone-notification-mode',defaultValue:'Notification details'},
    {type:'text',id:'halftone-notification-disabled',defaultValue:'Enable Notifications in the activity list to change its details.'},
    {type:'toggle',messageKey:'SHOW_NOTIFICATIONS',defaultValue:false,label:'New notifications'},
    {type:'toggle',messageKey:'NOTIFICATION_PREVIEW',defaultValue:false,label:'Include message text'},
    {type:'toggle',messageKey:'NOTIFICATION_APP_ONLY',defaultValue:false,label:'App name only'},
    {type:'select',messageKey:'NOTIFICATION_VIBRATION',defaultValue:0,label:'Additional vibration',description:'One additional vibration per new notification burst, using your app filter. Respects Quiet Time. Turn this off if Pebble already vibrates for those notifications.',serializeValueAs:'integer',options:[
      {label:'Off',value:0},{label:'Short pulse',value:1},{label:'Double pulse',value:2}
    ]},
    {type:'text',id:'halftone-notification-help',defaultValue:'New notifications use the same activity priority and primary/secondary layouts. Allow notification access in Pebble. Pebble’s system notifications remain separate.'},
    {type:'text',id:'halftone-app-mode',defaultValue:'Notification apps'},
    {type:'input',messageKey:'NOTIFICATION_APPS',defaultValue:'',label:'Selected apps',description:'Use exact app names or Android package names, separated by commas. For example: Signal, org.thoughtcrime.securesms',attributes:{type:'text',maxlength:160,autocapitalize:'none',autocomplete:'off',spellcheck:'false'}}
  ]},
  {type:'section',items:[
    {type:'heading',defaultValue:'Connection & help'},
    {type:'text',id:'halftone-save-status',defaultValue:'Changes apply after you save.'},
    {type:'text',defaultValue:'Status when settings opened. Reopen settings to refresh.'},
    {type:'text',id:'halftone-source-status',defaultValue:'Halftone content: waiting for Pebble'},
    {type:'text',id:'complications-status',defaultValue:'Complications: waiting for Pebble'},
    {type:'text',id:'context-status',defaultValue:'Halftone content: waiting for Pebble'},
    {type:'text',defaultValue:'Timeline Peek keeps the clock and complications 1 and 2. Its event panel takes priority over music and notifications.'}
  ]},
  {type:'submit',defaultValue:'Save'},
  // Transport components have no preference keys and are never submitted.
  {type:'text',id:'halftone-settings-data',defaultValue:'{}'},
  {type:'text',id:'halftone-settings-strings',defaultValue:'{}'},
  {type:'text',id:'halftone-preview-assets',defaultValue:'{}'},
  {type:'input',messageKey:'__halftoneActivityPreferences',defaultValue:'',attributes:{type:'hidden'}}
];
