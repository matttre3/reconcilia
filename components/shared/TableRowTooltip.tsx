"use client"

import type * as React from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type Props = {
  children: React.ReactNode
  content?: React.ReactNode
  className?: string
  contentClassName?: string
  onClick?: React.MouseEventHandler<HTMLTableRowElement>
  disabled?: boolean
}

export function TableRowTooltip({
  children,
  content,
  className,
  contentClassName,
  onClick,
  disabled = false,
}: Props) {
  const isEmptyContent =
    content == null || (typeof content === "string" && content.trim() === "")

  if (disabled || isEmptyContent) {
    return (
      <tr className={className} onClick={onClick}>
        {children}
      </tr>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        delay={150}
        render={<tr className={className} onClick={onClick} />}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className={cn("text-center", contentClassName)}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
