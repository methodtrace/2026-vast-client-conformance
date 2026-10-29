// Common normalized shape for one parsed ad, independent of client.
// {
//   kind: 'inline' | 'wrapper', id, sequence, adSystem, title,
//   impressions: [url], errors: [url], vastAdTagURI, universalAdIds: [{registry, value}], verifications: n,
//   creatives: [{ id, type: 'linear'|'nonlinear'|'companion', duration, skipOffset,
//                 mediaFiles: [{ url, type, width, height, delivery }],
//                 tracking: [{ event, url, offset }], clickThrough, clickTracking: [url] }]
// }
export const s = v => (v === undefined || v === null ? null : String(v).trim());
export const n = v => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v));
export const uniq = a => [...new Set(a.filter(Boolean))];

export function ad({ kind, id, sequence, adSystem, title, impressions = [], errors = [], vastAdTagURI = null,
  universalAdIds = [], verifications = 0, creatives = [] }) {
  return { kind, id: s(id), sequence: n(sequence), adSystem: s(adSystem), title: s(title),
    impressions: impressions.map(s).filter(Boolean), errors: errors.map(s).filter(Boolean),
    vastAdTagURI: s(vastAdTagURI), universalAdIds, verifications, creatives };
}

export function creative({ id, type, duration = null, skipOffset = null, mediaFiles = [], tracking = [], clickThrough = null, clickTracking = [] }) {
  return { id: s(id), type, duration: n(duration), skipOffset: s(skipOffset),
    mediaFiles: mediaFiles.map(m => ({ url: s(m.url), type: s(m.type), width: n(m.width), height: n(m.height), delivery: s(m.delivery) })),
    tracking: tracking.map(t => ({ event: s(t.event), url: s(t.url), offset: s(t.offset) })).filter(t => t.url),
    clickThrough: s(clickThrough), clickTracking: clickTracking.map(s).filter(Boolean) };
}

// Parses HH:MM:SS(.mmm) to seconds; returns null when absent.
export function hms(v) {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'number') return v;
  const m = String(v).trim().match(/^(\d+):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + (m[4] ? Number('0.' + m[4]) : 0);
}
