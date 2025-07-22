import { GoogleGenerativeAI } from "@google/generative-ai"

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null
const endpoint = "/api/evaluate"

/**
 * Evaluates a summary given the original OCR text using the selected model.
 * @param {Object} params
 * @param {string} params.ocrText - The OCR-extracted text
 * @param {string} params.summary - The generated summary
 * @param {string} params.model - The selected model ('huggingface' or 'gemini')
 * @returns {Promise<string>} - The evaluation result
 */
export async function evaluateSummary({ ocrText, summary, model }) {
  const prompt = `Given the following original text and its summary, rate the summary for:\n- Judgment (is it a good summary?)\n- Specificity (does it cover specific details?)\n- Coverage (does it cover all important points?)\n- Accuracy (is it factually correct?)\nProvide a score (1-5) and a brief explanation for each.\n\nOriginal: ${ocrText}\nSummary: ${summary}`

  try {
    if (model === 'huggingface') {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: prompt }),
      })
      const data = await response.json()
      if (data.error) return `Evaluation failed: ${data.error}`
      return data[0]?.generated_text || 'No evaluation generated.'
    } else if (model === 'gemini') {
      if (!genAI) return 'Evaluation failed: Gemini API key not set'
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await geminiModel.generateContent(prompt)
      const response = await result.response
      return response.text() || 'No evaluation generated.'
    } else {
      return 'Evaluation failed: Unknown model selected'
    }
  } catch (err) {
    return `Evaluation failed: ${err.message}`
  }
}