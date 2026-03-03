"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckSquare, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

export interface TaskItem {
  id: string
  content: string
  done: boolean
  createdAt: string
}

interface Props {
  tasks: TaskItem[]
}

export default function TasksWidget({ tasks: initial }: Props) {
  const [tasks, setTasks] = useState(initial)
  const [newContent, setNewContent] = useState("")
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function addTask() {
    const content = newContent.trim()
    if (!content) return
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) { toast.error("Failed to add task"); return }
    const created: TaskItem = await res.json()
    setTasks((prev) => [...prev, created])
    setNewContent("")
    inputRef.current?.focus()
  }

  async function toggleTask(id: string, done: boolean) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done } : t))
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, done: !done } : t))
      toast.error("Failed to update task")
    }
  }

  async function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    if (!res.ok) toast.error("Failed to delete task")
  }

  const pending = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          My Tasks
          {pending.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{pending.length} remaining</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3">
        {/* Pending tasks */}
        {pending.length > 0 && (
          <ul className="space-y-1">
            {pending.map((t) => (
              <li key={t.id} className="flex items-center gap-2 group/task">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggleTask(t.id, true)}
                  className="h-4 w-4 rounded border-gray-300 cursor-pointer shrink-0"
                />
                <span className="text-sm flex-1 min-w-0">{t.content}</span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="opacity-0 group-hover/task:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Completed tasks */}
        {done.length > 0 && (
          <ul className="space-y-1">
            {done.map((t) => (
              <li key={t.id} className="flex items-center gap-2 group/task">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => toggleTask(t.id, false)}
                  className="h-4 w-4 rounded border-gray-300 cursor-pointer shrink-0"
                />
                <span className="text-sm flex-1 min-w-0 line-through text-muted-foreground">{t.content}</span>
                <button
                  onClick={() => deleteTask(t.id)}
                  className="opacity-0 group-hover/task:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}

        {/* Add task */}
        {adding ? (
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="New task…"
              className="text-sm h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") addTask()
                if (e.key === "Escape") { setAdding(false); setNewContent("") }
              }}
              autoFocus
            />
            <Button size="sm" className="h-8 px-2" onClick={addTask} disabled={!newContent.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add task
          </button>
        )}
      </CardContent>
    </Card>
  )
}
