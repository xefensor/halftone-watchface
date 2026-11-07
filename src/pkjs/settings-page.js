'use strict';

// Clay copies only this function to its offline page. Everything used below is
// supplied through Clay userData/transport components or declared inside it.
module.exports = function() {
  var clay = this;
  // Clay serializes this hook, so the common stylesheet is explicit userData.
  // Bundled config already needs it for the loading screen; legacy Clay adds it.
  if (!document.getElementById('xoce-settings-style')) {
    var sharedStyle = document.createElement('style');
    sharedStyle.id = 'xoce-settings-style';
    sharedStyle.textContent = clay.meta.userData.settingsStyle;
    document.head.appendChild(sharedStyle);
  }
  var style = document.createElement('style');
  style.id = 'halftone-settings-style';
  style.textContent = [
    ':root{--on-accent:var(--accent-ink);--track:#cad0d6}@media(prefers-color-scheme:dark){:root{--track:#565f6a}}',
    'html{font-size:16px!important;height:auto;background:var(--page)!important;color:var(--ink)!important}',
    'body{height:auto;max-width:512px;margin:0 auto;padding:24px 16px calc(var(--halftone-save-height,108px) + 24px)}',
    // Clay adds component styles after this hook. Scope colour rules to the
    // form so late defaults cannot reintroduce white inputs or orange text.
    'body{background:var(--page)!important;color:var(--ink)!important}',
    '#main-form{color:var(--ink);font:inherit}',
    '#main-form .section{background:var(--card);color:var(--ink)}',
    '#main-form label,#main-form .label,#main-form .component-select .value{color:var(--ink);font-family:inherit}',
    '#main-form strong{color:var(--ink);font-family:inherit}',
    '#main-form .description,#main-form .component-text p{color:var(--muted)}',
    '#main-form input,#main-form select,#main-form option{color:var(--ink);background-color:var(--field);font-family:inherit}',
    '#main-form input::placeholder{color:var(--muted);opacity:1}',
    '#main-form .component-select .value{background:var(--field)}',
    '#main-form .component-toggle input{background:none}',
    '#main-form .component-toggle .graphic .marker{background:#fff;border:1px solid #59636f}',
    '#main-form .component-toggle input:checked+.graphic .marker{background:#fff;border-color:#fff}',
    '#main-form .component-color .picker-wrap .picker{background:var(--card);color:var(--ink)}',
    '#main-form .halftone-save-state p{color:var(--muted)}',
    '#main-form .halftone-warning p{color:#934300}',
    '@media(prefers-color-scheme:dark){#main-form .halftone-warning p{color:#ffbd77}}',
    '#main-form>.component-heading:first-child{padding:0}',
    '.component-heading h1,.component-heading h2,.component-heading h3,.component-heading h4{margin:0;color:var(--ink);font:700 var(--section-size)/1.3 var(--font-family);text-transform:none;letter-spacing:0}',
    '#main-form>.component-heading:first-child h1,#main-form>.component-heading:first-child h2,#main-form>.component-heading:first-child h4{font-size:var(--title-size);line-height:1.2;letter-spacing:-.6px}',
    '#main-form>.component-heading:first-child:after{display:none}',
    '#main-form>.halftone-intro{margin:12px 0 24px;padding:0}',
    '#main-form>.halftone-intro p{font-size:16px;line-height:1.5}',
    '#main-form>.halftone-intro:after{content:"";position:static;display:block;width:48px;height:4px;border-radius:2px;margin-top:16px;background:var(--accent)}',
    '.section{margin:0 0 24px;border:1px solid var(--line);border-radius:var(--card-radius);background:var(--card);box-shadow:none;overflow:hidden}',
    '.section>.component{margin-top:0!important;padding:16px;position:relative}',
    '.section>.component-heading:first-child{padding:16px;background:none;border-radius:0}',
    '.section>.component-heading:first-child h1,.section>.component-heading:first-child h2,.section>.component-heading:first-child h4{color:var(--ink)}',
    '.section>.component:after{left:16px;right:16px;background:var(--line)}',
    '.component-text p{margin:0;font-size:14px;line-height:1.5;color:var(--muted);overflow-wrap:break-word;word-wrap:break-word}',
    'label{min-height:28px;margin:0;padding:0;gap:14px;color:var(--ink);font-size:16px;line-height:1.5}',
    'label>.label{min-width:0;flex:1;overflow-wrap:break-word;word-wrap:break-word}',
    'label>.input{flex-shrink:0;margin-left:0}',
    '.description{padding:0;margin-top:7px;color:var(--muted);font-size:14px;line-height:1.5;overflow-wrap:break-word;word-wrap:break-word}',
    '.component-toggle label{min-height:var(--control-height)}',
    '.component-toggle input{display:block;position:absolute;opacity:0;width:44px;height:44px;right:12px;top:13px;margin:0}',
    '.component-toggle input:focus-visible+.graphic{outline:var(--focus-width) solid var(--accent);outline-offset:3px;border-radius:16px}',
    '.component-select:focus-within .value,.component-color label:focus-visible{outline:var(--focus-width) solid var(--accent);outline-offset:3px}',
    '.color-box.selectable:focus-visible{outline:var(--focus-width) solid var(--ink);outline-offset:-3px}',
    '.component-toggle .graphic .slide{background:var(--track)}',
    '.component-toggle .graphic .marker{box-shadow:0 1px 3px #0003}',
    '.component-toggle input:checked+.graphic .slide{background:var(--accent)}',
    '#main-form .component-toggle input:checked+.graphic .marker{background:var(--on-accent);border-color:var(--on-accent)}',
    '.component-toggle .graphic .slide,.component-toggle .graphic .marker{transition:background-color var(--control-motion) ease-out,left var(--control-motion) ease-out,transform var(--control-motion) ease-out}',
    '.component-color .value{flex-shrink:0;border:1px solid #8886;box-shadow:none}',
    '.component-color .picker-wrap .picker{max-width:416px;background:var(--card);border:1px solid var(--line);border-radius:var(--card-radius)}',
    '.component-input label{display:block}',
    '.component-input label>.label{display:block;padding:0}',
    '.component-input .input{display:block;min-width:100%;max-width:none;margin:9px 0 0}',
    '.component-input input{min-height:var(--control-height);padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--ink);font-size:15px}',
    '.component-input input:focus{outline:var(--focus-width) solid var(--accent);outline-offset:3px;border:1px solid var(--line)}',
    '.component-select label,.halftone-choice label{display:block}',
    '.component-select .value{margin-top:9px;padding:9px 28px 9px 12px;min-height:var(--control-height);border:1px solid var(--line);border-radius:8px;background:var(--field);font-size:15px}',
    '.component-select .value:after{right:12px;top:50%;margin-top:0;transform:translateY(-50%);border-top-color:var(--accent)}',
    '.halftone-choice select{display:block;width:100%;margin-top:9px;min-height:var(--control-height);padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--ink);font:inherit;font-size:15px}',
    '.halftone-choice select:focus-visible,button:focus-visible,summary:focus-visible{outline:var(--focus-width) solid var(--accent);outline-offset:3px}',
    '.halftone-section-nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}',
    '.halftone-section-nav button{flex:1 1 auto;min-width:0;min-height:var(--control-height);width:auto;max-width:100%;margin:0;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink);box-shadow:none;font:650 16px/1.5 var(--font-family);text-transform:none;letter-spacing:0;white-space:normal;overflow-wrap:normal;word-break:normal}',
    '.halftone-section-target:focus{outline:var(--focus-width) solid var(--accent);outline-offset:3px}',
    '.halftone-preview-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:0 0 16px}',
    '.halftone-preview-tabs button{min-width:0;width:100%;margin:0;text-transform:none;letter-spacing:0;box-shadow:none;min-height:var(--control-height);padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--ink);font:650 16px/1.5 var(--font-family);white-space:normal;overflow-wrap:anywhere}',
    '.halftone-preview-tabs button[aria-selected=true]{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}',
    '.halftone-preview-stage{width:212px;max-width:100%;margin:0 auto 14px;border:6px solid #101216;border-radius:var(--card-radius);overflow:hidden;background:#fff;line-height:0}',
    '.halftone-preview-stage canvas{display:block;width:200px;height:auto;max-width:100%;aspect-ratio:200/228;image-rendering:pixelated}',
    '.halftone-preview-note{margin:7px 0 0!important;font-size:12px!important}',
    '.halftone-preview-title{margin:0 0 12px;color:var(--ink);font-size:15px;text-transform:none!important}',
    '.halftone-preview-palette{display:block;margin:0 0 14px}',
    '.halftone-preview-palette>.description{display:block;margin-top:7px}',
    '.halftone-example-disabled{padding:7px 9px;border-radius:7px;background:var(--field);color:var(--muted)}',
    '.halftone-save-state{padding:0!important;margin:0 auto 12px;min-height:21px;color:var(--muted);font-size:14px;line-height:1.5;text-align:left}',
    '.halftone-save-state p{margin:0;font-size:14px;line-height:1.5;text-align:left}',
    '.halftone-save-state:after{display:none!important}',
    '.halftone-palette-code label{display:block;margin-bottom:7px}',
    '.halftone-palette-details summary{font-size:16px}',
    '.halftone-palette-code input{display:block;width:100%;min-height:var(--control-height);padding:9px 12px;border:1px solid var(--line);border-radius:8px;font:16px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}',
    '.halftone-palette-actions{display:flex;gap:8px;margin-top:9px}',
    '.halftone-palette-actions button{flex:1;min-width:0;width:auto;margin:0;min-height:var(--control-height);padding:9px 12px;border:1px solid var(--line);border-radius:8px;box-shadow:none;background:var(--field);color:var(--ink);font:650 16px/1.5 var(--font-family);text-transform:none;letter-spacing:0}',
    '#main-form .halftone-palette-code input:focus-visible{outline:var(--focus-width) solid var(--accent);outline-offset:3px}',
    '.halftone-palette-code p{margin:7px 0 0!important}',
    '.halftone-app-filter label{display:block;min-height:0;margin-bottom:7px}',
    '.halftone-app-entry{display:flex;gap:7px;align-items:stretch}',
    '.halftone-app-entry input{flex:1;min-width:0;width:0;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--ink);font:inherit;font-size:15px}',
    '.halftone-app-entry button,.halftone-app-chip button{width:auto;margin:0;min-width:0;box-shadow:none;text-transform:none;letter-spacing:0;font:inherit}',
    '.halftone-app-entry button{min-height:var(--control-height);padding:9px 13px;border:0;border-radius:8px;background:var(--accent);color:var(--on-accent)}',
    '.halftone-app-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 0;padding:0;list-style:none}',
    '.halftone-app-chip{display:flex;align-items:center;max-width:100%;padding:3px 3px 3px 10px;border:1px solid var(--line);border-radius:9px;background:var(--field);font-size:14px}',
    '.halftone-app-chip span{min-width:0;overflow-wrap:anywhere}',
    '.halftone-app-chip button{flex-shrink:0;min-height:var(--control-height);min-width:44px;padding:3px;border:0;background:none;color:var(--ink);font-size:20px}',
    '.halftone-app-filter .halftone-app-error{margin:7px 0 0;color:var(--ink);font-size:14px}',
    '.halftone-activity-list{padding:0;margin:12px 0 0;list-style:none}',
    '.halftone-activity-row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:6px 8px;padding:10px 0;border-top:1px solid var(--line)}',
    '.halftone-activity-row[data-hidden=true] .halftone-activity-name,.halftone-activity-row[data-disabled=true] .halftone-activity-name{color:var(--muted)}',
    '.halftone-activity-name{min-width:0;overflow-wrap:anywhere;font-size:15px;font-weight:650}',
    '.halftone-activity-name small{display:block;font-size:12px;font-weight:400;color:var(--muted)}',
    '.halftone-activity-row button{width:auto;min-width:44px;min-height:var(--control-height);margin:0;padding:7px;box-shadow:none;border:1px solid var(--line);border-radius:7px;background:var(--field);color:var(--ink);font:inherit;text-transform:none;letter-spacing:0}',
    '.halftone-activity-row button:disabled{opacity:.45}',
    '.halftone-activity-handle{touch-action:none;cursor:grab;font-size:21px!important}',
    '.halftone-activity-move{grid-column:2/4;display:flex;gap:8px}',
    '.halftone-activity-move button{flex:1;min-width:0}',
    '.halftone-activity-visible{display:flex!important;align-items:center;gap:8px;min-height:var(--control-height)!important;font-size:16px}',
    '.halftone-activity-visible input{position:static!important;width:22px!important;height:22px!important;opacity:1!important;margin:0!important}',
    '.halftone-activity-announcement{font-size:12px!important;min-height:18px;margin-top:7px!important}',
    '.halftone-reading-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}',
    '.halftone-reading{padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--field);min-width:0}',
    '.halftone-reading small,.halftone-health small{display:block;font-size:12px;color:var(--muted)}',
    '.halftone-reading strong{display:block;margin:4px 0;font-size:15px;color:var(--ink);overflow-wrap:anywhere}',
    '.halftone-reading .halftone-example{font-size:19px;line-height:1.2;color:var(--ink);margin:8px 0}',
    '.halftone-state{display:block;font-size:12px;color:var(--muted)}',
    '.halftone-health{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;padding:10px 0;color:var(--ink);font-size:14px}',
    '.halftone-health+.halftone-health{border-top:1px solid var(--line)}',
    '.halftone-health .halftone-state{text-align:right;max-width:60%}',
    '.halftone-health-help{font-size:12px!important;margin-top:4px!important}',
    '.halftone-details{padding:13px 16px;border-top:1px solid var(--line)}',
    '.halftone-details summary{font-size:16px}',
    '.halftone-details .component{padding:10px 0!important}',
    '.halftone-details p{font-size:12px;line-height:1.5;color:var(--muted);overflow-wrap:anywhere}',
    '.halftone-warning p{color:#a84d00}',
    '@media(prefers-color-scheme:dark){.halftone-warning p{color:#ffbd77}}',
    '.component-submit{position:fixed;left:0;right:0;bottom:0;max-width:none;margin:0;padding:12px 16px max(16px,env(safe-area-inset-bottom));z-index:20;background:var(--page);border-top:1px solid var(--line);box-shadow:none}.component-submit>*{max-width:480px;margin-left:auto;margin-right:auto}',
    'body.halftone-picker-open .component-submit{visibility:hidden}',
    '.component-input input,.halftone-app-entry input,select{scroll-margin-bottom:calc(var(--halftone-save-height,108px) + 16px)}',
    '.component-submit button{display:block;width:100%;min-width:0;min-height:var(--save-height);margin:0;padding:12px 16px;border:0;border-radius:8px;background:var(--accent);color:var(--on-accent);font:650 16px/1.5 var(--font-family);text-transform:none;letter-spacing:0}',
    '.component-submit button:disabled{opacity:.45}',
    '@media(max-height:420px){.component-submit{position:static;max-width:none;margin:16px 0 0;padding:12px 0;box-shadow:none}body{padding-bottom:24px}}',
    'body.halftone-actions-flow{padding-bottom:24px}.halftone-actions-flow .component-submit{position:static;max-width:none;margin:16px 0 0;padding:12px 0;box-shadow:none}',
    '.component-submit .halftone-reload-saved{margin-top:8px;border:1px solid var(--line);background:var(--field);color:var(--ink);font-weight:650}',
    '.halftone-save-buttons{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}',
    '.component-submit .halftone-discard{border:1px solid var(--line);background:var(--field);color:var(--ink);font-weight:650}',
    '#main-form input,#main-form select,.component-select .value,.halftone-preview-title,.halftone-activity-name{font-size:16px}',
    '#main-form .halftone-preview-note,#main-form .halftone-health-help,.halftone-details p,.halftone-state,.halftone-reading small,.halftone-health small,.halftone-activity-name small,.halftone-activity-announcement{font-size:14px!important}',
    '#main-form button{display:inline-flex;align-items:center;justify-content:center;text-align:center}#main-form .component-submit button{display:flex}.component-select .value{display:flex;align-items:center;line-height:1.5}',
    '@media(max-width:340px){body{padding-left:12px;padding-right:12px}.section>.component{padding-left:12px;padding-right:12px}.halftone-reading-grid{gap:6px}.halftone-reading{padding:9px}.component-submit{padding-left:12px;padding-right:12px}}',
  ].join('\n');
  document.head.appendChild(style);
  var viewport = document.querySelector('meta[name=viewport]');
  if (viewport) { viewport.setAttribute('content','width=device-width,initial-scale=1'); }

  clay.on(clay.EVENTS.AFTER_BUILD, function() {
    function item(id) { return clay.getItemById(id); }
    function field(key) { return clay.getItemByMessageKey(key); }
    function node(value) { return value && value.$element && value.$element[0]; }
    function clear(element) { while (element.firstChild) { element.removeChild(element.firstChild); } }
    function make(tag, text, className) {
      var element = document.createElement(tag);
      if (text !== undefined && text !== null) { element.textContent = String(text); }
      if (className) { element.className = className; }
      return element;
    }
    function transport(id) {
      var element = node(item(id)), value = {};
      if (element) {
        try { value = JSON.parse(element.textContent || '{}'); } catch (ignored) {}
        element.hidden = true;
      }
      return value && typeof value === 'object' ? value : {};
    }
    var data = transport('halftone-settings-data');
    var words = transport('halftone-settings-strings');
    if (typeof data.language === 'string') { document.documentElement.lang = data.language; }
    var assets = transport('halftone-preview-assets');
    var intro=node(item('halftone-intro'));if(intro)intro.className+=' halftone-intro';
    function t(key,params) {
      var text = typeof words[key] === 'string' ? words[key] : key;
      return text.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,function(match,name) { return params && params[name] !== undefined ? String(params[name]) : match; });
    }
    function show(value, visible) { var element = node(value); if (element) { element.hidden = !visible; } }
    var sections=document.querySelectorAll('#main-form > .section');
    if (sections.length) {
      var sectionNav=make('nav',null,'halftone-section-nav');sectionNav.setAttribute('aria-label',t('title'));
      Array.prototype.forEach.call(sections,function(section,index) {
        var heading=section.querySelector('.component-heading');if (!heading) { return; }
        var target=heading.querySelector('h1,h2,h3,h4') || heading;
        target.id='halftone-section-heading-'+index;target.tabIndex=-1;target.className+=' halftone-section-target';
        var button=make('button',target.textContent.trim());button.type='button';button.setAttribute('aria-controls',target.id);
        button.addEventListener('click',function() { target.focus();target.scrollIntoView({block:'start'}); });
        sectionNav.appendChild(button);
      });
      sections[0].parentNode.insertBefore(sectionNav,sections[0]);
    }
    function choice(id, label, options, value) {
      var host = node(item(id));
      if (!host) { return null; }
      clear(host); host.className += ' halftone-choice';
      var wrapper = make('label'), title = make('span', label), select = make('select');
      select.id = id + '-select';
      wrapper.setAttribute('for', select.id);
      options.forEach(function(option) {
        var child = make('option', option[1]); child.value = option[0]; select.appendChild(child);
      });
      select.value = String(value); wrapper.appendChild(title); wrapper.appendChild(select); host.appendChild(wrapper);
      return select;
    }
    function state(value) {
      var names = {empty:'sourceEmpty',loading:'sourceLoading',ready:'sourceReady',unavailable:'sourceUnavailable',
        expired:'sourceExpired',denied:'sourceDenied',unsupported:'sourceUnsupported',disabled:'sourceDisabled',playing:'sourcePlaying',
        idle:'sourceIdle',paused:'sourcePaused',off:'sourceOff',waiting:'sourceWaiting',permission:'sourcePermission'};
      return t(names[value] || 'sourceWaiting');
    }
    function nativeColor(value) {
      var number = typeof value === 'number' ? value : parseInt(String(value).replace(/^#|^0x/i,''),16);
      if (!isFinite(number)) { return 0; }
      return [16,8,0].reduce(function(result,shift) {
        return result | (Math.max(0,Math.min(3,Math.round(((number >> shift) & 255) / 85))) * 85 << shift);
      },0);
    }
    function color(key) { return nativeColor(field(key).get()); }
    function css(value) { return '#' + ('000000' + value.toString(16)).slice(-6); }
    clay.getItemsByType('color').forEach(function(value) {
      var element = node(value), opener = element && element.querySelector('label');
      if (!opener) { return; }
      opener.tabIndex = 0; opener.setAttribute('role','button'); opener.setAttribute('aria-haspopup','true'); opener.setAttribute('aria-expanded','false');
      opener.addEventListener('keydown',function(event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); opener.click(); }
        if (event.key === 'Escape') { var picker = element.querySelector('.picker-wrap'); if (picker) { picker.classList.remove('show'); } }
      });
      Array.prototype.forEach.call(element.querySelectorAll('.color-box.selectable'),function(box) {
        box.tabIndex = -1; box.setAttribute('role','button');
        box.setAttribute('aria-label',css(Number(box.getAttribute('data-value'))));
        box.addEventListener('keydown',function(event) {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); box.click(); opener.focus(); }
          if (event.key === 'Escape') { var picker = element.querySelector('.picker-wrap'); if (picker) { picker.classList.remove('show'); } opener.focus(); }
        });
      });
    });
    var initialSnapshot = '', appEntry;
    var bridge = window.HalftoneSettingsBridge, phonePhase = 'ready', phoneConfirmed = false, reloadSaved, discard, confirmedForm, restoring = false;
    function updateDirty() {}
    var activityHost = node(item('halftone-activity-order'));
    var activityPreferences = data.activityPreferences || {}, activityOrder = [], activityHidden = [];
    var activityProviders = Object.create(null), activityList, activityAnnouncement;
    var activityPluginSwitch=field('SHOW_ACTIVITIES');
    function providerKey(value) { return typeof value === 'string' &&
      (value === 'builtin:music' || value === 'builtin:notifications' || /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)); }
    (data.activityProviders || []).forEach(function(provider) {
      if (!provider || !providerKey(provider.uuid)) { return; }
      activityProviders[provider.uuid] = {name:String(provider.name || provider.uuid).slice(0,96),available:provider.available !== false};
    });
    activityProviders['builtin:notifications'] = {name:t('notificationsSource'),available:true};
    activityProviders['builtin:music'] = {name:t('musicSource'),available:true};
    var visibleProviderKeys=['builtin:notifications'].concat(Object.keys(activityProviders).filter(function(id) {
      return id !== 'builtin:notifications' && id !== 'builtin:music';
    }),['builtin:music']);
    var unavailableBudget=Math.max(0,64-visibleProviderKeys.length),unavailableCount=0;
    (Array.isArray(activityPreferences.order) ? activityPreferences.order : []).concat(visibleProviderKeys).forEach(function(id) {
      if (!providerKey(id) || activityOrder.indexOf(id) >= 0) { return; }
      // Reserve room for installed apps and built-ins before remembering absent
      // apps. A full old preference list must never hide current controls.
      if (!activityProviders[id] && unavailableCount++ >= unavailableBudget) { return; }
      activityOrder.push(id);
    });
    (Array.isArray(activityPreferences.hidden) ? activityPreferences.hidden : []).forEach(function(id) {
      if (providerKey(id) && activityHidden.indexOf(id) < 0) { activityHidden.push(id); }
    });
    function activityVisibility(id,visible) {
      activityHidden=activityHidden.filter(function(value) { return value !== id; });
      if (!visible) { activityHidden.push(id); }
    }
    activityVisibility('builtin:music',!!field('SHOW_MUSIC').get());
    activityVisibility('builtin:notifications',!!field('SHOW_NOTIFICATIONS').get());
    function activityValue() { return {order:activityOrder.slice(),hidden:activityHidden.slice()}; }
    // A hidden Clay field carries phone-only ordering through its serializer.
    // PKJS removes it before numeric AppMessage conversion; no native key exists.
    var activityPreferenceField = field('__halftoneActivityPreferences');
    show(activityPreferenceField,false);
    function syncActivityValue() { activityPreferenceField.set(JSON.stringify(activityValue())); }
    syncActivityValue();
    function activityName(id) { return activityProviders[id] ? activityProviders[id].name : t('activityUnavailableApp'); }
    function moveActivity(id, target, focusAction) {
      var from = activityOrder.indexOf(id);
      target = Math.max(0,Math.min(activityOrder.length - 1,target));
      if (from < 0 || from === target) { return; }
      activityOrder.splice(from,1); activityOrder.splice(target,0,id); syncActivityValue(); renderActivities(); updateDirty();
      if (activityAnnouncement) { activityAnnouncement.textContent = t('activityMoved',{name:activityName(id),position:target+1}); }
      if (focusAction && activityList) {
        var row = activityList.children[target], button = row && row.querySelector('[data-action="' + focusAction + '"]');
        if (button && !button.disabled) { button.focus(); }
        else if (row) { row.querySelector('.halftone-activity-handle').focus(); }
      }
    }
    function activityAt(target) {
      while (target && target !== activityList) {
        if (target.getAttribute && target.getAttribute('data-provider')) { return target.getAttribute('data-provider'); }
        target = target.parentNode;
      }
      return null;
    }
    var draggingActivity = null, touchActivityTarget = null;
    function renderActivities() {
      if (!activityList) { return; }
      var focused=document.activeElement,focusedProvider=activityAt(focused);
      var focusedAction=focused && focused.getAttribute && focused.getAttribute('data-action');
      clear(activityList);
      activityOrder.forEach(function(id,index) {
        var provider = activityProviders[id], row = make('li',null,'halftone-activity-row');
        row.setAttribute('data-provider',id); row.setAttribute('data-hidden',activityHidden.indexOf(id) >= 0 ? 'true' : 'false');
        var disabled=id!=='builtin:music' && id!=='builtin:notifications' && !activityPluginSwitch.get();
        row.setAttribute('data-disabled',disabled?'true':'false');
        var handle = make('button','≡','halftone-activity-handle'); handle.type = 'button'; handle.draggable = true;
        handle.setAttribute('aria-label',t('activityMove',{name:activityName(id)})); handle.setAttribute('data-action','handle');
        handle.addEventListener('keydown',function(event) {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault(); moveActivity(id,index + (event.key === 'ArrowUp' ? -1 : 1),'handle');
          }
        });
        handle.addEventListener('dragstart',function(event) {
          draggingActivity = id; if (event.dataTransfer) { event.dataTransfer.effectAllowed='move'; event.dataTransfer.setData('text/plain',id); }
        });
        handle.addEventListener('dragend',function() { draggingActivity=null; });
        function moveTouch(x,y) {
          var target = activityAt(document.elementFromPoint(x,y));
          if (target && target !== id) { touchActivityTarget=target; }
          Array.prototype.forEach.call(activityList.children,function(child) {
            child.style.outline=child.getAttribute('data-provider') === touchActivityTarget ? '2px solid var(--accent)' : '';
          });
        }
        function finishTouch() {
          var target=touchActivityTarget; touchActivityTarget=null; draggingActivity=null;
          if (target) { moveActivity(id,activityOrder.indexOf(target),'handle'); }
          else { renderActivities(); }
        }
        if (typeof PointerEvent !== 'undefined') {
          handle.addEventListener('pointerdown',function(event) {
            if (event.pointerType === 'mouse') { return; }
            draggingActivity=id; touchActivityTarget=null; if (handle.setPointerCapture) { handle.setPointerCapture(event.pointerId); }
          });
          handle.addEventListener('pointermove',function(event) {
            if (draggingActivity === id) { event.preventDefault(); moveTouch(event.clientX,event.clientY); }
          });
          handle.addEventListener('pointerup',function() { if (draggingActivity === id) { finishTouch(); } });
          handle.addEventListener('pointercancel',function() { draggingActivity=null; touchActivityTarget=null; renderActivities(); });
        } else {
          handle.addEventListener('touchstart',function() { draggingActivity=id; touchActivityTarget=null; },{passive:true});
          handle.addEventListener('touchmove',function(event) {
            if (draggingActivity !== id || !event.touches.length) { return; }
            event.preventDefault(); moveTouch(event.touches[0].clientX,event.touches[0].clientY);
          },{passive:false});
          handle.addEventListener('touchend',finishTouch);
          handle.addEventListener('touchcancel',function() { draggingActivity=null; touchActivityTarget=null; renderActivities(); });
        }
        row.addEventListener('dragover',function(event) { if (draggingActivity) { event.preventDefault(); } });
        row.addEventListener('drop',function(event) { event.preventDefault(); if (draggingActivity) {
          var moving=draggingActivity; draggingActivity=null; moveActivity(moving,activityOrder.indexOf(id),'handle');
        } });
        row.appendChild(handle);
        var title = make('span',activityName(id),'halftone-activity-name');
        if (!provider || !provider.available) { title.appendChild(make('small',t('activityUnavailable'))); }
        if (disabled) { title.appendChild(make('small',t('activityPluginsOffHelp'))); }
        row.appendChild(title);
        var label = make('label',null,'halftone-activity-visible'), toggle = make('input'); toggle.type='checkbox';
        toggle.checked=activityHidden.indexOf(id)<0; toggle.disabled=disabled;
        toggle.setAttribute('data-action','visible'); toggle.setAttribute('aria-label',t('activityShow',{name:activityName(id)}));
        label.appendChild(toggle); label.appendChild(make('span',t('activityVisible'))); row.appendChild(label);
        toggle.addEventListener('change',function() {
          activityVisibility(id,toggle.checked);
          if (id === 'builtin:music') { field('SHOW_MUSIC').set(toggle.checked); }
          if (id === 'builtin:notifications') {
            field('SHOW_NOTIFICATIONS').set(toggle.checked);
            updateNotifications();
          }
          syncActivityValue(); row.setAttribute('data-hidden',toggle.checked?'false':'true'); updateDirty(); renderPreview();
        });
        var moves = make('div',null,'halftone-activity-move');
        [['up',-1,'activityUp'],['down',1,'activityDown']].forEach(function(action) {
          var button = make('button',t(action[2])); button.type='button'; button.disabled=index+action[1]<0||index+action[1]>=activityOrder.length;
          button.setAttribute('data-action',action[0]); button.setAttribute('aria-label',t(action[2]) + ': ' + activityName(id));
          button.addEventListener('click',function() { moveActivity(id,index+action[1],action[0]); }); moves.appendChild(button);
        });
        row.appendChild(moves); activityList.appendChild(row);
      });
      if (focusedProvider && focusedAction) {
        var replacement=activityList.querySelector('[data-provider="'+focusedProvider+'"] [data-action="'+focusedAction+'"]');
        if (replacement && !replacement.disabled) { replacement.focus(); }
      }
    }
    if (activityHost) {
      clear(activityHost); activityHost.appendChild(make('strong',t('activityPriority')));
      activityHost.appendChild(make('p',t('activityPriorityHelp'),'description'));
      activityList=make('ol',null,'halftone-activity-list'); activityList.setAttribute('aria-label',t('activityPriority')); activityHost.appendChild(activityList);
      activityAnnouncement=make('p','','halftone-activity-announcement'); activityAnnouncement.setAttribute('aria-live','polite'); activityHost.appendChild(activityAnnouncement);
      renderActivities(); show(field('SHOW_MUSIC'),false);
    }
    activityPluginSwitch.on('change',function() { renderActivities(); renderPreview(); updateDirty(); });
    var themeChanging = false;
    var bg = field('BACKGROUND_COLOR'), fg = field('TEXT_COLOR'), accent = field('ACCENT_COLOR');
    var initialTheme = color('BACKGROUND_COLOR') === 0xFFFFFF && color('TEXT_COLOR') === 0 ? 'light' :
      color('BACKGROUND_COLOR') === 0 && color('TEXT_COLOR') === 0xFFFFFF ? 'dark' : 'custom';
    var customPalette = {background:bg.get(),foreground:fg.get()};
    var previousTheme = initialTheme;
    var paletteInput, paletteStatus;
    var night = field('NIGHT_PALETTE');
    var previewPalette;
    var theme = choice('halftone-theme',t('theme'),[['light',t('themeLight')],['dark',t('themeDark')],['custom',t('themeCustom')]],initialTheme);
    function updateColors() {
      show(bg,theme.value === 'custom'); show(fg,theme.value === 'custom');
      var contrast = node(item('halftone-contrast'));
      function luminance(value) {
        return [16,8,0].map(function(shift) { var channel = ((value >> shift) & 255) / 255;
          return channel <= .04045 ? channel / 12.92 : Math.pow((channel + .055) / 1.055,2.4);
        }).reduce(function(sum,channel,index) { return sum + channel * [.2126,.7152,.0722][index]; },0);
      }
      var background = color('BACKGROUND_COLOR'), foreground = color('TEXT_COLOR');
      function ratio(first,second) { var a=luminance(first),b=luminance(second); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); }
      var secondary = [16,8,0].reduce(function(result,shift) {
        var front=(foreground>>shift)&255,back=(background>>shift)&255;
        return result | (Math.floor((2*(front/85)+(back/85)+1)/3)*85 << shift);
      },0);
      var low = ratio(background,foreground) < 4.5 || night.get() && ratio(color('NIGHT_BACKGROUND_COLOR'),color('NIGHT_TEXT_COLOR')) < 4.5;
      var adjusted = ratio(background,secondary) < 4.5 || ratio(background,color('ACCENT_COLOR')) < 2 ||
        night.get() && ratio(color('NIGHT_BACKGROUND_COLOR'),color('NIGHT_ACCENT_COLOR')) < 2;
      if (contrast) { contrast.className += contrast.className.indexOf('halftone-warning') < 0 ? ' halftone-warning' : '';
        contrast.hidden = !low && !adjusted; clear(contrast); contrast.appendChild(make('p',t(low ? 'contrastHelp' : 'accentContrastHelp'))); }
      updatePaletteCode(); renderPreview();
    }
    if (theme) { theme.addEventListener('change',function() {
      if (previousTheme === 'custom') { customPalette = {background:bg.get(),foreground:fg.get()}; }
      themeChanging = true;
      if (theme.value === 'light') { bg.set(0xFFFFFF); fg.set(0); }
      if (theme.value === 'dark') { bg.set(0); fg.set(0xFFFFFF); }
      if (theme.value === 'custom') { bg.set(customPalette.background); fg.set(customPalette.foreground); }
      previousTheme = theme.value;
      themeChanging = false; updateColors(); updateDirty();
    }); }
    [bg,fg,accent].forEach(function(value) { if (value) { value.on('change',function() {
      if (!themeChanging && value !== accent) { theme.value = previousTheme = 'custom'; customPalette = {background:bg.get(),foreground:fg.get()}; }
      updateColors();
    }); } });

    function paletteCode() {
      return 'HAL1-' + ['BACKGROUND_COLOR','TEXT_COLOR','ACCENT_COLOR'].map(function(key) { return css(color(key)).slice(1).toUpperCase(); }).join('-');
    }
    function updatePaletteCode() {
      if (paletteInput) { paletteInput.value = paletteCode(); paletteInput.setCustomValidity(''); }
      if (paletteStatus) { paletteStatus.textContent = ''; }
    }
    var paletteHost = node(item('halftone-palette-code'));
    if (paletteHost) {
      clear(paletteHost); paletteHost.className += ' halftone-palette-code';
      var paletteDetails=make('details',null,'halftone-palette-details');
      paletteDetails.appendChild(make('summary',t('paletteCode')));paletteHost.appendChild(paletteDetails);
      paletteHost=paletteDetails;
      var paletteLabel = make('label',t('paletteInput')); paletteLabel.setAttribute('for','halftone-palette-input'); paletteHost.appendChild(paletteLabel);
      paletteInput = make('input'); paletteInput.id = 'halftone-palette-input'; paletteInput.type = 'text'; paletteInput.maxLength = 32;
      paletteInput.autocomplete = 'off'; paletteInput.spellcheck = false; paletteInput.setAttribute('autocapitalize','characters');
      paletteInput.setAttribute('aria-label',t('paletteInput')); paletteInput.setAttribute('aria-describedby','halftone-palette-help halftone-palette-status');
      paletteHost.appendChild(paletteInput);
      var paletteActions = make('div',null,'halftone-palette-actions');
      var copyPalette = make('button',t('paletteCopy')), applyPalette = make('button',t('paletteApply'));
      copyPalette.type = applyPalette.type = 'button'; copyPalette.id = 'halftone-palette-copy'; applyPalette.id = 'halftone-palette-apply';
      paletteActions.appendChild(copyPalette); paletteActions.appendChild(applyPalette); paletteHost.appendChild(paletteActions);
      var paletteHelp = make('p',t('paletteCodeHelp'),'description'); paletteHelp.id = 'halftone-palette-help'; paletteHost.appendChild(paletteHelp);
      paletteStatus = make('p','','description'); paletteStatus.id = 'halftone-palette-status'; paletteStatus.setAttribute('role','status'); paletteStatus.setAttribute('aria-live','polite'); paletteHost.appendChild(paletteStatus);
      paletteInput.addEventListener('input',function() { paletteInput.setCustomValidity(''); paletteStatus.textContent = ''; });
      applyPalette.addEventListener('click',function() {
        var match = /^HAL1-([0-9A-F]{6})-([0-9A-F]{6})-([0-9A-F]{6})$/i.exec(paletteInput.value.trim());
        if (!match) { paletteStatus.textContent = t('paletteInvalid'); paletteInput.focus(); return; }
        themeChanging = true;
        [bg,fg,accent].forEach(function(value,index) { value.set(nativeColor(parseInt(match[index+1],16))); });
        theme.value = previousTheme = 'custom'; customPalette = {background:bg.get(),foreground:fg.get()};
        themeChanging = false; updateColors(); updateDirty(); paletteStatus.textContent = t('paletteApplied');
      });
      copyPalette.addEventListener('click',function() {
        updatePaletteCode(); paletteInput.focus(); paletteInput.select();
        if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(paletteInput.value).then(function() { paletteStatus.textContent = t('paletteCopied'); },function() { paletteStatus.textContent = t('paletteSelectCopy'); });
        } else {
          var copied = false; try { copied = document.execCommand('copy'); } catch (ignored) {}
          paletteStatus.textContent = t(copied ? 'paletteCopied' : 'paletteSelectCopy');
        }
      });
      updatePaletteCode();
    }
    function updateNight() {
      ['NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR'].forEach(function(key) { show(field(key),!!night.get()); });
      if (previewPalette) {
        previewPalette.parentNode.hidden = !night.get();
        if (!night.get()) { previewPalette.value = 'day'; }
      }
      updateColors(); updateDirty();
    }
    night.on('change',updateNight);
    ['NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR'].forEach(function(key) { field(key).on('change',updateColors); });
    updateNight();

    var notification = field('SHOW_NOTIFICATIONS'), preview = field('NOTIFICATION_PREVIEW'), appOnly = field('NOTIFICATION_APP_ONLY'), vibration = field('NOTIFICATION_VIBRATION'), apps = field('NOTIFICATION_APPS');
    var noticeMode = choice('halftone-notification-mode',t('notificationDetails'),[
      ['app',t('notificationAppOnly')],['summary',t('notificationSummary')],['preview',t('notificationPreview')]
    ],appOnly.get() ? 'app' : preview.get() ? 'preview' : 'summary');
    var appMode = choice('halftone-app-mode',t('notificationAppsMode'),[
      ['all',t('allApps')],['selected',t('selectedApps')]
    ],String(apps.get() || '').trim() ? 'selected' : 'all');
    function parsedApps(value) {
      var seen = Object.create(null); return String(value || '').split(',').map(function(name) { return name.trim(); }).filter(function(name) {
        if (!name || seen[name.toLowerCase()]) { return false; } seen[name.toLowerCase()] = true; return true;
      });
    }
    var entries = parsedApps(apps.get()), appHost = make('div',null,'component halftone-app-filter');
    var appLabel = make('label',t('appEntryLabel')); appLabel.setAttribute('for','halftone-app-entry'); appHost.appendChild(appLabel);
    var entryRow = make('div',null,'halftone-app-entry');
    appEntry = make('input'); appEntry.id = 'halftone-app-entry'; appEntry.type = 'text'; appEntry.maxLength = 160;
    appEntry.autocomplete = 'off'; appEntry.setAttribute('autocapitalize','none'); appEntry.spellcheck = false;
    var addApp = make('button',t('appAdd')); addApp.type = 'button'; addApp.id = 'halftone-app-add';
    entryRow.appendChild(appEntry); entryRow.appendChild(addApp); appHost.appendChild(entryRow);
    var chips = make('ul',null,'halftone-app-chips'); chips.setAttribute('aria-label',t('selectedApps')); appHost.appendChild(chips);
    var appHelp = make('p',t('appEntryHelp'),'description'); appHelp.id='halftone-app-help';appHost.appendChild(appHelp);
    appEntry.setAttribute('aria-describedby','halftone-app-help halftone-app-error');
    var appError = make('p','','halftone-app-error'); appError.id='halftone-app-error';appError.setAttribute('aria-live','polite');appHost.appendChild(appError);
    var canonicalInput = apps.$manipulatorTarget && apps.$manipulatorTarget[0];
    if (canonicalInput) { canonicalInput.required = false; canonicalInput.setCustomValidity(''); }
    var appNode = node(apps); appNode.parentNode.insertBefore(appHost,appNode);
    show(notification,false); show(preview,false); show(appOnly,false); show(apps,false);
    function appValidity(message) {
      var enabled = notification.get() && appMode.value === 'selected';
      appEntry.required = enabled && !entries.length;
      if (enabled && !entries.length && !appEntry.value.trim() && !message) { message = t('appFilterRequired'); }
      appEntry.setCustomValidity(enabled ? message || '' : '');
      appError.textContent = enabled ? message || '' : '';
    }
    function draftAppError() {
      var value = appEntry.value.trim();
      if (value && /[,\x00-\x1f\x7f]/.test(value)) { return t('appInvalid'); }
      if (value && entries.some(function(name) { return name.toLowerCase() === value.toLowerCase(); })) { return t('appDuplicate'); }
      if (entries.concat(value ? [value] : []).join(', ').length > 160) { return t('appLimit'); }
      return '';
    }
    function renderApps() {
      clear(chips);
      entries.forEach(function(name,index) {
        var chip = make('li',null,'halftone-app-chip'), text = make('span',name), remove = make('button','×');
        remove.type='button'; remove.setAttribute('aria-label',t('appRemove',{app:name}));
        remove.addEventListener('click',function() {
          entries.splice(index,1); renderApps();
          var remaining = chips.querySelectorAll('button');
          (remaining[Math.min(index,remaining.length-1)] || addApp).focus();
          updateDirty();
        });
        chip.appendChild(text);chip.appendChild(remove);chips.appendChild(chip);
      });
      apps.set(appMode.value === 'selected' ? entries.join(', ') : '');
      appValidity(draftAppError()); updateDirty();
    }
    function commitApp(report) {
      var value = appEntry.value.trim(), error = draftAppError();
      if (error) { appValidity(error); if (report) { appEntry.reportValidity(); } return false; }
      if (!value) { appValidity(''); if (report && !entries.length) { appEntry.reportValidity(); } return entries.length > 0; }
      entries.push(value);appEntry.value='';renderApps();return true;
    }
    addApp.addEventListener('click',function() { commitApp(true); });
    appEntry.addEventListener('keydown',function(event) { if (event.key === 'Enter') { event.preventDefault();commitApp(true); } });
    appEntry.addEventListener('input',function() { appValidity(draftAppError()); updateDirty(); });
    function updateNotifications() {
      var enabled = !!notification.get();
      activityVisibility('builtin:notifications',enabled);
      syncActivityValue(); renderActivities();
      if (enabled) {
        appOnly.set(noticeMode.value === 'app');
        if (noticeMode.value !== 'app') { preview.set(noticeMode.value === 'preview'); }
      }
      show(vibration,enabled);
      show(item('halftone-notification-mode'),enabled);
      show(item('halftone-notification-disabled'),!enabled);
      show(item('halftone-notification-help'),enabled);
      var privacy = node(item('halftone-notification-help'));
      if (privacy) { clear(privacy); privacy.appendChild(make('p',t('notificationsHelp')));
        if (noticeMode.value === 'summary') { privacy.appendChild(make('p',t('notificationSummaryHelp'))); }
        if (noticeMode.value === 'app') { privacy.appendChild(make('p',t('notificationAppOnlyHelp'))); }
      }
      show(item('halftone-app-mode'),enabled); appHost.hidden = !enabled || appMode.value !== 'selected';
      appValidity(draftAppError()); renderPreview(); updateDirty();
    }
    noticeMode.addEventListener('change',updateNotifications);
    appMode.addEventListener('change',function() { renderApps(); updateNotifications(); });
    renderApps();

    var readings = node(item('halftone-readings'));
    if (readings) {
      clear(readings); readings.appendChild(make('strong',t('twoReadings')));
      var grid = make('div',null,'halftone-reading-grid');
      [0,1].forEach(function(index) {
        var slot = (data.slots || [])[index] || {}, card = make('div',null,'halftone-reading');
        card.appendChild(make('small',t(index ? 'rightReading' : 'leftReading')));
        var propertyKeys = {temperature:'readingTemperature',feels_like:'readingFeelsLike',high:'readingHigh',low:'readingLow',condition:'readingCondition',condition_code:'readingCondition',humidity:'readingHumidity',wind_speed:'readingWindSpeed',wind_direction:'readingWindDirection',precipitation:'readingRain',uv_index:'readingUv',battery_level:'readingBattery',title:'readingTitle',artist:'readingArtist',name:'readingName'};
        var property = slot.category === 'phone' && slot.property === 'battery_level' ? t('phoneSource') : propertyKeys[slot.property] ? t(propertyKeys[slot.property]) : '';
        var label = slot.label && String(slot.label).toLowerCase() !== String(slot.property || '').toLowerCase() ? slot.label : property || slot.label;
        card.appendChild(make('strong',label || state(slot.status || 'empty')));
        if (property && property !== label) { card.appendChild(make('small',property)); }
        if (slot.value !== undefined && slot.value !== '') { card.appendChild(make('div',slot.value,'halftone-example')); }
        if (label) { card.appendChild(make('span',state(slot.status || 'empty'),'halftone-state')); }
        var age = typeof slot.observationAgeSec === 'number' && isFinite(slot.observationAgeSec) && slot.observationAgeSec >= 0 ? ['observedAge',slot.observationAgeSec] :
          typeof slot.receivedAgeSec === 'number' && isFinite(slot.receivedAgeSec) && slot.receivedAgeSec >= 0 ? ['receivedAge',slot.receivedAgeSec] : null;
        if (age) { card.appendChild(make('small',age[1] < 60 ? t(age[0] === 'observedAge' ? 'justObserved' : 'justReceived') : t(age[0],{age:Math.floor(age[1]/60)}))); }
        var recovery = slot.status === 'denied' || slot.status === 'permission' ? 'permissionHelp' :
          slot.status === 'empty' || !slot.status ? 'readingSetupHelp' :
          ['expired','unavailable','unsupported','disabled'].indexOf(slot.status) >= 0 ? 'sourceNoUpdateHelp' : '';
        if (recovery) { card.appendChild(make('small',t(recovery))); }
        grid.appendChild(card);
      }); readings.appendChild(grid);
    }
    var readingHelp=node(item('halftone-reading-help'));
    if (readingHelp) { clear(readingHelp); readingHelp.appendChild(make('p',t('complicationsHelp')));
      readingHelp.appendChild(make('p',t('sharedReadingsHelp'),'description')); }
    var health = node(item('halftone-source-status'));
    if (health) {
      clear(health);
      [['music','musicSource'],['notifications','notificationsSource'],['phone','phoneSource'],['activities','activitiesSource']].forEach(function(pair) {
        var source = data.sources && data.sources[pair[0]] || {}, row = make('div',null,'halftone-health');
        row.appendChild(make('span',t(pair[1]))); row.appendChild(make('span',state(pair[0] !== 'music' && source.state === 'idle' ? 'ready' : source.state),'halftone-state'));
        health.appendChild(row);
        var recovery = source.message === 'DISCONNECTED' ? 'connectionHelp' : source.state === 'denied' || source.state === 'permission' ? 'permissionHelp' :
          source.state === 'disabled' || source.state === 'unavailable' ? 'pluginHelp' : '';
        if (recovery) { health.appendChild(make('p',t(recovery),'halftone-health-help')); }
      });
    }
    var saveStatus = node(item('halftone-save-status'));
    var submitHost = document.querySelector('.component-submit');
    function visibleViewport() {
      var view=window.visualViewport,top=view?view.offsetTop:0;
      return {top:top,bottom:top+(view?view.height:window.innerHeight),height:view?view.height:window.innerHeight};
    }
    var saveFrame=false,lastSaveHeight,lastSaveFlow;
    function saveSpace() {
      if(saveFrame)return;
      saveFrame=true;
      (window.requestAnimationFrame||function(callback){return window.setTimeout(callback,16);})(function(){
        saveFrame=false;measureSaveSpace();focusedVisible();
      });
    }
    function measureSaveSpace() {
      if (!submitHost) { return; }
      var flow=visibleViewport().height<=420;
      if(flow!==lastSaveFlow){document.body.classList.toggle('halftone-actions-flow',flow);lastSaveFlow=flow;}
      var fixed=window.getComputedStyle(submitHost).position==='fixed';
      var height=fixed?Math.ceil(submitHost.getBoundingClientRect().height)+'px':'0px';
      if(height!==lastSaveHeight){document.documentElement.style.setProperty('--halftone-save-height',height);lastSaveHeight=height;}
    }
    function focusedVisible(target) {
      target=target||document.activeElement;
      if(!target||['INPUT','SELECT'].indexOf(target.tagName)<0||target.type==='checkbox'||target.type==='hidden')return;
      var viewport=visibleViewport(),rect=target.getBoundingClientRect();
      var fixed=submitHost&&window.getComputedStyle(submitHost).position==='fixed'&&!document.body.classList.contains('halftone-picker-open');
      var bottom=(fixed?Math.min(viewport.bottom,submitHost.getBoundingClientRect().top):viewport.bottom)-12;
      if(rect.bottom>bottom)window.scrollBy(0,rect.bottom-bottom);
      else if(rect.top<viewport.top+8)window.scrollBy(0,rect.top-viewport.top-8);
    }
    if (saveStatus && submitHost) {
      saveStatus.className += ' halftone-save-state'; saveStatus.setAttribute('role','status'); saveStatus.setAttribute('aria-live','polite');
      submitHost.insertBefore(saveStatus,submitHost.firstChild);
    }
    if (bridge && submitHost) {
      var saveButton = submitHost.querySelector('button');
      saveButton.classList.add('halftone-primary-save');
      var actions = make('div',null,'halftone-save-buttons');
      discard = make('button',t('phoneDiscard'),'halftone-discard'); discard.type = 'button';
      discard.addEventListener('click',function() {
        if (phonePhase === 'saving' || phonePhase === 'uncertain' || !confirmedForm) return;
        restoring = true;
        function previous(name) { var value = confirmedForm[name]; return value && typeof value === 'object' ? value.value : value; }
        noticeMode.value = previous('NOTIFICATION_APP_ONLY') ? 'app' : previous('NOTIFICATION_PREVIEW') ? 'preview' : 'summary';
        appMode.value = previous('NOTIFICATION_APPS') ? 'selected' : 'all';
        entries = String(previous('NOTIFICATION_APPS') || '').split(',').map(function(value){return value.trim();}).filter(Boolean);
        appEntry.value = '';
        Object.keys(confirmedForm).forEach(function(name) { var value = field(name); if (value) value.set(previous(name)); });
        var preferences = JSON.parse(previous('__halftoneActivityPreferences') || '{}');
        activityOrder = (preferences.order || []).slice(); activityHidden = (preferences.hidden || []).slice();
        syncActivityValue();
        var background = color('BACKGROUND_COLOR'), foreground = color('TEXT_COLOR');
        theme.value = previousTheme = background === 0xffffff && foreground === 0 ? 'light' : background === 0 && foreground === 0xffffff ? 'dark' : 'custom';
        customPalette = {background:bg.get(),foreground:fg.get()};
        renderApps(); updateNotifications(); updateColors(); renderActivities();
        phonePhase = 'ready'; restoring = false; updateDirty();
      });
      saveButton.parentNode.insertBefore(actions,saveButton); actions.appendChild(discard); actions.appendChild(saveButton);
      reloadSaved = make('button',t('phoneReload'),'halftone-reload-saved');
      reloadSaved.type = 'button'; reloadSaved.hidden = true;
      reloadSaved.addEventListener('click',function(){bridge.reload();});
      submitHost.appendChild(reloadSaved);
    }
    function signature() {
      return JSON.stringify(['BACKGROUND_COLOR','TEXT_COLOR','ACCENT_COLOR','CLOCK_FORMAT','ANIMATIONS','SHOW_STATUS','SHOW_ACTIVITIES','SHOW_MUSIC','SHOW_NOTIFICATIONS','NOTIFICATION_PREVIEW','NOTIFICATION_APP_ONLY','NOTIFICATION_VIBRATION','NOTIFICATION_APPS','NIGHT_PALETTE','NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR'].map(function(key) { return field(key).get(); }).concat([notification.get() && appMode.value === 'selected' ? appEntry.value.trim() : '',activityValue()]));
    }
    updateDirty = function() {
      if (!initialSnapshot || restoring) { return; }
      var dirty = signature() !== initialSnapshot;
      var saved = data.save && data.save.state || 'none';
      var key = bridge ? phonePhase === 'saving' ? 'saveSending' : phonePhase === 'uncertain' ? 'phoneSaveUncertain' :
        phonePhase === 'failed' ? 'phoneSaveFailed' : dirty ? 'saveUnsaved' : phoneConfirmed ? 'phoneSaved' : 'phoneNoChanges' :
        dirty ? 'saveUnsaved' : saved === 'saved' ? 'saveLastDelivered' : saved === 'pending' || saved === 'failed' ? 'savePhoneWaiting' : 'saveNone';
      if (saveStatus) { clear(saveStatus); saveStatus.appendChild(make('p',t(key))); }
      var button = submitHost && submitHost.querySelector(bridge ? '.halftone-primary-save' : 'button');
      if (button) { button.disabled = bridge ? phonePhase === 'saving' || !dirty && phonePhase !== 'uncertain' && phonePhase !== 'failed' : !dirty && saved !== 'none'; }
      if (reloadSaved) { reloadSaved.hidden = phonePhase !== 'uncertain'; reloadSaved.disabled = phonePhase === 'saving'; }
      if (discard) discard.disabled = !dirty || phonePhase === 'saving' || phonePhase === 'uncertain';
      saveSpace();
    };
    var technical = node(item('complications-status')), context = node(item('context-status'));
    if (technical && context) {
      var details = make('details',null,'halftone-details'); details.appendChild(make('summary',t('technicalDetails')));
      technical.parentNode.insertBefore(details,technical); details.appendChild(technical); context.hidden=true;
      [['music','musicSource'],['notifications','notificationsSource'],['phone','phoneSource'],['activities','activitiesSource']].forEach(function(pair) {
        var source = data.sources && data.sources[pair[0]];
        if (source && source.message) { details.appendChild(make('p',t(pair[1]) + ': ' + source.message)); }
      });
      (data.slots || []).forEach(function(slot,index) {
        var lines = [t(index ? 'rightReading' : 'leftReading') + ': ' + [slot.category,slot.item,slot.property].filter(Boolean).join('/')];
        [['receivedAge','receivedAgeSec'],['observedAge','observationAgeSec']].forEach(function(pair) {
          var age = slot[pair[1]]; if (typeof age === 'number' && isFinite(age) && age >= 0) { lines.push(t(pair[0],{age:Math.floor(age/60)})); }
        });
        if (slot.help) { lines.push(slot.help); }
        details.appendChild(make('p',lines.join(' · ')));
      });
    }

    var previewHost = node(item('halftone-preview')), canvas, previewCaption, timelineCaption, disabledCaption, formatCaption, previewState = 'idle', request = 0, imageCache = {};
    if (previewHost) {
      clear(previewHost); previewHost.appendChild(make('h3',t('layoutPreview'),'halftone-preview-title')); var tabs = make('div',null,'halftone-preview-tabs'); tabs.setAttribute('role','tablist');
      tabs.setAttribute('aria-label',t('samplePreview'));
      [['idle','previewIdle'],['music','previewMusic'],['timer','previewTimer'],['notification-summary','previewBanner'],['notification','previewMessage'],['timeline','previewTimeline']].forEach(function(pair) {
        var button = make('button',t(pair[1])); button.type = 'button'; button.setAttribute('role','tab');
        button.setAttribute('aria-selected',pair[0] === previewState ? 'true' : 'false');
        button.tabIndex = pair[0] === previewState ? 0 : -1; button.setAttribute('aria-controls','halftone-preview-canvas');
        button.addEventListener('click',function() { previewState = pair[0];
          Array.prototype.forEach.call(tabs.children,function(child) { child.setAttribute('aria-selected',child === button ? 'true' : 'false'); child.tabIndex = child === button ? 0 : -1; });
          renderPreview(); });
        button.addEventListener('keydown',function(event) {
          var shift = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
          var index=Array.prototype.indexOf.call(tabs.children,button),count=tabs.children.length;
          if(event.key==='Home')index=0;
          else if(event.key==='End')index=count-1;
          else if(shift)index=(index+shift+count)%count;
          else return;
          event.preventDefault();var next=tabs.children[index];next.click();next.focus();
        }); tabs.appendChild(button);
      });
      previewHost.appendChild(tabs); var stage = make('div',null,'halftone-preview-stage');
      var paletteChoice = make('label',null,'halftone-choice halftone-preview-palette');
      paletteChoice.setAttribute('for','halftone-preview-palette-select');
      paletteChoice.appendChild(make('span',t('previewPalette')));
      previewPalette = make('select'); previewPalette.id = 'halftone-preview-palette-select';
      [['day','previewDay'],['quiet','previewQuietTime']].forEach(function(pair) {
        var option = make('option',t(pair[1])); option.value = pair[0]; previewPalette.appendChild(option);
      });
      previewPalette.setAttribute('aria-describedby','halftone-preview-palette-help');
      paletteChoice.appendChild(previewPalette);
      var paletteHelp = make('span',t('previewPaletteHelp'),'description'); paletteHelp.id = 'halftone-preview-palette-help';
      paletteChoice.appendChild(paletteHelp); paletteChoice.hidden = !night.get();
      previewHost.appendChild(paletteChoice); previewPalette.addEventListener('change',renderPreview);
      canvas = make('canvas'); canvas.id = 'halftone-preview-canvas'; canvas.width = 200; canvas.height = 228; canvas.setAttribute('role','img');
      stage.appendChild(canvas); previewHost.appendChild(stage);
      previewHost.appendChild(make('p',t('sampleHelp')));
      previewHost.appendChild(make('p',t('previewSafeHelp'),'halftone-preview-note'));
      disabledCaption = make('p',t('previewDisabled'),'halftone-preview-note halftone-example-disabled'); previewHost.appendChild(disabledCaption);
      formatCaption = make('p',t('previewUnknownFormat'),'halftone-preview-note'); previewHost.appendChild(formatCaption);
      previewCaption = make('p',t('previewSettingsNote'),'halftone-preview-note'); previewHost.appendChild(previewCaption);
      timelineCaption = make('p',t('previewTimelineHelp'),'halftone-preview-note'); timelineCaption.hidden = true; previewHost.appendChild(timelineCaption);
    }
    function recolorPreview(pixels,keep,foreground,background,highlight,timeline) {
      var contentMap={},bezelMap={};
      // Match the native accent contrast fallback on Pebble's quantized palette.
      function luminance(color) {
        var linear=[0,90842,401978,1000000];
        return Math.floor((linear[(color>>16&255)/85]*2126+
          linear[(color>>8&255)/85]*7152+linear[(color&255)/85]*722)/10000);
      }
      function contrasts(first,second) {
        var a=luminance(first),b=luminance(second);
        return (Math.max(a,b)+50000)*1000>=(Math.min(a,b)+50000)*2000;
      }
      if(!contrasts(highlight,background)) {
        var light=luminance(background);
        highlight=contrasts(foreground,background)?foreground:
          (light+50000)*(light+50000)>=52500000000?0:0xffffff;
      }
      function blend(front,back,amount) {
        var result=0;
        for(var shift=16;shift>=0;shift-=8) {
          var a=((front>>shift)&255)/85,b=((back>>shift)&255)/85;
          result|=Math.max(0,Math.min(3,Math.floor((a*amount+b*(16-amount)+8)/16)))*85<<shift;
        }
        return result;
      }
      var edge=timeline?171:228;
      for(var y=0;y<228;y++)for(var x=0;x<200;x++) {
        var preserve=false;
        for(var rectangle=0;rectangle<keep.length;rectangle++) {
          var rect=keep[rectangle];
          if(x>=rect.x&&x<rect.x+rect.width&&y>=rect.y&&y<rect.y+rect.height){preserve=true;break;}
        }
        if(preserve)continue;
        var i=(y*200+x)*4,r=pixels.data[i]/85,g=pixels.data[i+1]/85,b=pixels.data[i+2]/85;
        // The bezel is black ink on the selected background. Preserve its ink,
        // while recolouring the background between dots and their edge coverage.
        var bezel=x<24||x>=176||y<16||y>=edge-16;
        var colorMap=bezel?bezelMap:contentMap;
        var source=(pixels.data[i]<<16)|(pixels.data[i+1]<<8)|pixels.data[i+2];
        var mapped=colorMap[source];
        if(mapped===undefined) {
          if(r===g&&g===b)mapped=blend(bezel?0:foreground,background,Math.round((3-r)*16/3));
          else if(b===3&&r<g&&g<=b)mapped=blend(highlight,background,Math.round((3-r)*8));
          else if(r===3&&g===3&&b<3)mapped=blend(0xFFFF00,background,Math.round((3-b)*16/3));
          else mapped=-1;
          colorMap[source]=mapped;
        }
        if(mapped===-1)continue;
        pixels.data[i]=(mapped>>16)&255;pixels.data[i+1]=(mapped>>8)&255;pixels.data[i+2]=mapped&255;
      }
      return pixels;
    }
    var previewPending=false;
    function renderPreview() {
      ++request;
      if(previewPending)return;
      previewPending=true;
      (window.requestAnimationFrame||function(callback){return window.setTimeout(callback,16);})(function(){
        previewPending=false;drawPreview();
      });
    }
    function drawPreview() {
      if (!canvas) { return; }
      var format = Number(field('CLOCK_FORMAT').get());
      if (format !== 12 && format !== 24) { format = Number(assets.systemFormat) === 12 ? 12 : 24; }
      var quietPreview = night.get() && previewPalette && previewPalette.value === 'quiet';
      var background = color(quietPreview ? 'NIGHT_BACKGROUND_COLOR' : 'BACKGROUND_COLOR');
      var foreground = color(quietPreview ? 'NIGHT_TEXT_COLOR' : 'TEXT_COLOR');
      var highlight = color(quietPreview ? 'NIGHT_ACCENT_COLOR' : 'ACCENT_COLOR');
      var exactTheme = highlight === 0x55AAFF && background === 0xFFFFFF && foreground === 0 ? 'light' :
        highlight === 0x55AAFF && background === 0 && foreground === 0xFFFFFF ? 'dark' : '';
      var sampleState = previewState;
      var key = sampleState + '-' + format + '-' + (exactTheme || 'light');
      var frame = (assets.frames || {})[key];
      var ctx = canvas.getContext('2d'), serial = request;
      canvas.setAttribute('aria-label',t('samplePreview') + ': ' + t({idle:'previewIdle',music:'previewMusic',timer:'previewTimer','notification-summary':'previewBanner',notification:'previewMessage',timeline:'previewTimeline'}[previewState]) +
        (night.get() ? ' · ' + t(quietPreview ? 'previewQuietTime' : 'previewDay') : ''));
      previewCaption.textContent = t(exactTheme ? 'previewSettingsNote' : 'previewCustomHelp')+' '+t('previewOpticalStyle');
      timelineCaption.hidden = previewState !== 'timeline';
      disabledCaption.hidden = !(previewState === 'music' && !field('SHOW_MUSIC').get() ||
        previewState === 'timer' && (!field('SHOW_ACTIVITIES').get() || !field('SHOW_MUSIC').get()) ||
        previewState === 'notification' && (!notification.get() || noticeMode.value !== 'preview') || previewState === 'notification-summary' && (!notification.get() || noticeMode.value === 'app'));
      formatCaption.hidden = Number(field('CLOCK_FORMAT').get()) !== 0 || Number(assets.systemFormat) === 12 || Number(assets.systemFormat) === 24;
      ctx.fillStyle = css(background); ctx.fillRect(0,0,200,228);
      if (!frame) { previewCaption.textContent = t('noExample'); return; }
      if (typeof frame === 'string') { frame = {src:frame}; }
      function draw(image) {
        if (serial !== request) { return; }
        if (image.naturalWidth !== 200 || image.naturalHeight !== 228) { previewCaption.textContent = t('noExample'); return; }
        ctx.drawImage(image,0,0,200,228);
        if (exactTheme) { return; }
        // Custom colours reuse the actual native geometry. Reverse-mapping a
        // quantised capture cannot recover every coverage sample: the page
        // explicitly identifies these colours as approximate. Provider images
        // and the OS-owned Timeline card retain their captured pixels.
        var pixels=ctx.getImageData(0,0,200,228);
        recolorPreview(pixels,frame.preserve||[],foreground,background,highlight,previewState==='timeline');
        ctx.putImageData(pixels,0,0);
      }
      if (imageCache[key] && imageCache[key].complete) { draw(imageCache[key]); return; }
      var image = new Image(); imageCache[key] = image; image.onload = function() { draw(image); }; image.onerror = function() { if (serial === request) { previewCaption.textContent = t('noExample'); } }; image.src = frame.src;
    }
    field('CLOCK_FORMAT').on('change',renderPreview);
    field('SHOW_MUSIC').on('change',renderPreview);
    updateNotifications(); updateColors();
    initialSnapshot = signature();
    confirmedForm = JSON.parse(JSON.stringify(clay.serialize()));
    if (bridge) bridge.remember(clay.serialize());
    ['BACKGROUND_COLOR','TEXT_COLOR','ACCENT_COLOR','CLOCK_FORMAT','ANIMATIONS','SHOW_STATUS','SHOW_ACTIVITIES','SHOW_MUSIC','SHOW_NOTIFICATIONS','NOTIFICATION_PREVIEW','NOTIFICATION_APP_ONLY','NOTIFICATION_VIBRATION','NOTIFICATION_APPS','NIGHT_PALETTE','NIGHT_BACKGROUND_COLOR','NIGHT_TEXT_COLOR','NIGHT_ACCENT_COLOR'].forEach(function(key) { field(key).on('input change',updateDirty); });
    updateDirty();
    var form = document.getElementById('main-form');
    if (form) {
      function resized() {saveSpace();}
      saveSpace();window.addEventListener('resize',resized);
      if(window.visualViewport)window.visualViewport.addEventListener('resize',resized);
      if(typeof ResizeObserver!=='undefined'&&submitHost)new ResizeObserver(saveSpace).observe(submitHost);
      function saveVisibility() {
        document.body.classList.toggle('halftone-picker-open',!!document.querySelector('.picker-wrap.show'));
        clay.getItemsByType('color').forEach(function(value) { var element = node(value), opener = element && element.querySelector('label');
          if (!element) { return; }
          var picker = element.querySelector('.picker-wrap'), open = !!element.querySelector('.picker-wrap.show');
          if (opener) { opener.setAttribute('aria-expanded',open ? 'true' : 'false'); }
          if (picker) {
            if (!open && picker.contains(document.activeElement) && opener) { opener.focus(); }
            picker.setAttribute('aria-hidden',open ? 'false' : 'true');
            Array.prototype.forEach.call(picker.querySelectorAll('.color-box.selectable'),function(box) { box.tabIndex = open ? 0 : -1; });
          }
        });
      }
      saveVisibility();
      if (typeof MutationObserver !== 'undefined') { new MutationObserver(saveVisibility).observe(form,{subtree:true,attributes:true,attributeFilter:['class']}); }
      else { document.addEventListener('click',function() { setTimeout(saveVisibility,0); }); }
      form.addEventListener('focusin',function(event) {
        if (['INPUT','SELECT'].indexOf(event.target.tagName)<0 || event.target.type === 'checkbox' || event.target.type === 'hidden') { return; }
        setTimeout(function() {focusedVisible(event.target);},0);
      });
      form.addEventListener('submit',function(event) {
      if (notification.get() && appMode.value === 'selected' && !commitApp(true)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (!form.checkValidity()) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      var button = form.querySelector(bridge ? '.halftone-primary-save' : '.component-submit button');
      if (bridge) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (phonePhase === 'saving' || button && button.disabled) return;
        var candidate, sentForm = clay.serialize(), sentSignature = signature();
        try { candidate = bridge.snapshot(sentForm); } catch (ignored) { phonePhase = 'failed'; updateDirty(); return; }
        phonePhase = 'saving'; updateDirty();
        bridge.save(candidate,function(result) {
          if (result && result.ok) { bridge.remember(sentForm,result.settings); confirmedForm = JSON.parse(JSON.stringify(sentForm)); initialSnapshot = sentSignature; phoneConfirmed = true; phonePhase = 'ready'; }
          else phonePhase = result && result.notSaved ? 'failed' : 'uncertain';
          updateDirty();
        });
      } else if (button) { button.textContent = t('saveSending'); button.disabled = true; }
    },true); }
  });
};
