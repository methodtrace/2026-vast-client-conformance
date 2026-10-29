#!/bin/sh
# Prints the rmp-vast 17.2.0 and vast-client 6.4.2 source lines cited in REPORT.md (read-only).
R="${RMP_SRC:?set RMP_SRC to a checkout of rmp-vast src/js at commit 5975ead}"
V="$(cd "$(dirname "$0")" && pwd)/node_modules/@dailymotion/vast-client/src"
p() { echo "== $1:$2"; sed -n "$2p" "$1"; }
p $R/helpers/utils.js 223; p $R/index.js 586,599; p $R/index.js 460,466; p $R/index.js 527,530; p $R/index.js 560,566
p $R/helpers/tracking.js 112,123; p $R/helpers/tracking.js 176,180; p $R/helpers/tracking.js 338,351; p $R/helpers/tracking.js 359,362
p $R/helpers/tracking.js 438,442; p $R/helpers/tracking.js 462,482; p $R/framework/fw.js 194,201; p $R/creatives/linear.js 172,176
p $R/creatives/icons.js 186,190; p $R/helpers/utils.js 245,245
p $V/parser/vast_parser.js 359,381; p $V/parser/vast_parser.js 389,401; p $V/parser/vast_parser.js 304,315; p $V/parser/vast_parser.js 427,433
p $V/parser/vast_parser.js 446,466; p $V/fetcher/url_handler.js 56,64; p $V/parser/ad_parser.js 228,234
