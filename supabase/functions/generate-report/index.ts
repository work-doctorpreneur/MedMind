import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Report type prompts
const reportPrompts: Record<string, { system: string, format: string }> = {
    briefing: {
        system: "You are an expert analyst creating executive briefing documents. Be concise, professional, and highlight key actionable insights.",
        format: `Create a briefing document with these sections:
# Executive Summary
A 2-3 sentence overview of the main topic.

## Key Points
- Bullet points of the most important information

## Critical Insights
The most important takeaways that require attention.

## Recommendations
Actionable next steps based on the content.

## Conclusion
Brief closing summary.`
    },
    study_guide: {
        system: "You are an expert educator creating comprehensive study guides. Make content easy to understand with clear explanations.",
        format: `Create a study guide with these sections:
# Study Guide: [Topic]

## Learning Objectives
What the reader will learn from this material.

## Core Concepts
### [Concept 1]
Detailed explanation...

### [Concept 2]
Detailed explanation...

## Key Terminology
- **Term**: Definition

## Summary
Recap of the main points.

## Review Questions
Questions to test understanding.`
    },
    faq: {
        system: "You are creating a comprehensive FAQ document. Anticipate common questions and provide clear, helpful answers.",
        format: `Create an FAQ document:
# Frequently Asked Questions

## General Questions

### Q: [Question 1]?
**A:** [Clear, comprehensive answer]

### Q: [Question 2]?
**A:** [Clear, comprehensive answer]

## Technical/Detailed Questions

### Q: [Question]?
**A:** [Detailed answer]

## Additional Resources
Links or suggestions for further learning.`
    },
    timeline: {
        system: "You are creating a chronological timeline of events, milestones, or developments. Focus on dates and progression.",
        format: `Create a timeline document:
# Timeline: [Topic]

## Overview
Brief context about what this timeline covers.

## Timeline of Events

### [Date/Period 1]
**[Event/Milestone]**
Description of what happened and its significance.

### [Date/Period 2]
**[Event/Milestone]**
Description...

## Key Milestones Summary
- [Milestone]: [Significance]

## Future Outlook
What might come next based on the progression.`
    }
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { notebook_id, user_id, report_type } = await req.json()

        if (!notebook_id || !user_id || !report_type) {
            return new Response(
                JSON.stringify({ success: false, error: 'Missing required parameters' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey)

        // Get documents for this notebook
        const { data: documents, error: docsError } = await supabase
            .from('documents')
            .select('id, filename')
            .eq('notebook_id', notebook_id)

        if (docsError || !documents?.length) {
            return new Response(
                JSON.stringify({ success: false, error: 'No documents found in notebook' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Get embeddings with summaries for these documents
        const docIds = documents.map(d => d.id)
        const { data: embeddings, error: embError } = await supabase
            .from('embeddings')
            .select('content, summary, tags, document_id')
            .in('document_id', docIds)

        // Log the error but continue - we can still generate a report from document names
        if (embError) {
            console.error('Embeddings fetch error:', embError)
        }

        // Build document context - even if no embeddings, use document names
        const docMap = new Map(documents.map(d => [d.id, d.filename]))
        let context = ''
        const allTags = new Set<string>()

        if (embeddings && embeddings.length > 0) {
            embeddings.forEach(emb => {
                const filename = docMap.get(emb.document_id) || 'Unknown'
                if (emb.summary) {
                    context += `\n\n## ${filename}\n**Summary:** ${emb.summary}\n`
                }
                if (emb.content) {
                    context += `**Content:** ${emb.content.substring(0, 2000)}...\n`
                }
                if (emb.tags && Array.isArray(emb.tags)) {
                    emb.tags.forEach((tag: string) => allTags.add(tag))
                }
            })
        } else {
            // Fallback: just use document names
            context = 'Documents in this notebook:\n'
            documents.forEach(doc => {
                context += `- ${doc.filename}\n`
            })
        }

        const tagsString = Array.from(allTags).join(', ')

        // Get report type configuration
        const reportConfig = reportPrompts[report_type] || reportPrompts.briefing

        // Initialize Gemini
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
            return new Response(
                JSON.stringify({ success: false, error: 'Gemini API key not configured' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const genAI = new GoogleGenerativeAI(geminiApiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

        const prompt = `${reportConfig.system}

Based on the following document content, create a well-structured report.

**Document Content:**
${context}

**Relevant Topics:** ${tagsString}

**Format Instructions:**
${reportConfig.format}

Generate a comprehensive, well-formatted markdown report. Use proper headings, bullet points, and formatting. Make the content informative and useful.`

        const result = await model.generateContent(prompt)
        const report = result.response.text()

        return new Response(
            JSON.stringify({ success: true, report, report_type }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Report generation error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Failed to generate report' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
