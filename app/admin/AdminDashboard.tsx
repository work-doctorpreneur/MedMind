"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { CSSProperties, ElementType } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Loader2,
    LogOut,
    Mail,
    Moon,
    Search,
    Shield,
    Sun,
    User,
    UserCheck,
    UserPlus,
    UserX,
    Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createClient } from "@/utils/supabase/client"

type AdminUser = {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
    role: "admin" | "doctor" | string | null
    plan: string | null
    status: "active" | "suspended" | string | null
    created_at: string | null
}

type NewDoctor = {
    first_name: string
    last_name: string
    email: string
    password: string
}



export default function AdminDashboard() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])
    const [darkMode, setDarkMode] = useState(false)
    const [users, setUsers] = useState<AdminUser[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")
    const [busyUserId, setBusyUserId] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newDoctor, setNewDoctor] = useState<NewDoctor>({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
    })

    useEffect(() => {
        const savedDarkMode = localStorage.getItem("medmind-dark-mode") === "true"
        setDarkMode(savedDarkMode)
        document.documentElement.classList.toggle("dark", savedDarkMode)
    }, [])



    const loadUsers = useCallback(async () => {
        setIsLoading(true)
        setError("")

        try {
            const { data, error: supabaseError } = await supabase
                .from('profiles')
                .select('id, email, first_name, last_name, role, plan, status, created_at')
                .order('email')

            if (supabaseError) throw supabaseError

            setUsers(data || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load users")
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        loadUsers()
    }, [loadUsers])

    const filteredUsers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return users

        return users.filter((user) => {
            const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()
            return `${fullName} ${user.email || ""} ${user.role || ""} ${user.plan || ""}`
                .toLowerCase()
                .includes(query)
        })
    }, [searchQuery, users])

    const stats = useMemo(() => {
        const active = users.filter((user) => (user.status || "active") === "active").length
        const suspended = users.filter((user) => user.status === "suspended").length
        const admins = users.filter((user) => user.role === "admin").length
        const paid = users.filter((user) => (user.plan || "free") !== "free").length

        return [
            { label: "Total Users", value: users.length, icon: Users },
            { label: "Active", value: active, icon: UserCheck },
            { label: "Inactive", value: suspended, icon: UserX },
            { label: "Admins", value: admins, icon: Shield },
            { label: "Paid Plans", value: paid, icon: CheckCircle2 },
        ]
    }, [users])

    const toggleDarkMode = () => {
        const nextDarkMode = !darkMode
        setDarkMode(nextDarkMode)
        localStorage.setItem("medmind-dark-mode", String(nextDarkMode))
        document.documentElement.classList.toggle("dark", nextDarkMode)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.refresh()
        router.push("/")
    }

    const updateUserStatus = async (userId: string, status: "active" | "suspended") => {
        setBusyUserId(userId)
        setError("")

        try {
            const { data, error: supabaseError } = await supabase
                .from('profiles')
                .update({ status })
                .eq('id', userId)
                .select()
                .single()

            if (supabaseError) throw supabaseError

            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user.id === userId ? { ...user, status: data.status || status } : user
                )
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to update user status")
        } finally {
            setBusyUserId(null)
        }
    }

    const updateUserPlan = async (userId: string, plan: string) => {
        setBusyUserId(userId)
        setError("")

        try {
            const { data, error: supabaseError } = await supabase
                .from('profiles')
                .update({ plan })
                .eq('id', userId)
                .select()
                .single()

            if (supabaseError) throw supabaseError

            setUsers((currentUsers) =>
                currentUsers.map((user) =>
                    user.id === userId ? { ...user, plan: data.plan || plan } : user
                )
            )
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to update user plan")
        } finally {
            setBusyUserId(null)
        }
    }

    const createDoctor = async () => {
        if (!newDoctor.email.trim() || !newDoctor.password.trim()) return

        setIsCreating(true)
        setError("")

        try {
            const response = await fetch("/api/admin/users", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newDoctor),
            })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Unable to create doctor")
            }

            setShowCreateModal(false)
            setNewDoctor({ first_name: "", last_name: "", email: "", password: "" })
            await loadUsers()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to create doctor")
        } finally {
            setIsCreating(false)
        }
    }

    const initialsFor = (user: AdminUser) => {
        const first = user.first_name?.[0] || user.email?.[0] || "U"
        const last = user.last_name?.[0] || ""
        return `${first}${last}`.toUpperCase()
    }

    const displayNameFor = (user: AdminUser) => {
        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim()
        return fullName || user.email || "Unknown user"
    }

    const formatDate = (value: string | null) => {
        if (!value) return "Unknown"
        return new Date(value).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    return (
        <div style={{ minHeight: "100vh", background: "var(--color-canvas)" }}>
            <nav style={{
                height: "64px",
                background: "var(--color-canvas)",
                borderBottom: "1px solid var(--color-hairline)",
                position: "sticky",
                top: 0,
                zIndex: 50,
            }}>
                <div style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "0 var(--spacing-lg)",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)", textDecoration: "none" }}>
                        <Image src="/logo.png" alt="MedMind Logo" width={28} height={28} />
                        <span className="typo-title-md" style={{ color: "var(--color-ink)" }}>MedMind</span>
                        <span style={{
                            padding: "3px 8px",
                            border: "1px solid var(--color-hairline-strong)",
                            borderRadius: "var(--rounded-md)",
                            color: "var(--color-body)",
                            fontSize: "12px",
                            fontWeight: 700,
                        }}>
                            Admin
                        </span>
                    </Link>

                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                        <Link href="/dashboard" style={{ textDecoration: "none", marginRight: "var(--spacing-xs)" }}>
                            <Button variant="outline" size="sm" style={{ height: "32px" }}>
                                Back to Notebooks
                            </Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={toggleDarkMode} title="Toggle theme">
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
                            <LogOut size={18} />
                        </Button>
                    </div>
                </div>
            </nav>

            <main style={{
                maxWidth: "1200px",
                margin: "0 auto",
                padding: "var(--spacing-xxl) var(--spacing-lg) var(--spacing-section)",
            }}>
                <div style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "var(--spacing-lg)",
                    marginBottom: "var(--spacing-xl)",
                }}>
                    <div>
                        <h1 className="typo-display-md" style={{ color: "var(--color-ink)", margin: 0 }}>
                            Admin Dashboard
                        </h1>
                        <p className="typo-body-md" style={{ color: "var(--color-body)", marginTop: "var(--spacing-xs)" }}>
                            Manage doctors, plans, and account access.
                        </p>
                    </div>
                    <Button onClick={() => setShowCreateModal(true)} style={{ gap: "var(--spacing-xs)" }}>
                        <UserPlus size={16} />
                        Add Doctor
                    </Button>
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "var(--spacing-base)",
                    marginBottom: "var(--spacing-xl)",
                }}>
                    {stats.map((stat) => (
                        <Card key={stat.label} style={{ borderRadius: "var(--rounded-md)" }}>
                            <CardContent className="p-4">
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-sm)" }}>
                                    <div>
                                        <p className="typo-body-sm" style={{ color: "var(--color-muted)", margin: 0 }}>{stat.label}</p>
                                        <p className="typo-title-lg" style={{ color: "var(--color-ink)", margin: "4px 0 0" }}>{stat.value}</p>
                                    </div>
                                    <stat.icon size={20} style={{ color: "var(--color-muted)", flexShrink: 0 }} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {error && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--spacing-xs)",
                        padding: "var(--spacing-sm) var(--spacing-base)",
                        border: "1px solid var(--color-error)",
                        borderRadius: "var(--rounded-md)",
                        color: "var(--color-error)",
                        marginBottom: "var(--spacing-base)",
                    }}>
                        <AlertCircle size={16} />
                        <span className="typo-body-sm">{error}</span>
                    </div>
                )}

                <Card style={{ borderRadius: "var(--rounded-md)", overflow: "hidden" }}>
                    <CardHeader className="border-b" style={{ borderColor: "var(--color-hairline)" }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "var(--spacing-base)",
                        }}>
                            <CardTitle>User Management</CardTitle>
                            <div style={{ position: "relative", width: "320px", maxWidth: "100%" }}>
                                <Search size={16} style={{
                                    position: "absolute",
                                    left: "var(--spacing-base)",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--color-muted)",
                                }} />
                                <Input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search users..."
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-section) 0" }}>
                                <Loader2 size={30} style={{ color: "var(--color-ink)", animation: "spin 1s linear infinite" }} />
                            </div>
                        ) : (
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid var(--color-hairline)", background: "var(--color-surface-strong)" }}>
                                            <th className="typo-body-sm" style={tableHeadStyle}>User</th>
                                            <th className="typo-body-sm" style={tableHeadStyle}>Role</th>
                                            <th className="typo-body-sm" style={tableHeadStyle}>Plan</th>
                                            <th className="typo-body-sm" style={tableHeadStyle}>Status</th>
                                            <th className="typo-body-sm" style={tableHeadStyle}>Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((user) => {
                                            const status = user.status || "active"
                                            const isAdmin = user.role === "admin"

                                            return (
                                                <tr key={user.id} style={{ borderBottom: "1px solid var(--color-hairline)" }}>
                                                    <td style={tableCellStyle}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                                                            <div style={avatarStyle}>{initialsFor(user)}</div>
                                                            <div>
                                                                <div className="typo-body-md" style={{ color: "var(--color-ink)", fontWeight: 700 }}>
                                                                    {displayNameFor(user)}
                                                                </div>
                                                                <div className="typo-body-sm" style={{ color: "var(--color-muted)" }}>{user.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={tableCellStyle}>{roleBadge(user.role || "doctor")}</td>
                                                    <td style={tableCellStyle}>
                                                        <PlanDropdown
                                                            plan={user.plan || "free"}
                                                            disabled={busyUserId === user.id}
                                                            onChange={(newPlan) => updateUserPlan(user.id, newPlan)}
                                                        />
                                                    </td>
                                                    <td style={tableCellStyle}>
                                                        <StatusDropdown
                                                            status={status}
                                                            disabled={isAdmin || busyUserId === user.id}
                                                            onChange={(newStatus) => updateUserStatus(user.id, newStatus as "active" | "suspended")}
                                                        />
                                                    </td>
                                                    <td className="typo-body-sm" style={{ ...tableCellStyle, color: "var(--color-body)" }}>
                                                        {formatDate(user.created_at)}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {!isLoading && filteredUsers.length === 0 && (
                            <div style={{ textAlign: "center", padding: "var(--spacing-section) 0" }}>
                                <Users size={32} style={{ color: "var(--color-muted)", margin: "0 auto var(--spacing-sm)" }} />
                                <p className="typo-title-md" style={{ color: "var(--color-ink)", margin: 0 }}>No users found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {showCreateModal && (
                    <div style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 80,
                        background: "rgba(0, 0, 0, 0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "var(--spacing-lg)",
                    }}>
                        <Card style={{ width: "100%", maxWidth: "460px", borderRadius: "var(--rounded-md)" }}>
                            <CardHeader>
                                <CardTitle style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
                                    <UserPlus size={18} />
                                    Add Doctor
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <IconInput icon={User} placeholder="First name" value={newDoctor.first_name} onChange={(value) => setNewDoctor({ ...newDoctor, first_name: value })} />
                                    <IconInput icon={User} placeholder="Last name" value={newDoctor.last_name} onChange={(value) => setNewDoctor({ ...newDoctor, last_name: value })} />
                                </div>
                                <IconInput icon={Mail} placeholder="Email" type="email" value={newDoctor.email} onChange={(value) => setNewDoctor({ ...newDoctor, email: value })} />
                                <IconInput icon={Shield} placeholder="Temporary password" type="password" value={newDoctor.password} onChange={(value) => setNewDoctor({ ...newDoctor, password: value })} />
                                <div style={{ display: "flex", gap: "var(--spacing-sm)", paddingTop: "var(--spacing-sm)" }}>
                                    <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)} disabled={isCreating}>
                                        Cancel
                                    </Button>
                                    <Button className="flex-1" onClick={createDoctor} disabled={isCreating}>
                                        {isCreating && <Loader2 size={14} style={{ animation: "spin 1s linear infinite", marginRight: 8 }} />}
                                        Create
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </div>
    )
}

function IconInput({
    icon: Icon,
    value,
    onChange,
    placeholder,
    type = "text",
}: {
    icon: ElementType
    value: string
    onChange: (value: string) => void
    placeholder: string
    type?: string
}) {
    return (
        <div style={{ position: "relative" }}>
            <Icon size={16} style={{
                position: "absolute",
                left: "var(--spacing-base)",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-muted)",
            }} />
            <Input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="pl-10"
            />
        </div>
    )
}

function roleBadge(role: string) {
    return (
        <span style={{
            ...badgeStyle,
            background: role === "admin" ? "var(--color-surface-dark-elevated)" : "var(--color-surface-strong)",
            color: role === "admin" ? "var(--color-on-dark)" : "var(--color-ink)",
        }}>
            {role}
        </span>
    )
}

const planColors: Record<string, { bg: string; color: string }> = {
    free:  { bg: "var(--color-surface-strong)", color: "var(--color-body)" },
    paid:  { bg: "var(--color-primary)",        color: "var(--color-on-primary)" },
    trial: { bg: "#f59e0b",                     color: "#fff" },
}

function PlanDropdown({ plan, disabled, onChange }: {
    plan: string
    disabled: boolean
    onChange: (plan: string) => void
}) {
    const { bg, color } = planColors[plan] || planColors.free
    return (
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <select
                value={plan}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    ...badgeStyle,
                    background: bg,
                    color,
                    border: "none",
                    cursor: disabled ? "not-allowed" : "pointer",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                    paddingRight: "22px",
                    outline: "none",
                    opacity: disabled ? 0.6 : 1,
                } as CSSProperties}
            >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="trial">Trial</option>
            </select>
            <ChevronDown size={11} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color, pointerEvents: "none" }} />
        </div>
    )
}

