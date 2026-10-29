// Generates the crafted test vectors under suite/vectors/<vector>/*.xml.
// Every URL points at the recording server: {{BASE}} and {{CASE}} are expanded at serve time. Pixel URLs are
// {{BASE}}/t/{{CASE}}/<label>, where the label names the document and element that carried it (for example
// w1/imp is the Impression of the second wrapper), so the oracle can tell exactly which tracker fired.
// Usage: node suite/build-vectors.mjs [--browser]
//   default:   writes suite/vectors/ (one MP4 MediaFile per ad; media is never decoded under the Node harness)
//   --browser: writes suite/vectors-browser/ (each ad offers a real 10 s WebM and MP4 served by the harness, so
//              real <video> elements in real browsers can play it; otherwise identical)
import fs from 'node:fs';
import path from 'node:path';

const BROWSER = process.argv.includes('--browser');
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), BROWSER ? 'vectors-browser' : 'vectors');
const P = label => `{{BASE}}/t/{{CASE}}/${label}`;
const DOC = (vec, file, q = '') => `{{BASE}}/doc/{{CASE}}/${vec}/${file}${q}`;
const cdata = u => `<![CDATA[${u}]]>`;
const vast = (body, version = '4.3') => `<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="${version}" xmlns="http://www.iab.com/VAST">\n${body}\n</VAST>\n`;

const STD_EVENTS = ['start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete'];
const trackingXml = (prefix, events) => events.map(e => {
  const [ev, offset, label] = Array.isArray(e) ? e : [e, null, e];
  return `        <Tracking event="${ev}"${offset ? ` offset="${offset}"` : ''}>${cdata(P(`${prefix}/${label}`))}</Tracking>`;
}).join('\n');

// One <Verification> with a verificationNotExecuted tracker that carries [REASON]. The resource is a real, harmless
// JavaScript file served by the harness at {{BASE}}/js/{{CASE}}/<prefix>/verif-js (application/javascript), so what a
// vector tests is the player's choice, not a resource that cannot run:
//   framework (default 'omid'): the apiFramework attribute; a framework no player implements makes the player decline
//                               it as not supported (§3.17.4 reason 2)
//   status: the resource URL answers with that HTTP status (404: a resource that fails to load, §3.17.4 reason 3)
function verificationXml(v) {
  const res = `{{BASE}}/js/{{CASE}}/${v.prefix}/verif-js${v.status ? `?status=${v.status}` : ''}`;
  return `        <Verification vendor="${v.vendor}">
          <JavaScriptResource apiFramework="${v.framework ?? 'omid'}" browserOptional="true">${cdata(res)}</JavaScriptResource>
          <TrackingEvents>
            <Tracking event="verificationNotExecuted">${cdata(P(`${v.prefix}/vne?reason=[REASON]`))}</Tracking>
          </TrackingEvents>
          <VerificationParameters>${cdata('{"harness":"VASTCONF"}')}</VerificationParameters>
        </Verification>`;
}
// An AdChoices-style Icon with view and click tracking; timed (offset 1 s, duration 8 s) or shown for the whole ad.
function iconXml(p, timed = false) {
  return `            <Icons>
              <Icon program="AdChoices" width="20" height="20" xPosition="left" yPosition="top"${timed ? ' offset="00:00:01" duration="00:00:08"' : ''}>
                <StaticResource creativeType="image/gif">${cdata(P(`${p}/icon-img`))}</StaticResource>
                <IconClicks>
                  <IconClickThrough>${cdata(P(`${p}/icon-clickthrough`))}</IconClickThrough>
                  <IconClickTracking>${cdata(P(`${p}/icon-click`))}</IconClickTracking>
                </IconClicks>
                <IconViewTracking>${cdata(P(`${p}/icon-view`))}</IconViewTracking>
              </Icon>
            </Icons>
`;
}
// Media for one ad. Under Node the media is never fetched or decoded, so every variant is one MP4 URL on the
// recorder; in browsers each variant is real (or deliberately broken) media served by the harness.
//   ok: playable WebM + MP4   missing: both 404   timeout: both answer after 30 s   corrupt: random bytes typed as
//   WebM and MP4   flvfirst: an unsupported FLV listed first, then the playable pair   audio: Opus WebM + AAC M4A
function mediaFor(p, variant = 'ok') {
  const m = (file, type, q = '') => ({ type, url: `{{BASE}}/media/${file}?case={{CASE}}&ad=${p}${q}` });
  if (!BROWSER) {
    const node = [{ type: 'video/mp4', url: `{{BASE}}/m/{{CASE}}/${p}.mp4` }];
    if (variant === 'flvfirst') return [{ type: 'video/x-flv', url: `{{BASE}}/m/{{CASE}}/${p}.flv` }, ...node];
    if (variant === 'audio') return [{ type: 'audio/mp4', url: `{{BASE}}/m/{{CASE}}/${p}.m4a`, width: 0, height: 0 }];
    return node;
  }
  const pair = q => [m('ad-10s.webm', 'video/webm', q), m('ad-10s.mp4', 'video/mp4', q)];
  if (variant === 'missing') return pair('&status=404');
  if (variant === 'timeout') return pair('&delay=30000');
  if (variant === 'corrupt') return [m('corrupt.webm', 'video/webm'), m('corrupt.mp4', 'video/mp4')];
  if (variant === 'flvfirst') return [m('ad-10s.flv', 'video/x-flv'), ...pair('')];
  if (variant === 'audio') return [{ ...m('ad-10s-audio.webm', 'audio/webm'), width: 0, height: 0 }, { ...m('ad-10s-audio.m4a', 'audio/mp4'), width: 0, height: 0 }];
  return pair('');
}

