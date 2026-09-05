"use client"

import * as React from "react"
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export interface DataTableColumn<TData> {
  id: string
  header:
    | React.ReactNode
    | ((context: {
        sortDirection?: "asc" | "desc" | null
        toggleSort: () => void
      }) => React.ReactNode)
  accessorKey?: keyof TData
  accessorFn?: (row: TData) => unknown
  cell?: (row: TData, index: number) => React.ReactNode
  sortable?: boolean
  sortFn?: (a: TData, b: TData) => number
  align?: "left" | "center" | "right"
  className?: string
  headClassName?: string
}

export interface DataTableFilterPill {
  id: string
  label: string
  count?: number
  active: boolean
  onToggle: () => void
}

export interface DataTableProps<TData> {
  data: TData[]
  columns: DataTableColumn<TData>[]
  keyExtractor: (row: TData, index: number) => string
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: ((row: TData) => string | undefined | null)[]
  filterPills?: DataTableFilterPill[]
  toolbarRight?: React.ReactNode
  pageSize?: number
  pageSizeOptions?: number[]
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  batchActions?: (selectedRows: TData[]) => React.ReactNode
  footer?: React.ReactNode
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
  emptyIcon?: React.ReactNode
  className?: string
  tableClassName?: string
  bordered?: boolean
}

