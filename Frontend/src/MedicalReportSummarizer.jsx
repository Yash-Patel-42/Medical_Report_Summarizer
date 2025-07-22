import "./App.css"
import { useState, useEffect } from "react"
import { extractTextFromFile } from "./OCR"
import { summarizeMedicalReport } from "./summarizer"
import { evaluateSummary } from "./evaluator"
import ReactMarkdown from "react-markdown"
import {
  LANGUAGES,
  useTranslation,
  useReadAloud,
  stripMarkdown,
} from "./TranslationAndTTS"
import {
  FaHeartbeat,
  FaFileMedical,
  FaCloudUploadAlt,
  FaFileAlt,
  FaCheckCircle,
  FaLanguage,
} from "react-icons/fa"

const MODEL_OPTIONS = [
  { label: "HuggingFace", value: "huggingface" },
  { label: "Gemini", value: "gemini" },
]

function parseEvaluation(evaluationText) {
  // Regex to match: **Metric (desc)**: 4/5 - explanation
  const regex = /\*\*\s*(.*?)\s*\(.*?\)\*\*: (\d)\/5\s*-\s*([^\n]*)/g
  const results = []
  let match
  while ((match = regex.exec(evaluationText)) !== null) {
    results.push({
      metric: match[1],
      score: parseInt(match[2], 10),
      description: match[3].split(".")[0] + ".", // First sentence
    })
  }
  return results
}

