import "./App.css"
import { useState, useEffect } from "react"
import { GoogleGenerativeAI } from "@google/generative-ai"

// Get your Gemini API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(API_KEY)

// Helper: Convert file to base64 for Gemini API
async function fileToBase64Part(file) {
  return {
    inlineData: {
      data: await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result.split(",")[1])
        reader.readAsDataURL(file)
      }),
      mimeType: file.type,
    },
  }
}

function App() {
  // State variables
  const [file, setFile] = useState(null)
  const [summary, setSummary] = useState(
    "Your summarized medical report will appear here."
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [count, setCount] = useState(() => {
    // Load count from localStorage
    const saved = localStorage.getItem("summarizedReportsCount")
    return saved ? parseInt(saved, 10) : 0
  })

  // Save count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("summarizedReportsCount", count.toString())
  }, [count])

  // When user selects a file
  function onFileChange(e) {
    setFile(e.target.files[0])
  }

  // When user clicks Summarize
  async function onSummarize() {
    if (!file) {
      setError("Please select a file to summarize.")
      return
    }
    if (!file.type.startsWith("image/")) {
      setError(
        "Only image files are supported for now. PDF summarization will be added later."
      )
      return
    }
    setLoading(true)
    setError(null)
    setSummary("Summarizing...")
    try {
      // Prepare Gemini model and input
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
      const parts = [
        await fileToBase64Part(file),
        {
          text: "Analyze the provided image. Summarize it only if it is a medical report. If it is not a medical report, reply: 'This is not a medical report. Please provide a medical report.' If it is a medical report, summarize it in 50-100 words highlighting every important detail.",
        },
      ]
      // Get summary from Gemini
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
      })
      const response = await result.response
      let text = response.text()
      // Remove prefix if present
      const nonMedicalPrefix = "NON_MEDICAL_DOC:"
      if (text.startsWith(nonMedicalPrefix)) {
        text = text.substring(nonMedicalPrefix.length).trim()
      }
      setSummary(text)
      // Only increment count if it was a valid medical report
      if (
        !text.includes(
          "This is not a medical report. Please provide a medical report."
        )
      ) {
        setCount((prev) => prev + 1)
      }
    } catch (err) {
      setError(
        "Error summarizing document. Please ensure it's a clear image of a medical report."
      )
      setSummary("Your summarized medical report will appear here.")
    } finally {
      setLoading(false)
    }
  }

  // Format summary: make **bold** text bold
  function formatSummary(text) {
    if (!text) return ""
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full flex flex-col md:flex-row bg-white p-8 rounded-xl shadow-lg">
        {/* Left: Upload Section */}
        <div className="md:w-1/2 md:pr-4 flex flex-col space-y-6">
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            Upload Medical Report
          </h2>
          <p className="text-center text-sm text-gray-600">
            Upload an image or PDF to get a summary.
          </p>
          <div className="rounded-md shadow-sm">
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              accept=".pdf,image/*"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={onFileChange}
            />
          </div>
          <button
            type="button"
            onClick={onSummarize}
            disabled={loading}
            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
              loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {loading ? "Summarizing..." : "Summarize"}
          </button>
          {error && <p className="mt-2 text-center text-red-600">{error}</p>}
          {/* Show how many reports summarized */}
          <div className="flex-grow flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md border border-gray-200 text-gray-700">
            <p className="text-sm mb-2">Reports Summarized:</p>
            <p className="text-4xl font-bold text-blue-600">{count}</p>
          </div>
        </div>
        {/* Divider */}
        <div className="md:w-px bg-gray-300 mx-4 my-8 md:my-0"></div>
        {/* Right: Summary Section */}
        <div className="md:w-1/2 md:pl-4 flex flex-col space-y-6">
          <h2 className="text-center text-2xl font-extrabold text-gray-900">
            Summary
          </h2>
          <h3 className="text-lg font-medium text-gray-900">Summary:</h3>
          <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 whitespace-pre-wrap h-[400px] overflow-y-auto shadow-inner">
            <p dangerouslySetInnerHTML={{ __html: formatSummary(summary) }}></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