function inline(p, o = {}) {
  const imps = o.impressions ?? [`${p}/imp`];
  const errs = o.errors ?? [`${p}/err?code=[ERRORCODE]`];
  const events = o.events ?? STD_EVENTS;
  const media = o.media ?? mediaFor(p, o.mediaVariant);
  const uaids = o.universalAdIds ?? [['unknown', 'unknown']];
  const verif = o.verifications ? `      <AdVerifications>\n${o.verifications.map(v => verificationXml(v)).join('\n')}\n      </AdVerifications>\n` : '';
  // Child order follows IAB's VAST 4.2 XSD, which declares each content model as an ordered sequence.
  const head = `      <AdSystem>harness</AdSystem>
${errs.map(e => `      <Error>${cdata(P(e))}</Error>`).join('\n')}
${o.extensions ? `      <Extensions>\n${o.extensions}\n      </Extensions>` : ''}
${imps.map(i => (i.startsWith('<Impression') ? `      ${i}` : `      <Impression id="${p}">${i === 'about:blank' ? i : cdata(P(i))}</Impression>`)).join('\n')}
      <AdServingId>${p}-serving</AdServingId>
      <AdTitle>${p}</AdTitle>
${verif}${o.category ? `      <Category authority="https://iabtechlab.com/">${o.category}</Category>` : ''}`;
  const uaidXml = uaids.map(([r, v]) => `          <UniversalAdId idRegistry="${r}"${o.uaidIdValueAttr ? ` idValue="${v}"` : ''}>${v}</UniversalAdId>`).join('\n');
  if (o.nonLinearOnly) return `  <Ad id="${p}">
    <InLine>
${head}
      <Creatives>
        <Creative id="${p}-c">
          <NonLinearAds>
            <TrackingEvents>
              <Tracking event="creativeView">${cdata(P(`${p}/nl-view`))}</Tracking>
            </TrackingEvents>
            <NonLinear width="300" height="50" minSuggestedDuration="00:00:05">
              <StaticResource creativeType="image/gif">${cdata(P(`${p}/nl-img`))}</StaticResource>
              <NonLinearClickThrough>${cdata(P(`${p}/nl-click`))}</NonLinearClickThrough>
            </NonLinear>
          </NonLinearAds>
${uaidXml}
        </Creative>
      </Creatives>
    </InLine>
  </Ad>`;
  return `  <Ad id="${p}"${o.sequence ? ` sequence="${o.sequence}"` : ''}${o.adType ? ` adType="${o.adType}"` : ''}>
    <InLine>
${head}
      <Creatives>
        <Creative id="${p}-c" adId="${p}-c">
          <Linear${o.skipoffset ? ` skipoffset="${o.skipoffset}"` : ''}>
${o.icons ? iconXml(p, o.icons === 'timed') : ''}            <TrackingEvents>
${trackingXml(p, events)}
            </TrackingEvents>
            <Duration>${o.duration ?? '00:00:10'}</Duration>
            <MediaFiles>
${o.closedCaptions ? `              <ClosedCaptionFiles>\n${o.closedCaptions.map(l => `                <ClosedCaptionFile type="text/vtt" language="${l}">${cdata(`{{BASE}}/m/{{CASE}}/${p}-${l}.vtt`)}</ClosedCaptionFile>`).join('\n')}\n              </ClosedCaptionFiles>` : ''}
${media.map(m => `              <MediaFile delivery="progressive" type="${m.type}" width="${m.width ?? 640}" height="${m.height ?? 360}">${cdata(m.url)}</MediaFile>`).join('\n')}
            </MediaFiles>
${o.clickThrough === null ? '' : `            <VideoClicks>\n              <ClickTracking>${cdata(P(`${p}/clicktracking`))}</ClickTracking>\n${o.clickThrough !== false ? `              <ClickThrough>${cdata(P(`${p}/clickthrough`))}</ClickThrough>\n` : ''}            </VideoClicks>`}
          </Linear>
${uaidXml}
        </Creative>
      </Creatives>
    </InLine>
  </Ad>`;
}

