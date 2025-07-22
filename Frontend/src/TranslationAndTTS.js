import { useState } from 'react'
import removeMarkdown from 'remove-markdown'

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  // Add more as needed
]

// Utility to strip markdown
export function stripMarkdown(text) {
  return removeMarkdown(text || '')
}

export function useTranslation() {
  const [translatedText, setTranslatedText] = useState("")
  const [translating, setTranslating] = useState(false)

  // Helper to split text into chunks (by paragraph)
  function splitText(text, maxLen = 500) {
    const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    const chunks = []
    let current = ''
    for (const para of paras) {
      if ((current + '\n\n' + para).length > maxLen && current) {
        chunks.push(current)
        current = para
      } else {
        current = current ? current + '\n\n' + para : para
      }
    }
    if (current) chunks.push(current)
    return chunks
  }

  async function translate(text, targetLang, sourceLang = 'en') {
    if (!text || targetLang === 'en') {
      setTranslatedText(text)
      return
    }
    setTranslating(true)
    setTranslatedText('')
    try {
      // 1. Strip markdown
      const plainText = stripMarkdown(text)
      // 2. Split into chunks
      const chunks = splitText(plainText)
      const results = []
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        try {
          const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: chunk,
              source: sourceLang,
              target: targetLang,
            }),
          })
          const data = await res.json()
          if (data.translatedText && !data.translatedText.startsWith('Translation failed')) {
            results.push(data.translatedText)
          } else {
            results.push(`[Chunk ${i+1} failed to translate]`)
          }
        } catch (err) {
          results.push(`[Chunk ${i+1} error: ${err.message}]`)
        }
      }
      setTranslatedText(results.join('\n\n'))
    } catch (err) {
      setTranslatedText('Translation failed.')
    } finally {
      setTranslating(false)
    }
  }

  function clearTranslation() {
    setTranslatedText("")
  }

  return { translatedText, translating, translate, clearTranslation }
}

export function useReadAloud() {
  function readAloud(text, lang) {
    const synth = window.speechSynthesis
    if (!synth) return
    if (!text) return
    const voices = synth.getVoices()
    const langVoice = voices.find(v => v.lang && v.lang.startsWith(lang))
    const utter = new window.SpeechSynthesisUtterance(text)
    if (langVoice) utter.voice = langVoice
    utter.lang = lang
    synth.cancel()
    synth.speak(utter)
  }
  return { readAloud }
} 