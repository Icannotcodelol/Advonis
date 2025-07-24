'use client'

import { useState, useCallback } from 'react'
import { Upload, AlertCircle } from 'lucide-react'

interface UploadAreaProps {
  onContractUpload: (file: File) => void
}

export function UploadArea({ onContractUpload }: UploadAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    const allowedExtensions = ['pdf', 'docx']
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext || '')) {
      return 'Please upload a PDF or Word (.docx) file'
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB'
    }
    return null
  }

  const handleFileProcessing = async (file: File) => {
    setIsProcessing(true)
    setError(null)
    try {
      onContractUpload(file)
    } catch (err) {
      console.error('File processing error:', err)
      setError('Failed to process file. Please ensure it is a readable PDF or Word document.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const file = files[0]
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    await handleFileProcessing(file)
  }, [])

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const file = files[0]
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }
    await handleFileProcessing(file)
  }

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onClick={() => document.getElementById('file-input')?.click()}
      style={{ minHeight: 180 }}
    >
      <input
        id="file-input"
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileInput}
      />
      <Upload className="w-10 h-10 text-gray-400 mb-2" />
      <span className="text-gray-700 font-medium">Drag & drop a PDF or Word (.docx) file here, or click to select</span>
      {isProcessing && <span className="text-blue-500 mt-2">Processing...</span>}
      {error && (
        <div className="flex items-center text-red-500 mt-2">
          <AlertCircle className="w-5 h-5 mr-1" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
} 