function wrapper(p, next, o = {}) {
  const attrs = Object.entries(o.attrs || {}).map(([k, v]) => ` ${k}="${v}"`).join('');
  const events = o.events ?? STD_EVENTS;
  return `  <Ad id="${p}"${o.sequence ? ` sequence="${o.sequence}"` : ''}>
    <Wrapper${attrs}>
      <AdSystem>harness</AdSystem>
      <Error>${cdata(P(`${p}/err?code=[ERRORCODE]`))}</Error>
      <Impression id="${p}">${cdata(P(`${p}/imp`))}</Impression>
${o.verifications ? `      <AdVerifications>\n${o.verifications.map(v => verificationXml(v)).join('\n')}\n      </AdVerifications>\n` : ''}${o.blockedAdCategories ? `      <BlockedAdCategories authority="https://iabtechlab.com/">${o.blockedAdCategories}</BlockedAdCategories>\n` : ''}      <Creatives>
        <Creative>
          <Linear>
            <TrackingEvents>
${trackingXml(p, events)}
            </TrackingEvents>
${o.clickThrough || o.clickTracking !== false ? `            <VideoClicks>\n${o.clickTracking !== false ? `              <ClickTracking>${cdata(P(`${p}/clicktracking`))}</ClickTracking>\n` : ''}${o.clickThrough ? `              <ClickThrough>${cdata(P(`${p}/clickthrough`))}</ClickThrough>\n` : ''}            </VideoClicks>` : ''}
          </Linear>
        </Creative>
      </Creatives>
      <VASTAdTagURI>${o.rawTagUri ?? cdata(next)}</VASTAdTagURI>
    </Wrapper>
  </Ad>`;
}

// chain(vec, n, inlineOpts, wrapperOpts): start.xml = w0 -> w1 -> ... -> w(n-1) -> inline.xml
function chain(vec, n, io = {}, wo = () => ({})) {
  const files = {};
  for (let i = 0; i < n; i++) files[i === 0 ? 'start.xml' : `w${i}.xml`] = vast(wrapper(`w${i}`, DOC(vec, i + 1 < n ? `w${i + 1}.xml` : 'inline.xml'), wo(i)));
  files[n === 0 ? 'start.xml' : 'inline.xml'] = vast(inline('in', io));
  return files;
}

const V = {};
// --- wrappers
V.w_one = chain('w_one', 1);
V.w_one_seq = chain('w_one_seq', 1, {}, () => ({ sequence: 1 }));
V.w_five = chain('w_five', 5);
V.w_six = chain('w_six', 6);
V.w_loop = { 'start.xml': vast(wrapper('w0', DOC('w_loop', 'start.xml'))) };
V.w_http404 = { 'start.xml': vast(wrapper('w0', DOC('w_http404', 'inline.xml', '?status=404'))), 'inline.xml': vast(inline('in')) };
V.w_timeout = { 'start.xml': vast(wrapper('w0', DOC('w_timeout', 'inline.xml', '?delay=8000'))), 'inline.xml': vast(inline('in')) };
V.w_noad = { 'start.xml': vast(wrapper('w0', DOC('w_noad', 'noad.xml'))), 'noad.xml': vast(`  <Error>${cdata(P('noad/err?code=[ERRORCODE]'))}</Error>`) };
V.w_malformed = { 'start.xml': vast(wrapper('w0', DOC('w_malformed', 'bad.xml'))), 'bad.xml': '<?xml version="1.0"?>\n<VAST version="4.3"><Ad id="x"><InLine><AdSystem>broken</Ad></VAST>\n' };
V.w_two_wrappers_inline_error = chain('w_two_wrappers_inline_error', 2, { media: [{ type: 'video/x-unplayable', url: '{{BASE}}/m/{{CASE}}/in.bin' }] });
V.w_click_inline_wins = chain('w_click_inline_wins', 1, {}, () => ({ clickThrough: true }));
// the InLine has no VideoClicks at all (§3.10.1 requires a ClickThrough whenever an InLine has VideoClicks)
V.w_click_wrapper_fallback = chain('w_click_wrapper_fallback', 2, { clickThrough: null }, i => ({ clickThrough: true }));
V.w_click_tracking = chain('w_click_tracking', 2);
V.w_follow_false = { 'start.xml': vast(wrapper('w0', DOC('w_follow_false', 'w1.xml'), { attrs: { followAdditionalWrappers: 'false' } })),
  'w1.xml': vast(wrapper('w1', DOC('w_follow_false', 'inline.xml'))), 'inline.xml': vast(inline('in')) };
