"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  currentPage: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  siblingCount?: number
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      className,
      currentPage,
      pageSize,
      totalItems,
      onPageChange,
      onPageSizeChange,
      pageSizeOptions = [10, 20, 50, 100],
      siblingCount = 1,
      ...props
    },
    ref
  ) => {
    const totalPages = Math.ceil(totalItems / pageSize)
    const startItem = (currentPage - 1) * pageSize + 1
    const endItem = Math.min(currentPage * pageSize, totalItems)

    const range = (start: number, end: number) => {
      const length = end - start + 1
      return Array.from({ length }, (_, i) => start + i)
    }

    const getPaginationItems = () => {
      const totalPageNumbers = siblingCount * 2 + 5

      if (totalPages <= totalPageNumbers) {
        return range(1, totalPages)
      }

      const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
      const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

      const showLeftDots = leftSiblingIndex > 2
      const showRightDots = rightSiblingIndex < totalPages - 1

      if (!showLeftDots && showRightDots) {
        const leftRange = range(1, 3 + siblingCount)
        return [...leftRange, "dots", totalPages]
      }

      if (showLeftDots && !showRightDots) {
        const rightRange = range(totalPages - (2 + siblingCount), totalPages)
        return [1, "dots", ...rightRange]
      }

      const middleRange = range(leftSiblingIndex, rightSiblingIndex)
      return [1, "dots", ...middleRange, "dots", totalPages]
    }

    const paginationItems = getPaginationItems()

    return (
      <div
        ref={ref}
        className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 px-2", className)}
        {...props}
      >
        <div className="flex items-center gap-4">
          {onPageSizeChange && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground-secondary">Filas:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="h-9 w-20 rounded-md border border-border bg-background px-3 text-sm"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          )}
          <span className="text-sm text-foreground-secondary">
            {totalItems === 0 ? (
              "Sin resultados"
            ) : (
              <>
                Mostrando <span className="font-medium">{startItem}</span>
                {" - "}
                <span className="font-medium">{endItem}</span>
                {" de "}
                <span className="font-medium">{totalItems}</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="hidden sm:flex"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 px-2">
            {paginationItems.map((item, index) =>
              item === "dots" ? (
                <span
                  key={`dots-${index}`}
                  className="px-2 text-foreground-secondary"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  variant={currentPage === item ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onPageChange(item as number)}
                  className="w-10"
                >
                  {item}
                </Button>
              )
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="hidden sm:flex"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }
)
Pagination.displayName = "Pagination"

export { Pagination }
