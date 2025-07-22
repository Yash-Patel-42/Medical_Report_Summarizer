import Tesseract from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'

/**
 * Extracts text from an image or PDF file using OCR.
 * @param {File} file - The file to extract text from (image or PDF)
 * @returns {Promise<string>} - The extracted text
 */
export async function extractTextFromFile(file) {
  if (file.type.startsWith('image/')) {
    // Use Tesseract.js for image OCR
    const { data: { text } } = await Tesseract.recognize(file, 'eng')
    return text
  } else if (file.type === 'application/pdf') {
    // Use pdfjs-dist to render each page as an image, then OCR
    const pdfData = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise
    let fullText = ''
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2 })
      // Create a canvas to render the page
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: context, viewport }).promise
      // Convert canvas to blob for Tesseract
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const { data: { text } } = await Tesseract.recognize(blob, 'eng')
      fullText += `\n--- Page ${pageNum} ---\n` + text
    }
    return fullText
  } else {
    throw new Error('Unsupported file type for OCR')
  }
} 