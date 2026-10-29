# XSD validation of the test vectors

Rerun 2026-10-21 on the current vectors (code/harness/suite/vectors and vectors-browser) against IAB's vast_4.2.xsd and the vast_4.4.xsd draft from sources/iab-vast-spec/vast (IAB's 4.3 XSD is empty).

    python3 -I evidence/checks/xsd/validate_vectors.py code/harness/suite/vectors sources/iab-vast-spec/vast

Result, both variants: 69 vectors, 109 documents; 1 not well-formed (w_malformed/bad.xml, on purpose); 102 valid against 4.2; 6 invalid on purpose: v_20, v_30, v_mixed_chain (VAST 2.0 and 3.0, no namespace), x_no_namespace, x_uaid_idvalue (4.0 idValue attribute), x_unknown_event. The four single-document vectors a_verification_inline, m_optional_noflv, r_gzip_root and r_text_plain_root are valid against 4.2 and 4.4; they replace the two-document r_gzip and r_text_plain, so the document count is unchanged.
