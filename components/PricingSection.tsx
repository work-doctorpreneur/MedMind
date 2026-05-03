"use client"

import { useState } from "react"
import { Check, Loader2, Sparkles, Zap, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import Script from "next/script"

interface PricingSectionProps {
    currentPlan?: string
    userId?: string
    onPlanUpdated?: () => void
}

export function PricingSection({ currentPlan = "free", userId, onPlanUpdated }: PricingSectionProps) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState<string | null>(null)

    const handleStartTrial = async () => {
        setIsLoading("trial")
        try {
            const response = await fetch("/api/trial/start", { method: "POST" })
            const data = await response.json()

            if (!response.ok) throw new Error(data.error || "Failed to start trial")

            toast({
                title: "Trial Started!",
                description: "You now have 7 days of full access (except AI Chat).",
            })
            onPlanUpdated?.()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            })
        } finally {
            setIsLoading(null)
        }
    }

    const handleYearlyPayment = async () => {
        setIsLoading("yearly")
        try {
            // 1. Create order on server
            const orderResponse = await fetch("/api/razorpay/order", { method: "POST" })
            const order = await orderResponse.json()

            if (!orderResponse.ok) throw new Error(order.error || "Failed to create order")

            // 2. Open Razorpay Checkout
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "MedMind",
                description: "Yearly Pro Membership",
                order_id: order.id,
                handler: function (response: any) {
                    toast({
                        title: "Payment Successful",
                        description: "Your account is being upgraded. It might take a moment.",
                    })
                    onPlanUpdated?.()
                },
                prefill: {
                    name: "",
                    email: "",
                },
                notes: {
                    userId: userId,
                    planType: "yearly",
                },
                theme: {
                    color: "#3b82f6",
                },
            }

            const rzp = new (window as any).Razorpay(options)
            rzp.open()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Payment Error",
                description: error.message,
            })
        } finally {
            setIsLoading(null)
        }
    }

    const plans = [
        {
            name: "Free",
            price: "₹0",
            description: "Basic medical note organization",
            features: ["Basic Notebooks", "PDF Uploads", "Study Reports", "Community Access"],
            buttonText: currentPlan === "free" ? "Current Plan" : "Downgrade",
            buttonVariant: "outline" as const,
            disabled: currentPlan === "free",
            icon: <Zap className="w-5 h-5 text-gray-400" />,
        },
        {
            name: "7-Day Trial",
            price: "₹0",
            description: "Experience the power of MedMind",
            features: ["All Free Features", "Priority Processing", "Advanced Mind Maps", "Audio Explanations", "No AI Chat"],
            buttonText: currentPlan === "trial" ? "Trial Active" : "Start Trial",
            buttonVariant: "secondary" as const,
            onClick: handleStartTrial,
            disabled: currentPlan !== "free" || isLoading !== null,
            icon: <Sparkles className="w-5 h-5 text-purple-400" />,
            highlight: true,
        },
        {
            name: "Yearly Pro",
            price: "₹999",
            period: "/year",
            description: "The ultimate tool for medical students",
            features: ["Everything in Trial", "Full AI Chat Access", "Unlimited Storage", "Early Feature Access", "Dedicated Support"],
            buttonText: currentPlan === "yearly" ? "Plan Active" : "Upgrade Now",
            buttonVariant: "default" as const,
            onClick: handleYearlyPayment,
            disabled: currentPlan === "yearly" || isLoading !== null,
            icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
            popular: true,
        },
    ]

    return (
        <section className="py-12 px-4 max-w-6xl mx-auto">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Choose Your Plan
                </h2>
                <p className="mt-4 text-lg text-gray-400">
                    Unlock the full potential of AI-powered medical learning.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <Card
                        key={plan.name}
                        className={`relative flex flex-col border-gray-800 bg-gray-900/50 backdrop-blur-sm transition-all hover:scale-105 ${
                            plan.popular ? "ring-2 ring-blue-500 shadow-xl shadow-blue-500/10" : ""
                        }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                Best Value
                            </div>
                        )}
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-2">
                                {plan.icon}
                                <CardTitle className="text-xl text-white">{plan.name}</CardTitle>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-bold text-white">{plan.price}</span>
                                {plan.period && <span className="text-gray-400">{plan.period}</span>}
                            </div>
                            <CardDescription className="text-gray-400 mt-2">
                                {plan.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <ul className="space-y-3">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                                        <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                variant={plan.buttonVariant}
                                onClick={plan.onClick}
                                disabled={plan.disabled}
                            >
                                {isLoading === plan.name.toLowerCase().split("-")[1] || (isLoading === "trial" && plan.name.includes("Trial")) ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                {plan.buttonText}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </section>
    )
}
