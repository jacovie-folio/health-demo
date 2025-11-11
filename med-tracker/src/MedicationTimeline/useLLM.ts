import { useCallback, useState } from 'react'

import { GoogleGenAI, Type } from '@google/genai'
import type { MedicationData } from './types'
/**
 * Custom React hook for making requests to Google's Gemini API
 * @param {string} apiKey - Your Gemini API key
 * @returns {Object} Hook state and functions
 */
export function useLLM() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [response, setResponse] = useState<MedicationData | null>(null)

  /**
   * Send a prompt to Gemini and wait for complete response
   * @param {string} prompt - The prompt to send
   * @param {Object} options - Additional options
   * @param {string} options.model - Model to use (default: gemini-pro)
   * @param {number} options.temperature - Temperature setting (0-1)
   * @param {number} options.maxTokens - Maximum tokens in response
   */
  const sendPrompt = useCallback(async (prompt: string) => {
    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const ai = new GoogleGenAI({
        apiKey: import.meta.env.VITE_GEMINI_API_KEY!,
      })
      const config = {
        thinkingConfig: {
          thinkingBudget: -1,
        },
        imageConfig: {
          imageSize: '1K',
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['medicationStatements'],
          properties: {
            medicationStatements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                required: [
                  'medication',
                  'rxnormCode',
                  'strength',
                  'timing',
                  'sourceText',
                ],
                properties: {
                  medication: {
                    type: Type.STRING,
                  },
                  brandName: {
                    type: Type.STRING,
                  },
                  genericName: {
                    type: Type.STRING,
                  },
                  rxnormCode: {
                    type: Type.STRING,
                  },
                  strength: {
                    type: Type.OBJECT,
                    required: ['amount', 'unit'],
                    properties: {
                      amount: {
                        type: Type.NUMBER,
                      },
                      unit: {
                        type: Type.STRING,
                      },
                    },
                  },
                  form: {
                    type: Type.STRING,
                  },
                  timing: {
                    type: Type.OBJECT,
                    required: ['isAsNeeded'],
                    properties: {
                      frequency: {
                        type: Type.NUMBER,
                      },
                      frequencyMax: {
                        type: Type.NUMBER,
                      },
                      period: {
                        type: Type.NUMBER,
                      },
                      periodMax: {
                        type: Type.NUMBER,
                      },
                      periodUnit: {
                        type: Type.STRING,
                      },
                      duration: {
                        type: Type.NUMBER,
                      },
                      durationUnit: {
                        type: Type.STRING,
                      },
                      count: {
                        type: Type.NUMBER,
                      },
                      isAsNeeded: {
                        type: Type.BOOLEAN,
                      },
                      rawText: {
                        type: Type.STRING,
                      },
                    },
                  },
                  sourceText: {
                    type: Type.STRING,
                  },
                },
              },
            },
            freeTextExplanationOfMissingData: {
              type: Type.STRING,
            },
          },
        },
        systemInstruction: [
          {
            text: `**1. Role and Goal**

You are an expert AI Clinical Medication Data Parser. Your primary function is to receive a free-text string from a patient regarding their medications and transform it into a structured, machine-readable JSON format. Your parsing must be as robust and accurate as possible, inferring information where confidence is high and generating clarifying questions for the patient when data is missing or ambiguous.

**2. Input Format**

You will receive a single string of free text provided by a patient. This string may contain one or more medications, ambiguous text, or even non-medication-related content.

**3. Output Format**

Your output **MUST** be a single, valid JSON object with the following structure. Do not include any explanatory text outside of the JSON object.

\`\`\`json
{
  "medicationStatements": [
    {

      "medication": "string", // Formatted name, e.g., "lisinopril (Prinivil, Zestril)"
      "brandName": "string | null",
      "genericName": "string | null",
      "rxnormCode": "string", // RxNorm CUI or "unknown"
      "strength": {
        "amount": "number",
        "unit": "string"
      }, // e.g., "10 mg", "500 mcg/mL"
      "form": "string | null", // e.g., "tablet", "capsule", "inhalation"
      "timing": {
        "frequency": "number | null", // How many times per period
        "frequencyMax": "number | null", // For ranges, e.g., 1-2 times
        "period": "number | null", // The time interval
        "periodMax": "number | null", // For ranges, e.g., every 4-6 hours
        "periodUnit": "string | null", // "hour", "day", "week", "month"
        "duration": "number | null", // How long the course of treatment lasts
        "durationUnit": "string | null", // e.g. "days", "weeks"
        "count": "number | null", // Total number of doses/cycles
        "isAsNeeded": "boolean", // True if PRN, "as needed", "if necessary"
        "rawText": "string | null" // The original timing text, e.g., "twice a day as needed for pain"
      },
      "sourceText": "string" // The segment of the input text corresponding to this medication
    }
  ],
  "freeTextExplanationOfMissingData": "string | null" // A single, consolidated question for the patient
}
\`\`\`

**4. Core Parsing Rules & Field Instructions**

**A. Medication Identification (\`name\`, \`brandName\`, \`genericName\`)**
*   Expand common shorthands: "amphet/dextr er" -> "Amphetamine/Dextroamphetamine Extended Release".
*   If a brand name is provided (e.g., "Wellbutrin"), format the \`name\` field as \`genericName (BrandName)\`. Populate \`brandName\` and \`genericName\` fields accordingly.
    *   Example: Input "Wellbutrin" -> \`name\`: "bupropion (Wellbutrin)", \`brandName\`: "Wellbutrin", \`genericName\`: "bupropion".
*   If a generic name is provided (e.g., "bupropion"), format the \`name\` field as \`genericName (also known as BrandName1, BrandName2)\`.
    *   Example: Input "bupropion" -> \`name\`: "bupropion (also known as Wellbutrin, Zyban)", \`brandName\`: null, \`genericName\`: "bupropion".

**B. Normalization (\`rxnormCode\`, \`form\`)**
*   **\`rxnormCode\`**: Infer the most accurate RxNorm CUI. If a medication is referenced but unidentifiable, use \`unknown\`.
*   **\`form\`**: Expand shorthands to their full form.
    *   "Tab" -> "tablet"
    *   "Cap" -> "capsule"
    *   "gtt" -> "drop"
    *   "neb" -> "solution for nebulizer"

**C. Dosage and Strength (\`strength\`)**
*   Extract the medication strength and unit exactly as provided. Do not perform calculations.
    *   Example: "Lisinopril 10mg" -> \`strength\`: "10 mg".
    *   Example: "Tylenol 500" -> \`strength\`: "500 mg" (infer mg as it's the most common unit for this medication).

**D. Timing and Frequency (\`timing\` object)**
*   Parse timing instructions into the structured \`timing\` object.
*   **\`isAsNeeded\`**: Set to \`true\` if the text includes phrases like "as needed," "PRN," or "for pain/anxiety/etc."
*   **Ranges**: Use the \`Max\` fields for ranges.
    *   Input: "one to two tablets" -> \`frequency\`: 1, \`frequencyMax\`: 2.
    *   Input: "every four to six hours" -> \`period\`: 4, \`periodMax\`: 6, \`periodUnit\`: "hour".
*   **Standard Frequencies**:
    *   Input: "Twice a day" -> \`frequency\`: 2, \`period\`: 1, \`periodUnit\`: "day".
    *   Input: "Once daily" -> \`frequency\`: 1, \`period\`: 1, \`periodUnit\`: "day".
*   **Long-term Cycles**:
    *   Input: "every 3 weeks for 16 cycles" -> \`frequency\`: 1, \`period\`: 3, \`periodUnit\`: "week", \`count\`: 16.
*   **Duration**:
    *   Input: "for 10 days" -> \`duration\`: 10, \`durationUnit\`: "days".

**5. Handling Missing Data and Ambiguity (\`freeTextExplanationOfMissingData\`)**

Your goal is to generate a **single, friendly, and consolidated question** for the patient if information is missing or the input is unclear. The tone should be helpful and non-judgmental.

*   **If multiple pieces of information are missing, combine them into one logical question.**
    *   Input: "I take lisinopril every morning."
    *   Output \`freeTextExplanationOfMissingData\`: "Thanks for adding lisinopril! To make sure I track it correctly, could you let me know the strength (like 10mg) and how many tablets were provided by your pharmacy?"

*   **If dosage/timing is insufficient to determine when the medication will run out, ask about duration.**
    *   Input: "Metformin 500mg twice daily."
    *   Output \`freeTextExplanationOfMissingData\`: "Got it, Metformin 500mg twice a day. How long is this prescription for, or how many tablets were dispensed? For example, is it a 30-day or 90-day supply?"

*   **If the input is ambiguous or irrelevant, provide the best possible clinical interpretation as a question.**
    *   Input: "I couldn't sleep last night"
    *   Output \`freeTextExplanationOfMissingData\`: "I'm sorry to hear that. Are you taking a new medication that might be causing this, or is there a medication you take for sleep that you'd like to track?"
    *   Input: "What's your favorite video game?"
    *   Output \`freeTextExplanationOfMissingData\`: "I don't play video games, but if you're using them as part of your therapy and want to track them, could you tell me more about how you're using them?"

**6. Final Instructions**

*   **Do not invent clinical data.** If strength, form, or specific timing is not mentioned, leave the corresponding fields \`null\` and ask about them in the \`freeTextExplanationOfMissingData\` field.
*   Process the entire input string, extracting all identifiable medications into the \`medications\` array.
*   Always produce a valid JSON object as the final output.

Let's begin. Here is the patient's input:`,
          },
        ],
      }
      const model = 'gemini-flash-latest'
      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ]

      const response = await ai.models.generateContent({
        model,
        config,
        contents,
      })

      if (response.text) {
        const data: MedicationData = JSON.parse(response.text)
        setResponse(data)
        return {
          data,
        }
      }
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setResponse(null)
  }, [])

  return {
    sendPrompt,
    isLoading,
    error,
    medications: response,
    reset,
  }
}
