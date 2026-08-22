from pathlib import Path

MARKER = 'reac-parallax-viewport-fix'

CSS = '''\n<style id="reac-parallax-viewport-fix">\n  /* ===== Parallax: full viewport / no side gaps ===== */\n  html, body {\n    margin: 0 !important;\n    padding: 0 !important;\n    max-width: 100% !important;\n    overflow-x: hidden !important;\n  }\n\n  #top[data-screen-label="Parallax"] {\n    width: 100vw !important;\n    max-width: none !important;\n    margin-left: calc(50% - 50vw) !important;\n    margin-right: calc(50% - 50vw) !important;\n    overflow: hidden !important;\n    isolation: isolate;\n  }\n\n  #top[data-screen-label="Parallax"] > div:first-child,\n  #top[data-screen-label="Parallax"] > div:first-child > div:first-child {\n    width: 100% !important;\n    max-width: none !important;\n  }\n\n  #top[data-screen-label="Parallax"] img {\n    left: 50% !important;\n    width: max(100vw, 177.78vh) !important;\n    max-width: none !important;\n    height: auto !important;\n  }\n\n  @media (max-width: 700px) {\n    #top[data-screen-label="Parallax"] img {\n      width: max(100vw, 135vh) !important;\n    }\n  }\n</style>\n'''

for name in ('index.html', 'Reac.dc.html'):
    path = Path(name)
    if not path.exists():
        continue

    text = path.read_text(encoding='utf-8')
    if MARKER in text:
        continue

    if '</head>' not in text:
        raise RuntimeError(f'Missing </head> in {name}')

    path.write_text(text.replace('</head>', CSS + '</head>', 1), encoding='utf-8')