function EvaluationDisplay({ evaluation }) {
  const metrics = parseEvaluation(evaluation)
  if (!metrics.length)
    return <span className="text-gray-400">Evaluation will appear here.</span>
  return (
    <div className="space-y-4">
      {metrics.map(({ metric, score, description }) => (
        <div key={metric} className="flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">{metric}</span>
            <span className="text-sm text-gray-600">{score}/5</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-3 bg-blue-500 transition-all duration-300"
              style={{ width: `${(score / 5) * 100}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500 mt-1">{description}</span>
        </div>
      ))}
    </div>
  )
}

async function tryEvaluate({ ocrText, summary, model, maxRetries = 3 }) {
  let attempt = 0
  let evalResult = ""
  while (attempt < maxRetries) {
    evalResult = await evaluateSummary({ ocrText, summary, model })
    if (
      evalResult &&
      evalResult.trim().length > 0
    ) {
      return evalResult
    }
    attempt++
  }
  return "Evaluation could not be generated. Please try again later."
}

async function onSummarize() {
  if (!file) {
    setError("Please select a file to summarize.")
    return
  }
  if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
    setError("Only image and PDF files are supported.")
    return
  }
  setLoading(true)
  setError(null)
  setSummary("Extracting text with OCR...")
  setEvaluation("")
  try {
    // Step 1: OCR
    const ocrText = await extractTextFromFile(file)
    if (!ocrText || ocrText.trim().length < 10) {
      setSummary("OCR failed or text too short. Please upload a clearer document.")
      setEvaluation("Evaluation could not be generated due to insufficient text.")
      setLoading(false)
      return
    }
    setSummary("Summarizing...")
    // Step 2: Summarization
    const text = await summarizeMedicalReport({ file, ocrText, model })
    setSummary(text)
    // Step 3: Evaluation (always attempt, even if summary is short)
    setEvaluation("Evaluating summary...")
    const evalResult = await tryEvaluate({ ocrText, summary: text, model })
    setEvaluation(evalResult)
    // Step 4: Count
    if (
      !text.includes(
        "This is not a medical report. Please provide a medical report."
      )
    ) {
      setCount((prev) => prev + 1)
    }
  } catch (err) {
    setError(
      err.message ||
        "Error processing document. Please ensure it's a clear image or PDF of a medical report."
    )
    setSummary("Your summarized medical report will appear here.")
    setEvaluation("Evaluation could not be generated due to an error.")
  } finally {
    setLoading(false)
  }
}

// Spinner component
function Spinner({ className = "" }) {
  return (
    <svg
      className={`animate-spin h-6 w-6 text-blue-500 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

// Helper to truncate long file names
function getDisplayFileName(name) {
  if (!name) return ''
  if (name.length <= 28) return name
  return name.slice(0, 12) + '...' + name.slice(-10)
}

function MedicalReportSummarizer() {
  // State variables
  const [file, setFile] = useState(null)
  const [summary, setSummary] = useState(
    "Your summarized medical report will appear here."
  )
  const [evaluation, setEvaluation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [count, setCount] = useState(() => {
    // Load count from localStorage
    const saved = localStorage.getItem("summarizedReportsCount")
    return saved ? parseInt(saved, 10) : 0
  })
  const [model, setModel] = useState("gemini")
  const [selectedLang, setSelectedLang] = useState("en")
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState("summary")

  // Use translation and TTS hooks
  const { translatedText, translating, translate, clearTranslation } =
    useTranslation()
  const { readAloud } = useReadAloud()

  // Save count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("summarizedReportsCount", count.toString())
  }, [count])

  // Drag-and-drop handlers
  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
  }
  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0])
    }
  }

  // When user clicks Summarize
  async function onSummarize() {
    if (!file) {
      setError("Please select a file to summarize.")
      return
    }
    if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
      setError("Only image and PDF files are supported.")
      return
    }
    setLoading(true)
    setError(null)
    setSummary("Extracting text with OCR...")
    setEvaluation("")
    try {
      // Step 1: OCR
      const ocrText = await extractTextFromFile(file)
      if (!ocrText || ocrText.trim().length < 10) {
        setSummary("OCR failed or text too short. Please upload a clearer document.")
        setEvaluation("Evaluation could not be generated due to insufficient text.")
        setLoading(false)
        return
      }
      setSummary("Summarizing...")
      // Step 2: Summarization
      const text = await summarizeMedicalReport({ file, ocrText, model })
      setSummary(text)
      // Step 3: Evaluation (always attempt, even if summary is short)
      setEvaluation("Evaluating summary...")
      const evalResult = await tryEvaluate({ ocrText, summary: text, model })
      setEvaluation(evalResult)
      // Step 4: Count
      if (
        !text.includes(
          "This is not a medical report. Please provide a medical report."
        )
      ) {
        setCount((prev) => prev + 1)
      }
    } catch (err) {
      setError(
        err.message ||
          "Error processing document. Please ensure it's a clear image or PDF of a medical report."
      )
      setSummary("Your summarized medical report will appear here.")
      setEvaluation("Evaluation could not be generated due to an error.")
    } finally {
      setLoading(false)
    }
  }

  // Format summary: make **bold** text bold
  function formatSummary(text) {
    if (!text) return ""
    return text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  }

  // When language changes, clear translation
  function onLangChange(e) {
    setSelectedLang(e.target.value)
    clearTranslation()
  }

  // Translate summary using hook
  async function onTranslate() {
    await translate(summary, selectedLang)
  }

  // Read summary aloud using hook
  function onReadAloud() {
    readAloud(translatedText || summary, selectedLang)
  }

  // New file change handler
  function onFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur shadow-md flex items-center px-4 py-3 border-b border-blue-100">
        <FaHeartbeat
          className="text-blue-500 text-2xl mr-2"
          aria-label="Medical Icon"
        />
        <span className="text-xl font-bold text-blue-700 tracking-tight">
          MediReport Summarizer
        </span>
      </header>
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-8 px-2 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full flex flex-col md:flex-row bg-white p-8 rounded-xl shadow-lg mt-4">
          {/* Left: Upload Section */}
          <div className="md:w-1/2 md:pr-4 flex flex-col space-y-6">
            {/* Model Switcher */}
            <div className="flex flex-col items-center mb-2">
              <label
                htmlFor="model-switcher"
                className="text-sm font-medium text-gray-700 mb-1"
              >
                Summarization Model:
              </label>
              <select
                id="model-switcher"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm"
                disabled={loading}
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Upload Card */}
            <div
              className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 bg-blue-50 transition-all duration-200 ${
                dragActive ? "border-blue-400 bg-blue-100" : "border-blue-200"
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <FaFileMedical className="text-blue-400 text-4xl mb-2" />
              <p className="text-center text-base text-blue-700 font-semibold mb-1">
                Drag & drop your medical report here
              </p>
              <p className="text-center text-xs text-blue-500 mb-3">
                (PDF or image file)
              </p>
              <label
                htmlFor="file-upload"
                className="w-full flex flex-col items-center cursor-pointer"
              >
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={onFileChange}
                />
                <span className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow text-base font-medium transition-colors">
                  <FaCloudUploadAlt className="mr-2" />
                  {file ? (
                    <span title={file.name}>{getDisplayFileName(file.name)}</span>
                  ) : "Select File"}
                </span>
              </label>
              {file && (
                <span className="mt-2 text-xs text-green-600" title={file.name}>
                  File selected: {getDisplayFileName(file.name)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSummarize}
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2" /> Processing...
                </>
              ) : (
                "Summarize & Evaluate"
              )}
            </button>
            {error && (
              <p className="mt-2 text-center text-red-600">{error}</p>
            )}
            {/* Show how many reports summarized */}
            <div className="flex-grow flex flex-col items-center justify-center p-4 bg-gray-50 rounded-md border border-gray-200 text-gray-700">
              <p className="text-sm mb-2">Reports Summarized:</p>
              <p className="text-4xl font-bold text-blue-600">{count}</p>
            </div>
          </div>
          {/* Divider */}
          <div className="md:w-px bg-gray-300 mx-4 my-8 md:my-0"></div>
          {/* Right: Summary Section as Tabs */}
          <div className="md:w-1/2 md:pl-4 flex flex-col space-y-6">
            <div className="flex space-x-2 mb-4">
              <button
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === "summary"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-gray-100 border-transparent text-gray-500 hover:text-blue-600"
                }`}
                onClick={() => setActiveTab("summary")}
              >
                <FaFileAlt className="mr-1" /> Summary
              </button>
              <button
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === "evaluation"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-gray-100 border-transparent text-gray-500 hover:text-blue-600"
                }`}
                onClick={() => setActiveTab("evaluation")}
              >
                <FaCheckCircle className="mr-1" /> Evaluation
              </button>
              <button
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-t-lg font-semibold text-sm transition-colors border-b-2 ${
                  activeTab === "translation"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "bg-gray-100 border-transparent text-gray-500 hover:text-blue-600"
                }`}
                onClick={() => setActiveTab("translation")}
              >
                <FaLanguage className="mr-1" /> Translation
              </button>
            </div>
            {/* Tab Panels */}
            <div className="flex-1">
              {activeTab === "summary" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Summary:
                  </h3>
                  <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 whitespace-pre-wrap min-h-[180px] max-h-[400px] overflow-y-auto shadow-inner flex items-center justify-center">
                    {loading && summary.startsWith("Extracting") ? (
                      <div className="flex flex-col items-center w-full">
                        <Spinner className="mb-2" />
                        <span className="text-blue-500 text-sm">
                          Extracting text with OCR...
                        </span>
                      </div>
                    ) : loading && summary.startsWith("Summarizing") ? (
                      <div className="flex flex-col items-center w-full">
                        <Spinner className="mb-2" />
                        <span className="text-blue-500 text-sm">
                          Summarizing medical report...
                        </span>
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none w-full">
                        <ReactMarkdown>{summary}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "evaluation" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Evaluation:
                  </h3>
                  <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700 whitespace-pre-wrap h-[180px] overflow-y-auto shadow-inner flex items-center justify-center">
                    {loading && evaluation.startsWith("Evaluating") ? (
                      <div className="flex flex-col items-center w-full">
                        <Spinner className="mb-2" />
                        <span className="text-blue-500 text-sm">
                          Evaluating summary...
                        </span>
                      </div>
                    ) : (
                      <EvaluationDisplay evaluation={evaluation} />
                    )}
                  </div>
                </div>
              )}
              {activeTab === "translation" && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Translation:
                  </h3>
                  <div className="mb-2">
                    <label
                      htmlFor="lang-select"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Translate summary to:
                    </label>
                    <div className="flex items-center space-x-2">
                      <select
                        id="lang-select"
                        value={selectedLang}
                        onChange={onLangChange}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm"
                        disabled={loading || translating}
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={onTranslate}
                        disabled={loading || translating}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        {translating ? (
                          <>
                            <Spinner className="mr-2" />
                            Translating...
                          </>
                        ) : (
                          "Translate"
                        )}
                      </button>
                      <button
                        onClick={onReadAloud}
                        disabled={loading || translating}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        Read Aloud
                      </button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded border min-h-[60px] whitespace-pre-line flex items-center justify-center">
                    {selectedLang !== "en" ? (
                      translating ? (
                        <>
                          <Spinner className="mr-2" />
                          Translating...
                        </>
                      ) : (
                        translatedText || (
                          <span className="text-gray-400">
                            Translation will appear here.
                          </span>
                        )
                      )
                    ) : (
                      <span className="text-gray-400">
                        Select a language to translate.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="mt-auto py-4 text-center text-xs text-gray-400 bg-white/70 border-t border-blue-100">
        &copy; {new Date().getFullYear()} MediReport Summarizer &mdash; Made
        with <span className="text-red-400">♥</span> for healthcare
      </footer>
    </div>
  )
}

export default MedicalReportSummarizer
