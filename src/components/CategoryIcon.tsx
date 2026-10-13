import { Dress, Pants, TShirt, type IconProps } from '@phosphor-icons/react'
import { CATEGORIES } from '../domain/categories'
import type { Category } from '../domain/types'

const ICONS = { TShirt, Pants, Dress }

/** A category's icon, as named in the registry. */
export function CategoryIcon({ cat, ...props }: { cat: Category } & IconProps) {
  const Icon = ICONS[CATEGORIES[cat].icon]
  return <Icon {...props} />
}
