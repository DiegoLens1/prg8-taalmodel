import { AzureChatOpenAI } from "@langchain/openai"
import * as z from "zod"

// Zod schema voor structured output
const KookAssistent = z.object({
    message: z.string().describe("Het antwoord van de assistent aan de gebruiker"),
    recept: z.object({
        naam: z.string().describe("Naam van het gerecht, leeg string als er nog geen recept is"),
        personen: z.number().describe("Aantal personen"),
        bereidingstijd: z.string().describe("Geschatte bereidingstijd, leeg als onbekend"),
        stappen: z.array(z.string()).describe("Bereidingsstappen, lege array als er nog geen recept is"),
    }),
    boodschappenlijst: z.array(z.string()).describe("Lijst met benodigde producten inclusief hoeveelheid (bijv. '200g kipfilet'). Vul deze ALTIJD in zodra er een recept is. Lege array alleen als er nog geen recept besproken is."),
})

const baseModel = new AzureChatOpenAI({ temperature: 0.7 })
const model = baseModel.withStructuredOutput(KookAssistent, { includeRaw: true })

const userChats = new Map()

const systemPrompt = {
    role: "system",
    content: `Je bent "Mise en Place", een vriendelijke kook- en boodschappenassistent.
Je helpt gebruikers met:
1. Recepten bedenken op basis van ingrediënten die ze al hebben, of wat ze willen eten
2. Een boodschappenlijstje maken van wat ze nog nodig hebben

Gedraag je als een goede vriend die goed kan koken.
Stel altijd door: hoeveel personen, dieetwensen, hoeveel tijd hebben ze?
Je antwoordt altijd in het Nederlands.
Je voegt altijd de hoeveelheid van de ingrediënten toe in de boodschappenlijst.
Je geeft nooit medisch voedingsadvies, maar kan wel rekening houden met dieetwensen (vegetarisch, veganistisch, glutenvrij, lactosevrij, etc.).
Zet ingrediënten die de gebruiker al heeft NIET op de boodschappenlijst.
Zodra er een recept bekend is, vul je de boodschappenlijst ALTIJD in met alle benodigde ingrediënten die de gebruiker nog niet heeft.`,
}

export function getUserChat(userId) {
    if (!userChats.has(userId)) {
        userChats.set(userId, [systemPrompt])
    }
    return userChats.get(userId)
}

export async function callAssistant(userId, prompt) {
    const messages = getUserChat(userId)
    messages.push({ role: "user", content: prompt })
    const { raw, parsed } = await model.invoke(messages)
    messages.push({ role: "assistant", content: JSON.stringify(parsed) })
    console.log("AI response:", parsed)
    return { ...parsed, tokens: raw.usage_metadata }
}