const podDoc = vast([inline('p2', { sequence: 2 }), inline('p1', { sequence: 1 }), inline('s1')].join('\n'));
V.w_allow_multiple_false = { 'start.xml': vast(wrapper('w0', DOC('w_allow_multiple_false', 'pod.xml'), { attrs: { allowMultipleAds: 'false' } })), 'pod.xml': podDoc };
V.w_allow_multiple_default = { 'start.xml': vast(wrapper('w0', DOC('w_allow_multiple_default', 'pod.xml'))), 'pod.xml': podDoc };
V.w_blocked_category = { 'start.xml': vast(wrapper('w0', DOC('w_blocked_category', 'inline.xml'), { blockedAdCategories: 'IAB8-5' })), 'inline.xml': vast(inline('in', { category: 'IAB8-5' })) };
// --- errors
V.e_noad_root = { 'start.xml': vast(`  <Error>${cdata(P('root/err1?code=[ERRORCODE]'))}</Error>\n  <Error>${cdata(P('root/err2?code=[ERRORCODE]'))}</Error>`) };
V.e_inline_unplayable = { 'start.xml': vast(inline('in', { errors: ['in/err1?code=[ERRORCODE]', 'in/err2?code=[ERRORCODE]'], media: [{ type: 'video/x-unplayable', url: '{{BASE}}/m/{{CASE}}/in.bin' }] })) };
// --- tracking
V.t_inline_full = { 'start.xml': vast(inline('in', {
  impressions: ['in/imp-a', 'in/imp-b', 'about:blank'],
  events: [...STD_EVENTS, ['start', null, 'start-2'], ['progress', '00:00:05', 'p-5s'], ['progress', '00:00:02.500', 'p-2.5s'], ['progress', '80%', 'p-80pct'], ['progress', '10%', 'p-10pct']],
})) };
V.t_wrapper_events = chain('t_wrapper_events', 1, {}, () => ({ events: [...STD_EVENTS, ['progress', '00:00:05', 'p-5s']] }));
// --- macros
const macroImp = 'in/imp?cb=[CACHEBUSTING]&ts=[TIMESTAMP]&lat=[LIMITADTRACKING]&unk=[NOTAREALMACRO]&ah=[ADPLAYHEAD]';
V.m_macros = { 'start.xml': vast(inline('in', { impressions: [macroImp], events: [['start', null, 'start?cb=[CACHEBUSTING]&ts=[TIMESTAMP]&lat=[LIMITADTRACKING]']] })) };
// --- XML handling
V.x_whitespace = { 'start.xml': vast(inline('in').replace(`<Impression id="in">${cdata(P('in/imp'))}</Impression>`, `<Impression id="in">\n        ${cdata(P('in/imp'))}\n      </Impression>`)) };
V.x_comment = { 'start.xml': vast(inline('in').replace(`<Impression id="in">${cdata(P('in/imp'))}</Impression>`, `<Impression id="in"><!-- comment before -->${cdata(P('in/imp'))}<!-- comment after --></Impression>`)) };
V.x_entities = { 'start.xml': vast(inline('in').replace(`<Impression id="in">${cdata(P('in/imp'))}</Impression>`, `<Impression id="in">${P('in/imp').replace('{{BASE}}', '{{BASE}}')}?a=1&amp;b=2</Impression>`)) };
V.x_no_namespace = { 'start.xml': vast(inline('in')).replace(' xmlns="http://www.iab.com/VAST"', '') };
V.x_multi_uaid = { 'start.xml': vast(inline('in', { universalAdIds: [['ad-id.org', 'ABCD1234000H'], ['clearcast.co.uk', 'CC/ABC/123']] })) };
V.x_multi_cc = { 'start.xml': vast(inline('in', { closedCaptions: ['en', 'es'] })) };
// --- pods
V.p_pod_order = { 'start.xml': vast([inline('p3', { sequence: 3 }), inline('p1', { sequence: 1 }), inline('p2', { sequence: 2 })].join('\n')) };

