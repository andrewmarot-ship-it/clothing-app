import type { JSX } from 'react'
import { TabBar } from './components/Chrome'
import { SvgDefs } from './components/Garment'
import { AddPiece } from './screens/AddPiece'
import { ItemDetail } from './screens/ItemDetail'
import { Looks } from './screens/Looks'
import { Match } from './screens/Match'
import { Occasion } from './screens/Occasion'
import { Outfit } from './screens/Outfit'
import { Profile } from './screens/Profile'
import { Quiz } from './screens/Quiz'
import { Tones } from './screens/Tones'
import { Wardrobe } from './screens/Wardrobe'
import { TABS, useApp, type Screen, type Tab } from './state/context'
import { AppProvider } from './state/store'

const SCREENS: Record<Screen, () => JSX.Element> = {
  outfit: Outfit,
  wardrobe: Wardrobe,
  add: AddPiece,
  looks: Looks,
  profile: Profile,
  occasion: Occasion,
  match: Match,
  item: ItemDetail,
  quiz: Quiz,
  tones: Tones,
}

function Shell() {
  const { state } = useApp()
  const Current = SCREENS[state.screen]
  const isTab = TABS.includes(state.screen as Tab)
  return (
    <div className="page">
      <main className={`app ${isTab ? 'has-tabs' : ''}`}>
        <Current key={state.screen} />
      </main>
      {isTab && <TabBar />}
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
