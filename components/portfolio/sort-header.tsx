import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { SortDir } from "@/lib/desk-url"

type Props = { label: string; active: boolean; dir: SortDir; onSort: () => void; className?: string }

// W3C APG sortable table: aria-sort on the sorted column only, a real button
// inside, and an icon hidden from assistive technology.
// https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/
export function SortHeader({ label, active, dir, onSort, className }: Props) {
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
  return <th scope="col" className={className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
    <button type="button" className="admin-sort-button" onClick={onSort}>{label}<Icon className={active ? "size-3.5" : "size-3.5 opacity-40"} aria-hidden="true" /></button>
  </th>
}
