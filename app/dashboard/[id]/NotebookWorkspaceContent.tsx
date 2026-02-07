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
    ChevronRight,
    Moon,
    Sun,
    Sparkles,
    Volume2,
    Loader2,
    File,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Tag,
    X,
    RotateCcw,
    ArrowLeft,
    ArrowRight,
    ThumbsUp,
    ThumbsDown,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    Copy,
    Printer,
    PenTool,
    Zap,
    Flame,
    MessageSquareQuote
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import * as pdfjsLib from 'pdfjs-dist'
import ReactFlow, {
    Node,
    Edge,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Position
} from 'reactflow'
import 'reactflow/dist/style.css'

// Set up PDF.js worker
if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
}

// Helper to extract text from PDF
async function extractTextFromPDF(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            const pageText = content.items.map((item: any) => item.str).join(' ')
            fullText += pageText + '\n'
        }

        return fullText.trim()
    } catch (error) {
        console.error('PDF extraction error:', error)
        return ''
    }
}

interface Document {
    id: string
    filename: string
    created_at: string
    metadata?: {
        size?: number
        type?: string
        path?: string
    }
}

interface Citation {
    chunk_id: string
    document_id: string
    filename: string
    excerpt: string
}

interface Message {
    id?: string
    role: "user" | "assistant"
    content: string
    citations?: Citation[]
}

interface NotebookSummary {
    title: string
    summaries: { docName: string; summary: string }[]
    tags: string[]
    sourceCount: number
}

interface Flashcard {
    id: number
    question: string
    answer: string
}

const studioActions = [
    { id: "audio", icon: Volume2, label: "Audio", description: "Generate audio content" },
    { id: "mindmap", icon: Map, label: "Mind Map", description: "Visual knowledge graph" },
    { id: "report", icon: FileBarChart, label: "Reports", description: "Generate structured reports" },
    { id: "flashcards", icon: GraduationCap, label: "Flashcards", description: "Study key concepts" },
    { id: "quiz", icon: HelpCircle, label: "Quiz", description: "Test your knowledge" },
    { id: "infographic", icon: Image, label: "Infographic", description: "Visual summaries" },
    { id: "faq", icon: MessageSquareQuote, label: "FAQ", description: "Questions and answers" },
]

const audioTypes = [
    { id: 'overview', label: 'Audio Overview', description: 'Podcast-style summary with host and expert', icon: Mic },
    { id: 'pixar_story', label: 'Pixar Story', description: 'Fun storytelling like a children\'s tale', icon: Sparkles },
]

const reportTypes = [
    { id: 'briefing', label: 'Briefing Doc', description: 'Executive summary with key points', icon: FileText },
    { id: 'study_guide', label: 'Study Guide', description: 'Comprehensive learning material', icon: GraduationCap },
    { id: 'blog_post', label: 'Blog Post', description: 'Engaging article format', icon: PenTool },
]

interface NotebookWorkspaceContentProps {
    notebookId: string
}

