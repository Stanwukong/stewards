"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShuffleIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { createBot } from "@/actions/bots"
import { ChatAvatar } from "@/components/chat-avatar"
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
import { insertBotSchema } from "@/lib/db/schema"

type BotFormInput = z.input<typeof insertBotSchema>
type BotFormOutput = z.output<typeof insertBotSchema>

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

function defaultValues(): BotFormInput {
  return { name: "", avatar: nanoid(), job: "", instructions: "" }
}

function BotDialog({ trigger }: { trigger: React.ReactElement }) {
  const [open, setOpen] = React.useState(false)
  const form = useForm<BotFormInput, unknown, BotFormOutput>({
    resolver: zodResolver(insertBotSchema),
    defaultValues: defaultValues(),
  })

  const avatar = useWatch({ control: form.control, name: "avatar" }) ?? ""
  const job = useWatch({ control: form.control, name: "job" })
  const selectedPreset = presets.find((preset) => preset.job === job)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      form.reset(defaultValues())
    }
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
    const result = await createBot(values)
    if (!result.success) {
      toast.add({
        title: "Couldn't create bot",
        description: result.error,
        type: "error",
      })
      return
    }

    toast.add({ title: `${result.bot.name} is ready`, type: "success" })
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>New bot</DialogTitle>
            <DialogDescription>
              Give it a face, a name, and a job to do.
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
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Spinner data-icon="inline-start" />
              )}
              Create bot
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BotDialog }
