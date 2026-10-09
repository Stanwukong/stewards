<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Git

- Never create branches, worktrees, or commits automatically. Only do so when the user explicitly asks for that specific action in the current request
- Leave changes uncommited in the working tree on the current branch and let the user decide when and how to commit.

## Database

- Apply schema changes only with `npm run db:push` (`drizzle-kit push`). Never use migrations: do not run `drizzle-kit generate` or `drizzle-kit migrate`, and do not create migration files or a migrations folder.
- This is a development project. There is no backwards compatibility and the data is worthless. Prefer data loss: never backfill, migrate, or preserve existing rows, and never spend effort on keeping old data working. Every schema change means a clean slate.

## Forms

Reference implementation: `lib/db/schema.ts` (`insertBotSchema`), `actions/bots.ts` (`createBot`), `components/bot-dialog.tsx` (`BotDialog`).

### Schema

- Derive validation from the Drizzle table with `createInsertSchema` from `drizzle-zod`. Never hand-write a parallel zod object for a table.
- Export the insert schema from `lib/db/schema.ts` next to its table, named `insert<Entity>Schema`.
- Put user-facing rules and error messages in the refinements, e.g. `name: (s) => s.trim().min(1, "Give your bot a name.")`.
- `.omit()` every server-owned column (`id`, `userId`, `createdAt`, third-party IDs) so the client can never set them.
- One schema is shared by the form resolver and the server action. Don't fork it.

### Server actions

- Put actions in `actions/<entity>.ts` with `"use server"` at the top of the file.
- Type the input as `z.input<typeof insertXSchema>`, not `FormData`.
- Call `await auth.protect()` from `@clerk/nextjs/server` first, and take `userId` from it. Never accept `userId` from the client.
- Validate again with `safeParse` on the server. Server actions are public POST endpoints.
- Return a discriminated union `{ success: true; <entity> } | { success: false; error: string }` for expected failures (use `z.prettifyError` for validation). Don't throw for them.
- Normalise empty optional strings to `null` before inserting, insert with `.returning()`, then `revalidatePath(...)` the affected route.

### Form components

- Use `react-hook-form` with `zodResolver(insertXSchema)` and type it as `useForm<z.input<typeof s>, unknown, z.output<typeof s>>`.
- Use `useWatch({ control, name })` to read values during render. `form.watch` breaks React Compiler memoization (`react-hooks/incompatible-library`).
- Lay out fields with shadcn `FieldGroup` + `Field`. Render each control through `<Controller>` with `data-invalid={fieldState.invalid}` on `Field`, `aria-invalid` on the control, and `<FieldError errors={[fieldState.error]} />`.
- For nullable columns bound to inputs, pass `value={field.value ?? ""}`.
- Use `ToggleGroup` for preset or option chips, not looped `Button`s with manual active state.
- Show pending submits with `disabled={form.formState.isSubmitting}` plus `<Spinner data-icon="inline-start" />`. Button has no loading prop.
- Report results with `toast.add({ title, description, type })` from `@/components/ui/toast` (Base UI). Sonner isn't used here.

### Dialog forms

- Name the component `components/<entity>-dialog.tsx`. It's a client component that owns its `open` state.
- Accept a `trigger: React.ReactElement` prop and render `<DialogTrigger render={trigger} />`. This is Base UI's `render`, not `asChild`. The server page passes the button in, so the page stays a Server Component.
- Put the `<form>` inside `DialogContent`, wrapping `DialogHeader`, the fields and `DialogFooter`. Submit is a `type="submit"` button. Cancel is `<DialogClose render={<Button type="button" variant="outline" />}>`.
- Reset the form (`form.reset(defaultValues())`) whenever the dialog closes, and close it after a successful submit.
- Always include `DialogTitle` and `DialogDescription`.

### Dependencies

- `@hookform/resolvers` has an optional zod 3 peer that conflicts with zod 4. Install form packages with `npm install --legacy-peer-deps`.


## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.