// "@Name" mentions of a chat's bots in message text

export type Mentionable = { id: string; name: string }

export type Mention<T extends Mentionable> = {
  bot: T
  index: number
  length: number
}

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// An "@" at the start or after whitespace, followed by what's typed so far,
// right before the caret
export const MENTION_QUERY = /(?:^|\s)@([^\s@]*)$/

// Every mention of the bots in the text, in order. Longer names are tried
// first, so "@Ada Lovelace" isn't read as "@Ada". When two bots share a name,
// the preferred one wins.
export function findMentions<T extends Mentionable>(
  text: string,
  bots: T[],
  preferred?: string
): Mention<T>[] {
  const names = [...new Set(bots.map((bot) => bot.name))].sort(
    (a, b) => b.length - a.length
  )
  if (names.length === 0) return []

  const pattern = new RegExp(
    `(?<=^|\\s)@(${names.map(escape).join("|")})(?![\\p{L}\\p{N}_])`,
    "gu"
  )

  return [...text.matchAll(pattern)].map((match) => {
    const named = bots.filter((bot) => bot.name === match[1])
    return {
      bot: named.find((bot) => bot.id === preferred) ?? named[0],
      index: match.index,
      length: match[0].length,
    }
  })
}
