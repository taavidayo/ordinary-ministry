"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Select is still used inside FieldEditor for the type switcher
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Trash2, Copy, GripVertical,
  Type, AlignLeft, List, CheckSquare, ChevronDown as DropIcon,
  BarChart2, Star, Calendar, Clock, Youtube, Image, Minus, Hash,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export type FieldType =
  | "SECTION_HEADER" | "TEXT" | "SHORT_ANSWER" | "LONG_ANSWER"
  | "MULTIPLE_CHOICE" | "CHECKBOX" | "DROPDOWN"
  | "LINEAR_SCALE" | "RATING" | "DATE" | "TIME"
  | "YOUTUBE" | "IMAGE"

export interface FormFieldDef {
  id: string
  type: FieldType
  label: string
  description: string
  required: boolean
  config: Record<string, unknown>
}

const FIELD_TYPES: { type: FieldType; label: string; icon: React.ElementType }[] = [
  { type: "SECTION_HEADER", label: "Section Header", icon: Hash },
  { type: "TEXT",           label: "Text Block",     icon: Type },
  { type: "SHORT_ANSWER",   label: "Short Answer",   icon: Minus },
  { type: "LONG_ANSWER",    label: "Long Answer",    icon: AlignLeft },
  { type: "MULTIPLE_CHOICE",label: "Multiple Choice",icon: List },
  { type: "CHECKBOX",       label: "Checkboxes",     icon: CheckSquare },
  { type: "DROPDOWN",       label: "Dropdown",       icon: DropIcon },
  { type: "LINEAR_SCALE",   label: "Linear Scale",   icon: BarChart2 },
  { type: "RATING",         label: "Rating",         icon: Star },
  { type: "DATE",           label: "Date",           icon: Calendar },
  { type: "TIME",           label: "Time",           icon: Clock },
  { type: "YOUTUBE",        label: "YouTube Video",  icon: Youtube },
  { type: "IMAGE",          label: "Image",          icon: Image },
]

function uid() {
  return Math.random().toString(36).slice(2)
}

function defaultConfig(type: FieldType): Record<string, unknown> {
  if (type === "MULTIPLE_CHOICE" || type === "CHECKBOX" || type === "DROPDOWN")
    return { options: ["Option 1", "Option 2"] }
  if (type === "LINEAR_SCALE")
    return { min: 1, max: 5, minLabel: "", maxLabel: "" }
  if (type === "RATING")
    return { max: 5 }
  return {}
}

interface FieldEditorProps {
  field: FormFieldDef
  autoFocus?: boolean
  onChange: (f: FormFieldDef) => void
  onDelete: () => void
  onDuplicate: () => void
  onFocused?: () => void
}

