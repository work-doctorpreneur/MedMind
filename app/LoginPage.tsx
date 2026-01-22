"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Mail, Lock, User, Eye, EyeOff, ArrowRight, Sparkles, CheckCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
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
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] p-12 flex-col justify-between relative overflow-hidden">
                {/* Animated background elements */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-3xl font-bold text-white">MedMind</span>
                    </div>
                    <p className="text-white/80 text-lg max-w-md">
                        Your AI-powered medical second brain. Upload documents, get insights, and never miss critical information again.
                    </p>
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">AI-Powered Analysis</h3>
                            <p className="text-white/70 text-sm">Deep insights from your medical documents with precise citations</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Lock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">HIPAA-Grade Security</h3>
                            <p className="text-white/70 text-sm">Your data is encrypted and isolated. Only you can access it.</p>
                        </div>
                    </div>
                </div>

                <p className="text-white/50 text-sm relative z-10">
                    © 2026 MedMind. Built for healthcare professionals.
                </p>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <Card className="w-full max-w-md border-0 shadow-2xl">
                    <CardHeader className="space-y-1 text-center pb-2">
                        <div className="flex justify-center mb-4 lg:hidden">
                            <div className="p-3 bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] rounded-2xl">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">
                            {isLogin ? "Welcome back" : "Create your account"}
                        </CardTitle>
                        <CardDescription>
                            {isLogin
                                ? "Enter your credentials to access your medical brain"
                                : "Start your journey to smarter medical documentation"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isLogin && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">First Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                                        <label className="text-sm font-medium text-foreground">Last Name</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                                <label className="text-sm font-medium text-foreground">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                                <label className="text-sm font-medium text-foreground">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                                variant="gradient"
                                className="w-full mt-6"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {isLogin ? "Sign In" : "Create Account"}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="ml-1 text-primary font-medium hover:underline"
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
