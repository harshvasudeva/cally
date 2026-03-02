"use client"

import { memo, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes, type HTMLAttributes } from "react"

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  children: ReactNode
}

export const Table = memo(function Table({ className = "", children, ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-[var(--radius-lg)] border border-border">
      <table className={`w-full text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  )
})

export const TableHeader = memo(function TableHeader({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-surface-secondary ${className}`} {...props}>
      {children}
    </thead>
  )
})

export const TableBody = memo(function TableBody({ className = "", children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-border ${className}`} {...props}>
      {children}
    </tbody>
  )
})

export const TableRow = memo(function TableRow({ className = "", children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`transition-colors hover:bg-surface-hover ${className}`}
      {...props}
    >
      {children}
    </tr>
  )
})

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sorted?: "asc" | "desc" | false
  onSort?: () => void
}

export const TableHead = memo(function TableHead({ sortable, sorted, onSort, className = "", children, ...props }: TableHeadProps) {
  return (
    <th
      className={`
        px-4 py-3 text-left text-xs font-medium text-text-tertiary uppercase tracking-wider
        ${sortable ? "cursor-pointer select-none hover:text-text-secondary" : ""}
        ${className}
      `}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {sorted === "asc" && <span className="text-primary">↑</span>}
        {sorted === "desc" && <span className="text-primary">↓</span>}
      </div>
    </th>
  )
})

export const TableCell = memo(function TableCell({ className = "", children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3 text-text ${className}`} {...props}>
      {children}
    </td>
  )
})

interface TableEmptyProps {
  colSpan: number
  message?: string
  icon?: ReactNode
}

export const TableEmpty = memo(function TableEmpty({ colSpan, message = "No data found", icon }: TableEmptyProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-2 text-text-tertiary">
          {icon && <span className="text-text-tertiary">{icon}</span>}
          <p className="text-sm">{message}</p>
        </div>
      </td>
    </tr>
  )
})
