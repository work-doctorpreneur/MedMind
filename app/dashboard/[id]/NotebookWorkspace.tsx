"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Brain,
    Upload,
    FileText,
    Trash2,
    Send,
    Mic,
    Map,
    FileBarChart,
    GraduationCap,
    HelpCircle,
    Image,
    ChevronLeft,
    Moon,
    Sun,
    Clock,
    Sparkles,
    Volume2,
    Loader2,
    X,
    File
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

interface Document {
    id: string
    filename: string
    created_at: string
    metadata?: {
        size?: number
        type?: string
    }
}

interface Message {
    role: "user" | "assistant"
    content: string
}

const studioActions = [
    { id: "audio", icon: Volume2, label: "Audio Overview", description: "Generate a podcast-style summary" },
    { id: "mindmap", icon: Map, label: "Mind Map", description: "Visual knowledge graph" },
    { id: "report", icon: FileBarChart, label: "Reports", description: "Generate clinical reports" },
    { id: "flashcards", icon: GraduationCap, label: "Flashcards", description: "Study key concepts" },
    { id: "quiz", icon: HelpCircle, label: "Quiz", description: "Test your knowledge" },
    { id: "infographic", icon: Image, label: "Infographic", description: "Visual summaries" },
]

interface NotebookWorkspaceProps {
    params: { id: string }
}

export default function NotebookWorkspace({ params }: NotebookWorkspaceProps) {
    const [darkMode, setDarkMode] = useState(false)
    const [message, setMessage] = useState("")
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hello! Upload some documents and I'll help you analyze them. Ask me anything about the content."
        }
    ])
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatingType, setGeneratingType] = useState<string | null>(null)
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [notebookName, setNotebookName] = useState("Loading...")
    const [userId, setUserId] = useState<string | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const initWorkspace = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/")
                return
            }
            setUserId(user.id)

            // Fetch notebook details
            const { data: notebook } = await supabase
                .from('notebooks')
                .select('name')
                .eq('id', params.id)
                .eq('user_id', user.id)
                .single()

            if (notebook) {
                setNotebookName(notebook.name)
            } else {
                router.push("/dashboard")
                return
            }

            // Fetch documents for this notebook
            const { data: docs } = await supabase
                .from('documents')
                .select('id, filename, created_at, metadata')
                .eq('notebook_id', params.id)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (docs) {
                setDocuments(docs)
            }
            setIsLoading(false)
        }
        initWorkspace()
    }, [supabase, params.id, router])

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
        document.documentElement.classList.toggle("dark")
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0 || !userId) return

        setIsUploading(true)

        for (const file of Array.from(files)) {
            const filePath = `${userId}/${params.id}/${Date.now()}_${file.name}`

            // Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                continue
            }

            // Save metadata to documents table
            const { data: docData, error: dbError } = await supabase
                .from('documents')
                .insert({
                    notebook_id: params.id,
                    user_id: userId,
                    filename: file.name,
                    metadata: {
                        size: file.size,
                        type: file.type,
                        path: filePath
                    }
                })
                .select()
                .single()

            if (!dbError && docData) {
                setDocuments(prev => [docData, ...prev])
            }
        }

        setIsUploading(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDeleteDocument = async (docId: string, metadata?: { path?: string }) => {
        // Delete from storage if path exists
        if (metadata?.path) {
            await supabase.storage.from('documents').remove([metadata.path])
        }

        // Delete from database
        await supabase.from('documents').delete().eq('id', docId)
        setDocuments(prev => prev.filter(d => d.id !== docId))
    }

    const handleSendMessage = async () => {
        if (!message.trim()) return

        const userMessage = message.trim()
        setMessage("")
        setMessages(prev => [...prev, { role: "user", content: userMessage }])

        // TODO: Integrate with Gemini API
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "I'm currently in demo mode. Once the backend API is connected, I'll be able to analyze your documents and provide intelligent responses with citations."
            }])
        }, 1000)
    }

    const handleStudioAction = (actionId: string) => {
        setGeneratingType(actionId)
        setIsGenerating(true)
        setTimeout(() => {
            setIsGenerating(false)
            setGeneratingType(null)
        }, 3000)
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return ''
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
                <div className="max-w-full mx-auto px-4">
                    <div className="flex items-center justify-between h-14">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard">
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <ChevronLeft className="w-5 h-5" />
                                </Button>
                            </Link>
                            <div className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-primary" />
                                <span className="font-semibold text-foreground">{notebookName}</span>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleDarkMode}
                            className="rounded-full"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Main Content - 3 Column Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Column - Sources */}
                <div className="w-72 border-r bg-card/50 flex flex-col">
                    <div className="p-4 border-b">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-foreground">Sources</h2>
                            <span className="text-xs text-muted-foreground">{documents.length} files</span>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            multiple
                            accept=".pdf,.doc,.docx,.txt,.md"
                        />
                        <Button
                            variant="outline"
                            className="w-full gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            {isUploading ? "Uploading..." : "Upload Files"}
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <File className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No documents yet</p>
                                <p className="text-xs">Upload files to get started</p>
                            </div>
                        ) : (
                            documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="group p-3 rounded-xl bg-background hover:bg-accent transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <FileText className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate" title={doc.filename}>{doc.filename}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <span>{formatDate(doc.created_at)}</span>
                                                {doc.metadata?.size && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatFileSize(doc.metadata.size)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteDocument(doc.id, doc.metadata as { path?: string })}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Center Column - Chat */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3'
                                        : 'bg-card border rounded-2xl rounded-bl-md px-5 py-4'
                                    }`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-lg">
                                                <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-xs font-medium text-muted-foreground">MedMind AI</span>
                                        </div>
                                    )}
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t bg-background/50">
                        <div className="flex items-center gap-2 max-w-3xl mx-auto">
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Ask anything about your documents..."
                                    className="pr-12 h-12 rounded-xl"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2"
                                >
                                    <Mic className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button
                                variant="gradient"
                                size="icon"
                                className="h-12 w-12 rounded-xl"
                                onClick={handleSendMessage}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Studio */}
                <div className="w-80 border-l bg-card/50 flex flex-col">
                    <div className="p-4 border-b">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            Studio
                        </h2>
                        <p className="text-xs text-muted-foreground mt-1">Generate learning artifacts from your documents</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 gap-3">
                            {studioActions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={() => handleStudioAction(action.id)}
                                    disabled={isGenerating || documents.length === 0}
                                    className="group p-4 rounded-xl border bg-background hover:bg-accent hover:border-primary/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3 group-hover:bg-primary/20 transition-colors">
                                        {isGenerating && generatingType === action.id ? (
                                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                        ) : (
                                            <action.icon className="w-5 h-5 text-primary" />
                                        )}
                                    </div>
                                    <h3 className="font-medium text-sm mb-1">{action.label}</h3>
                                    <p className="text-xs text-muted-foreground">{action.description}</p>
                                </button>
                            ))}
                        </div>

                        {documents.length === 0 && (
                            <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-dashed">
                                <p className="text-sm text-muted-foreground text-center">
                                    Upload documents to unlock Studio features
                                </p>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                    <div>
                                        <p className="text-sm font-medium">Generating {studioActions.find(a => a.id === generatingType)?.label}...</p>
                                        <p className="text-xs text-muted-foreground">This may take a minute</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