function StatusDropdown({ status, disabled, onChange }: {
    status: string
    disabled: boolean
    onChange: (status: "active" | "suspended") => void
}) {
    const isActive = status !== "suspended"
    const displayValue = isActive ? "active" : "inactive"
    return (
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <select
                value={displayValue}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value === "inactive" ? "suspended" : "active")}
                style={{
                    ...badgeStyle,
                    background: isActive ? "var(--color-success)" : "var(--color-error)",
                    color: "var(--color-on-primary)",
                    border: "none",
                    cursor: disabled ? "not-allowed" : "pointer",
                    WebkitAppearance: "none",
                    MozAppearance: "none",
                    appearance: "none",
                    paddingRight: "22px",
                    outline: "none",
                    opacity: disabled ? 0.6 : 1,
                } as CSSProperties}
            >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
            <ChevronDown size={11} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", color: "var(--color-on-primary)", pointerEvents: "none" }} />
        </div>
    )
}

const tableHeadStyle: CSSProperties = {
    padding: "14px 16px",
    textAlign: "left",
    color: "var(--color-muted)",
    fontWeight: 700,
}

const tableCellStyle: CSSProperties = {
    padding: "16px",
    verticalAlign: "middle",
}

const avatarStyle: CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "var(--rounded-md)",
    background: "var(--color-surface-strong)",
    border: "1px solid var(--color-hairline-strong)",
    color: "var(--color-ink)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 800,
    flexShrink: 0,
}

const badgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "26px",
    padding: "0 9px",
    borderRadius: "var(--rounded-md)",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "capitalize",
}
