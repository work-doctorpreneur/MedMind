"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Plus,
    Search,
    FolderOpen,
    Clock,
    FileText,
    Moon,
    Sun,
    LogOut,
    Brain,
    X,
    Loader2,
    Trash2,
    AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"

interface Notebook {
    id: string
    name: string
    created_at: string
    document_count?: number
}

export default function DashboardHome() {
    const [darkMode, setDarkMode] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [user, setUser] = useState<{ id: string, firstName: string, lastName: string } | null>(null)
    const [userRole, setUserRole] = useState<'admin' | 'doctor'>('doctor')
    const [notebooks, setNotebooks] = useState<Notebook[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newNotebookName, setNewNotebookName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [deletingNotebook, setDeletingNotebook] = useState<Notebook | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const initDashboard = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Fetch user profile including role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, role')
                    .eq('id', user.id)
                    .single()

                setUser({
                    id: user.id,
                    firstName: profile?.first_name || user.user_metadata.first_name || "Doctor",
                    lastName: profile?.last_name || user.user_metadata.last_name || ""
                })
                setUserRole(profile?.role || 'doctor')

                // Fetch ALL notebooks (not filtered by user_id)
                const { data: notebooksData, error } = await supabase
                    .from('notebooks')
                    .select(`
                        id,
                        name,
                        created_at,
                        documents(count)
                    `)
                    .order('created_at', { ascending: false })

                if (!error && notebooksData) {
                    const formattedNotebooks = notebooksData.map((nb: any) => ({
                        id: nb.id,
                        name: nb.name,
                        created_at: nb.created_at,
                        document_count: nb.documents?.[0]?.count || 0
                    }))
                    setNotebooks(formattedNotebooks)
                }
            }
            setIsLoading(false)
        }
        initDashboard()
    }, [supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push("/")
    }

    const handleCreateNotebook = async () => {
        if (!newNotebookName.trim() || !user) return

        setIsCreating(true)
        const { data, error } = await supabase
            .from('notebooks')
            .insert({
                name: newNotebookName.trim(),
                user_id: user.id
            })
            .select()
            .single()

        if (!error && data) {
            setNotebooks([{ ...data, document_count: 0 }, ...notebooks])
            setNewNotebookName("")
            setShowCreateModal(false)
        }
        setIsCreating(false)
    }

    const handleDeleteNotebook = async () => {
        if (!deletingNotebook || !user) return

        setIsDeleting(true)
        try {
            // Get all documents in this notebook
            const { data: docs } = await supabase
                .from('documents')
                .select('id, metadata')
                .eq('notebook_id', deletingNotebook.id)

            if (docs && docs.length > 0) {
                // Delete embeddings for all documents
                const docIds = docs.map(d => d.id)
                await supabase.from('embeddings').delete().in('document_id', docIds)

                // Delete files from storage
                const filePaths = docs
                    .map(d => d.metadata?.path)
                    .filter(Boolean) as string[]
                if (filePaths.length > 0) {
                    await supabase.storage.from('documents').remove(filePaths)
                }

                // Delete documents
                await supabase.from('documents').delete().eq('notebook_id', deletingNotebook.id)
            }

            // Delete chat messages
            await supabase.from('chat_messages').delete().eq('notebook_id', deletingNotebook.id)

            // Delete the notebook
            await supabase.from('notebooks').delete().eq('id', deletingNotebook.id)

            // Update state
            setNotebooks(prev => prev.filter(nb => nb.id !== deletingNotebook.id))
            setDeletingNotebook(null)
        } catch (error) {
            console.error('Error deleting notebook:', error)
        } finally {
            setIsDeleting(false)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.round(diffMs / 60000)
        const diffHours = Math.round(diffMs / 3600000)
        const diffDays = Math.round(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins} min ago`
        if (diffHours < 24) return `${diffHours} hours ago`
        if (diffDays < 7) return `${diffDays} days ago`
        return date.toLocaleDateString()
    }

    const filteredNotebooks = notebooks.filter(nb =>
        nb.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
        document.documentElement.classList.toggle("dark")
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/dashboard" className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-xl">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold gradient-text">MedMind</span>
                        </Link>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground hidden sm:block">
                                Welcome, <span className="font-semibold text-foreground">
                                    {user ? `${user.firstName} ${user.lastName}` : "Doctor"}!
                                </span>
                            </span>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleDarkMode}
                                className="rounded-full"
                            >
                                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Your Notebooks</h1>
                        <p className="text-muted-foreground mt-1">Organize your medical documents and insights</p>
                    </div>
                    {userRole === 'admin' && (
                        <Button
                            variant="gradient"
                            className="gap-2 shadow-lg hover:shadow-primary/25 transition-all"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Create Notebook
                        </Button>
                    )}
                </div>

                <div className="relative mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notebooks..."
                        className="pl-10 max-w-md bg-card/50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : filteredNotebooks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredNotebooks.map((notebook) => (
                            <Link href={`/dashboard/${notebook.id}`} key={notebook.id}>
                                <div className="group bg-card hover:bg-accent/50 border rounded-2xl p-6 transition-all hover:shadow-lg cursor-pointer h-full flex flex-col relative">
                                    {/* Delete Button - Admin Only */}
                                    {userRole === 'admin' && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setDeletingNotebook(notebook)
                                            }}
                                            className="absolute top-3 right-3 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive"
                                            title="Delete notebook"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                                            <FolderOpen className="w-6 h-6 text-primary" />
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">{notebook.name}</h3>

                                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <FileText className="w-3 h-3" />
                                            <span>{notebook.document_count} documents</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" />
                                            <span>{formatDate(notebook.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl bg-card/50">
                        <div className="p-4 bg-muted rounded-full mb-4">
                            <FolderOpen className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No notebooks yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-sm">
                            Create your first notebook to start organizing and analyzing your medical documents.
                        </p>
                        <Button
                            variant="gradient"
                            className="gap-2"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus className="w-4 h-4" />
                            Create Notebook
                        </Button>
                    </div>
                )}
            </main>

            {/* Create Notebook Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FolderOpen className="w-5 h-5 text-primary" />
                                    </div>
                                    <h2 className="text-xl font-semibold">Create Notebook</h2>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Notebook Name</label>
                                    <Input
                                        placeholder="e.g., Patient Records Q1 2026"
                                        value={newNotebookName}
                                        onChange={(e) => setNewNotebookName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
                                        autoFocus
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="gradient"
                                        className="flex-1"
                                        onClick={handleCreateNotebook}
                                        disabled={!newNotebookName.trim() || isCreating}
                                    >
                                        {isCreating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            "Create"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingNotebook && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-destructive/10 rounded-full">
                                    <AlertTriangle className="w-6 h-6 text-destructive" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold">Delete Notebook</h2>
                                    <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-6">
                                Are you sure you want to delete <span className="font-semibold text-foreground">"{deletingNotebook.name}"</span>?
                                This will permanently delete all documents, embeddings, and chat history associated with this notebook.
                            </p>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setDeletingNotebook(null)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleDeleteNotebook}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
