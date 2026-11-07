'use strict';

function text(value) { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function propertyText(property) {
  if (!property || typeof property !== 'object') return;
  return text(property.shortText && property.shortText.text) || text(property.longText && property.longText.text);
}
function same(a,b) { return typeof a === 'string' && typeof b === 'string' && a.replace(/_/g,' ').toLowerCase() === b.replace(/_/g,' ').toLowerCase(); }
function weather(slot) { return slot && !slot.invalid && slot.category === 'weather' && slot.item === 'location'; }

// Presentation only: Core normalizes the returned public text to its existing
// 24-byte semantic label and retains the original observation/expiry rules.
// Undefined leaves the established property/qualifier caption in place.
module.exports = function(slot,instance,descriptors) {
  if (!slot || slot.invalid || slot.category === 'music' || slot.category === 'notifications') return;
  var custom = text(slot.label);
  if (custom) return custom;
  if (!instance || typeof instance !== 'object') return;
  var properties = instance.properties || {};
  var name = text(instance.name) || propertyText(properties.name);
  if (weather(slot)) {
    var different = Array.isArray(descriptors) && descriptors.some(function(other) {
      return weather(other) && other.index !== slot.index;
    });
    return different ? name : undefined;
  }
  if (slot.category === 'finance') {
    // A provider's public ticker is preferable to a guessed company name or an
    // opaque UUID. Do not derive a ticker from human-readable display names.
    var ticker = propertyText(properties.ticker) || propertyText(properties.symbol) || text(instance.instanceId);
    return ticker && ticker.length <= 24 && /^[A-Za-z0-9^][A-Za-z0-9.^=:/-]*$/.test(ticker) ? ticker : undefined;
  }
  if (!name || same(name,slot.category) || same(name,slot.item) || same(name,slot.property) ||
      same(name,propertyText(properties[slot.property]))) return;
  return name;
};
