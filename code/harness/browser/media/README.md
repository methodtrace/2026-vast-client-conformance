# Test media

The browser vectors point every MediaFile at these files, which the recording server serves. They are synthetic: no
third-party footage, audio or advertising creative. They are released with the harness under CC BY 4.0, like the
test vectors.

| File | Content | Duration | Streams |
|---|---|---|---|
| `ad-10s.mp4` | FFmpeg test pattern (`testsrc`, with a running counter) and a 440 Hz sine tone | 10 s | H.264 320x180, AAC mono 44.1 kHz |
| `ad-10s.webm` | the same pattern and tone | 10 s | VP9 320x180, Opus mono 48 kHz |
| `ad-10s-audio.m4a` | 440 Hz sine tone (audio ad) | 10 s | AAC mono 44.1 kHz |
| `ad-10s-audio.webm` | 440 Hz sine tone (audio ad) | 10 s | Opus mono 48 kHz |
| `content-40s.mp4` | SMPTE color bars (`smptebars`) and a 220 Hz sine tone, used as the content the ads interrupt | 40 s | H.264 320x180, AAC mono 44.1 kHz |
| `content-40s.webm` | the same bars and tone | 40 s | VP9 320x180, Opus mono 48 kHz |
| `corrupt.mp4`, `corrupt.webm` | 120,000 random bytes (one file under two names), for the unplayable-media vectors | none | none |

Each ad lists the MP4 and the WebM version, so every browser finds a format it can decode. Each vector's Duration
(00:00:10) matches the ad files, which the progress and quartile oracles rely on.

SHA-256:

```
7253e96844ca8fa0f29fbacbe875ff1691ed6f05f4dc376de73b66e1d3b80469  ad-10s-audio.m4a
38d3d50b43a23fa31a21b7888f32ddd75ed7f613157aec24dd46b2df74dacba6  ad-10s-audio.webm
f312472825be443960fa8151d728a6bdaf3112c1740410d7c3b8be5234227c94  ad-10s.mp4
d2acc178abd4587a38a144bf1dc8aa8d07e4a45b14faab227fdb20a299ea8f23  ad-10s.webm
2343f3235f6ea6f27c8de74a34dbbc4e91cd5c95280d7012fdc2279c9a9911ab  content-40s.mp4
22b72457a445abb11384a71324979e5d1524f8783de213cdd58e71f1e3eb4bc4  content-40s.webm
dce5cb34a2865a6afd7f317daa74e8d8fbd06f516d6252b663931e2d700fd5a8  corrupt.mp4
dce5cb34a2865a6afd7f317daa74e8d8fbd06f516d6252b663931e2d700fd5a8  corrupt.webm
```