// =====================================================================
// --- wrappers: fallbackOnNoAd (§3.19): the wrapper's target has no ad; a stand-alone ad is available in the response
V.w_fallback_noad = { 'start.xml': vast([wrapper('w0', DOC('w_fallback_noad', 'noad.xml'), { attrs: { fallbackOnNoAd: 'true' } }), inline('s1')].join('\n')),
  'noad.xml': vast(`  <Error>${cdata(P('noad/err?code=[ERRORCODE]'))}</Error>`) };
// --- errors: media failures (real media; browser layer) and a NonLinear-only ad
V.e_media_404 = { 'start.xml': vast(inline('in', { mediaVariant: 'missing' })) };
V.e_media_timeout = { 'start.xml': vast(inline('in', { mediaVariant: 'timeout' })) };
V.e_media_corrupt = { 'start.xml': vast(inline('in', { mediaVariant: 'corrupt' })) };
V.e_nonlinear_only = { 'start.xml': vast(inline('in', { nonLinearOnly: true })) };
// --- tracking: user actions, skip, rewind
const ACTION_EVENTS = [...STD_EVENTS, 'pause', 'resume', 'mute', 'unmute', 'loaded'];
V.t_interact = { 'start.xml': vast(inline('in', { events: ACTION_EVENTS })) };
V.t_skip = { 'start.xml': vast(inline('in', { skipoffset: '00:00:03', events: [...STD_EVENTS, 'skip', ['progress', '00:00:02', 'p-2s'], ['progress', '00:00:05', 'p-5s']] })) };
V.t_skip_pct = { 'start.xml': vast(inline('in', { skipoffset: '30%', events: [...STD_EVENTS, 'skip'] })) };
V.t_rewind = { 'start.xml': vast(inline('in', { events: [...STD_EVENTS, 'rewind', ['progress', '00:00:05', 'p-5s']] })) };
// --- verification (§3.16, §3.17)
// one vendor in the InLine and one in the Wrapper, each a real JavaScript resource whose apiFramework no player
// implements, so every player declines it as not supported (§3.17.4 reason 2)
const UNSUPPORTED_FW = 'vastconf-unsupported';
V.a_verification_js = chain('a_verification_js', 1, { verifications: [{ vendor: 'inline.harness.test-unsupported', prefix: 'in', framework: UNSUPPORTED_FW }] },
  () => ({ verifications: [{ vendor: 'wrapper.harness.test-unsupported', prefix: 'w0', framework: UNSUPPORTED_FW }] }));
