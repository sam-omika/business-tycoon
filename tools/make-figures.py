"""Builds 'Tycoon Figures': Selawik's digits 0-9 made equal-width (tabular), for lining up numbers.

Selawik has no tabular figures (its "1" is much narrower), so columns of numbers wobble.
This script takes each Selawik weight in fonts/, keeps only the ten digits, gives them all the width
of the widest digit and centres each outline in that width. The result is renamed, because the
SIL Open Font License reserves the name "Selawik" for the original (see fonts/Selawik-OFL.txt).

The page loads these files with unicode-range U+0030-0039, so only digits come from them and
everything else stays Selawik.

Run once after changing fonts (needs fonttools + brotli):
    python3 -m venv /tmp/ft && /tmp/ft/bin/pip install fonttools brotli
    /tmp/ft/bin/python tools/make-figures.py
"""
import os
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = os.path.join(os.path.dirname(__file__), '..', 'fonts')
WEIGHTS = {'selawkl': 'Light', 'selawksl': 'Semilight', 'selawk': 'Regular', 'selawksb': 'Semibold'}
FAMILY = 'Tycoon Figures'
DIGITS = list(range(0x30, 0x3A))

for src, style in WEIGHTS.items():
    font = TTFont(os.path.join(ROOT, src + '.woff2'))
    # Keep only the digits (no kerning or substitutions needed for single glyphs).
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = []
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=DIGITS)
    sub.subset(font)

    cmap = font.getBestCmap()
    hmtx, glyf = font['hmtx'], font['glyf']
    names = [cmap[c] for c in DIGITS]
    target = max(hmtx[n][0] for n in names)
    for n in names:
        adv, lsb = hmtx[n]
        shift = (target - adv) // 2
        g = glyf[n]
        if shift and g.numberOfContours != 0:
            if g.isComposite():
                for comp in g.components:
                    comp.x += shift
            else:
                g.coordinates.translate((shift, 0))
            g.recalcBounds(glyf)
        hmtx[n] = (target, lsb + shift)

    # Rename: the OFL Reserved Font Name may not be used for a modified version.
    ps = 'TycoonFigures-' + style
    for rec in font['name'].names:
        if rec.nameID in (1, 16):
            rec.string = FAMILY
        elif rec.nameID in (2, 17):
            rec.string = style
        elif rec.nameID == 3:
            rec.string = ps + ';tabular digits derived from Selawik'
        elif rec.nameID == 4:
            rec.string = FAMILY + ' ' + style
        elif rec.nameID == 6:
            rec.string = ps
    out = os.path.join(ROOT, 'tycoon-figures-' + style.lower() + '.woff2')
    font.flavor = 'woff2'
    font.save(out)
    print('wrote', os.path.relpath(out), 'digit width', target, 'bytes', os.path.getsize(out))
