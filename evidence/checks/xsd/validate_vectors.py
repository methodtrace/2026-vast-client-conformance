# Validates every test vector against the IAB VAST XSDs (4.2 and the 4.4 draft; IAB's 4.3 XSD file is empty).
# Usage: python3 -I validate_vectors.py <vectors dir> <iab vast repo dir>
# Placeholders are expanded to a fixed base URL first, and the square brackets of VAST macros ([ERRORCODE] etc.) and
# of the ']]>' test string are percent-encoded before validation: libxml2 rejects '[' and ']' in xs:anyURI values,
# although IAB's own specification puts macros in URIs. Prints one line per document and per schema.
import sys, pathlib
from lxml import etree
vec, repo = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
schemas = {name: etree.XMLSchema(etree.parse(str(repo / f))) for name, f in [('4.2', 'vast_4.2.xsd'), ('4.4', 'vast_4.4.xsd')]}
for f in sorted(vec.rglob('*.xml')):
    raw = f.read_text(encoding='utf-8-sig').replace('{{BASE}}', 'http://127.0.0.1:1').replace('{{CASE}}', 'c0000')
    import re
    raw = re.sub(r'\[([A-Z_]+)\]', r'%5B\1%5D', raw).replace('?s=x]]]]><![CDATA[>x', '?s=x%5D%5D%3Ex')
    rel = f.relative_to(vec)
    try:
        doc = etree.fromstring(raw.encode('utf-8'))
    except etree.XMLSyntaxError as e:
        print(f'{rel}\tnot-well-formed\t{e}'); continue
    for name, xs in schemas.items():
        d = doc
        if name == '4.4':  # the 4.4 draft fixes version="4.4"; validate the content model with that value
            d = etree.fromstring(etree.tostring(doc).replace(b'version="4.3"', b'version="4.4"'))
        ok = xs.validate(d)
        print(f'{rel}\t{name}\t{"valid" if ok else "INVALID: " + "; ".join(str(x.message) for x in list(xs.error_log)[:3])}')
