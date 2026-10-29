// IMA probes (a copy of the probe definitions, not part of the catalog; they are appended to the requirement list for the probe run)
REQUIREMENTS.push(
  { id: 'PRB1', area: 'probe', strength: 'probe', duty: 'verify', vector: 'p_vne_wrapper_only', mode: 'play', script: { kind: 'full' },
    claim: 'probe: Wrapper-only unsupported verification', oracle: o => (o.hits('w0/vne').length ? { verdict: 'conforms', detail: 'w0/vne ' + o.hits('w0/vne').map(h => h.query).join(',') } : { verdict: 'deviates', detail: 'w0/vne not requested' }) },
  { id: 'PRB2', area: 'probe', strength: 'probe', duty: 'verify', vector: 'p_vne_two_inline', mode: 'play', script: { kind: 'full' },
    claim: 'probe: two unsupported InLine verifications', oracle: o => { const a = o.hits('in/vneA').length, b = o.hits('in/vneB').length; return { verdict: a && b ? 'conforms' : 'deviates', detail: `vneA ${a} vneB ${b}` }; } },
  { id: 'PRB3', area: 'probe', strength: 'probe', duty: 'track', vector: 'p_click_no_clickthrough', mode: 'play', script: { kind: 'click' },
    claim: 'probe: InLine without ClickThrough, with ClickTracking', oracle: o => ({ verdict: o.hits('in/clicktracking').length ? 'conforms' : 'deviates', detail: `clicktracking ${o.hits('in/clicktracking').length}` }) },
);

// Vectors whose entry document is a Wrapper. A client that never requests a Wrapper's target cannot be graded on
// what it does further down the chain; evaluate.mjs grades those cells n/a and the failure is counted once, in W01
// (W02 tests whether a particular Wrapper is followed, so it keeps its own verdict).
export const WRAPPER_START_VECTORS = new Set(['a_verification_js', 'p_pod_wrapper', 'x_adtaguri_amp', 'x_adtaguri_ncr', 'm_request_context', 'r_gzip', 'r_redirect', 'r_text_plain', 't_wrapper_events',
  'v_mixed_chain', 'w_allow_multiple_default', 'w_allow_multiple_false', 'w_blocked_category', 'w_click_inline_wins', 'w_click_tracking',
  'w_click_wrapper_fallback', 'w_fallback_noad', 'w_five', 'w_follow_false', 'w_http404', 'w_loop', 'w_malformed', 'w_noad', 'w_one', 'w_one_seq',
  'w_six', 'w_timeout', 'w_two_wrappers_inline_error', 'x_adtaguri_ws']);
for (const r of REQUIREMENTS) r.startsWithWrapper = WRAPPER_START_VECTORS.has(r.vector) && !['W01', 'W02'].includes(r.id);