// the InLine's verification alone, with no Wrapper before it, so a client that does not follow Wrappers is graded too
// (A01, A02, A04; A03, the Wrapper's verification, keeps a_verification_js)
V.a_verification_inline = { 'start.xml': vast(inline('in', { verifications: [{ vendor: 'inline.harness.test-unsupported', prefix: 'in', framework: UNSUPPORTED_FW }] })) };
// an OMID resource whose URL answers HTTP 404 (§3.17.4 reason 3: "404 or other failed response codes"), InLine only
V.a_verification_404 = { 'start.xml': vast(inline('in', { verifications: [{ vendor: 'inline.harness.test-omid', prefix: 'in', status: 404 }] })) };
// --- media selection
V.s_flv_first = { 'start.xml': vast(inline('in', { mediaVariant: 'flvfirst' })) };
V.s_audio = { 'start.xml': vast(inline('in', { mediaVariant: 'audio', adType: 'audio' })) };
// --- macros: optional macros, macro contexts (Error URIs, VAST request URIs)
const OPT = 'ah=[ADPLAYHEAD]&asi=[ADSERVINGID]&ua=[UNIVERSALADID]&ps=[PODSEQUENCE]&au=[ASSETURI]&bp=[BREAKPOSITION]&ifa=[IFA]&cua=[CLIENTUA]';
V.m_optional = { 'start.xml': vast(inline('in', {
  mediaVariant: 'flvfirst',
  impressions: [`in/imp?${OPT}`],
  events: [...STD_EVENTS.filter(e => e !== 'midpoint'), ['midpoint', null, 'midpoint?ah=[ADPLAYHEAD]&au=[ASSETURI]']],
  universalAdIds: [['ad-id.org', 'ABCD 1234'], ['clearcast.co.uk', 'CC/ABC/123']],
})) };
// the same optional macros on an ad that offers only playable media (no FLV), so whether the macros are replaced does
// not depend on media selection (M06 to M09; M10, which compares ASSETURI with the chosen file, keeps m_optional)
V.m_optional_noflv = { 'start.xml': vast(inline('in', {
  impressions: [`in/imp?${OPT}`],
  events: [...STD_EVENTS.filter(e => e !== 'midpoint'), ['midpoint', null, 'midpoint?ah=[ADPLAYHEAD]&au=[ASSETURI]']],
  universalAdIds: [['ad-id.org', 'ABCD 1234'], ['clearcast.co.uk', 'CC/ABC/123']],
})) };
V.m_error_context = { 'start.xml': vast(inline('in', { errors: ['in/err?code=[ERRORCODE]&cb=[CACHEBUSTING]&ts=[TIMESTAMP]'], media: [{ type: 'video/x-unplayable', url: '{{BASE}}/m/{{CASE}}/in.bin' }] })) };
V.m_request_context = { 'start.xml': vast(wrapper('w0', DOC('m_request_context', 'inline.xml', '?cb=[CACHEBUSTING]&ts=[TIMESTAMP]'))), 'inline.xml': vast(inline('in')) };
// --- pods: playing a whole pod, and a pod whose second ad cannot play (with a stand-alone ad to substitute)
V.p_pod_play = { 'start.xml': vast([inline('p1', { sequence: 1 }), inline('p2', { sequence: 2 }), inline('p3', { sequence: 3 })].join('\n')) };
V.p_pod_fail = { 'start.xml': vast([inline('p1', { sequence: 1 }), inline('p2', { sequence: 2, mediaVariant: 'missing' }), inline('p3', { sequence: 3 }), inline('s1')].join('\n')) };
// --- icons (§3.11)
V.i_icon = { 'start.xml': vast(inline('in', { icons: true })) };
V.i_icon_timed = { 'start.xml': vast(inline('in', { icons: 'timed' })) };
// --- XML handling
V.x_adtaguri_ws = { 'start.xml': vast(wrapper('w0', null, { rawTagUri: `\n        ${cdata(DOC('x_adtaguri_ws', 'inline.xml'))}\n      ` })), 'inline.xml': vast(inline('in')) };
V.x_unknown_event = { 'start.xml': vast(inline('in', { events: [...STD_EVENTS, ['notARealEvent', null, 'unknown-event']] })) };
V.x_extension_impression = { 'start.xml': vast(inline('in', { extensions:
`        <Extension type="harness">
          <Impression>${cdata(P('ext/imp'))}</Impression>
          <Tracking event="start">${cdata(P('ext/start'))}</Tracking>
          <Error>${cdata(P('ext/err'))}</Error>
        </Extension>` })) };
