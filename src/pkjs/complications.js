'use strict';

var createComplications = require('pebble-watchface-core').createComplications;

// Preserve Halftone's existing phone cache while sharing the coordinator.
module.exports = function(options) {
  var configured = {};
  Object.keys(options).forEach(function(key) { configured[key] = options[key]; });
  configured.cacheKey = 'halftone-complications-v1';
  return createComplications(configured);
};