export function DataTable<TData>({
  data,
  columns,
  keyExtractor,
  searchable = false,
  searchPlaceholder = "Search records...",
  searchFields,
  filterPills,
  toolbarRight,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  selectable = false,
  selectedIds,
  onSelectionChange,
  batchActions,
  footer,
  loading = false,
  emptyTitle = "No records found",
  emptyDescription = "No data matches your current search or filters.",
  emptyAction,
  emptyIcon,
  className,
  tableClassName,
  bordered = true,
}: DataTableProps<TData>) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [sortColumnId, setSortColumnId] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<
    "asc" | "desc" | null
  >(null)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [currentPageSize, setCurrentPageSize] = React.useState(pageSize || 10)

  // Filtering
  const filteredData = React.useMemo(() => {
    if (!searchable || !searchTerm.trim()) return data

    const query = searchTerm.toLowerCase()

    return data.filter((row) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((fieldFn) => {
          const val = fieldFn(row)
          return val ? String(val).toLowerCase().includes(query) : false
        })
      }

      // Default fallback search: search across all column accessors
      return columns.some((col) => {
        let val: unknown
        if (col.accessorFn) {
          val = col.accessorFn(row)
        } else if (col.accessorKey) {
          val = row[col.accessorKey]
        }
        return val ? String(val).toLowerCase().includes(query) : false
      })
    })
  }, [data, searchable, searchTerm, searchFields, columns])

  // Sorting
  const sortedData = React.useMemo(() => {
    if (!sortColumnId || !sortDirection) return filteredData

    const col = columns.find((c) => c.id === sortColumnId)
    if (!col) return filteredData

    return [...filteredData].sort((a, b) => {
      if (col.sortFn) {
        const res = col.sortFn(a, b)
        return sortDirection === "asc" ? res : -res
      }

      let valA: unknown
      let valB: unknown

      if (col.accessorFn) {
        valA = col.accessorFn(a)
        valB = col.accessorFn(b)
      } else if (col.accessorKey) {
        valA = a[col.accessorKey]
        valB = b[col.accessorKey]
      }

      if (valA === valB) return 0
      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDirection === "asc" ? valA - valB : valB - valA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      const comp = strA.localeCompare(strB)
      return sortDirection === "asc" ? comp : -comp
    })
  }, [filteredData, sortColumnId, sortDirection, columns])

  // Pagination
  const totalPages = pageSize
    ? Math.max(1, Math.ceil(sortedData.length / currentPageSize))
    : 1

  const paginatedData = React.useMemo(() => {
    if (!pageSize) return sortedData
    const start = (currentPage - 1) * currentPageSize
    return sortedData.slice(start, start + currentPageSize)
  }, [sortedData, pageSize, currentPage, currentPageSize])

  // Handle Sort Toggle
  const handleToggleSort = (columnId: string) => {
    if (sortColumnId !== columnId) {
      setSortColumnId(columnId)
      setSortDirection("asc")
    } else if (sortDirection === "asc") {
      setSortDirection("desc")
    } else {
      setSortColumnId(null)
      setSortDirection(null)
    }
  }

  // Handle Selection
  const allPageIds = React.useMemo(
    () => paginatedData.map((row, idx) => keyExtractor(row, idx)),
    [paginatedData, keyExtractor]
  )

  const isAllSelected =
    allPageIds.length > 0 &&
    Boolean(selectedIds && allPageIds.every((id) => selectedIds.includes(id)))

  const isSomeSelected = Boolean(
    selectedIds &&
    selectedIds.length > 0 &&
    allPageIds.some((id) => selectedIds.includes(id)) &&
    !isAllSelected
  )

  const toggleSelectAll = () => {
    if (!onSelectionChange) return
    if (isAllSelected) {
      const remaining = (selectedIds || []).filter(
        (id) => !allPageIds.includes(id)
      )
      onSelectionChange(remaining)
    } else {
      const next = Array.from(new Set([...(selectedIds || []), ...allPageIds]))
      onSelectionChange(next)
    }
  }

  const toggleSelectRow = (id: string) => {
    if (!onSelectionChange) return
    const current = selectedIds || []
    if (current.includes(id)) {
      onSelectionChange(current.filter((item) => item !== id))
    } else {
      onSelectionChange([...current, id])
    }
  }

  return (
    <div className={cn("flex w-full min-w-0 flex-col gap-3", className)}>
      {/* Top Toolbar (Search, Filter Pills, Batch Actions, Right Slot) */}
      {(searchable ||
        filterPills ||
        toolbarRight ||
        (selectable && selectedIds && selectedIds.length > 0)) && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Search & Filter Pills */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {searchable && (
              <div className="relative w-full sm:w-64">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-8 bg-background pr-7 pl-8 text-xs"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("")
                      setCurrentPage(1)
                    }}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            )}

            {/* Filter Pills */}
            {filterPills && filterPills.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {filterPills.map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={pill.onToggle}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-none border px-2.5 py-1 text-xs font-semibold transition-all",
                      pill.active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    )}
                  >
                    <span>{pill.label}</span>
                    {pill.count !== undefined && (
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          pill.active
                            ? "text-background/80"
                            : "text-muted-foreground"
                        )}
                      >
                        ({pill.count})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Batch Actions or Toolbar Right */}
          <div className="flex shrink-0 items-center justify-end gap-2">
            {selectable &&
            selectedIds &&
            selectedIds.length > 0 &&
            batchActions ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">
                  {selectedIds.length} selected
                </span>
                {batchActions(
                  data.filter((r, idx) =>
                    selectedIds.includes(keyExtractor(r, idx))
                  )
                )}
              </div>
            ) : (
              toolbarRight
            )}
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div
        className={cn(
          "min-w-0 overflow-x-auto rounded-none bg-card",
          bordered && "border border-border/80"
        )}
      >
        <Table className={tableClassName}>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/70 hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10 px-2 text-center">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}

              {columns.map((col) => {
                const isSorted = sortColumnId === col.id
                const isSortable =
                  col.sortable !== false &&
                  (col.sortable ||
                    col.sortFn ||
                    col.accessorKey ||
                    col.accessorFn)

                return (
                  <TableHead
                    key={col.id}
                    className={cn(
                      "h-9 text-xs font-semibold tracking-wider text-muted-foreground uppercase select-none",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.headClassName
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleToggleSort(col.id)}
                        className={cn(
                          "inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground",
                          col.align === "right" && "ml-auto flex-row-reverse",
                          col.align === "center" && "mx-auto",
                          isSorted && "text-foreground"
                        )}
                      >
                        {typeof col.header === "function"
                          ? col.header({
                              sortDirection: isSorted ? sortDirection : null,
                              toggleSort: () => handleToggleSort(col.id),
                            })
                          : col.header}
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="size-3 text-foreground" />
                          ) : (
                            <ArrowDown className="size-3 text-foreground" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-30 hover:opacity-100" />
                        )}
                      </button>
                    ) : typeof col.header === "function" ? (
                      col.header({
                        sortDirection: null,
                        toggleSort: () => {},
                      })
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  {selectable && (
                    <TableCell className="p-3 text-center">
                      <div className="mx-auto size-4 bg-muted/60" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id} className="p-3">
                      <div className="h-4 w-3/4 bg-muted/60" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center"
                >
                  <Empty className="border-0 p-0">
                    <EmptyHeader>
                      {emptyIcon && <EmptyMedia>{emptyIcon}</EmptyMedia>}
                      <EmptyTitle>{emptyTitle}</EmptyTitle>
                      <EmptyDescription>{emptyDescription}</EmptyDescription>
                    </EmptyHeader>
                    {emptyAction && <div className="mt-3">{emptyAction}</div>}
                  </Empty>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const rowKey = keyExtractor(row, index)
                const isSelected = Boolean(
                  selectedIds && selectedIds.includes(rowKey)
                )

                return (
                  <TableRow
                    key={rowKey}
                    data-state={isSelected ? "selected" : undefined}
                    className={cn(
                      "border-b border-border/40 transition-colors",
                      isSelected && "bg-muted/40"
                    )}
                  >
                    {selectable && (
                      <TableCell className="px-2 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(rowKey)}
                          aria-label={`Select row ${index + 1}`}
                        />
                      </TableCell>
                    )}

                    {columns.map((col) => {
                      let cellContent: React.ReactNode
                      if (col.cell) {
                        cellContent = col.cell(row, index)
                      } else if (col.accessorFn) {
                        cellContent = String(col.accessorFn(row) ?? "")
                      } else if (col.accessorKey) {
                        cellContent = String(row[col.accessorKey] ?? "")
                      } else {
                        cellContent = null
                      }

                      return (
                        <TableCell
                          key={col.id}
                          className={cn(
                            "py-2.5 text-xs",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                            col.className
                          )}
                        >
                          {cellContent}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* Custom Footer or Metric Strip */}
        {footer && <div className="border-t border-border/60">{footer}</div>}
      </div>

      {/* Pagination Footer */}
      {pageSize && totalPages > 1 && (
        <div className="flex flex-col gap-2 pt-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing{" "}
            <strong>
              {(currentPage - 1) * currentPageSize + 1}–
              {Math.min(currentPage * currentPageSize, sortedData.length)}
            </strong>{" "}
            of <strong>{sortedData.length}</strong> records
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {pageSizeOptions.length > 1 && (
              <div className="mr-2 flex items-center gap-1 text-[11px]">
                <span>Rows:</span>
                <select
                  value={currentPageSize}
                  onChange={(e) => {
                    setCurrentPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="h-7 rounded-none border border-border bg-background px-1 text-xs outline-none"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              title="First Page"
            >
              <ChevronsLeft className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            <span className="px-2 font-mono font-semibold text-foreground">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              title="Next Page"
            >
              <ChevronRight className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              title="Last Page"
            >
              <ChevronsRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
