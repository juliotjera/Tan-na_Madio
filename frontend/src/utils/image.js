// Photo réduite avant l'envoi (1600 px, JPEG) : rapide même sur une connexion mobile faible
export async function compresserPhoto(fichier, { cote = 1600, qualite = 0.82 } = {}) {
  if (!fichier?.type?.startsWith('image/')) return fichier
  try {
    const image = await createImageBitmap(fichier, { imageOrientation: 'from-image' })
    const echelle = Math.min(1, cote / Math.max(image.width, image.height))
    if (echelle === 1 && fichier.size < 900 * 1024) return fichier
    const toile = document.createElement('canvas')
    toile.width = Math.round(image.width * echelle)
    toile.height = Math.round(image.height * echelle)
    toile.getContext('2d').drawImage(image, 0, 0, toile.width, toile.height)
    const blob = await new Promise((ok) => toile.toBlob(ok, 'image/jpeg', qualite))
    if (!blob || blob.size >= fichier.size) return fichier
    return new File([blob], fichier.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return fichier // navigateur ancien : la photo part telle quelle
  }
}
