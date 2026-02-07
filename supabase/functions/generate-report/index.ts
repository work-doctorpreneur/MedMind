import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Report type prompts - comprehensive and detailed
const reportPrompts: Record<string, string> = {
    normal_explanation: `You are an expert educator who excels at explaining complex concepts clearly and comprehensively. Create a detailed explanation document that covers EVERY concept in the source material.

**CRITICAL: FULL DOCUMENT COVERAGE**
You MUST explain EVERY concept, term, principle, and topic from the source document. Do NOT skip anything. The reader should be able to understand the ENTIRE subject after reading your explanation.

**Structure Requirements:**

**1. Introduction & Overview** (150-200 words)
- What is this subject/topic about?
- Why is it important?
- What will the reader learn?

**2. Core Concepts - Section by Section**
For EACH major topic/chapter in the source document, create a dedicated section with:
- **Clear Definition**: What is this concept?
- **Detailed Explanation**: How does it work? Why does it happen?
- **Key Components**: Break down into smaller parts
- **Examples**: Concrete illustrations of the concept
- **Common Misconceptions**: What do people often get wrong?
- **Connection to Other Concepts**: How does this relate to other topics?

**3. Key Formulas/Rules/Principles**
- List ALL important formulas, rules, or principles
- Explain what each one means and when to use it

**4. Summary of All Concepts**
- A comprehensive list of everything covered
- Quick reference for revision

**Formatting:**
- Use H2 for major topics, H3 for subtopics
- Use bullet points for lists
- Bold key terms when first introduced
- Use examples liberally

**Tone:** Clear, educational, and thorough. Explain as if teaching someone who has no prior knowledge but wants to understand deeply.

**Length:** 4000-6000 words (as needed to cover ALL concepts)

**CRITICAL REQUIREMENTS:**
- Cover EVERY topic from beginning to end
- No concept should be left unexplained
- Provide clear, detailed explanations
- Include examples for each major concept`,

    story_format: `You are a master storyteller who transforms educational content into engaging narratives. Create a story-based explanation that covers ALL concepts from the source material using a Pixar-style narrative structure.

**CRITICAL: FULL DOCUMENT COVERAGE**
Your story MUST incorporate and explain EVERY major concept from the source document. No topic should be left out. Use the narrative to make each concept memorable and understandable.

**Story Structure (Pixar Format):**

**Opening - Setting the Scene** (200-300 words)
"Once upon a time..." - Introduce a relatable protagonist (student, curious character, or personified concept) in a world related to the topic.
"Every day..." - Show their normal routine and initial understanding.

**The Journey Begins** (Main Content - 3000-4000 words)
"One day..." - Something changes, sparking the need to learn.

For EACH major concept in the source document:
- "Because of that..." - The character encounters the concept
- Create a mini-story or scene that illustrates the concept
- Show the character learning and understanding
- Use dialogue, actions, and emotions to make it memorable
- Connect each concept to the next naturally

**The Transformation**
"Until finally..." - The character achieves the "aha!" moment, understanding how everything connects.
"And ever since then..." - Show how this knowledge changed them.

**The Moral & Summary** (200-300 words)
- Summarize ALL key concepts learned
- "The moral of the story is..." - Key takeaways

**Storytelling Rules:**
- Create memorable characters for abstract concepts
- Use vivid imagery and sensory details
- Include emotional moments: curiosity, frustration, excitement, triumph
- Make abstract concepts concrete through metaphors and analogies
- Keep language accessible but don't oversimplify the concepts
- Each concept must be woven naturally into the narrative

**Characters to Consider:**
- A curious student on a learning journey
- Personified concepts as characters (e.g., "Captain Current" for electricity)
- A mentor figure who guides understanding
- Challenges/obstacles that represent common misconceptions

**Tone:** Engaging, warm, imaginative, but educational. The story should be entertaining AND teach all the concepts thoroughly.

**Length:** 4000-5000 words

**CRITICAL REQUIREMENTS:**
- EVERY concept from the source must appear in the story
- Each concept must be explained through the narrative
- The story should flow logically from beginning to end
- Readers should understand all concepts after reading`,

    practical_application: `You are an expert practitioner who connects theory to real-world applications. Create a comprehensive guide showing how EVERY concept from the source material applies in real life.

**CRITICAL: FULL DOCUMENT COVERAGE**
You MUST provide practical applications for EVERY concept, principle, and topic in the source document. No concept should be left without a real-world connection.

**Structure Requirements:**

**1. Introduction: Why This Matters in Real Life** (150-200 words)
- Overview of the practical importance of this subject
- Where you'll encounter these concepts in daily life

**2. Concept-by-Concept Applications**

For EACH concept in the source document, provide:

### [Concept Name]
**What It Is** (1-2 sentences): Brief definition
**Real-World Applications:**
- **Example 1**: Detailed scenario where this applies (home, work, nature)
- **Example 2**: Another context (different industry or situation)
- **Example 3**: Everyday life application

**How to Apply It:**
- Step-by-step practical guide
- What to look for in real situations
- Common mistakes to avoid

**Case Study/Scenario:** (100-150 words)
A specific story or situation demonstrating this concept in action

---

**3. Cross-Concept Applications**
- Scenarios that combine multiple concepts
- How concepts work together in real situations

**4. Practical Exercises**
- 5-10 activities the reader can do to apply these concepts
- DIY experiments or observations
- Questions to consider in daily life

**5. Career/Professional Applications**
- How these concepts apply in various professions
- Industries that rely on these principles

**6. Quick Reference Guide**
- Table: Concept → Common Application → How to Recognize It

**Formatting:**
- Use clear headers for each concept
- Include practical tips in bullet points
- Use real-world scenarios and examples
- Add "Try This" boxes for hands-on activities

**Tone:** Practical, actionable, and engaging. Write as if helping someone see the subject in their everyday life.

**Length:** 4000-6000 words

**CRITICAL REQUIREMENTS:**
- EVERY concept must have at least 2-3 practical applications
- Include diverse examples (home, work, nature, technology)
- Make connections clear between theory and practice
- Provide actionable ways to apply the knowledge`,

    mnemonics: `You are a memory expert who creates powerful memory aids for learning. Create comprehensive mnemonics, memory techniques, and recall strategies for EVERY concept in the source material.

**CRITICAL: FULL DOCUMENT COVERAGE**
You MUST create memory aids for EVERY key term, concept, formula, principle, and topic in the source document. No important information should be left without a memory technique.

**Structure Requirements:**

**1. Overview: Memory Strategy for This Subject** (100-150 words)
- Quick overview of the memory techniques you'll use
- How to best use this document for studying

**2. Concept-by-Concept Memory Aids**

For EACH concept in the source document, provide:

### [Concept Name]

**Definition to Remember:** (1 sentence)

**Memory Techniques:**

**Acronym/Acrostic:**
- Create a memorable word or phrase where each letter represents a key point
- Example: "HOMES" for Great Lakes

**Visual Association:**
- Describe a vivid mental image that represents the concept
- The more unusual/funny, the more memorable

**Story/Narrative Hook:**
- A short memorable story (2-3 sentences) linking the concept to something familiar

**Rhyme or Jingle:**
- A catchy phrase or rhyme to remember key facts

**Memory Palace Location:**
- Suggest where to "place" this concept in a mental journey through a familiar location

**Connection Cue:**
- Link to something the reader already knows

---

**3. Formula/Rule Mnemonics**
For each formula, equation, or rule:
- The formula
- Mnemonic to remember it
- Trick to remember what each part means

**4. Comparison Mnemonics**
For easily confused concepts:
- Clear way to distinguish between similar terms
- Memory tricks to never mix them up again

**5. Master Memory Map**
- A suggested "memory palace" journey through ALL concepts
- Ordered sequence for reviewing everything

**6. Quick Reference: All Mnemonics**
Table format:
| Concept | Quick Mnemonic | Type |
|---------|---------------|------|
| [term] | [memory aid] | [acronym/visual/rhyme] |

**7. Study Tips**
- How to review and reinforce these mnemonics
- Spaced repetition suggestions
- Active recall techniques

**Mnemonic Types to Use:**
- **Acronyms**: First letters spell a word
- **Acrostics**: First letters form a sentence
- **Rhymes**: Easy-to-remember verses
- **Visual associations**: Vivid mental images
- **Method of loci**: Memory palace technique
- **Chunking**: Breaking info into groups
- **Stories**: Narrative connections
- **Peg systems**: Number-concept associations

**Tone:** Creative, memorable, and helpful. Be inventive and even silly - the more unusual, the more memorable!

**Length:** 3500-5000 words

**CRITICAL REQUIREMENTS:**
- EVERY key concept must have at least 2 different memory techniques
- Mnemonics must be relevant and actually helpful for remembering
- Include a variety of mnemonic types
- Make them creative, vivid, and memorable
- Cover ALL formulas, rules, and terms from the source`
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
            .select('chunk_text, summary, tags, document_id, created_at')
            .in('document_id', docIds)
            .order('document_id', { ascending: true })
            .order('created_at', { ascending: true })

        // Log the error but continue
        if (embError) {
            console.error('Embeddings fetch error:', embError)
        }

        // Build document context - use MORE content for FAQ to cover entire document
        const docMap = new Map(documents.map(d => [d.id, d.filename]))
        let context = ''
        const allTags = new Set<string>()
        let totalContentLength = 0
        // Use high limit to get full document content for comprehensive reports
        const MAX_CONTENT_LENGTH = 150000

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
                    const contentText = emb.chunk_text || ''
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
        const reportPrompt = reportPrompts[report_type] || reportPrompts.normal_explanation

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
