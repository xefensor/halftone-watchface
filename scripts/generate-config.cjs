'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),pkg=require(root+'/package.json');
const keys=Object.fromEntries(pkg.pebble.messageKeys.map((name,index)=>[name,index]));
const installed=process.env.CLAY_GENERATOR_BUNDLE||path.join(root,'node_modules/@rebble/clay/dist/js/index.js');
const source=fs.readFileSync(installed,'utf8');
const box={module:{exports:{}},exports:{},require:name=>{if(name==='message_keys')return keys;throw Error(name);},Pebble:{platform:'config',addEventListener:()=>{}},localStorage:{getItem:()=>null},console};
vm.runInNewContext(source,box,{filename:'clay.js'});
const state=require('../src/common/settings-state');
const page=require('../src/common/settings-config')(state.read({getItem:()=>null}),'en');
const settingsStyle=require('pebble-xoce-ui/settings-style');
const preview=require('../src/pkjs/settings-preview');
page.config.forEach(item=>{if(item.id==='halftone-preview-assets')item.defaultValue=JSON.stringify(preview);});
const clay=new box.module.exports(page.config,require('../src/pkjs/settings-page'),{autoHandleEvents:false,userData:{settingsStyle}});
// No Pebble ready event is emitted by this offline generator.
clay.meta.userData.settingsStyle=settingsStyle;
let html=decodeURIComponent(clay.generateUrl().split(',').slice(1).join(','));
const start=html.lastIndexOf('<script>'),end=html.indexOf('</script>',start);
if(start<0||end<start)throw Error('Clay bootstrap script missing');
const client=html.slice(start+8,end).replace(/\/\/# sourceMappingURL=[^\r\n]+/g,'');
const bootstrap="window.__halftoneStartClay=function(page){var assets;window.clayConfig.forEach(function(item){if(item.id==='halftone-preview-assets')assets=item.defaultValue;});window.clayConfig=page.config;window.clayConfig.forEach(function(item){if(item.id==='halftone-preview-assets'){var parsed=JSON.parse(assets);parsed.systemFormat=page.systemFormat;item.defaultValue=JSON.stringify(parsed);}});window.claySettings=page.values;"+client+'};';
const localization=require('../src/pkjs/localization'),words={};
localization.languages.forEach(language=>{words[language]=localization.settingsStrings(language);});
const bridge='('+require('../src/pkjs/settings-bridge').toString()+')('+JSON.stringify(words)+','+JSON.stringify(state.defaults)+','+JSON.stringify(state.preferencesKey)+');';
html=html.slice(0,start)+'<script>'+bootstrap+'\n'+bridge+'</script>'+html.slice(end+9);
html=html.replace('<form id="main-form"','<section id="halftone-bootstrap"><h1>Halftone</h1><p id="halftone-bootstrap-status" role="status">Loading settings…</p><button type="button" id="halftone-bootstrap-retry" hidden>Retry</button></section><form id="main-form"');
// The inactive form contains no editable defaults; only a successful read starts Clay.
html=html.replace('</head>','<meta name="color-scheme" content="light dark"><style id="xoce-settings-style">'+settingsStyle+'</style><style>#halftone-bootstrap{max-width:512px;margin:0 auto;padding:24px 16px}#halftone-bootstrap h1{margin-bottom:12px}#halftone-bootstrap button{min-height:48px;background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}</style></head>');
const target=path.join(root,'config.html');
if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==html)throw Error('config.html is stale');console.log('Bundled stay-open Clay configuration: PASS');}
else fs.writeFileSync(target,html);
