// iab-vast-parser 1.2.1: repeated elements that the VAST 4.2 XSD allows (maxOccurs="unbounded"); prints accepted/REJECTED.
// Usage: node evidence/checks/fuzz-repros/iab-valid-repeats/probe.cjs
const parse = require(require('path').join(__dirname, '../../../../code/harness/node_modules/iab-vast-parser'));
const lin = x => `<VAST version="4.3"><Ad id="a"><InLine><AdSystem>x</AdSystem><AdTitle>x</AdTitle><Impression>http://e/i</Impression>${x.inl||''}<Creatives><Creative><UniversalAdId idRegistry="u">u</UniversalAdId><Linear><Duration>00:00:10</Duration><MediaFiles><MediaFile delivery="progressive" type="video/mp4" width="640" height="360">http://e/a.mp4</MediaFile>${x.mf||''}</MediaFiles>${x.lin||''}</Linear></Creative></Creatives></InLine></Ad></VAST>`;
const icon = '<Icons><Icon program="p" width="1" height="1"><StaticResource creativeType="image/png">http://e/i.png</StaticResource><IconClicks><IconClickFallbackImages><IconClickFallbackImage width="1" height="1"><StaticResource creativeType="image/png">http://e/f1.png</StaticResource></IconClickFallbackImage><IconClickFallbackImage width="1" height="1"><StaticResource creativeType="image/png">http://e/f2.png</StaticResource></IconClickFallbackImage></IconClickFallbackImages></IconClicks></Icon></Icons>';
const cases = {
  control: {},
  mezzanine_x2: { mf: '<Mezzanine delivery="progressive" type="video/mp4" width="1" height="1">http://e/m1.mp4</Mezzanine><Mezzanine delivery="progressive" type="video/mp4" width="1" height="1">http://e/m2.mp4</Mezzanine>' },
  category_x2: { inl: '<Category authority="a">1</Category><Category authority="a">2</Category>' },
  iconclickfallbackimage_x2: { lin: icon },
  icon_x2: { lin: '<Icons><Icon program="p"><StaticResource creativeType="image/png">http://e/1</StaticResource></Icon><Icon program="q"><StaticResource creativeType="image/png">http://e/2</StaticResource></Icon></Icons>' },
  verification_js_x2: { inl: '<AdVerifications><Verification vendor="v"><JavaScriptResource apiFramework="omid" browserOptional="true">http://e/1.js</JavaScriptResource><JavaScriptResource apiFramework="omid" browserOptional="true">http://e/2.js</JavaScriptResource></Verification></AdVerifications>' },
  executableresource_x2: { inl: '<AdVerifications><Verification vendor="v"><ExecutableResource apiFramework="x" type="t">http://e/1</ExecutableResource><ExecutableResource apiFramework="x" type="t">http://e/2</ExecutableResource></Verification></AdVerifications>' },
  interactivecreativefile_x2: { mf: '<InteractiveCreativeFile type="application/javascript">http://e/1.js</InteractiveCreativeFile><InteractiveCreativeFile type="application/javascript">http://e/2.js</InteractiveCreativeFile>' },
  clicktracking_x2: { lin: '<VideoClicks><ClickTracking>http://e/1</ClickTracking><ClickTracking>http://e/2</ClickTracking></VideoClicks>' },
  customclick_x2: { lin: '<VideoClicks><CustomClick>http://e/1</CustomClick><CustomClick>http://e/2</CustomClick></VideoClicks>' },
};
cases.companion_staticresource_x2 = null;
const comp = '<VAST version="4.3"><Ad id="a"><InLine><AdSystem>x</AdSystem><AdTitle>x</AdTitle><Impression>http://e/i</Impression><Creatives><Creative><CompanionAds><Companion width="1" height="1"><StaticResource creativeType="image/png">http://e/1.png</StaticResource><StaticResource creativeType="image/jpeg">http://e/1.jpg</StaticResource></Companion></CompanionAds></Creative></Creatives></InLine></Ad></VAST>';
for (const [n, x] of Object.entries(cases)) { try { parse(x === null ? comp : lin(x)); console.log(n.padEnd(28), 'accepted'); } catch (e) { console.log(n.padEnd(28), 'REJECTED', e.code, e.message); } }
