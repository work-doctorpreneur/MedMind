"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Brain,
    Users,
    UserX,
    FileText,
    Type,
    Volume2,
    Search,
    Trash2,
    Archive,
    Moon,
    Sun,
    LogOut,
    ArrowUpDown,
    UserPlus,
    Mail,
    Lock,
    User
} from "lucide-react"
import Link from "next/link"

// Mock stats
const stats = [
    { label: "Active Users", value: "127", icon: Users, color: "text-green-500", bgColor: "bg-green-500/10" },
    { label: "Archived Users", value: "23", icon: UserX, color: "text-orange-500", bgColor: "bg-orange-500/10" },
    { label: "Total Documents", value: "2,847", icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { label: "Text Tokens Used", value: "12.4M", icon: Type, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { label: "Audio Tokens Used", value: "3.2M", icon: Volume2, color: "text-pink-500", bgColor: "bg-pink-500/10" },
]

// Mock users
const mockUsers = [
    { id: "1", firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@hospital.com", documents: 124, textTokens: 450000, audioTokens: 120000, joined: "Dec 15, 2025", status: "active" },
    { id: "2", firstName: "Michael", lastName: "Chen", email: "m.chen@clinic.org", documents: 89, textTokens: 320000, audioTokens: 85000, joined: "Dec 20, 2025", status: "active" },
    { id: "3", firstName: "Emily", lastName: "Davis", email: "emily.davis@medcenter.com", documents: 56, textTokens: 180000, audioTokens: 45000, joined: "Dec 28, 2025", status: "active" },
    { id: "4", firstName: "James", lastName: "Wilson", email: "james.w@hospital.com", documents: 34, textTokens: 95000, audioTokens: 0, joined: "Jan 1, 2026", status: "archived" },
]

export default function AdminDashboard() {
    const [darkMode, setDarkMode] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newUser, setNewUser] = useState({ firstName: "", lastName: "", email: "", password: "" })

    const filteredUsers = mockUsers.filter(user =>
        `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const toggleDarkMode = () => {
        setDarkMode(!darkMode)
        document.documentElement.classList.toggle("dark")
    }

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K'
        return num.toString()
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Navbar */}
            <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/admin" className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-xl">
                                <Brain className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold gradient-text">MedMind</span>
                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">Admin</span>
                            </div>
                        </Link>

                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleDarkMode}
                                className="rounded-full"
                            >
                                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </Button>

                            <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:text-destructive hover:bg-destructive/10">
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    {stats.map((stat) => (
                        <Card key={stat.label} className="relative overflow-hidden">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                                        <p className="text-2xl font-bold">{stat.value}</p>
                                    </div>
                                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* User Management */}
                <Card>
                    <CardHeader className="border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <CardTitle>User Management</CardTitle>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        className="pl-10 w-64"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button variant="gradient" className="gap-2" onClick={() => setShowCreateModal(true)}>
                                    <UserPlus className="w-4 h-4" />
                                    Add Doctor
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">
                                            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                                                Full Name
                                                <ArrowUpDown className="w-3 h-3" />
                                            </button>
                                        </th>
                                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Email</th>
                                        <th className="text-right p-4 font-medium text-sm text-muted-foreground">Documents</th>
                                        <th className="text-right p-4 font-medium text-sm text-muted-foreground">Text Tokens</th>
                                        <th className="text-right p-4 font-medium text-sm text-muted-foreground">Audio Tokens</th>
                                        <th className="text-left p-4 font-medium text-sm text-muted-foreground">Joined</th>
                                        <th className="text-center p-4 font-medium text-sm text-muted-foreground">Status</th>
                                        <th className="text-center p-4 font-medium text-sm text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-white font-medium text-sm">
                                                        {user.firstName[0]}{user.lastName[0]}
                                                    </div>
                                                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-muted-foreground">{user.email}</td>
                                            <td className="p-4 text-right font-medium">{user.documents}</td>
                                            <td className="p-4 text-right font-medium">{formatNumber(user.textTokens)}</td>
                                            <td className="p-4 text-right font-medium">{formatNumber(user.audioTokens)}</td>
                                            <td className="p-4 text-muted-foreground">{user.joined}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.status === 'active'
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : 'bg-orange-500/10 text-orange-600'
                                                    }`}>
                                                    {user.status === 'active' ? 'Active' : 'Archived'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                                        title="Archive User"
                                                    >
                                                        <Archive className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12">
                                <div className="p-4 bg-muted rounded-full w-fit mx-auto mb-4">
                                    <Users className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No users found</h3>
                                <p className="text-muted-foreground">Try a different search term</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Create User Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    Add New Doctor
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="John"
                                                className="pl-10"
                                                value={newUser.firstName}
                                                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Doe"
                                                className="pl-10"
                                                value={newUser.lastName}
                                                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder="doctor@hospital.com"
                                            className="pl-10"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10"
                                            value={newUser.password}
                                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="gradient" className="flex-1">
                                        Create Account
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
