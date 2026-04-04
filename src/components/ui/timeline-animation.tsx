"use client"

import React, { useRef } from "react"
import { motion, useInView, type Variants } from "framer-motion"
import { cn } from "@/lib/utils"

interface TimelineContentProps {
  as?: React.ElementType
  children: React.ReactNode
  className?: string
  animationNum?: number
  timelineRef?: React.RefObject<HTMLElement | null>
  customVariants?: Variants
  [key: string]: unknown
}

function TimelineContent({
  as: Component = "div",
  children,
  className,
  animationNum = 0,
  timelineRef,
  customVariants,
  ...props
}: TimelineContentProps) {
  const localRef = useRef<HTMLElement>(null)
  const isInView = useInView(timelineRef ?? localRef, { once: true, amount: 0.1 })

  const defaultVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(8px)",
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  }

  const variants = customVariants ?? defaultVariants

  return (
    <motion.div
      ref={localRef as React.Ref<HTMLDivElement>}
      custom={animationNum}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export { TimelineContent }
