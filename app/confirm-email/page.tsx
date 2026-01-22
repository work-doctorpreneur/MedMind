"use client"

import { Brain, Mail, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function ConfirmEmailPage() {
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

                <div className="relative z-10">
                    <p className="text-white/50 text-sm">
                        © 2026 MedMind. Built for healthcare professionals.
                    </p>
                </div>
            </div>

            {/* Right Panel - Confirmation Message */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <Card className="w-full max-w-md border-0 shadow-2xl">
                    <CardContent className="pt-8 pb-8 text-center">
                        {/* Success Icon */}
                        <div className="mb-6 flex justify-center">
                            <div className="relative">
                                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                                    <Mail className="w-12 h-12 text-green-600 dark:text-green-400" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-gray-800 rounded-full shadow-lg">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Check your email
                        </h1>

                        {/* Description */}
                        <p className="text-muted-foreground mb-6">
                            We've sent a confirmation link to your email address.
                            Please click the link to verify your account and get started.
                        </p>

                        {/* Info Box */}
                        <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left">
                            <h3 className="font-medium text-sm text-foreground mb-2">What's next?</h3>
                            <ul className="text-sm text-muted-foreground space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="font-semibold text-primary">1.</span>
                                    Open the email from MedMind
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-semibold text-primary">2.</span>
                                    Click the confirmation link
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-semibold text-primary">3.</span>
                                    Start using your medical brain!
                                </li>
                            </ul>
                        </div>

                        {/* Didn't receive email */}
                        <p className="text-sm text-muted-foreground mb-4">
                            Didn't receive the email? Check your spam folder or try signing up again.
                        </p>

                        {/* Back to Sign In */}
                        <Link href="/">
                            <Button variant="gradient" className="w-full">
                                Back to Sign In
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
