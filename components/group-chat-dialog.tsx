"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import {
  createGroupChat,
  deleteGroupChat,
  updateGroupChat,
} from "@/actions/chats"
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
import { Checkbox } from "@/components/ui/checkbox"
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
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { insertGroupChatSchema } from "@/lib/db/schema"
import type { BotListItem } from "@/queries/bots"

type GroupChatFormInput = z.input<typeof insertGroupChatSchema>
type GroupChatFormOutput = z.output<typeof insertGroupChatSchema>
type EditableGroupChat = { id: string; name: string | null; botIds: string[] }

function defaultValues(chat?: EditableGroupChat): GroupChatFormInput {
  if (chat) {
    return { name: chat.name ?? "", botIds: chat.botIds }
  }
  return { name: "", botIds: [] }
}

function GroupChatDialog({
  chat,
  bots,
  trigger,
  open: openProp,
  onOpenChange,
}: {
  // Edits this group when given, otherwise creates a new one
  chat?: EditableGroupChat
  // The bots that can be picked as members
  bots: BotListItem[]
  trigger?: React.ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const router = useRouter()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = openProp ?? uncontrolledOpen
  const [isDeleting, setIsDeleting] = React.useState(false)
  const form = useForm<GroupChatFormInput, unknown, GroupChatFormOutput>({
    resolver: zodResolver(insertGroupChatSchema),
    defaultValues: defaultValues(chat),
  })

  function handleOpenChange(nextOpen: boolean) {
    setUncontrolledOpen(nextOpen)
    onOpenChange?.(nextOpen)
    // Also reset on open, so an edit starts from the group's latest saved values
    form.reset(defaultValues(chat))
  }

  async function handleDelete() {
    if (!chat) {
      return
    }
    setIsDeleting(true)
    // Succeeding redirects away from the deleted group, so this only returns
    // on failure
    const result = await deleteGroupChat(chat.id)
    setIsDeleting(false)
    toast.add({
      title: `Couldn't delete ${chat.name ?? "the group"}`,
      description: result.error,
      type: "error",
    })
  }

  async function onSubmit(values: GroupChatFormOutput) {
    const result = chat
      ? await updateGroupChat(chat.id, values)
      : await createGroupChat(values)
    if (!result.success) {
      toast.add({
        title: chat ? "Couldn't save changes" : "Couldn't create group",
        description: result.error,
        type: "error",
      })
      return
    }

    toast.add({
      title: chat
        ? `${result.chat.name} is updated`
        : `${result.chat.name} is ready`,
      type: "success",
    })
    handleOpenChange(false)
    if (!chat) {
      router.push(`/chats/${result.chat.id}`)
    }
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
            <DialogTitle>
              {chat ? `Edit ${chat.name ?? "group"}` : "New group chat"}
            </DialogTitle>
            <DialogDescription>
              {chat
                ? "Rename the group or change which bots are in it."
                : "Name the group and pick which bots are in it."}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="group-chat-name">Name</FieldLabel>
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    id="group-chat-name"
                    placeholder="Weekend plans"
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
              name="botIds"
              control={form.control}
              render={({ field, fieldState }) => (
                <FieldSet data-invalid={fieldState.invalid}>
                  <FieldLegend variant="label">Bots</FieldLegend>
                  <FieldGroup data-slot="checkbox-group" className="gap-3">
                    {bots.map((bot) => (
                      <Field key={bot.id} orientation="horizontal">
                        <Checkbox
                          id={`group-chat-bot-${bot.id}`}
                          name={field.name}
                          checked={field.value.includes(bot.id)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked
                                ? [...field.value, bot.id]
                                : field.value.filter((id) => id !== bot.id)
                            )
                          }
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldLabel
                          htmlFor={`group-chat-bot-${bot.id}`}
                          className="font-normal"
                        >
                          <ChatAvatar seed={bot.avatar} className="size-6" />
                          {bot.name}
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </FieldSet>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            {chat && (
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
                    <AlertDialogTitle>
                      Delete {chat.name ?? "this group"}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This deletes the group chat. Its bots stay. You
                      can&apos;t undo this.
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
              {chat ? "Save changes" : "Create group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { GroupChatDialog }
