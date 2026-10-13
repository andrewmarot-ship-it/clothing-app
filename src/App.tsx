import { useCallback, useState, type JSX } from 'react'
import { Dock } from './components/Chrome'
import { SvgDefs } from './components/Garment'
import { AddPiece } from './screens/AddPiece'
import { EditItem } from './screens/EditItem'
import { ItemDetail } from './screens/ItemDetail'
import { Looks } from './screens/Looks'
import { Stage } from './screens/Stage'
import { Aura } from './screens/Aura'
import { Quiz } from './screens/Quiz'
import { Tones } from './screens/Tones'
import { Spectrum } from './screens/Spectrum'
import { Welcome } from './screens/Welcome'
import { TABS, useApp, type Screen, type Tab } from './state/context'
import { AppProvider } from './state/store'
import { useThemePref } from './state/theme'
import { shouldWelcome } from './state/welcome'

const SCREENS: Record<Screen, () => JSX.Element> = {
  outfit: Stage,
  wardrobe: Spectrum,
  add: AddPiece,
  looks: Looks,
  profile: Aura,
  item: ItemDetail,
  edit: EditItem,
  quiz: Quiz,
  tones: Tones,
}

function Shell() {
  const { state } = useApp()
  useThemePref()
  const [welcome, setWelcome] = useState(shouldWelcome)
  const done = useCallback(() => setWelcome(false), [])
  if (welcome) return <Welcome onDone={done} />
  const Current = SCREENS[state.screen]
  const isTab = TABS.includes(state.screen as Tab)
  return (
    <div className="page">
      <main className={`app ${isTab ? 'has-tabs' : ''} ${state.screen === 'outfit' ? 'is-stage' : ''}`}>
        <Current key={state.screen} />
      </main>
      {isTab && !state.sheet && <Dock />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <SvgDefs />
      <Shell />
    </AppProvider>
  )
}
