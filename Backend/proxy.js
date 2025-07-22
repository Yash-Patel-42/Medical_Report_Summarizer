const express = require("express")
const fetch = require("node-fetch")
const cors = require("cors")
require("dotenv").config()

const app = express()
app.use(express.json())
app.use(cors()) // Allow all origins for local dev

// Proxy for summarization (chunked, very small model, robust error handling)
app.post("/api/summarize", async (req, res) => {
  try {
    const userText =
      req.body.inputs ||
      req.body.text ||
      req.body.q ||
      req.body.ocrText ||
      req.body.content ||
      req.body.data ||
      req.body.report ||
      req.body.input ||
      req.body.summary ||
      req.body.message ||
      req.body.prompt ||
      req.body
    const text = typeof userText === "string" ? userText : userText?.text || ""
    // Chunk the text into ~256 character chunks
    const chunkSize = 256
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize))
    }
    const summaries = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      try {
        const response = await fetch(
          "https://api-inference.huggingface.co/models/google-t5/t5-small",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.VITE_HF_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: `summarize: ${chunk}` }),
          }
        )
        const text = await response.text()
        // Check for HTML response (endpoint down or error)
        if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html')) {
          summaries.push(`[Chunk ${i + 1} failed: HuggingFace endpoint returned HTML (likely down or overloaded)]`)
          continue
        }
        let data
        try {
          data = JSON.parse(text)
        } catch (e) {
          summaries.push(`[Chunk ${i + 1} failed: Invalid JSON]`)
          continue
        }
        const summary = data[0]?.summary_text || data.summary || data.generated_text || '[No summary]'
        summaries.push(summary)
      } catch (err) {
        summaries.push(`[Chunk ${i + 1} error: ${err.message}]`)
      }
    }
    res.json({ summary: summaries.join('\n\n') })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Proxy for evaluation
app.post("/api/evaluate", async (req, res) => {
  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VITE_HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    )
    const data = await response.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Proxy for translation (HuggingFace Inference API)
app.post("/api/translate", async (req, res) => {
  try {
    const { q, source, target } = req.body
    const model = `Helsinki-NLP/opus-mt-${source}-${target}`
    console.log("Translating:", { q, source, target, model })
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VITE_HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inputs: q }),
      }
    )
    const text = await response.text()
    console.log("HF translation response:", text)
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error("JSON parse error:", e, text)
      return res
        .status(500)
        .json({ error: "Invalid JSON from HuggingFace", details: text })
    }
    res.json({
      translatedText: data[0]?.translation_text || "Translation failed.",
    })
  } catch (err) {
    console.error("Translation proxy error:", err)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`Proxy running on http://localhost:${PORT}`))
