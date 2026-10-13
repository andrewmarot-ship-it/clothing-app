import { Camera } from '@phosphor-icons/react'
import { useState } from 'react'
import { BackRow } from '../components/Chrome'
import { DetailsForm, type Details } from '../components/DetailsForm'
import { Garment } from '../components/Garment'
import { useApp } from '../state/context'

export function EditItem() {
  const { state, go, byId, updateItem } = useApp()
  const item = byId(state.itemId)
  const [details, setDetails] = useState<Details | null>(() =>
    item ? { name: item.name, cat: item.cat, kind: item.kind, fabric: item.fabric, f: item.f, w: item.w } : null,
  )
  const back = () => go('item', { itemId: state.itemId })

  if (!item || !details) {
    return (
      <>
        <BackRow label="Spectrum" onBack={() => go('wardrobe')} />
        <p className="pad top-8 muted">This piece is no longer in your wardrobe.</p>
      </>
    )
  }

  const save = () => {
    updateItem(item.id, { ...details, name: details.name.trim() || item.name, fabric: details.fabric.trim() || item.fabric })
    back()
  }

  return (
    <>
      <BackRow label={item.name} onBack={back} right="Edit" />
      <div className="pad top-4 edit-head">
        <span className="w-tile edit-thumb">
          <Garment item={item} align="center" shade={false} stroke={2} fit="tight" className="fill" />
        </span>
        <button type="button" className="btn btn-secondary" onClick={() => go('add', { retakeId: item.id })}>
          <Camera size={16} />
          Retake photo
        </button>
      </div>
      <div className="pad top-6 stack-4">
        <DetailsForm value={details} onChange={setDetails} />
        <div className="actions-item top-3">
          <button type="button" className="btn btn-ghost btn-tall" onClick={back}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary btn-tall" onClick={save}>
            Save changes
          </button>
        </div>
      </div>
    </>
  )
}
