import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Report type prompts - comprehensive and detailed
const reportPrompts: Record<string, string> = {
    briefing: `You are an expert analyst and strategic consultant. Create a comprehensive briefing document that synthesizes the source materials into an actionable intelligence report.

**Structure Requirements:**
- **Executive Summary** (150-200 words): Open with the most critical takeaways, key decisions needed, and strategic implications. This section must be readable as a standalone piece.
- **Main Themes & Analysis**: Organize content into 3-5 major themes using clear headings. For each theme, provide detailed examination of evidence, supporting data, conflicting viewpoints, and conclusions.
- **Key Insights**: Highlight 5-7 non-obvious insights or patterns that emerge from cross-referencing the sources.
- **Important Quotes**: Include 3-5 particularly significant direct quotes that capture essential arguments or evidence. Attribute each quote properly.
- **Implications & Considerations**: A brief section on what these findings mean for stakeholders or decision-makers.

**Formatting:** Use hierarchical headings (H1, H2, H3), bullet points for lists, and bold text for emphasis on critical points. Include page/source references where specific claims are made.

**Tone:** Objective, analytical, and authoritative. Write for an executive or decision-maker who needs to understand both the details and the big picture quickly. Avoid jargon unless necessary, and define technical terms when first introduced.

**Length:** 1500-2500 words, prioritizing depth and completeness over brevity.

**CRITICAL REQUIREMENTS:**
- Cover ALL major topics mentioned in the source documents
- Do NOT skip any important information or sections
- Each section should be thorough and well-explained
- Maintain logical flow from one topic to the next
- Every claim must be traceable to the source content`,

    study_guide: `You are an experienced educator and curriculum designer specializing in comprehensive learning materials. Create an in-depth study guide that facilitates active learning, critical thinking, and mastery of the source content.

**Structure Requirements:**

**Part 1: Content Overview**
- **Learning Objectives**: List 5-7 specific, measurable learning outcomes students should achieve
- **Core Concepts Summary**: Provide a 300-400 word overview of the main ideas, organized thematically
- **Concept Map or Framework**: Present relationships between key ideas (describe visually if you cannot draw)

**Part 2: Active Recall Quiz**
- **10 Short-Answer Questions**: Design questions that test comprehension and application (not just memorization). Each should require 2-4 sentence responses. Vary difficulty from basic recall to analytical thinking.
- **Answer Key**: Provide complete, detailed answers (3-5 sentences each) that model the level of depth expected. Include explanations of why answers are correct.

**Part 3: Deep Thinking Exercises**
- **5 Essay Questions**: Create questions that demand synthesis, evaluation, and critical analysis. Include:
  - At least one comparative question
  - At least one application question (real-world scenario)
  - At least one evaluation or argument question
- For each essay question, provide: (a) suggested subtopics to address, (b) key sources to reference, (c) estimated word count

**Part 4: Comprehensive Glossary**
- Define 15-25 key terms, concepts, theories, or methodologies
- Each definition should be 2-4 sentences: one sentence for basic definition, additional sentences for context, significance, or examples
- Organize alphabetically
- Include cross-references where terms relate to each other

**Part 5: Additional Resources**
- Suggest 3-5 areas for further exploration based on the sources
- Include discussion prompts that connect concepts to broader themes

**Tone:** Clear, pedagogical, and encouraging. Write as if speaking to a motivated student who wants to truly understand the material, not just pass a test.

**Length:** 2000-3000 words total.

**CRITICAL REQUIREMENTS:**
- Cover ALL major topics mentioned in the source documents
- Do NOT skip any important information or sections
- Each concept should be explained thoroughly
- Maintain logical progression through the material`,

    faq: `You are an expert communicator and knowledge synthesizer specializing in making complex information accessible through question-and-answer formats. Create a comprehensive FAQ (Frequently Asked Questions) document that anticipates and answers the most important questions a reader would have about the source materials.

**Objective:** Transform dense or complex source content into an intuitive, scannable Q&A format that serves as both a quick reference guide and a learning tool. Think of this as the resource someone would want when they need specific answers fast.

**Structure Requirements:**

**Introduction** (100-150 words): 
- Brief overview of what topics/themes the FAQ covers
- Who this FAQ is designed for (target audience)
- How to best use this document (can be read sequentially or used for spot-checking)

**Question Categories:**
Organize questions into 4-6 thematic categories with clear headings. Example categories might include:
- "Understanding the Basics"
- "Key Concepts and Terminology"
- "Practical Applications"
- "Common Misconceptions"
- "Advanced Topics"
- "Implementation and Next Steps"

**Question Development:**
Create 15-25 questions total that represent:
- **Foundational questions** (30%): "What is...?", "Why does...?", "How does... work?"
- **Clarifying questions** (25%): "What's the difference between...?", "Is it true that...?"
- **Application questions** (25%): "How can I...?", "When should...?", "What are best practices for...?"
- **Anticipatory questions** (20%): Address likely concerns, objections, or confusion points

**Answer Format:**
Each answer should:
- **Be direct and complete** (100-250 words): Start with a clear, one-sentence direct answer, then elaborate with context, examples, or qualifications
- **Use layered information**: Essential answer first, then supporting details, then additional nuance
- **Include examples** where they clarify abstract concepts
- **Reference sources** when making specific claims (e.g., "According to [Source]...")
- **Cross-reference related questions** when helpful (e.g., "See also: Question 12")
- **Use formatting**: Bold key phrases, use bullet points for lists within answers, employ short paragraphs

**Question Phrasing:**
- Write questions exactly as a real person would ask them (conversational, natural)
- Vary question types: use What, How, Why, When, Should, Can, Is, Does
- Front-load the most important questions in each category
- Include at least 2-3 "myth-busting" questions that address common misconceptions
- Add 1-2 meta-questions like "What are the most important takeaways?" or "Where should I go to learn more?"

**Special Sections:**

**Quick Reference Box** (at the top): Include 3-5 "need-to-know" facts or numbers that readers most commonly search for

**Glossary Integration**: When introducing technical terms in answers, provide brief inline definitions in parentheses or link to a mini-glossary at the end

**Additional Resources** (at the end): Suggest 2-3 related questions not covered in the FAQ or point to sections of the source materials for deeper dives

**Tone & Style:**
- Approachable and helpful, like a knowledgeable colleague answering questions
- Clear and jargon-free unless technical terms are necessary (then define them)
- Patient and non-condescending—no question is "too basic"
- Confident and authoritative in answers
- Empathetic to reader confusion or concerns

**Formatting for Scannability:**
- Use clear visual hierarchy: Category headings (H2), Questions (H3, bold), Answers (regular text)
- Number questions within categories (e.g., 1.1, 1.2, 2.1, 2.2) for easy reference
- Add extra whitespace between Q&A pairs
- Consider a table of contents at the top for longer FAQs (20+ questions)

**Length:** 2000-3000 words total (including questions and answers)

**CRITICAL REQUIREMENTS:**
- Cover ALL major topics from the source documents
- Ensure comprehensiveness: cover questions 80% of readers would actually ask
- All answers must be fully supported by the source materials`,

    blog_post: `You are a skilled content creator and storytelling expert writing for a modern digital publication that values intellectual depth presented with engaging accessibility—think Medium, Substack, or The Atlantic's digital format.

**Objective:** Transform the source materials into a compelling, thought-provoking article that educates while entertaining. Your readers are curious, intelligent generalists who appreciate nuance but don't want academic density.

**Structure Requirements:**

**Headline**: Craft a compelling, specific headline that promises value and creates curiosity. Use numbers, questions, or bold statements. Test 2-3 options and choose the strongest. Avoid clickbait—deliver on your promise.

**Subheadline/Deck** (optional, 1 sentence): Expand on the headline with additional context or intrigue.

**Opening Hook** (100-150 words): Begin with one of these proven techniques:
- A surprising statistic or counterintuitive fact
- A relatable scenario or anecdote that illustrates the problem
- A provocative question that challenges conventional wisdom
- A vivid scene or moment that embodies the theme

Establish why readers should care RIGHT NOW in the first 2-3 sentences.

**Main Content - Listicle Format**:
Present 5-8 key takeaways as distinct sections. For each:

- **Bold, Specific Subheading**: Make it declarative and intriguing (not just "Point #1")
- **Explanation** (150-250 words): Unpack the idea using:
  - Clear, jargon-free language with short paragraphs (2-4 sentences)
  - Concrete examples, analogies, or real-world applications
  - Context for why this matters or surprises
  - Connection to reader's life or broader implications
- **Featured Quote** (when powerful quotes exist): Pull the most compelling quote from sources as a formatted blockquote. Choose quotes that are eloquent, provocative, or crystallize the point perfectly.
- **Mini-Analysis**: Don't just report—interpret. Why is this insight valuable? What's the hidden implication? How does it challenge assumptions?

**Transitions**: Use smooth connective tissue between sections to create narrative flow, not just a disconnected list.

**Conclusion** (150-200 words): 
- Synthesize the main thread connecting all points
- Zoom out to broader significance or future implications
- End with ONE of these:
  - A thought-provoking question for readers to ponder
  - A powerful call-to-action or next step
  - A memorable closing statement that echoes the opening
  - An invitation for reflection or dialogue

**Tone & Style:**
- Conversational yet intelligent—write as if explaining to a smart friend over coffee
- Use "you" and "we" to create intimacy and involvement
- Vary sentence length: mix short punchy sentences with longer, flowing ones
- Embrace personality and voice, but stay professional
- Balance accessibility with intellectual respect for your audience
- Use active voice and strong verbs
- Occasional humor or wit where appropriate, but never forced

**Formatting for Digital Readability:**
- Abundant whitespace and paragraph breaks
- Bold text for emphasis (sparingly—3-5 instances)
- Blockquotes for standout statements
- Short paragraphs (2-5 sentences)
- Subheadings every 200-300 words

**Length:** 1200-1800 words. Aim for 6-8 minute read time.

**CRITICAL REQUIREMENTS:**
- Include at least 2-3 genuinely surprising or counterintuitive insights from the source
- Cover ALL major topics from the source documents
- Readers should gain actionable knowledge or perspective shifts
- Even as a list, it should feel like a cohesive story`
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

        // Get embeddings with summaries for these documents - ORDERED BY CHUNK INDEX
        const docIds = documents.map(d => d.id)
        const { data: embeddings, error: embError } = await supabase
            .from('embeddings')
            .select('content, chunk_text, summary, tags, document_id, chunk_index')
            .in('document_id', docIds)
            .order('document_id', { ascending: true })
            .order('chunk_index', { ascending: true })

        // Log the error but continue
        if (embError) {
            console.error('Embeddings fetch error:', embError)
        }

        // Build document context with MUCH MORE content
        const docMap = new Map(documents.map(d => [d.id, d.filename]))
        let context = ''
        const allTags = new Set<string>()
        let totalContentLength = 0
        const MAX_CONTENT_LENGTH = 25000 // Increased from 2000 to 25000 chars

        if (embeddings && embeddings.length > 0) {
            // Group embeddings by document for better organization
            const embeddingsByDoc = new Map<string, typeof embeddings>()
            embeddings.forEach(emb => {
                const docId = emb.document_id
                if (!embeddingsByDoc.has(docId)) {
                    embeddingsByDoc.set(docId, [])
                }
                embeddingsByDoc.get(docId)!.push(emb)
            })

            // Process each document
            embeddingsByDoc.forEach((docEmbeddings, docId) => {
                const filename = docMap.get(docId) || 'Unknown'
                context += `\n\n---\n## Document: ${filename}\n---\n`

                // Collect summaries first
                const summaries = docEmbeddings
                    .filter(e => e.summary)
                    .map(e => e.summary)

                if (summaries.length > 0) {
                    context += `\n### Key Summaries:\n${summaries.join('\n')}\n`
                }

                // Then add content in order, respecting max length
                context += `\n### Content:\n`
                docEmbeddings.forEach(emb => {
                    const contentText = emb.chunk_text || emb.content || ''
                    if (contentText && totalContentLength < MAX_CONTENT_LENGTH) {
                        const remainingSpace = MAX_CONTENT_LENGTH - totalContentLength
                        const chunkToAdd = contentText.substring(0, remainingSpace)
                        context += chunkToAdd + '\n\n'
                        totalContentLength += chunkToAdd.length
                    }

                    // Collect tags
                    if (emb.tags && Array.isArray(emb.tags)) {
                        emb.tags.forEach((tag: string) => allTags.add(tag))
                    }
                })
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
        const reportPrompt = reportPrompts[report_type] || reportPrompts.briefing

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

        // Build the comprehensive prompt
        const prompt = `${reportPrompt}

---

## SOURCE DOCUMENT CONTENT:

${context}

---

## RELEVANT TOPICS/TAGS FROM DOCUMENTS:
${tagsString}

---

## GENERATION INSTRUCTIONS:

1. **COMPLETENESS IS MANDATORY**: You MUST cover ALL major topics, concepts, and important details from the source documents. Do NOT skip or omit any significant information.

2. **SOURCE FIDELITY**: Use ONLY information from the provided documents. Do NOT add external knowledge or make assumptions not supported by the source.

3. **LOGICAL FLOW**: Organize content in a logical progression. Each section should flow naturally to the next.

4. **THOROUGH EXPLANATIONS**: Each topic should be explained in sufficient depth. Don't just mention concepts—explain them fully.

5. **PROPER FORMATTING**: Use proper markdown formatting with headings, bullet points, bold text, and blockquotes as specified in the format instructions above.

Generate the report now, ensuring it is comprehensive, well-structured, and covers all content from the source documents.`

        console.log('Generating report with context length:', context.length)

        const result = await model.generateContent(prompt)
        const report = result.response.text()

        console.log('Generated report length:', report.length)

        return new Response(
            JSON.stringify({ success: true, report, report_type }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Report generation error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Failed to generate report' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
