# Medical Report Summarizer

A simple web app to upload medical report images or PDFs, extract text using OCR, generate a summary, and evaluate the summary for quality.

## How to Install

1. Clone this repository:
   ```sh
   git clone <repo-url>
   cd Medical_Report_Summarizer
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the root directory and add your HuggingFace API token:
   ```env
   VITE_HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## How to Run

Start the development server:
```sh
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## What We Use

- **OCR (Optical Character Recognition):**
  - [Tesseract.js](https://github.com/naptha/tesseract.js) (in-browser OCR for images and PDFs)
- **Summarization:**
  - [HuggingFace Inference API](https://huggingface.co/inference-api) with [facebook/bart-large-cnn](https://huggingface.co/facebook/bart-large-cnn)
- **Evaluation:**
  - [HuggingFace Inference API](https://huggingface.co/inference-api) with [meta-llama/Meta-Llama-3-8B-Instruct](https://huggingface.co/meta-llama/Meta-Llama-3-8B-Instruct)

---

**Enjoy summarizing and evaluating your medical reports!**
