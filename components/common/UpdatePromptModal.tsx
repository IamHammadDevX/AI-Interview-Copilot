'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getCurrentPrompt, handleSaveNewPrompt } from '@/libs/copilotPromptStore'
import type { DialogProps } from '@radix-ui/react-dialog'
import { useEffect, useRef, useState } from 'react'

export default function UpdatePromptModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: NonNullable<DialogProps['onOpenChange']>
}) {
  const initialPromptRef = useRef<string>('')
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (!open) return
    const currentPrompt = getCurrentPrompt() || 'You are a helpful AI assistant.'
    initialPromptRef.current = currentPrompt
    setPrompt(currentPrompt)
  }, [open])

  const close = () => {
    onOpenChange(false)
  }

  const handleCancel = () => {
    setPrompt(initialPromptRef.current)
    close()
  }

  const savePrompt = () => {
    const isSaved = handleSaveNewPrompt(prompt)
    if (!isSaved) return
    close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] px-6 py-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-white">Update system prompt</DialogTitle>
            <DialogDescription className="text-white/90">
              Quick edit your AI assistant&apos;s behavior.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 grid gap-2">
          <Label htmlFor="panel-prompt">System prompt</Label>
          <div className="relative">
            <Textarea
              id="panel-prompt"
              className="min-h-[280px] font-mono"
              rows={12}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your system prompt here..."
            />
            <div className="absolute bottom-3 right-3 text-xs text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">
              {prompt.length} characters
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: include your target role, years of experience, and key skills.
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Close
          </Button>
          <Button type="button" onClick={savePrompt}>
            Update prompt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
