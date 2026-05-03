"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
    Plus,
    Search,
    FolderOpen,
    Clock,
    FileText,
    Moon,
    Sun,
    LogOut,
    X,
    Loader2,
    Trash2,
    AlertTriangle,
    Crown,
    Calendar,
    Sparkles
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { PricingSection } from "@/components/PricingSection"

interface Notebook {
    id: string
    name: string
    created_at: string
    document_count?: number
}

/* ── MedMind Logo Icon ── */
// Using logo.png via Image component instead of SVG icon
export default function DashboardHome() {
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('medmind-dark-mode') === 'true'
        }
        return false
    })
    const [searchQuery, setSearchQuery] = useState("")
    const [user, setUser] = useState<{ id: string, firstName: string, lastName: string, plan: string, planExpiresAt?: string } | null>(null)
    const [userRole, setUserRole] = useState<'admin' | 'doctor'>('doctor')
    const [notebooks, setNotebooks] = useState<Notebook[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showPricingModal, setShowPricingModal] = useState(false)
    const [newNotebookName, setNewNotebookName] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [deletingNotebook, setDeletingNotebook] = useState<Notebook | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const router = useRouter()
    const supabase = createClient()

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

    useEffect(() => {
        const initDashboard = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Fetch user profile including role and plan
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('first_name, last_name, role, plan, plan_expires_at')
                    .eq('id', user.id)
                    .single()

                let currentPlan = profile?.plan || 'free'
                let currentExpiresAt = profile?.plan_expires_at

                // Check for plan expiration
                if (currentPlan !== 'free' && currentExpiresAt) {
                    const expiresAt = new Date(currentExpiresAt)
                    if (expiresAt < new Date()) {
                        // Plan expired - downgrade to free in DB
                        await supabase
                            .from('profiles')
                            .update({ plan: 'free', plan_expires_at: null })
                            .eq('id', user.id)
                        
                        currentPlan = 'free'
                        currentExpiresAt = null
                    }
                }

                setUser({
                    id: user.id,
                    firstName: profile?.first_name || user.user_metadata.first_name || "Doctor",
                    lastName: profile?.last_name || user.user_metadata.last_name || "",
                    plan: currentPlan,
                    planExpiresAt: currentExpiresAt
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
        return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
    }

    const filteredNotebooks = notebooks.filter(nb =>
        nb.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

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

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-canvas)' }}>
            {/* ── Top Navigation Bar ── */}
            <nav style={{
                height: '64px',
                background: 'var(--color-canvas)',
                borderBottom: '1px solid var(--color-hairline)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    padding: '0 var(--spacing-lg)',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    {/* Left: Logo + Wordmark */}
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', textDecoration: 'none' }}>
                        <Image src="/logo.png" alt="MedMind Logo" width={28} height={28} />
                        <span className="typo-title-md" style={{ color: 'var(--color-ink)' }}>MedMind</span>
                    </Link>

                    {/* Right: Greeting + Toggle + Logout */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-base)' }}>
                        <span className="typo-body-sm" style={{ color: 'var(--color-body)' }}>
                            Welcome, {user ? `${user.firstName} ${user.lastName}` : "Doctor"}!
                        </span>
                        {userRole === 'admin' && (
                            <Link href="/admin" style={{ textDecoration: 'none' }}>
                                <Button variant="outline" size="sm" style={{ height: '32px' }}>
                                    Admin Dashboard
                                </Button>
                            </Link>
                        )}
                        {/* Plan Badge */}
                        {user && (
                            <div 
                                onClick={() => setShowPricingModal(true)}
                                style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    background: user.plan === 'yearly' ? 'rgba(59,130,246,0.1)' : (user.plan === 'trial' ? 'rgba(168,85,247,0.1)' : 'rgba(156,163,175,0.1)'),
                                    color: user.plan === 'yearly' ? '#3b82f6' : (user.plan === 'trial' ? '#a855f7' : '#9ca3af'),
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    border: `1px solid ${user.plan === 'yearly' ? 'rgba(59,130,246,0.2)' : (user.plan === 'trial' ? 'rgba(168,85,247,0.2)' : 'rgba(156,163,175,0.2)')}`
                                }}
                            >
                                <Crown size={12} />
                                <span style={{ textTransform: 'capitalize' }}>{user.plan} Plan</span>
                            </div>
                        )}
                        <button
                            onClick={toggleDarkMode}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 'var(--spacing-xxs)',
                                color: 'var(--color-muted)',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button
                            onClick={handleLogout}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 'var(--spacing-xxs)',
                                color: 'var(--color-muted)',
                                transition: 'color 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-ink)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Main Content ── */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: `var(--spacing-xxl) var(--spacing-lg) var(--spacing-section)`,
            }}>
                {/* Page Header */}
                {/* Upgrade Banner for Free/Trial Users */}
                {user && user.plan !== 'yearly' && (
                    <div style={{
                        background: 'linear-gradient(90deg, #3b82f6 0%, #a855f7 100%)',
                        borderRadius: 'var(--rounded-xl)',
                        padding: 'var(--spacing-lg)',
                        marginBottom: 'var(--spacing-xl)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
                        width: '100%'
                    }}>
                        <div>
                            <h3 className="typo-title-md" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={20} />
                                {user.plan === 'free' ? 'Unlock MedMind Pro' : 'Your Trial ends soon'}
                            </h3>
                            <p className="typo-body-sm" style={{ opacity: 0.9, marginTop: '4px' }}>
                                {user.plan === 'free' 
                                    ? 'Get unlimited AI Chat, Mind Maps, and Audio Overviews for your medical studies.' 
                                    : `Upgrade now to keep your access to all premium features.`}
                            </p>
                        </div>
                        <Button 
                            onClick={() => setShowPricingModal(true)}
                            style={{ 
                                background: 'white', 
                                color: '#3b82f6', 
                                border: 'none',
                                fontWeight: '600'
                            }}
                        >
                            Upgrade Now
                        </Button>
                    </div>
                )}

                {/* Page Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--spacing-xl)',
                }}>
                    <div>
                        <h1 className="typo-display-md" style={{ color: 'var(--color-ink)', margin: 0 }}>
                            Your Notebooks
                        </h1>
                        <p className="typo-body-md" style={{ color: 'var(--color-body)', marginTop: 'var(--spacing-xs)' }}>
                            Organize your documents and insights
                        </p>
                    </div>
                    {userRole === 'admin' && (
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                            }}
                        >
                            <Plus size={16} />
                            Create Notebook
                        </Button>
                    )}
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{
                        position: 'relative',
                        width: '320px',
                        maxWidth: '100%',
                    }}>
                        <Search
                            size={16}
                            style={{
                                position: 'absolute',
                                left: 'var(--spacing-base)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--color-muted)',
                            }}
                        />
                        <input
                            type="text"
                            placeholder="Search notebooks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                height: '44px',
                                padding: 'var(--spacing-sm) var(--spacing-base) var(--spacing-sm) 44px',
                                background: 'var(--color-surface-card)',
                                border: '1px solid var(--color-hairline-strong)',
                                borderRadius: 'var(--rounded-md)',
                                fontFamily: 'var(--font-body)',
                                fontSize: '14px',
                                color: 'var(--color-ink)',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => (e.target.style.borderWidth = '2px', e.target.style.borderColor = 'var(--color-ink)')}
                            onBlur={e => (e.target.style.borderWidth = '1px', e.target.style.borderColor = 'var(--color-hairline-strong)')}
                        />
                    </div>
                </div>

                {/* Notebook Cards Grid */}
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-section) 0' }}>
                        <Loader2 size={32} style={{ color: 'var(--color-ink)', animation: 'spin 1s linear infinite' }} />
                    </div>
                ) : filteredNotebooks.length > 0 ? (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 'var(--spacing-lg)',
                    }} className="notebook-grid">
                        {filteredNotebooks.map((notebook) => (
                            <Link href={`/dashboard/${notebook.id}`} key={notebook.id} style={{ textDecoration: 'none' }}>
                                <div
                                    className="notebook-card"
                                    style={{
                                        background: 'var(--color-surface-card)',
                                        borderRadius: 'var(--rounded-lg)',
                                        padding: 'var(--spacing-lg)',
                                        border: '1px solid var(--color-hairline-strong)',
                                        cursor: 'pointer',
                                        transition: 'box-shadow 0.2s ease',
                                        position: 'relative',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)')}
                                    onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                                >
                                    {/* Delete Button - Admin Only */}
                                    {userRole === 'admin' && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setDeletingNotebook(notebook)
                                            }}
                                            className="notebook-delete-btn"
                                            style={{
                                                position: 'absolute',
                                                top: 'var(--spacing-sm)',
                                                right: 'var(--spacing-sm)',
                                                padding: 'var(--spacing-xs)',
                                                borderRadius: 'var(--rounded-md)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                opacity: 0,
                                                transition: 'opacity 0.2s',
                                                color: 'var(--color-error)',
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}

                                    {/* Folder icon plate */}
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        background: 'var(--color-surface-strong)',
                                        borderRadius: 'var(--rounded-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        <FolderOpen size={20} style={{ color: 'var(--color-ink)' }} />
                                    </div>

                                    {/* Notebook title */}
                                    <h3
                                        className="typo-title-md"
                                        style={{
                                            color: 'var(--color-ink)',
                                            marginTop: 'var(--spacing-sm)',
                                            marginBottom: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                    >
                                        {notebook.name}
                                    </h3>

                                    {/* Doc count + date */}
                                    <div style={{
                                        marginTop: 'auto',
                                        paddingTop: 'var(--spacing-sm)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-md)',
                                    }}>
                                        <div className="typo-body-sm" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xxs)', color: 'var(--color-text-link)' }}>
                                            <FileText size={14} />
                                            <span>{notebook.document_count} documents</span>
                                        </div>
                                        <div className="typo-body-sm" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xxs)', color: 'var(--color-muted)' }}>
                                            <Clock size={14} />
                                            <span>{formatDate(notebook.created_at)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 'var(--spacing-section) 0',
                        textAlign: 'center',
                        border: '2px dashed var(--color-hairline)',
                        borderRadius: 'var(--rounded-xl)',
                        background: 'var(--color-surface-card)',
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'var(--color-surface-strong)',
                            borderRadius: 'var(--rounded-full)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 'var(--spacing-base)',
                        }}>
                            <FolderOpen size={24} style={{ color: 'var(--color-muted)' }} />
                        </div>
                        <h3 className="typo-title-md" style={{ color: 'var(--color-ink)', marginBottom: 'var(--spacing-xs)' }}>
                            No notebooks yet
                        </h3>
                        <p className="typo-body-sm" style={{ color: 'var(--color-muted)', marginBottom: 'var(--spacing-lg)', maxWidth: '320px' }}>
                            Create your first notebook to start organizing and analyzing your documents.
                        </p>
                        <Button onClick={() => setShowCreateModal(true)} style={{ gap: 'var(--spacing-xs)' }}>
                            <Plus size={16} />
                            Create Notebook
                        </Button>
                    </div>
                )}
            </main>

            {/* ── Create Notebook Modal ── */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: 'var(--spacing-base)',
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '420px',
                        background: 'var(--color-canvas)',
                        borderRadius: 'var(--rounded-xl)',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: 'var(--color-surface-strong)',
                                    borderRadius: 'var(--rounded-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <FolderOpen size={18} style={{ color: 'var(--color-ink)' }} />
                                </div>
                                <h2 className="typo-title-md" style={{ color: 'var(--color-ink)', margin: 0 }}>Create Notebook</h2>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-muted)',
                                    padding: 'var(--spacing-xxs)',
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '0 var(--spacing-lg) var(--spacing-lg)' }}>
                            <label className="typo-body-sm" style={{ color: 'var(--color-body)', display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                                Notebook Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Research Notes Q1 2026"
                                value={newNotebookName}
                                onChange={(e) => setNewNotebookName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
                                autoFocus
                                style={{
                                    width: '100%',
                                    height: '44px',
                                    padding: 'var(--spacing-sm) var(--spacing-base)',
                                    background: 'var(--color-surface-card)',
                                    border: '1px solid var(--color-hairline-strong)',
                                    borderRadius: 'var(--rounded-md)',
                                    fontFamily: 'var(--font-body)',
                                    fontSize: '14px',
                                    color: 'var(--color-ink)',
                                    outline: 'none',
                                }}
                            />

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-base)' }}>
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateNotebook}
                                    disabled={!newNotebookName.trim() || isCreating}
                                    style={{ flex: 1 }}
                                >
                                    {isCreating ? (
                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                        "Create"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deletingNotebook && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 50,
                    padding: 'var(--spacing-base)',
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '420px',
                        background: 'var(--color-canvas)',
                        borderRadius: 'var(--rounded-xl)',
                        padding: 'var(--spacing-lg)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-base)' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(198,69,69,0.1)',
                                borderRadius: 'var(--rounded-full)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
                            </div>
                            <div>
                                <h2 className="typo-title-md" style={{ color: 'var(--color-ink)', margin: 0 }}>Delete Notebook</h2>
                                <p className="typo-caption" style={{ color: 'var(--color-muted)', margin: 0 }}>This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="typo-body-sm" style={{ color: 'var(--color-body)', marginBottom: 'var(--spacing-lg)' }}>
                            Are you sure you want to delete <strong style={{ color: 'var(--color-ink)' }}>"{deletingNotebook.name}"</strong>?
                            This will permanently delete all documents, embeddings, and chat history.
                        </p>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <Button
                                variant="outline"
                                onClick={() => setDeletingNotebook(null)}
                                disabled={isDeleting}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDeleteNotebook}
                                disabled={isDeleting}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                            >
                                {isDeleting ? (
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Delete
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Pricing Modal ── */}
            {showPricingModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: 'var(--spacing-base)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '1100px',
                        background: '#0a0a0a',
                        borderRadius: 'var(--rounded-xxl)',
                        position: 'relative',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <button
                            onClick={() => setShowPricingModal(false)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'white',
                                padding: '8px',
                                borderRadius: '50%',
                                zIndex: 10
                            }}
                        >
                            <X size={24} />
                        </button>
                        <PricingSection 
                            currentPlan={user?.plan} 
                            userId={user?.id}
                            onPlanUpdated={() => {
                                // Refresh user data
                                window.location.reload()
                            }}
                        />
                    </div>
                </div>
            )}

            {/* ── Responsive Grid Styles ── */}
            <style jsx global>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .notebook-card:hover .notebook-delete-btn {
                    opacity: 1 !important;
                }
                @media (max-width: 1024px) {
                    .notebook-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                @media (max-width: 640px) {
                    .notebook-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    )
}
