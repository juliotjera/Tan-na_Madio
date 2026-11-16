# Icônes « classiques » d'Android 7 (sans icône adaptative) : l'épingle générée par @capacitor/assets
# est posée sur le fond anthracite (carré arrondi, ou rond pour ic_launcher_round).
#   python scripts/icones-android-anciennes.py   (après npx capacitor-assets generate)
import glob
from PIL import Image, ImageDraw

FOND = (17, 24, 32, 255)  # #111820

for chemin in glob.glob('android/app/src/main/res/mipmap-*/ic_launcher*.png'):
    if 'foreground' in chemin or 'background' in chemin:
        continue
    epingle = Image.open(chemin).convert('RGBA')
    n = epingle.width
    masque = Image.new('L', (n * 4, n * 4), 0)
    dessin = ImageDraw.Draw(masque)
    if chemin.endswith('_round.png'):
        dessin.ellipse((0, 0, n * 4 - 1, n * 4 - 1), fill=255)
    else:
        dessin.rounded_rectangle((0, 0, n * 4 - 1, n * 4 - 1), radius=n * 4 * 0.22, fill=255)
    masque = masque.resize((n, n), Image.LANCZOS)
    icone = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    icone.paste(Image.new('RGBA', (n, n), FOND), (0, 0), masque)
    icone.alpha_composite(epingle)
    icone.save(chemin)
    print(chemin, n)
