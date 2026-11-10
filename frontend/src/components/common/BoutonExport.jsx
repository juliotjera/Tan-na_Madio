// Téléchargement d'un export CSV (ouvrable dans Excel)
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Download } from 'lucide-react'
import { telechargerCsv } from '../../api'
import { messageErreur } from '../../api/axiosConfig'
import { Spinner } from './ui'

export default function BoutonExport({ ressource, params, libelle = 'Exporter en CSV' }) {
  const [enCours, setEnCours] = useState(false)
  const exporter = async () => {
    setEnCours(true)
    try {
      toast.success(`Export enregistré : ${await telechargerCsv(ressource, params)}`)
    } catch (err) {
      toast.error(messageErreur(err))
    } finally {
      setEnCours(false)
    }
  }
  return (
    <button type="button" className="btn-secondaire" onClick={exporter} disabled={enCours}>
      {enCours ? <Spinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      {libelle}
    </button>
  )
}
