import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = { first: number; shown: number; total: number; page: number; pages: number; onPage: (page: number) => void }

// Shared footer for desk tables: range on the left, page controls on the right.
export function TablePager({ first, shown, total, page, pages, onPage }: Props) {
  return <nav aria-label="Pagination" className="admin-table-footer">
    <p role="status">{total ? `${first + 1}–${first + shown} of ${total}` : "0 results"}</p>
    <div className="flex items-center gap-2"><span>Page {page + 1} of {pages}</span><Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}><ChevronRight /></Button></div>
  </nav>
}
