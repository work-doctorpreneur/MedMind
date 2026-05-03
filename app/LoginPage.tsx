"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/utils/supabase/client"

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showEmailVerification, setShowEmailVerification] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: ""
    })

    const handleCloseVerification = () => {
        setShowEmailVerification(false)
        setIsLogin(true) // Switch to login form
        setFormData({ ...formData, password: "" }) // Clear password for security
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                })

                if (error) throw error
                router.push("/dashboard")
                router.refresh()
            } else {
                const { error } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                    options: {
                        data: {
                            first_name: formData.firstName,
                            last_name: formData.lastName,
                        },
                    },
                })

                if (error) throw error

                // Show email verification popup
                setShowEmailVerification(true)
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during authentication")
        } finally {
            setIsLoading(false)
        }
    }


    return (
        <div className="min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden" style={{ background: 'var(--color-surface-dark)' }}>
                {/* Subtle dark mode background decorations */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl animate-pulse" style={{ background: 'var(--color-on-dark)' }}></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000" style={{ background: 'var(--color-on-dark)' }}></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-2xl" style={{ background: 'var(--color-surface-dark-elevated)' }}>
                            <Image src="/logo.png" alt="MedMind Logo" width={32} height={32} />
                        </div>
                        <span className="typo-display-md" style={{ color: 'var(--color-on-dark)' }}>MedMind</span>
                    </div>
                    <p className="typo-body-md max-w-md" style={{ color: 'var(--color-on-dark-soft)' }}>
                        Your AI-powered medical second brain. Upload documents, get insights, and never miss critical information again.
                    </p>
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface-dark-elevated)' }}>
                            <Sparkles className="w-5 h-5" style={{ color: 'var(--color-on-dark)' }} />
                        </div>
                        <div>
                            <h3 className="typo-title-md" style={{ color: 'var(--color-on-dark)' }}>AI-Powered Analysis</h3>
                            <p className="typo-body-sm" style={{ color: 'var(--color-on-dark-soft)', marginTop: '4px' }}>Deep insights from your medical documents with precise citations</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface-dark-elevated)' }}>
                            <Lock className="w-5 h-5" style={{ color: 'var(--color-on-dark)' }} />
                        </div>
                        <div>
                            <h3 className="typo-title-md" style={{ color: 'var(--color-on-dark)' }}>HIPAA-Grade Security</h3>
                            <p className="typo-body-sm" style={{ color: 'var(--color-on-dark-soft)', marginTop: '4px' }}>Your data is encrypted and isolated. Only you can access it.</p>
                        </div>
                    </div>
                </div>

                <p className="typo-caption relative z-10" style={{ color: 'var(--color-on-dark-soft)' }}>
                    © 2026 MedMind. Built for healthcare professionals.
                </p>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8" style={{ background: 'var(--color-canvas)' }}>
                <Card className="w-full max-w-md border-0" style={{ background: 'var(--color-surface-card)', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', borderRadius: 'var(--rounded-2xl)' }}>
                    <CardHeader className="space-y-1 pb-4">
                        <div className="flex justify-center mb-6 lg:hidden">
                            <div className="p-3 rounded-2xl" style={{ background: 'var(--color-surface-dark)' }}>
                                <Image src="/logo.png" alt="MedMind Logo" width={32} height={32} />
                            </div>
                        </div>
                        <CardTitle className="typo-display-sm text-center" style={{ color: 'var(--color-ink)' }}>
                            {isLogin ? "Welcome back" : "Create your account"}
                        </CardTitle>
                        <CardDescription className="typo-body-sm text-center" style={{ color: 'var(--color-body-soft)', marginTop: '8px' }}>
                            {isLogin
                                ? "Enter your credentials to access your medical brain"
                                : "Start your journey to smarter medical documentation"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {!isLogin && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="typo-title-sm" style={{ color: 'var(--color-ink)' }}>First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-body-soft)' }} />
                                            <Input
                                                placeholder="John"
                                                className="pl-10"
                                                value={formData.firstName}
                                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="typo-title-sm" style={{ color: 'var(--color-ink)' }}>Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-body-soft)' }} />
                                            <Input
                                                placeholder="Doe"
                                                className="pl-10"
                                                value={formData.lastName}
                                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="typo-title-sm" style={{ color: 'var(--color-ink)' }}>Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-body-soft)' }} />
                                    <Input
                                        type="email"
                                        placeholder="doctor@hospital.com"
                                        className="pl-10"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="typo-title-sm" style={{ color: 'var(--color-ink)' }}>Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-body-soft)' }} />
                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-100 transition-opacity"
                                        style={{ color: 'var(--color-body-soft)', opacity: 0.7 }}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                                    <span className="font-medium">Error:</span> {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full mt-6"
                                disabled={isLoading}
                                style={{ borderRadius: 'var(--rounded-lg)' }}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-[var(--color-on-primary)]/30 border-t-[var(--color-on-primary)] rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {isLogin ? "Sign In" : "Create Account"}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="typo-body-sm" style={{ color: 'var(--color-body-soft)' }}>
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="ml-2 font-semibold hover:underline transition-all"
                                    style={{ color: 'var(--color-ink)' }}
                                >
                                    {isLogin ? "Sign up" : "Sign in"}
                                </button>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Email Verification Modal */}
            {showEmailVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md mx-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={handleCloseVerification}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center">
                            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-2">
                                Check your email
                            </h3>

                            <p className="text-muted-foreground mb-4">
                                We've sent a verification link to<br />
                                <span className="font-medium text-foreground">{formData.email}</span>
                            </p>

                            <p className="text-sm text-muted-foreground mb-6">
                                Click the link in your email to verify your account, then come back here to sign in.
                            </p>

                            <Button
                                variant="gradient"
                                className="w-full"
                                onClick={handleCloseVerification}
                            >
                                Got it, take me to login
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