function FieldEditor({ field, autoFocus, onChange, onDelete, onDuplicate, onFocused }: FieldEditorProps) {
  const labelInputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const set = (patch: Partial<FormFieldDef>) => onChange({ ...field, ...patch })

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  useEffect(() => {
    if (autoFocus && labelInputRef.current) {
      labelInputRef.current.focus()
      onFocused?.()
    }
  }, [autoFocus, onFocused])
  const setConfig = (patch: Record<string, unknown>) => set({ config: { ...field.config, ...patch } })

  const hasLabel = !["TEXT", "SECTION_HEADER"].includes(field.type)
  const hasRequired = !["SECTION_HEADER", "TEXT", "YOUTUBE", "IMAGE"].includes(field.type)
  const hasOptions = ["MULTIPLE_CHOICE", "CHECKBOX", "DROPDOWN"].includes(field.type)

  const options = (field.config.options as string[]) ?? []

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("border-l-4 border-l-primary", isDragging && "opacity-50 shadow-xl")}
    >
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-2">
          <GripVertical
            className="h-5 w-5 text-muted-foreground mt-1 shrink-0 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          />
          <div className="flex-1 space-y-3">
            {/* Type selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={field.type} onValueChange={(v) => onChange({ ...field, type: v as FieldType, config: defaultConfig(v as FieldType) })}>
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />{label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasRequired && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => set({ required: e.target.checked })}
                    className="rounded"
                  />
                  Required
                </label>
              )}
            </div>

            {/* Label / heading */}
            {field.type === "SECTION_HEADER" ? (
              <Input
                ref={labelInputRef as React.Ref<HTMLInputElement>}
                placeholder="Section heading"
                value={field.label}
                onChange={(e) => set({ label: e.target.value })}
                className="text-base font-semibold"
              />
            ) : field.type === "TEXT" ? (
              <Textarea
                ref={labelInputRef as React.Ref<HTMLTextAreaElement>}
                placeholder="Text content…"
                value={field.label}
                onChange={(e) => set({ label: e.target.value })}
                rows={3}
              />
            ) : field.type === "YOUTUBE" ? (
              <div className="space-y-1">
                <Label className="text-xs">YouTube URL or video ID</Label>
                <Input
                  ref={labelInputRef as React.Ref<HTMLInputElement>}
                  placeholder="https://youtube.com/watch?v=..."
                  value={field.label}
                  onChange={(e) => set({ label: e.target.value })}
                />
              </div>
            ) : field.type === "IMAGE" ? (
              <div className="space-y-1">
                <Label className="text-xs">Image URL</Label>
                <Input
                  ref={labelInputRef as React.Ref<HTMLInputElement>}
                  placeholder="https://..."
                  value={field.label}
                  onChange={(e) => set({ label: e.target.value })}
                />
              </div>
            ) : (
              <Input
                ref={labelInputRef as React.Ref<HTMLInputElement>}
                placeholder="Question"
                value={field.label}
                onChange={(e) => set({ label: e.target.value })}
              />
            )}

            {/* Description (for question types) */}
            {hasLabel && (
              <Input
                placeholder="Description (optional)"
                value={field.description}
                onChange={(e) => set({ description: e.target.value })}
                className="text-sm text-muted-foreground"
              />
            )}

            {/* Options */}
            {hasOptions && (
              <div className="space-y-1.5">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-4 shrink-0">
                      {field.type === "CHECKBOX" ? (
                        <input type="checkbox" disabled className="rounded" />
                      ) : field.type === "DROPDOWN" ? (
                        <span className="text-xs text-muted-foreground">{i + 1}.</span>
                      ) : (
                        <input type="radio" disabled />
                      )}
                    </div>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options]
                        next[i] = e.target.value
                        setConfig({ options: next })
                      }}
                      className="h-7 text-sm"
                    />
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                      onClick={() => setConfig({ options: options.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => setConfig({ options: [...options, `Option ${options.length + 1}`] })}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add option
                </Button>
              </div>
            )}

            {/* Linear scale config */}
            {field.type === "LINEAR_SCALE" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Min</Label>
                    <Input type="number" min={0} max={1} value={field.config.min as number ?? 1}
                      onChange={(e) => setConfig({ min: Number(e.target.value) })}
                      className="w-16 h-7 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max</Label>
                    <Input type="number" min={2} max={10} value={field.config.max as number ?? 5}
                      onChange={(e) => setConfig({ max: Number(e.target.value) })}
                      className="w-16 h-7 text-sm" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Min label</Label>
                    <Input value={field.config.minLabel as string ?? ""}
                      onChange={(e) => setConfig({ minLabel: e.target.value })}
                      className="h-7 text-sm" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Max label</Label>
                    <Input value={field.config.maxLabel as string ?? ""}
                      onChange={(e) => setConfig({ maxLabel: e.target.value })}
                      className="h-7 text-sm" />
                  </div>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: (field.config.max as number ?? 5) - (field.config.min as number ?? 1) + 1 }, (_, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{(field.config.min as number ?? 1) + i}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Rating config */}
            {field.type === "RATING" && (
              <div className="flex items-center gap-2">
                <Label className="text-xs">Max stars</Label>
                <Input type="number" min={3} max={10} value={field.config.max as number ?? 5}
                  onChange={(e) => setConfig({ max: Number(e.target.value) })}
                  className="w-16 h-7 text-sm" />
                <div className="flex gap-0.5">
                  {Array.from({ length: field.config.max as number ?? 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
              </div>
            )}

            {/* Preview placeholders */}
            {field.type === "SHORT_ANSWER" && (
              <Input disabled placeholder="Short answer text" className="bg-muted/50 text-sm" />
            )}
            {field.type === "LONG_ANSWER" && (
              <Textarea disabled placeholder="Long answer text" rows={3} className="bg-muted/50 text-sm" />
            )}
            {field.type === "DATE" && (
              <Input disabled type="date" className="bg-muted/50 text-sm w-44" />
            )}
            {field.type === "TIME" && (
              <Input disabled type="time" className="bg-muted/50 text-sm w-36" />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface Props {
  initialFields?: FormFieldDef[]
  onChange: (fields: FormFieldDef[]) => void
  className?: string
}

function getScrollParent(el: HTMLElement): HTMLElement | Window {
  let parent = el.parentElement
  while (parent && parent !== document.documentElement) {
    const { overflow, overflowY } = window.getComputedStyle(parent)
    if (/auto|scroll/.test(overflow + overflowY)) return parent
    parent = parent.parentElement
  }
  return window
}

export default function FormBuilder({ initialFields = [], onChange, className }: Props) {
  const [fields, setFields] = useState<FormFieldDef[]>(initialFields)
  const [focusId, setFocusId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const containerRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const currentYRef = useRef(0)
  const rafRef = useRef<number>(0)

  const animate = useCallback(() => {
    const container = containerRef.current
    const toolbar = toolbarRef.current
    if (!container || !toolbar) return

    const containerRect = container.getBoundingClientRect()
    const toolbarH = toolbar.offsetHeight
    const offset = 24 // desired gap from top of viewport

    // how far the toolbar should travel down from the container's top edge
    const target = Math.max(0, Math.min(
      offset - containerRect.top,
      containerRect.height - toolbarH
    ))

    // lerp: 12% per frame gives a smooth drag feel
    currentYRef.current += (target - currentYRef.current) * 0.12
    toolbar.style.transform = `translateY(${currentYRef.current}px)`

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scroller = getScrollParent(container)
    rafRef.current = requestAnimationFrame(animate)

    const onScroll = () => {} // RAF loop handles it continuously
    scroller.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      cancelAnimationFrame(rafRef.current)
      scroller.removeEventListener("scroll", onScroll)
    }
  }, [animate])

  function update(next: FormFieldDef[]) {
    setFields(next)
    onChange(next)
  }

  function addField(type: FieldType) {
    const newField: FormFieldDef = {
      id: uid(),
      type,
      label: "",
      description: "",
      required: false,
      config: defaultConfig(type),
    }
    update([...fields, newField])
    setFocusId(newField.id)
  }

  function updateField(i: number, f: FormFieldDef) {
    const next = [...fields]
    next[i] = f
    update(next)
  }

  function deleteField(i: number) {
    update(fields.filter((_, j) => j !== i))
  }

  function duplicateField(i: number) {
    const copy = { ...fields[i], id: uid() }
    const next = [...fields]
    next.splice(i + 1, 0, copy)
    update(next)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = fields.findIndex((f) => f.id === active.id)
    const newIndex = fields.findIndex((f) => f.id === over.id)
    update(arrayMove(fields, oldIndex, newIndex))
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={containerRef} className={cn("relative", className)}>
        {/* Field canvas */}
        {fields.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-10 text-center text-muted-foreground text-sm">
            Click a field type on the right to get started.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {fields.map((f, i) => (
                  <FieldEditor
                    key={f.id}
                    field={f}
                    autoFocus={focusId === f.id}
                    onChange={(updated) => updateField(i, updated)}
                    onDelete={() => deleteField(i)}
                    onDuplicate={() => duplicateField(i)}
                    onFocused={() => setFocusId(null)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Dragging sidebar — absolute right of widget, lerp-animated on scroll */}
        <div className="absolute top-0 left-full pointer-events-none" style={{ paddingLeft: "34px" }}>
          <div
            ref={toolbarRef}
            className="pointer-events-auto bg-card border rounded-xl shadow-md p-2 flex flex-col gap-1 w-11"
            style={{ willChange: "transform" }}
          >
            {FIELD_TYPES.map(({ type, label, icon: Icon }) => (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => addField(type)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {label}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
