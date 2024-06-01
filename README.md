# anonart
A little experiment for drawing in the browser and sharing the link, all client-side. See it live [here](https://kettek.net/s/a).

## Data Format
This is uses a very simple palette-based format that uses [Run-length encoding](https://en.wikipedia.org/wiki/Run-length_encoding) before being written to base64.

The basic format uses big-endian for 16-bit numbers and is:

| Variable | Bytes | Description
|-|-|
| width | 1 | Width of the image, up to 255
| height | 1 | Height of the image, up to 255
| color count | 2 | count of colors
| ... colors | 3 | red, green, and blue color entries, up to 255
| image data | 2+4 per run | Pairs of 16-bit run count and 16-bit palette index references, up to the end of the format.