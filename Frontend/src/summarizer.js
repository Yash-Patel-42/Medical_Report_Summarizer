import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

// Helper: Convert file to base64 for Gemini API
async function fileToBase64Part(file) {
  return {
    inlineData: {
      data: await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(file)
      }),
      mimeType: file.type,
    },
  }
}

/**
 * Summarizes a medical report using the selected model.
 * @param {Object} params
 * @param {File} params.file - The uploaded file (image or PDF)
 * @param {string} [params.ocrText] - The OCR-extracted text (required)
 * @param {string} params.model - The selected model ('huggingface' or 'gemini')
 * @returns {Promise<string>} - The summary
 */
export async function summarizeMedicalReport({ file, ocrText, model }) {
  if (!ocrText) throw new Error('OCR text is required for summarization')
  if (model === 'huggingface') {
    const endpoint = '/api/summarize'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: ocrText }),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error)
    return data.summary || data[0]?.summary_text || 'No summary generated.'
  } else if (model === 'gemini') {
    if (!genAI) throw new Error('Gemini API key not set')
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const prompt = `You are a medical report summarizer. Given the following medical report, do the following in markdown format:\n\n1. At the top, state the overall criticality of the report (e.g., **Critical**, **Normal**, **Minimal**) in bold and as a heading.\n2. Provide a concise summary with key findings, using headings and bold for important terms.\n3. If possible, add a section called **Home Remedies & Tips** with actionable advice or lifestyle tips the user can follow, as bullet points.\n4. Use markdown formatting for all sections.\n\nMedical Report:\n${ocrText}`
    const parts = [
      await fileToBase64Part(file),
      { text: prompt },
    ]
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts }],
    })
    const response = await result.response
    let text = response.text()
    // Remove prefix if present
    const nonMedicalPrefix = 'NON_MEDICAL_DOC:'
    if (text.startsWith(nonMedicalPrefix)) {
      text = text.substring(nonMedicalPrefix.length).trim()
    }
    return text
  } else {
    throw new Error('Unknown model selected')
  }
}

// Note: For future multimodal support, you may need to use a custom backend or a model that accepts both image and text as input. 