export default function NotebookWorkspaceContent({ notebookId }: NotebookWorkspaceContentProps) {
    const [darkMode, setDarkMode] = useState(() => {
        // Initialize from localStorage on client side
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('medmind-dark-mode')
            return saved === 'true'
        }
        return false
    })
    const [message, setMessage] = useState("")
    const [messages, setMessages] = useState<Message[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatingType, setGeneratingType] = useState<string | null>(null)
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isUploading, setIsUploading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [notebookName, setNotebookName] = useState("Loading...")
    const [userId, setUserId] = useState<string | null>(null)
    const [userRole, setUserRole] = useState<'admin' | 'doctor'>('doctor')
    const [expandedCitations, setExpandedCitations] = useState<Set<number>>(new Set())
    const [processingDocs, setProcessingDocs] = useState<Set<string>>(new Set())
    const [notebookSummary, setNotebookSummary] = useState<NotebookSummary | null>(null)

    // Flashcard state
    const [flashcards, setFlashcards] = useState<Flashcard[]>([])
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
    const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false)
    const [showFlashcardModal, setShowFlashcardModal] = useState(false)
    const [isLoadingFlashcards, setIsLoadingFlashcards] = useState(false)

    // Quiz State
    const [quizQuestions, setQuizQuestions] = useState<any[]>([])
    const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
    const [showQuizModal, setShowQuizModal] = useState(false)
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(false)
    const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null)
    const [isQuizAnswered, setIsQuizAnswered] = useState(false)
    const [quizScore, setQuizScore] = useState(0)
    const [showQuizDifficultySelector, setShowQuizDifficultySelector] = useState(false)
    const [quizDifficulty, setQuizDifficulty] = useState<string>('medium')

    // Mind Map State
    const [mindMapNodes, setMindMapNodes] = useState<Node[]>([])
    const [mindMapEdges, setMindMapEdges] = useState<Edge[]>([])
    const [showMindMapModal, setShowMindMapModal] = useState(false)
    const [isLoadingMindMap, setIsLoadingMindMap] = useState(false)

    // Report State
    const [reportContent, setReportContent] = useState<string>('')
    const [reportType, setReportType] = useState<string>('briefing')
    const [showReportModal, setShowReportModal] = useState(false)
    const [isLoadingReport, setIsLoadingReport] = useState(false)
    const [showReportTypeSelector, setShowReportTypeSelector] = useState(false)

    // Infographic State
    const [infographicImage, setInfographicImage] = useState<string>('')
    const [infographicTitle, setInfographicTitle] = useState<string>('')
    const [showInfographicModal, setShowInfographicModal] = useState(false)
    const [isLoadingInfographic, setIsLoadingInfographic] = useState(false)

    // Audio Overview State
    const [audioUrl, setAudioUrl] = useState<string>('')
    const [audioTitle, setAudioTitle] = useState<string>('')
    const [showAudioModal, setShowAudioModal] = useState(false)
    const [isLoadingAudio, setIsLoadingAudio] = useState(false)
    const [showAudioTypeSelector, setShowAudioTypeSelector] = useState(false)
    const [audioType, setAudioType] = useState<string>('overview')

    const fileInputRef = useRef<HTMLInputElement>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const supabase = createClient()

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        const initWorkspace = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/")
                return
            }
            setUserId(user.id)

            // Fetch user profile for role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            setUserRole(profile?.role || 'doctor')

            // Fetch notebook details (no user_id filter - all users can view)
            const { data: notebook } = await supabase
                .from('notebooks')
                .select('name')
                .eq('id', notebookId)
                .single()

            if (notebook) {
                setNotebookName(notebook.name)
            } else {
                router.push("/dashboard")
                return
            }

            // Fetch documents (all users can view - no user_id filter)
            const { data: docs } = await supabase
                .from('documents')
                .select('id, filename, created_at, metadata')
                .eq('notebook_id', notebookId)
                .order('created_at', { ascending: false })

            if (docs) {
                setDocuments(docs)
            }

            // Fetch notebook summary from embeddings for THIS notebook's documents only
            if (docs && docs.length > 0) {
                const docIds = docs.map(d => d.id)

                // Get ALL summaries from this notebook's embeddings (one per document)
                const { data: summaryData } = await supabase
                    .from('embeddings')
                    .select('summary, tags, document_id')
                    .in('document_id', docIds)
                    .not('summary', 'is', null)

                if (summaryData && summaryData.length > 0) {
                    // Create a lookup object for document names
                    const docIdToName: Record<string, string> = {}
                    docs.forEach(d => { docIdToName[d.id] = d.filename })

                    // Build array of document summaries
                    const documentSummaries = summaryData.map(s => ({
                        docName: docIdToName[s.document_id] || 'Document',
                        summary: s.summary
                    }))

                    // Collect all tags from all summaries
                    const allTags = new Set<string>()
                    summaryData.forEach(s => {
                        if (s.tags) {
                            s.tags.forEach((t: string) => allTags.add(t))
                        }
                    })

                    setNotebookSummary({
                        title: notebook.name,
                        summaries: documentSummaries,
                        tags: Array.from(allTags).slice(0, 8),
                        sourceCount: docs.length
                    })
                }
            }

            // Load chat history
            const { data: chatHistory } = await supabase
                .from('chat_messages')
                .select('id, role, content, citations')
                .eq('notebook_id', notebookId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })

            if (chatHistory && chatHistory.length > 0) {
                setMessages(chatHistory.map(m => ({
                    id: m.id,
                    role: m.role as "user" | "assistant",
                    content: m.content,
                    citations: m.citations
                })))
            }

            setIsLoading(false)
        }
        initWorkspace()
    }, [supabase, notebookId, router])

    // Load dark mode preference on mount
    useEffect(() => {
        const savedDarkMode = localStorage.getItem('medmind-dark-mode')
        if (savedDarkMode === 'true') {
            setDarkMode(true)
            document.documentElement.classList.add('dark')
        } else {
            setDarkMode(false)
            document.documentElement.classList.remove('dark')
        }
    }, [])

    const toggleDarkMode = () => {
        const newDarkMode = !darkMode
        setDarkMode(newDarkMode)
        localStorage.setItem('medmind-dark-mode', String(newDarkMode))
        if (newDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const saveMessage = async (msg: Message) => {
        if (!userId) return

        const { data } = await supabase
            .from('chat_messages')
            .insert({
                notebook_id: notebookId,
                user_id: userId,
                role: msg.role,
                content: msg.content,
                citations: msg.citations || null
            })
            .select('id')
            .single()

        return data?.id
    }

    const processDocument = async (docInfo: { id: string, filename: string, path: string, extracted_text?: string }) => {
        if (!userId) return

        setProcessingDocs(prev => new Set(prev).add(docInfo.id))

        try {
            const { data: result, error } = await supabase.functions.invoke('process-document', {
                body: {
                    document_id: docInfo.id,
                    user_id: userId,
                    notebook_id: notebookId,
                    file_path: docInfo.path,
                    filename: docInfo.filename,
                    extracted_text: docInfo.extracted_text || '',
                }
            })

            if (error) throw error
            console.log('Document processed:', result)

            // Refresh summary after processing
            if (result.success) {
                const { data: summaryData } = await supabase
                    .from('embeddings')
                    .select('summary, tags')
                    .eq('document_id', docInfo.id)
                    .not('summary', 'is', null)
                    .limit(1)

                if (summaryData && summaryData.length > 0) {
                    const newDocSummary = {
                        docName: docInfo.filename,
                        summary: summaryData[0].summary
                    }

                    setNotebookSummary(prev => {
                        const existingSummaries = prev?.summaries || []
                        const existingTags = prev?.tags || []
                        const newTags = summaryData[0].tags || []
                        const allTags = [...new Set([...existingTags, ...newTags])].slice(0, 8)

                        return {
                            title: prev?.title || notebookName,
                            summaries: [...existingSummaries, newDocSummary],
                            tags: allTags,
                            sourceCount: documents.length + 1
                        }
                    })
                }
            }
        } catch (error) {
            console.error('Error processing document:', error)
        } finally {
            setProcessingDocs(prev => {
                const next = new Set(prev)
                next.delete(docInfo.id)
                return next
            })
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0 || !userId) return

        setIsUploading(true)

        for (const file of Array.from(files)) {
            const filePath = `${userId}/${notebookId}/${Date.now()}_${file.name}`

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file)

            if (uploadError) {
                console.error('Upload error:', uploadError)
                continue
            }

            const { data: docData, error: dbError } = await supabase
                .from('documents')
                .insert({
                    notebook_id: notebookId,
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

                // Extract PDF text client-side before processing
                let extractedText = ''
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    console.log('Extracting text from PDF...')
                    extractedText = await extractTextFromPDF(file)
                    console.log('Extracted', extractedText.length, 'characters')
                }

                processDocument({
                    id: docData.id,
                    filename: file.name,
                    path: filePath,
                    extracted_text: extractedText
                })
            }
        }

        setIsUploading(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDeleteDocument = async (docId: string, metadata?: { path?: string }) => {
        if (metadata?.path) {
            await supabase.storage.from('documents').remove([metadata.path])
        }
        await supabase.from('embeddings').delete().eq('document_id', docId)
        await supabase.from('documents').delete().eq('id', docId)
        setDocuments(prev => prev.filter(d => d.id !== docId))

        // Update summary if no documents left
        if (documents.length <= 1) {
            setNotebookSummary(null)
        }
    }

    const handleSendMessage = async () => {
        if (!message.trim() || !userId || isSending) return

        const userMessage = message.trim()
        setMessage("")

        const userMsg: Message = { role: "user", content: userMessage }
        setMessages(prev => [...prev, userMsg])
        await saveMessage(userMsg)

        setIsSending(true)

        try {
            const conversationHistory = messages.slice(-6).map(m => ({
                role: m.role,
                content: m.content
            }))

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: userMessage,
                        notebook_id: notebookId,
                        user_id: userId,
                        conversation_history: conversationHistory,
                    }),
                }
            )

            const result = await response.json()

            const assistantMsg: Message = result.success
                ? { role: "assistant", content: result.response, citations: result.citations }
                : { role: "assistant", content: result.error || "Sorry, I encountered an error." }

            setMessages(prev => [...prev, assistantMsg])
            await saveMessage(assistantMsg)

        } catch (error) {
            console.error('Chat error:', error)
            const errorMsg: Message = { role: "assistant", content: "Sorry, I couldn't connect to the AI service." }
            setMessages(prev => [...prev, errorMsg])
            await saveMessage(errorMsg)
        } finally {
            setIsSending(false)
        }
    }

    const generateFlashcards = async () => {
        if (!userId) return

        setIsLoadingFlashcards(true)
        setShowFlashcardModal(true)
        setCurrentFlashcardIndex(0)
        setIsFlashcardFlipped(false)

        try {
            const { data: result, error } = await supabase.functions.invoke('generate-flashcards', {
                body: {
                    notebook_id: notebookId,
                    user_id: userId,
                    count: 10
                }
            })

            if (error) throw error

            if (result.success && result.flashcards) {
                setFlashcards(result.flashcards)
            } else {
                console.error('Flashcard generation error:', result.error)
                setFlashcards([{ id: 1, question: 'Error generating flashcards', answer: result.error || 'Please try again' }])
            }
        } catch (error) {
            console.error('Error generating flashcards:', error)
            setFlashcards([{ id: 1, question: 'Error', answer: 'Failed to connect to the server' }])
        } finally {
            setIsLoadingFlashcards(false)
        }
    }

    const generateQuiz = async (difficulty: string) => {
        if (!userId) return

        setShowQuizDifficultySelector(false)
        setQuizDifficulty(difficulty)
        setIsLoadingQuiz(true)
        setShowQuizModal(true)
        setCurrentQuizIndex(0)
        setQuizQuestions([])
        setQuizScore(0)
        setIsQuizAnswered(false)
        setSelectedQuizAnswer(null)

        try {
            const { data: result, error } = await supabase.functions.invoke('generate-quiz', {
                body: {
                    notebook_id: notebookId,
                    user_id: userId,
                    count: 20,
                    difficulty: difficulty
                }
            })

            if (error) throw error

            if (result.success && result.quiz) {
                setQuizQuestions(result.quiz)
            } else {
                setQuizQuestions([{
                    id: 1,
                    question: 'Error generating quiz',
                    options: ['Try again'],
                    answer: 'Try again',
                    explanation: result.error || 'Please try again'
                }])
            }
        } catch (error) {
            console.error('Error generating quiz:', error)
            setQuizQuestions([{
                id: 1,
                question: 'Connection Error',
                options: ['Check internet'],
                answer: 'Check internet',
                explanation: 'Failed to connect to server'
            }])
        } finally {
            setIsLoadingQuiz(false)
        }
    }

    const handleQuizOptionSelect = (option: string) => {
        if (isQuizAnswered) return
        setSelectedQuizAnswer(option)
        setIsQuizAnswered(true)

        if (option === quizQuestions[currentQuizIndex].answer) {
            setQuizScore(prev => prev + 1)
        }
    }

    const nextQuizQuestion = () => {
        if (currentQuizIndex < quizQuestions.length - 1) {
            setCurrentQuizIndex(prev => prev + 1)
            setSelectedQuizAnswer(null)
            setIsQuizAnswered(false)
        } else {
            // Quiz finished handling if needed
        }
    }

    const closeQuizModal = () => {
        setShowQuizModal(false)
        setQuizQuestions([])
    }

    // Mind Map Generation
    const generateMindMap = async () => {
        if (!userId) return

        setIsLoadingMindMap(true)
        setShowMindMapModal(true)

        try {
            const { data: result, error } = await supabase.functions.invoke('generate-mindmap', {
                body: {
                    notebook_id: notebookId,
                    user_id: userId,
                    notebook_name: notebookName
                }
            })

            if (error) throw error

            if (result.success && result.nodes) {
                // Convert to ReactFlow format with positioning
                // Horizontal Tree Layout Algorithm
                const categoryCount = result.nodes.filter((node: any) => node.type === 'category').length
                const nodes: Node[] = []
                const edges: Edge[] = []

                // Colors - High Contrast Light Mode (Strict Black/White)
                const colors = {
                    central: { bg: '#ffffff', border: '#000000', text: '#000000' },
                    category: { bg: '#ffffff', border: '#000000', text: '#000000' },
                    concept: { bg: '#ffffff', border: '#000000', text: '#334155' }
                }

                // 1. Central Node (Left Center)
                const startX = 100
                const startY = 300 // Centered vertically based on estimated height

                nodes.push({
                    id: 'central',
                    type: 'default',
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                    position: { x: startX, y: startY },
                    data: { label: result.nodes.find((n: any) => n.type === 'central')?.label || 'Notebook', expanded: true },
                    style: {
                        background: colors.central.bg,
                        color: colors.central.text,
                        border: `2px solid ${colors.central.border}`,
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '16px',
                        fontWeight: '700',
                        width: 200,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }
                })

                // 2. Categories (Middle Column)
                const categories = result.nodes.filter((n: any) => n.type === 'category')
                const catVerticalSpacing = 120
                const catStartY = startY - ((categories.length - 1) * catVerticalSpacing) / 2

                categories.forEach((cat: any, i: number) => {
                    const catId = cat.id
                    const catY = catStartY + (i * catVerticalSpacing)

                    nodes.push({
                        id: catId,
                        sourcePosition: Position.Right,
                        targetPosition: Position.Left,
                        position: { x: startX + 400, y: catY }, // Wider gap (400px)
                        data: { label: `${cat.label} >`, expanded: false }, // Add indicator
                        style: {
                            background: colors.category.bg,
                            color: colors.category.text,
                            border: `1.5px solid ${colors.category.border}`,
                            borderRadius: '8px',
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            width: 220,
                            boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
                            cursor: 'pointer'
                        }
                    })

                    edges.push({
                        id: `e-central-${catId}`,
                        source: 'central',
                        target: catId,
                        type: 'default', // Bezier Curve for organic flow
                        animated: false,
                        style: { stroke: '#000000', strokeWidth: 2 },
                    })

                    // 3. Concepts (Right Column) - Initially Hidden
                    const childEdges = result.edges.filter((e: any) => e.source === catId)
                    const concepts = childEdges.map((e: any) => result.nodes.find((n: any) => n.id === e.target))

                    // Center concepts relative to parent category
                    const conceptVerticalSpacing = 60
                    const conceptStartY = catY - ((concepts.length - 1) * conceptVerticalSpacing) / 2

                    concepts.forEach((concept: any, j: number) => {
                        if (!concept) return

                        nodes.push({
                            id: concept.id,
                            hidden: true, // Start hidden
                            sourcePosition: Position.Right,
                            targetPosition: Position.Left,
                            position: { x: startX + 800, y: conceptStartY + (j * conceptVerticalSpacing) },
                            data: { label: concept.label },
                            style: {
                                background: colors.concept.bg,
                                color: colors.concept.text,
                                border: `1px solid ${colors.concept.border}`,
                                borderRadius: '6px',
                                padding: '10px 16px',
                                fontSize: '13px',
                                width: 200,
                            }
                        })

                        edges.push({
                            id: `e-${catId}-${concept.id}`,
                            hidden: true,
                            source: catId,
                            target: concept.id,
                            type: 'default', // Bezier Curve
                            style: { stroke: '#000000', strokeWidth: 1.5 },
                        })
                    })
                })

                setMindMapNodes(nodes)
                setMindMapEdges(edges)
            }
        } catch (error) {
            console.error('Error generating mind map:', error)
        } finally {
            setIsLoadingMindMap(false)
        }
    }

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        // Toggle children visibility
        const isHidden = !node.data.expanded

        // Update node state (mark as expanded/collapsed)
        setMindMapNodes((nds) =>
            nds.map((n) => {
                if (n.id === node.id) {
                    return { ...n, data: { ...n.data, expanded: isHidden } }
                }
                return n
            })
        )

        // Find outgoing edges from this node
        const childEdges = mindMapEdges.filter((e) => e.source === node.id)
        const childNodeIds = new Set(childEdges.map((e) => e.target))

        // Toggle visibility of edges and child nodes
        setMindMapEdges((eds) =>
            eds.map((edge) => {
                if (edge.source === node.id) {
                    return { ...edge, hidden: !isHidden }
                }
                return edge
            })
        )

        setMindMapNodes((nds) =>
            nds.map((n) => {
                if (childNodeIds.has(n.id)) {
                    return { ...n, hidden: !isHidden }
                }
                return n
            })
        )
    }

    // Report Generation
    const generateReport = async (type: string) => {
        if (!userId) return

        setIsLoadingReport(true)
        setShowReportModal(true)
        setShowReportTypeSelector(false)
        setReportType(type)
        setReportContent('')

        try {
            const { data: result, error } = await supabase.functions.invoke('generate-report', {
                body: {
                    notebook_id: notebookId,
                    user_id: userId,
                    report_type: type
                }
            })

            if (error) throw error

            if (result.success && result.report) {
                setReportContent(result.report)
            } else {
                console.error('Report generation error:', result.error)
                setReportContent('# Error\n\nFailed to generate report. Please try again.')
            }
        } catch (error) {
            console.error('Error generating report:', error)
            setReportContent('# Error\n\nFailed to connect to the server. Please try again.')
        } finally {
            setIsLoadingReport(false)
        }
    }

    const handleStudioAction = (actionId: string) => {
        if (actionId === 'flashcards') {
            generateFlashcards()
            return
        }
        if (actionId === 'quiz') {
            setShowQuizDifficultySelector(true)
            return
        }
        if (actionId === 'mindmap') {
            generateMindMap()
            return
        }
        if (actionId === 'report') {
            setShowReportTypeSelector(true)
            return
        }
        if (actionId === 'infographic') {
            generateInfographic()
            return
        }
        if (actionId === 'audio') {
            setShowAudioTypeSelector(true)
            return
        }
        if (actionId === 'faq') {
            generateReport('faq')
            return
        }

        // For other studio actions (not yet implemented)
        setGeneratingType(actionId)
        setIsGenerating(true)
        setTimeout(() => {
            setIsGenerating(false)
            setGeneratingType(null)
        }, 3000)
    }

    // Audio Generation - handles both types
    const generateAudio = async (type: string) => {
        setShowAudioTypeSelector(false)
        setAudioType(type)

        if (!userId) return

        setIsLoadingAudio(true)
        setShowAudioModal(true)
        setAudioUrl('')

        try {
            const endpoint = type === 'pixar_story'
                ? 'generate-pixar-audio'
                : 'generate-audio-overview'

            const { data: result, error } = await supabase.functions.invoke(endpoint, {
                body: {
                    notebook_id: notebookId,
                    user_id: userId
                }
            })

            if (error) throw error

            if (result.success && result.audio) {
                const audioBlob = Uint8Array.from(atob(result.audio), c => c.charCodeAt(0))
                const blob = new Blob([audioBlob], { type: result.mimeType || 'audio/mp3' })
                const url = URL.createObjectURL(blob)
                setAudioUrl(url)
                setAudioTitle(result.title || (type === 'pixar_story' ? 'Pixar Story' : 'Audio Overview'))
            } else {
                console.error('Audio generation error:', result.error)
                setAudioUrl('')
            }
        } catch (error) {
            console.error('Error generating audio:', error)
            setAudioUrl('')
        } finally {
            setIsLoadingAudio(false)
        }
    }

    // Legacy Audio Overview Generation (kept for backward compatibility)
    const generateAudioOverview = async () => {
        generateAudio('overview')
    }



    // Infographic Generation
    const generateInfographic = async () => {
        if (!userId) return

        setIsLoadingInfographic(true)
        setShowInfographicModal(true)
        setInfographicImage('')

        try {
            const { data: result, error } = await supabase.functions.invoke('generate-infographic', {
                body: {
                    notebook_id: notebookId,
                    user_id: userId
                }
            })

            if (error) throw error

            if (result.success && result.image) {
                setInfographicImage(`data:${result.mimeType || 'image/png'};base64,${result.image}`)
                setInfographicTitle(result.title || 'Infographic')
            } else {
                console.error('Infographic generation error:', result.error)
                setInfographicImage('')
            }
        } catch (error) {
            console.error('Error generating infographic:', error)
            setInfographicImage('')
        } finally {
            setIsLoadingInfographic(false)
        }
    }

    const nextFlashcard = () => {
        if (currentFlashcardIndex < flashcards.length - 1) {
            setCurrentFlashcardIndex(prev => prev + 1)
            setIsFlashcardFlipped(false)
        }
    }

    const prevFlashcard = () => {
        if (currentFlashcardIndex > 0) {
            setCurrentFlashcardIndex(prev => prev - 1)
            setIsFlashcardFlipped(false)
        }
    }

    const closeFlashcardModal = () => {
        setShowFlashcardModal(false)
        setFlashcards([])
        setCurrentFlashcardIndex(0)
        setIsFlashcardFlipped(false)
    }

    const toggleCitation = (idx: number) => {
        setExpandedCitations(prev => {
            const next = new Set(prev)
            if (next.has(idx)) next.delete(idx)
            else next.add(idx)
            return next
        })
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

    // Simple markdown renderer for AI responses
    const renderMarkdown = (text: string) => {
        // Split into lines for processing
        const lines = text.split('\n')
        const elements: React.ReactNode[] = []
        let currentList: string[] = []
        let listKey = 0

        const processInlineFormatting = (line: string) => {
            // Process bold (**text**)
            let processed = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Process italic (*text* but not list items)
            processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
            // Process inline code (`code`)
            processed = processed.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
            return processed
        }

        const flushList = () => {
            if (currentList.length > 0) {
                elements.push(
                    <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 my-2 ml-2">
                        {currentList.map((item, i) => (
                            <li key={i} dangerouslySetInnerHTML={{ __html: processInlineFormatting(item) }} />
                        ))}
                    </ul>
                )
                currentList = []
            }
        }

        lines.forEach((line, idx) => {
            const trimmed = line.trim()

            // Check for list items (*, -, or numbered)
            const listMatch = trimmed.match(/^[\*\-•]\s+(.+)$/) || trimmed.match(/^\d+\.\s+(.+)$/)

            if (listMatch) {
                currentList.push(listMatch[1])
            } else {
                flushList()

                if (trimmed === '') {
                    elements.push(<br key={`br-${idx}`} />)
                } else {
                    elements.push(
                        <p
                            key={`p-${idx}`}
                            className="mb-2 last:mb-0"
                            dangerouslySetInnerHTML={{ __html: processInlineFormatting(line) }}
                        />
                    )
                }
            }
        })

        flushList()
        return <>{elements}</>
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

            {/* Main Content */}
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
                        {userRole === 'admin' && (
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {isUploading ? "Uploading..." : "Upload Files"}
                            </Button>
                        )}
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
                                <div key={doc.id} className="group p-3 rounded-xl bg-background hover:bg-accent transition-colors">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg relative">
                                            <FileText className="w-4 h-4 text-primary" />
                                            {processingDocs.has(doc.id) && (
                                                <div className="absolute -top-1 -right-1">
                                                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{doc.filename}</p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                <span>{formatDate(doc.created_at)}</span>
                                                {doc.metadata?.size && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{formatFileSize(doc.metadata.size)}</span>
                                                    </>
                                                )}
                                            </div>
                                            {processingDocs.has(doc.id) && (
                                                <p className="text-xs text-primary mt-1">Processing...</p>
                                            )}
                                        </div>
                                        {userRole === 'admin' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive"
                                                onClick={() => handleDeleteDocument(doc.id, doc.metadata)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Center Column - Chat */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Notebook Summary Header - Like NotebookLM */}
                        {notebookSummary && (
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-xl">
                                        <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-xl font-bold text-foreground mb-2">{notebookSummary.title}</h2>
                                        <p className="text-sm text-muted-foreground mb-3">{notebookSummary.sourceCount} source{notebookSummary.sourceCount !== 1 ? 's' : ''}</p>

                                        {/* Display all document summaries */}
                                        <div className="space-y-3 mb-4">
                                            {notebookSummary.summaries.map((s, i) => (
                                                <div key={i} className="text-sm">
                                                    <span className="font-semibold text-primary">{s.docName.replace('.pdf', '')}:</span>
                                                    <span className="text-foreground ml-1">{s.summary}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {notebookSummary.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {notebookSummary.tags.map((tag, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                        <Tag className="w-3 h-3" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Welcome message if no messages and no summary */}
                        {messages.length === 0 && !notebookSummary && (
                            <div className="flex justify-start">
                                <div className="bg-card border rounded-2xl rounded-bl-md px-5 py-4 max-w-[80%]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-lg">
                                            <Sparkles className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground">MedMind AI</span>
                                    </div>
                                    <div className="text-sm leading-relaxed">
                                        Hello! Upload some documents and I'll help you analyze them. Ask me anything about the content.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Messages */}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                                    <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                                        {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                                    </div>

                                    {msg.citations && msg.citations.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-border/50">
                                            <button onClick={() => toggleCitation(idx)} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                                                <FileText className="w-3 h-3" />
                                                <span>{msg.citations.length} source{msg.citations.length > 1 ? 's' : ''}</span>
                                                {expandedCitations.has(idx) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </button>

                                            {expandedCitations.has(idx) && (
                                                <div className="mt-2 space-y-2">
                                                    {msg.citations.map((citation, cidx) => (
                                                        <div key={cidx} className="p-2 rounded-lg bg-muted/50 text-xs">
                                                            <div className="flex items-center gap-2 font-medium mb-1">
                                                                <FileText className="w-3 h-3 text-primary" />
                                                                <span className="truncate">{citation.filename}</span>
                                                            </div>
                                                            <p className="text-muted-foreground line-clamp-2">{citation.excerpt}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isSending && (
                            <div className="flex justify-start">
                                <div className="bg-card border rounded-2xl rounded-bl-md px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                        <span className="text-sm text-muted-foreground">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t bg-background/50">
                        <div className="flex items-center gap-2 max-w-3xl mx-auto">
                            <div className="flex-1 relative">
                                <Input
                                    placeholder="Ask anything about your documents..."
                                    className="pr-12 h-12 rounded-xl"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                    disabled={isSending}
                                />
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2">
                                    <Mic className="w-4 h-4" />
                                </Button>
                            </div>
                            <Button
                                variant="gradient"
                                size="icon"
                                className="h-12 w-12 rounded-xl"
                                onClick={handleSendMessage}
                                disabled={isSending || !message.trim()}
                            >
                                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
                        <p className="text-xs text-muted-foreground mt-1">Generate learning artifacts</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <div className="grid grid-cols-2 gap-3">
                            {studioActions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={() => handleStudioAction(action.id)}
                                    disabled={isGenerating || documents.length === 0}
                                    className="group p-4 rounded-xl border bg-background hover:bg-accent transition-all text-left disabled:opacity-50"
                                >
                                    <div className="p-2 bg-primary/10 rounded-lg w-fit mb-3">
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
                                <p className="text-sm text-muted-foreground text-center">Upload documents to unlock Studio</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Flashcard Modal */}
            {
                showFlashcardModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-card border rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <div>
                                    <h2 className="font-semibold text-lg">{notebookName} Flashcards</h2>
                                    <p className="text-xs text-muted-foreground">Based on {documents.length} source{documents.length !== 1 ? 's' : ''}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={closeFlashcardModal} className="rounded-full">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Flashcard Content */}
                            <div className="p-6">
                                {isLoadingFlashcards ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                        <p className="text-muted-foreground">Generating flashcards...</p>
                                    </div>
                                ) : flashcards.length > 0 ? (
                                    <>
                                        {/* Keyboard hint */}
                                        <p className="text-xs text-muted-foreground text-center mb-4">
                                            Press "Space" to flip, "←" / "→" to navigate
                                        </p>

                                        {/* Flashcard */}
                                        <div
                                            className="relative min-h-[250px] cursor-pointer perspective-1000"
                                            onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                                            onKeyDown={(e) => {
                                                if (e.key === ' ' || e.key === 'Space') {
                                                    e.preventDefault()
                                                    setIsFlashcardFlipped(!isFlashcardFlipped)
                                                } else if (e.key === 'ArrowLeft') {
                                                    prevFlashcard()
                                                } else if (e.key === 'ArrowRight') {
                                                    nextFlashcard()
                                                }
                                            }}
                                            tabIndex={0}
                                        >
                                            <div className={`w-full min-h-[250px] transition-all duration-500 transform-style-preserve-3d ${isFlashcardFlipped ? 'rotate-y-180' : ''}`}>
                                                {/* Front (Question) */}
                                                <div className={`absolute inset-0 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-card to-muted p-6 flex flex-col justify-center items-center backface-hidden ${isFlashcardFlipped ? 'invisible' : ''}`}>
                                                    <p className="text-lg font-medium text-center leading-relaxed">
                                                        {flashcards[currentFlashcardIndex]?.question}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-4">Click to see answer</p>
                                                </div>

                                                {/* Back (Answer) */}
                                                <div className={`absolute inset-0 rounded-xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10 p-6 flex flex-col justify-center items-center backface-hidden rotate-y-180 ${!isFlashcardFlipped ? 'invisible' : ''}`}>
                                                    <p className="text-lg text-center leading-relaxed">
                                                        {flashcards[currentFlashcardIndex]?.answer}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-4">Click to see question</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Navigation */}
                                        <div className="flex items-center justify-center gap-6 mt-6">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={prevFlashcard}
                                                disabled={currentFlashcardIndex === 0}
                                                className="rounded-full"
                                            >
                                                <ArrowLeft className="w-5 h-5" />
                                            </Button>

                                            <span className="text-sm text-muted-foreground">
                                                {currentFlashcardIndex + 1} / {flashcards.length}
                                            </span>

                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={nextFlashcard}
                                                disabled={currentFlashcardIndex === flashcards.length - 1}
                                                className="rounded-full"
                                            >
                                                <ArrowRight className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-16 text-muted-foreground">
                                        No flashcards available
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="flex items-center justify-center gap-4 p-4 border-t">
                                <Button variant="outline" className="gap-2" onClick={closeFlashcardModal}>
                                    <ThumbsUp className="w-4 h-4" />
                                    Good content
                                </Button>
                                <Button variant="outline" className="gap-2" onClick={closeFlashcardModal}>
                                    <ThumbsDown className="w-4 h-4" />
                                    Bad content
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Quiz Modal */}
            {
                showQuizModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-card border rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                                <div>
                                    <h2 className="font-semibold text-lg">{notebookName} Quiz</h2>
                                    <p className="text-xs text-muted-foreground">Question {currentQuizIndex + 1} of {quizQuestions.length}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={closeQuizModal} className="rounded-full">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Quiz Content - Scrollable */}
                            <div className="p-6 overflow-y-auto flex-1">
                                {isLoadingQuiz ? (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                                        <p className="text-muted-foreground">Generating questions...</p>
                                    </div>
                                ) : quizQuestions.length > 0 ? (
                                    <>
                                        <div className="mb-6">
                                            <h3 className="text-lg font-medium leading-relaxed mb-6">
                                                {quizQuestions[currentQuizIndex]?.question}
                                            </h3>

                                            <div className="space-y-3">
                                                {quizQuestions[currentQuizIndex]?.options?.map((option: string, idx: number) => {
                                                    const isSelected = selectedQuizAnswer === option
                                                    const isCorrect = option === quizQuestions[currentQuizIndex].answer

                                                    let variantClass = "hover:bg-accent hover:text-accent-foreground border-input"

                                                    if (isQuizAnswered) {
                                                        if (isCorrect) {
                                                            variantClass = "bg-green-100 border-green-500 text-green-900 dark:bg-green-900/30 dark:text-green-100"
                                                        } else if (isSelected && !isCorrect) {
                                                            variantClass = "bg-red-100 border-red-500 text-red-900 dark:bg-red-900/30 dark:text-red-100"
                                                        } else {
                                                            variantClass = "opacity-50"
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={idx}
                                                            onClick={() => handleQuizOptionSelect(option)}
                                                            className={`w-full p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${variantClass}`}
                                                        >
                                                            <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                                                            {option}
                                                            {isQuizAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 ml-2 inline text-green-600" />}
                                                            {isQuizAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-2 inline text-red-600" />}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Explanation & Next */}
                                        {isQuizAnswered && (
                                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                <div className="p-4 rounded-lg bg-muted/50 mb-6 text-sm">
                                                    <span className="font-semibold block mb-1">Explanation:</span>
                                                    {quizQuestions[currentQuizIndex]?.explanation}
                                                </div>

                                                <Button className="w-full" onClick={nextQuizQuestion}>
                                                    {currentQuizIndex < quizQuestions.length - 1 ? (
                                                        <>Next Question <ArrowRight className="w-4 h-4 ml-2" /></>
                                                    ) : (
                                                        <>Finish Quiz</>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-16 text-muted-foreground">
                                        No questions available
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Mind Map Modal */}
            {
                showMindMapModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-card border rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-lg">
                                        <Map className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold">Mind Map</h2>
                                        <p className="text-sm text-muted-foreground">Visual knowledge graph of your documents</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() => setShowMindMapModal(false)}
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Mind Map Content */}
                            <div className="flex-1 relative">
                                {isLoadingMindMap ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                                            <p className="text-muted-foreground">Generating mind map...</p>
                                        </div>
                                    </div>
                                ) : mindMapNodes.length > 0 ? (
                                    <ReactFlow
                                        nodes={mindMapNodes}
                                        edges={mindMapEdges}
                                        onNodeClick={onNodeClick}
                                        fitView
                                        attributionPosition="bottom-left"
                                        style={{ background: darkMode ? '#1e293b' : '#ffffff' }}
                                    >
                                        <Background color="#cbd5e1" gap={20} />
                                        <Controls />
                                        <MiniMap
                                            nodeColor={(node) => {
                                                if (node.id === 'central') return '#000000';
                                                if (node.id.startsWith('cat-')) return '#334155';
                                                return '#94a3b8';
                                            }}
                                            maskColor="rgba(0, 0, 0, 0.1)"
                                        />
                                    </ReactFlow>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        No mind map data available
                                    </div>
                                )}
                            </div>

                            {/* Legend */}
                            <div className="p-4 border-t flex items-center justify-center gap-6 text-sm bg-white border-slate-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-white border-2 border-black"></div>
                                    <span className="text-slate-900 font-medium">Main Theme</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-white border border-black"></div>
                                    <span className="text-slate-700">Key Topics</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded bg-white border border-black"></div>
                                    <span className="text-slate-600">Concepts (Click to Expand)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Audio Type Selector Modal */}
            {
                showAudioTypeSelector && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-card dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Volume2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Generate Audio</h2>
                                        <p className="text-sm text-white/80">Choose an audio format</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowAudioTypeSelector(false)}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Audio Type Grid */}
                            <div className="p-6 grid grid-cols-2 gap-4">
                                {audioTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => generateAudio(type.id)}
                                        className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all text-left group"
                                    >
                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg w-fit mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50">
                                            <type.icon className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-purple-600" />
                                        </div>
                                        <h3 className="font-semibold text-purple-600 dark:text-purple-300 group-hover:text-purple-700 dark:group-hover:text-purple-200">{type.label}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Quiz Difficulty Selector Modal */}
            {
                showQuizDifficultySelector && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <HelpCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Quiz Mode</h2>
                                        <p className="text-sm text-white/80">Choose difficulty level</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowQuizDifficultySelector(false)}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Difficulty Options */}
                            <div className="p-6 space-y-3">
                                <button
                                    onClick={() => generateQuiz('easy')}
                                    className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all text-left group flex items-center gap-4"
                                >
                                    <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-800">
                                        <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-green-600 dark:text-green-400 text-lg">Easy Mode</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">20 basic recall questions</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => generateQuiz('medium')}
                                    className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-all text-left group flex items-center gap-4"
                                >
                                    <div className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800">
                                        <Brain className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 text-lg">Medium Mode</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">20 application-based questions</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => generateQuiz('hard')}
                                    className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all text-left group flex items-center gap-4"
                                >
                                    <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-800">
                                        <Flame className="w-6 h-6 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-red-600 dark:text-red-400 text-lg">Hard Mode</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">20 challenging analytical questions</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Report Type Selector Modal */}
            {
                showReportTypeSelector && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-card dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <FileBarChart className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Generate Report</h2>
                                        <p className="text-sm text-white/80">Choose a report format</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowReportTypeSelector(false)}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Report Type Grid */}
                            <div className="p-6 grid grid-cols-2 gap-4">
                                {reportTypes.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => generateReport(type.id)}
                                        className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-left group"
                                    >
                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg w-fit mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50">
                                            <type.icon className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600" />
                                        </div>
                                        <h3 className="font-semibold text-blue-600 dark:text-blue-300 group-hover:text-blue-700 dark:group-hover:text-blue-200">{type.label}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{type.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Report Display Modal */}
            {
                showReportModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] mx-4 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <FileBarChart className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">
                                            {reportTypes.find(t => t.id === reportType)?.label || 'Report'}
                                        </h2>
                                        <p className="text-xs text-white/80">Generated from your documents</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowReportModal(false)}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Report Content */}
                            <div className="flex-1 overflow-auto p-6 bg-white dark:bg-slate-800">
                                {isLoadingReport ? (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                                            <p className="text-slate-600 dark:text-slate-300">Generating your report...</p>
                                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">This may take a moment</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-100">
                                        {renderMarkdown(reportContent)}
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            {!isLoadingReport && reportContent && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowReportModal(false)
                                            setShowReportTypeSelector(true)
                                        }}
                                        className="gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Change Type
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                navigator.clipboard.writeText(reportContent)
                                            }}
                                            className="gap-2"
                                        >
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => window.print()}
                                            className="gap-2"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Print
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                const blob = new Blob([reportContent], { type: 'text/markdown' })
                                                const url = URL.createObjectURL(blob)
                                                const a = document.createElement('a')
                                                a.href = url
                                                a.download = `${reportTypes.find(t => t.id === reportType)?.label || 'report'}.md`
                                                a.click()
                                                URL.revokeObjectURL(url)
                                            }}
                                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Infographic Modal */}
            {
                showInfographicModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-card dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] mx-4 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-600 to-pink-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Image className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Infographic</h2>
                                        <p className="text-xs text-white/80">{infographicTitle || 'Visual summary of your documents'}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowInfographicModal(false)}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Infographic Content */}
                            <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                                {isLoadingInfographic ? (
                                    <div className="text-center">
                                        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                                        <p className="text-slate-600 dark:text-slate-300 font-medium">Generating your infographic...</p>
                                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">This may take 15-30 seconds</p>
                                    </div>
                                ) : infographicImage ? (
                                    <img
                                        src={infographicImage}
                                        alt={infographicTitle || 'Generated Infographic'}
                                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                                    />
                                ) : (
                                    <div className="text-center text-slate-500 dark:text-slate-400">
                                        <Image className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                        <p>Failed to generate infographic</p>
                                        <Button
                                            onClick={generateInfographic}
                                            className="mt-4 bg-purple-600 hover:bg-purple-700"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            {!isLoadingInfographic && infographicImage && (
                                <div className="p-4 border-t bg-slate-50 dark:bg-slate-800 flex items-center justify-between">
                                    <Button
                                        variant="outline"
                                        onClick={generateInfographic}
                                        className="gap-2"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Regenerate
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const link = document.createElement('a')
                                            link.href = infographicImage
                                            link.download = `${infographicTitle || 'infographic'}.png`
                                            link.click()
                                        }}
                                        className="gap-2 bg-purple-600 hover:bg-purple-700"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Audio Overview Modal */}
            {
                showAudioModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-card dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Volume2 className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">{audioTitle || 'Audio Overview'}</h2>
                                        <p className="text-xs text-white/80">{audioType === 'pixar_story' ? 'Fun storytelling like a children\'s tale' : 'Podcast-style summary'}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setShowAudioModal(false)
                                        if (audioUrl) URL.revokeObjectURL(audioUrl)
                                    }}
                                    className="text-white hover:bg-white/20"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Audio Content */}
                            <div className="p-6 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                                {isLoadingAudio ? (
                                    <div className="text-center py-8">
                                        <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                                        <p className="text-slate-600 font-medium">Creating your audio overview...</p>
                                        <p className="text-sm text-slate-400 mt-2">Generating script and synthesizing speech</p>
                                        <p className="text-xs text-slate-400 mt-1">This may take 30-60 seconds</p>
                                    </div>
                                ) : audioUrl ? (
                                    <div className="w-full space-y-4">
                                        <div className="bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-6">
                                            <audio
                                                controls
                                                controlsList="nodownload"
                                                className="w-full"
                                                src={audioUrl}
                                            >
                                                Your browser does not support the audio element.
                                            </audio>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Button
                                                variant="outline"
                                                onClick={() => generateAudio(audioType)}
                                                className="gap-2"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                                Regenerate
                                            </Button>
                                            <Button
                                                onClick={async () => {
                                                    try {
                                                        const response = await fetch(audioUrl)
                                                        const blob = await response.blob()
                                                        const filename = audioType === 'pixar_story' ? 'pixar-story.wav' : 'audio-overview.wav'
                                                        const url = URL.createObjectURL(new Blob([blob], { type: 'audio/wav' }))
                                                        const a = document.createElement('a')
                                                        a.href = url
                                                        a.download = filename
                                                        document.body.appendChild(a)
                                                        a.click()
                                                        document.body.removeChild(a)
                                                        setTimeout(() => URL.revokeObjectURL(url), 100)
                                                    } catch (e) {
                                                        console.error('Download error:', e)
                                                    }
                                                }}
                                                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                <Download className="w-4 h-4" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-slate-500">
                                        <Volume2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                        <p>Failed to generate audio</p>
                                        <Button
                                            onClick={() => generateAudio(audioType)}
                                            className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            Try Again
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
