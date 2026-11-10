// Export CSV lisible par Excel en français : séparateur « ; », marque UTF-8 (accents), dates locales
const echapper = (v) => {
  if (v == null) return ''
  const texte = v instanceof Date ? v.toISOString() : String(v)
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte
}

const dateCsv = (d) => (d ? new Date(d).toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' }) : '')
const nombreCsv = (n) => (n == null ? '' : String(n).replace('.', ','))

const BOM = String.fromCharCode(0xfeff) // marque UTF-8 : Excel affiche correctement les accents

// colonnes : [[en-tête, (ligne) => valeur], …]
function versCsv(lignes, colonnes) {
  const entete = colonnes.map(([titre]) => echapper(titre)).join(';')
  const corps = lignes.map((l) => colonnes.map(([, valeur]) => echapper(valeur(l))).join(';'))
  return `${BOM}${[entete, ...corps].join('\r\n')}\r\n`
}

function envoyerCsv(res, nom, contenu) {
  const jour = new Date().toISOString().slice(0, 10)
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="${nom}-${jour}.csv"`)
  res.send(contenu)
}

module.exports = { versCsv, envoyerCsv, dateCsv, nombreCsv }
