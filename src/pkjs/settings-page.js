'use strict';

// Clay serializes this function into its phone settings page. Keep it
// self-contained: no module state, external assets or additional requests.
module.exports = function() {
  var style = document.createElement('style');
  style.id = 'halftone-settings-style';
  style.textContent = [
    ':root{color-scheme:light;--page:#f4f3f0;--card:#fff;--ink:#22211f;--muted:#68645f;--line:#e8e5df;--accent:#b83c00;--field:#f4f3f0;--track:#d7d3cc}',
    '@media(prefers-color-scheme:dark){:root{color-scheme:dark;--page:#151514;--card:#222220;--ink:#f5f3ef;--muted:#b7b1a8;--line:#3b3935;--accent:#ff934f;--field:#30302c;--track:#5b5851}}',
    'html{font-size:16px!important;height:auto;background:var(--page)}',
    'body{box-sizing:border-box;height:auto;max-width:512px;margin:0 auto;padding:20px 16px 28px;background:var(--page);color:var(--ink);font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '*,*:before,*:after{box-sizing:border-box}',
    '#main-form>.component-heading:first-child{padding:0 2px 20px}',
    '.component-heading h1,.component-heading h2,.component-heading h3,.component-heading h4{margin:0;color:var(--ink);font:700 17px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-transform:none;letter-spacing:0}',
    '#main-form>.component-heading:first-child h1,#main-form>.component-heading:first-child h2,#main-form>.component-heading:first-child h4{font-size:28px;letter-spacing:-.6px}',
    '#main-form>.component-heading:first-child:after{content:"";display:block;width:48px;height:5px;margin-top:12px;background:radial-gradient(circle,var(--accent) 2px,transparent 2px) 0 0/8px 5px}',
    '.section{margin:0 0 16px;border:1px solid var(--line);border-radius:14px;background:var(--card);box-shadow:none;overflow:hidden}',
    '.section>.component{margin-top:0!important;padding:13px 16px;position:relative}',
    '.section>.component-heading:first-child{padding:16px 16px 10px;background:none;border-radius:0}',
    '.section>.component-heading:first-child h1,.section>.component-heading:first-child h2,.section>.component-heading:first-child h4{color:var(--accent)}',
    '.section>.component:after{left:16px;right:16px;background:var(--line)}',
    '.component-text p{margin:0;font-size:14px;line-height:1.5;color:var(--muted);overflow-wrap:break-word;word-wrap:break-word}',
    'label{min-height:28px;padding:0;gap:14px;color:var(--ink);font-size:15px;line-height:1.4}',
    'label>.label{min-width:0;flex:1;overflow-wrap:break-word;word-wrap:break-word}',
    'label>.input{flex-shrink:0;margin-left:0}',
    '.description{padding:0;margin-top:7px;color:var(--muted);font-size:13px;line-height:1.45;overflow-wrap:break-word;word-wrap:break-word}',
    '.component-toggle .graphic .slide{background:var(--track)}',
    '.component-toggle .graphic .marker{box-shadow:0 1px 3px #0003}',
    '.component-toggle input:checked+.graphic .slide{background:#9d3900}',
    '.component-toggle input:checked+.graphic .marker{background:#ff6500}',
    '.component-color .value{flex-shrink:0;border:1px solid #8886;box-shadow:none}',
    '.component-color .picker-wrap .picker{max-width:416px;background:var(--card);border:1px solid var(--line);border-radius:14px}',
    '.component-input label{display:block}',
    '.component-input label>.label{display:block;padding:0}',
    '.component-input .input{display:block;min-width:100%;max-width:none;margin:9px 0 0}',
    '.component-input input{min-height:44px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--ink);font-size:15px}',
    '.component-input input:focus{outline:2px solid var(--accent);outline-offset:1px;border:1px solid var(--line)}',
    '.component-submit{padding:4px 0 0}',
    '.component-submit button{display:block;width:100%;min-width:0;min-height:48px;margin:0;padding:12px 16px;border-radius:12px;background:#ff6500;color:#17130f;font:700 16px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-transform:none;letter-spacing:0}',
    '.component-submit button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}',
    'a{color:var(--accent)}'
  ].join('\n');
  document.head.appendChild(style);
};
