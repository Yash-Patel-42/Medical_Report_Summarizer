import { FaHeartbeat } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex flex-col items-center justify-center px-4">
      <header className="flex items-center space-x-2 mt-8 mb-4">
        <FaHeartbeat className="text-blue-500 text-3xl" aria-label="Medical Icon" />
        <span className="text-2xl font-bold text-blue-700 tracking-tight">MediReport Summarizer</span>
      </header>
      <main className="flex flex-col items-center max-w-xl w-full text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-800 mb-4 leading-tight">
          Instantly Summarize &amp; Understand Your Medical Reports
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Upload your medical report (PDF or image) and get a clear, AI-powered summary in seconds. Translate, listen, and evaluate—all in a secure, mobile-friendly interface.
        </p>
        <button
          onClick={() => navigate('/summarizer')}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg shadow transition-colors mb-4"
        >
          Try Now
        </button>
        <p className="text-xs text-gray-400 mt-2">No signup required. 100% free for patients and professionals.</p>
      </main>
      <footer className="mt-auto py-4 text-center text-xs text-gray-400 w-full">
        &copy; {new Date().getFullYear()} MediReport Summarizer &mdash; Empowering healthcare with AI
      </footer>
    </div>
  )
}

export default LandingPage 