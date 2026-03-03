"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import NewServiceForm from "@/components/admin/NewServiceForm"

interface Props {
  categories: { id: string; name: string; color: string }[]
  templates: { id: string; name: string }[]
  allSeries: { id: string; name: string }[]
}

export default function NewServiceDialog({ categories, templates, allSeries }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSuccess(ids: string[]) {
    setOpen(false)
    if (ids.length === 1) {
      router.push(`/admin/services/${ids[0]}`)
    } else {
      router.refresh()
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> New Service
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Service</DialogTitle>
          </DialogHeader>
          <NewServiceForm
            categories={categories}
            templates={templates}
            allSeries={allSeries}
            onSuccess={handleSuccess}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
