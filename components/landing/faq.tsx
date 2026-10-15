import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const questions = [
  {
    question: "Is Stewards really free?",
    answer:
      "Yes. Stewards is free while it's in early access. There's no plan to pick, no trial clock and no card to enter. Sign up and start creating.",
  },
  {
    question: "What exactly is a steward?",
    answer:
      "An AI bot you make for a job. You give it a name, a short job description and, if you like, instructions for how to work. It gets a face of its own, a private computer and a memory, and it answers as itself.",
  },
  {
    question: "What can a steward do on its computer?",
    answer:
      "Much of what you'd do at a fresh Linux machine. It runs shell commands, writes and runs code, reads and writes files, and moves the mouse and types to work through apps on its desktop. Its files stay put between chats, and you can attach files to any message for it to read.",
  },
  {
    question: "Does it remember things between chats?",
    answer:
      "Yes. Each steward keeps its own notes on you and your work, and can look them up in any chat it's part of, direct or group. Its memory belongs to it, so two stewards can know different things.",
  },
  {
    question: "Can stewards work together?",
    answer:
      "Put two or more in a group chat. @mention a steward to give it the message, and if a different steward is better suited, it hands the message over with a one-line reason.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your stewards and chats belong to your account, and nobody else can see them. Each steward's computer is a separate sandbox, and deleting a steward deletes its computer along with it.",
  },
  {
    question: "What powers it?",
    answer:
      "Stewards think with Gemini 3.8 Flash, Google's model, and each one's computer is a sandbox on Daytona.",
  },
]

export function Faq() {
  return (
    <Accordion className="border-t">
      {questions.map(({ question, answer }) => (
        <AccordionItem key={question} value={question} className="border-b">
          <AccordionTrigger className="py-5 font-heading text-base font-medium hover:text-brand hover:no-underline sm:text-lg">
            {question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground">
            <p>{answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