V.x_bom = { 'start.xml': '\uFEFF' + vast(inline('in')) };
V.x_cdata_split = { 'start.xml': vast(inline('in', { impressions: [`<Impression id="in">${cdata(P('in/imp') + '?s=x]]')}${cdata('>x')}</Impression>`] })) };
V.x_uaid_idvalue = { 'start.xml': vast(inline('in', { universalAdIds: [['ad-id.org', 'ABCD1234000H']], uaidIdValueAttr: true }), '4.3') };
V.x_empty_impression = { 'start.xml': vast(inline('in', { impressions: ['<Impression id="empty"></Impression>', 'in/imp'] })) };
// --- older VAST versions (§4.3 Media Players: keep accepting older versions)
const inline3 = (p, version) => `  <Ad id="${p}">
    <InLine>
      <AdSystem>harness</AdSystem>
      <AdTitle>${p}</AdTitle>
      <Error>${cdata(P(`${p}/err?code=[ERRORCODE]`))}</Error>
      <Impression>${cdata(P(`${p}/imp`))}</Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:10</Duration>
            <TrackingEvents>
${trackingXml(p, STD_EVENTS)}
            </TrackingEvents>
            <VideoClicks><ClickThrough>${cdata(P(`${p}/clickthrough`))}</ClickThrough></VideoClicks>
            <MediaFiles>
${mediaFor(p).map(m => `              <MediaFile delivery="progressive" type="${m.type}" width="640" height="360"${version === '2.0' ? ' bitrate="500"' : ''}>${cdata(m.url)}</MediaFile>`).join('\n')}
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>`;
const vastOld = (body, version) => `<?xml version="1.0" encoding="UTF-8"?>\n<VAST version="${version}">\n${body}\n</VAST>\n`;
V.v_30 = { 'start.xml': vastOld(inline3('in', '3.0'), '3.0') };
V.v_20 = { 'start.xml': vastOld(inline3('in', '2.0'), '2.0') };
V.v_mixed_chain = { 'start.xml': vastOld(`  <Ad id="w0">
    <Wrapper>
      <AdSystem>harness</AdSystem>
      <VASTAdTagURI>${cdata(DOC('v_mixed_chain', 'inline.xml'))}</VASTAdTagURI>
      <Error>${cdata(P('w0/err?code=[ERRORCODE]'))}</Error>
      <Impression>${cdata(P('w0/imp'))}</Impression>
      <Creatives><Creative><Linear><TrackingEvents>
${trackingXml('w0', STD_EVENTS)}
      </TrackingEvents></Linear></Creative></Creatives>
    </Wrapper>
  </Ad>`, '3.0'), 'inline.xml': vast(inline('in')) };
// --- HTTP robustness
V.r_redirect = { 'start.xml': vast(wrapper('w0', DOC('r_redirect', 'inline.xml', '?redirect=r_redirect/inline2.xml'))), 'inline.xml': vast(inline('in')), 'inline2.xml': vast(inline('in')) };
// an InLine response sent gzip-compressed or as text/plain: the requirement's entryQuery (?gzip=1, ?ctype=text/plain)
// makes the server send the entry document itself that way, so no Wrapper is involved
V.r_gzip_root = { 'start.xml': vast(inline('in')) };
V.r_text_plain_root = { 'start.xml': vast(inline('in')) };
V.r_pixel_500 = { 'start.xml': vast(inline('in', { events: [['start', null, 'start?status=500'], 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete'] })) };

// =====================================================================
// --- XML: an Impression wholly inside an XML comment (§2.2), next to the real one
V.x_comment_impression = { 'start.xml': vast(inline('in').replace(`<Impression id="in">${cdata(P('in/imp'))}</Impression>`,
  `<!-- <Impression id="cmt">${cdata(P('cmt/imp'))}</Impression> -->\n      <Impression id="in">${cdata(P('in/imp'))}</Impression>`)) };
// --- XML: a VASTAdTagURI given as escaped text (no CDATA), query parameters separated by &amp; or by &#38; (§2.3.2)
V.x_adtaguri_amp = { 'start.xml': vast(wrapper('w0', null, { rawTagUri: DOC('x_adtaguri_amp', 'inline.xml', '?a=1&amp;b=2&amp;c=3') })), 'inline.xml': vast(inline('in')) };
V.x_adtaguri_ncr = { 'start.xml': vast(wrapper('w0', null, { rawTagUri: DOC('x_adtaguri_ncr', 'inline.xml', '?a=1&#38;b=2&#38;c=3') })), 'inline.xml': vast(inline('in')) };
// --- pods: a pod reached through a Wrapper (allowMultipleAds="true", since the default false forbids pods); the
// target lists the pod in document order 3, 1, 2
V.p_pod_wrapper = { 'start.xml': vast(wrapper('w0', DOC('p_pod_wrapper', 'pod.xml'), { attrs: { allowMultipleAds: 'true' } })),
  'pod.xml': vast([inline('p3', { sequence: 3 }), inline('p1', { sequence: 1 }), inline('p2', { sequence: 2 })].join('\n')) };

fs.rmSync(OUT, { recursive: true, force: true });
let n = 0;
for (const [vec, files] of Object.entries(V)) for (const [f, body] of Object.entries(files)) {
  const p = path.join(OUT, vec, f);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body.replace(/\n\s*\n/g, '\n'));
  n++;
}
console.log(`${Object.keys(V).length} vectors, ${n} files -> ${OUT}`);
