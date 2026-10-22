Self-hosted fonts for the guest page (/m/) and the menu maker's cards (/qr/). No font is ever requested from a third party.

inter-latin-400|600|700.woff2     Inter 4.0 (Debian package fonts-inter 4.0+ds-1, OFL 1.1), Regular, SemiBold, Bold.
                                  Subset: Basic Latin, Latin-1, Latin Extended-A (Polish, Czech, Hungarian, Romanian...), typographic punctuation,
                                  currency signs (EUR, UAH, TRY, INR, RUB), arrows. Features kept: kern, tnum (tabular numbers), ccmp, locl, mark, mkmk.
inter-cyrillic-400|600|700.woff2  The same three weights, Cyrillic subset (Ukrainian and Russian pages only; the browser loads them only when needed).
outfit-latin-700.woff2            Outfit Bold (Outfit Project Authors, OFL 1.1; local copy of Outfit-Bold.ttf, version 1.100), the same Latin subset.
                                  Declared in the CSS for weights 700 to 800: there is no ExtraBold file, so 800 shows the Bold face (not a faked bold).

Made with fontTools (pyftsubset, WOFF2). The licence texts are in LICENSE-Inter.txt and LICENSE-Outfit.txt.
