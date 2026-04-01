"use client"

import { useState, useEffect } from "react"
import { X, Plus, CheckSquare, Square, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Task {
  id: string
  content: string
  done: boolean
  createdAt: string
}

interface Props {
  onClose: () => void
}

export default function TasksPanel({ onClose }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd() {
    const content = newTask.trim()
    if (!content) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) { toast.error("Failed to add task"); return }
    const task = await res.json()
    setTasks((prev) => [...prev, task])
    setNewTask("")
    setAdding(false)
  }

  async function handleToggle(id: string, done: boolean) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !done }),
    })
    if (!res.ok) return
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !done } : t)))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    if (!res.ok) return
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div className="w-72 border-l bg-card flex flex-col">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <CheckSquare className="h-4 w-4" />
          <p className="font-semibold text-sm">My Tasks</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

        {/* Add new task */}
        {adding ? (
          <div className="flex gap-1.5 mb-2">
            <Input
              autoFocus
              placeholder="New task..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="h-7 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
                if (e.key === "Escape") { setAdding(false); setNewTask("") }
              }}
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={handleAdd} disabled={!newTask.trim()}>
              Add
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-7 text-xs text-muted-foreground mb-1"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add task
          </Button>
        )}

        {/* Pending tasks */}
        {pending.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
        ))}

        {/* Completed tasks */}
        {done.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2 pb-1">
              Completed ({done.length})
            </p>
            {done.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </>
        )}

        {!loading && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks yet.</p>
        )}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-start gap-2 group py-1 px-1 rounded hover:bg-accent/50">
      <button
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        onClick={() => onToggle(task.id, task.done)}
      >
        {task.done
          ? <CheckSquare className="h-4 w-4 text-primary" />
          : <Square className="h-4 w-4" />}
      </button>
      <p className={cn("flex-1 text-sm leading-snug", task.done && "line-through text-muted-foreground")}>
        {task.content}
      </p>
      <Button
        variant="ghost" size="icon"
        className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(task.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
