"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { createBot, deleteBot, updateBot } from "@/actions/bots"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { insertBotSchema, type Bot } from "@/lib/db/schema"

type BotFormInput = z.input<typeof insertBotSchema>
type BotFormOutput = z.output<typeof insertBotSchema>
type EditableBot = Pick<Bot, "id" | "name" | "avatar" | "job" | "instructions">

const presets = [
  {
    job: "Research assistant",
    instructions:
      "Answer briefly, cite sources, and ask before running anything destructive.",
  },
  {
    job: "Code reviewer",
    instructions:
      "Point out bugs first, then risky patterns. Suggest concrete fixes and keep nitpicks short.",
  },
  {
    job: "Writing editor",
    instructions:
      "Tighten wording, fix grammar, and keep the author's voice. Explain larger edits.",
  },
  {
    job: "Tutor",
    instructions:
      "Teach step by step, check understanding with questions, and avoid giving answers away too early.",
  },
]

function defaultValues(bot?: EditableBot): BotFormInput {
  if (bot) {
    return {
      name: bot.name,
      avatar: bot.avatar,
      job: bot.job,
      instructions: bot.instructions ?? "",
    }
  }
  return { name: "", avatar: nanoid(), job: "", instructions: "" }
}

function BotDialog({
  bot,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  // Edits this bot when given, otherwise creates a new one
  bot?: EditableBot
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen
  const [isDeleting, setIsDeleting] = React.useState(false)
  const form = useForm<BotFormInput, unknown, BotFormOutput>({
    resolver: zodResolver(insertBotSchema),
    defaultValues: defaultValues(bot),
  })

  const avatar = useWatch({ control: form.control, name: "avatar" }) ?? ""
  const job = useWatch({ control: form.control, name: "job" })
  const selectedPreset = presets.find((preset) => preset.job === job)

  function handleOpenChange(nextOpen: boolean) {
    setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen)
    // Also reset on open, so an edit starts from the bot's latest saved values
    form.reset(defaultValues(bot))
  }

  async function handleDelete() {
    if (!bot) {
      return
    }
    setIsDeleting(true)
    // Succeeding redirects away from the deleted bot's chat, so this only
    // returns on failure
    const result = await deleteBot(bot.id)
    setIsDeleting(false)
    toast.add({
      title: `Couldn't delete ${bot.name}`,
      description: result.error,
      type: "error",
    })
  }

  function applyPreset(job: string) {
    const preset = presets.find((preset) => preset.job === job)
    if (!preset) {
      return
    }
    form.setValue("job", preset.job, { shouldValidate: true })
    form.setValue("instructions", preset.instructions, { shouldValidate: true })
  }

  async function onSubmit(values: BotFormOutput) {
    const result = bot
      ? await updateBot(bot.id, values)
      : await createBot(values)
    if (!result.success) {
      toast.add({
        title: bot ? "Couldn't save changes" : "Couldn't create bot",
        description: result.error,
        type: "error",
      })
      return
    }

    toast.add({
      title: bot
        ? `${result.bot.name} is updated`
        : `${result.bot.name} is ready`,
      type: "success",
    })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>{bot ? `Edit ${bot.name}` : "New bot"}</DialogTitle>
            <DialogDescription>
              {bot
                ? "Change its face, name, or how it does its job."
                : "Give it a face, a name, and a job to do."}
            </DialogDescription>
          </DialogHeader>

          <ToggleGroup
            aria-label="Start from a preset"
            variant="outline"
            className="flex-wrap"
            value={selectedPreset ? [selectedPreset.job] : []}
            onValueChange={(value) => applyPreset(value[0])}
          >
            {presets.map((preset) => (
              <ToggleGroupItem
                key={preset.job}
                value={preset.job}
                className="rounded-full"
              >
                {preset.job}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <FieldGroup>
            <Field orientation="horizontal">
              <ChatAvatar seed={avatar} className="size-12 rounded-none" />
              <FieldContent>
                <FieldTitle>Face</FieldTitle>
                <FieldDescription>
                  Shuffle until you find one you like.
                </FieldDescription>
              </FieldContent>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.setValue("avatar", nanoid())}
              >
                <ShuffleIcon data-icon="inline-start" />
                Shuffle
              </Button>
            </Field>

            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="bot-name"
                    placeholder="Ada"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="job"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-job">Job</FieldLabel>
                  <Input
                    {...field}
                    id="bot-job"
                    placeholder="Research assistant"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="instructions"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="bot-instructions">
                    How it should work
                  </FieldLabel>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    id="bot-instructions"
                    placeholder="Answer briefly, cite sources, and ask before running anything destructive."
                    className="min-h-24"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            {bot && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      className="sm:mr-auto"
                    />
                  }
                >
                  Delete
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes the bot and its chat. You can&apos;t undo
                      this.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={handleDelete}
                    >
                      {isDeleting && <Spinner data-icon="inline-start" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Spinner data-icon="inline-start" />
              )}
              {bot ? "Save changes" : "Create bot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
