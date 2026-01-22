import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { notebook_id, user_id } = await req.json()

        if (!notebook_id || !user_id) {
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

        // Get embeddings with summaries
        const docIds = documents.map(d => d.id)
        const { data: embeddings } = await supabase
            .from('embeddings')
            .select('summary, tags, document_id')
            .in('document_id', docIds)

        // Build context for infographic prompt
        const docMap = new Map(documents.map(d => [d.id, d.filename]))
        let contentSummary = ''
        const allTags = new Set<string>()
        let mainTitle = documents[0]?.filename?.replace(/\.[^/.]+$/, '') || 'Document Overview'

        if (embeddings && embeddings.length > 0) {
            embeddings.forEach(emb => {
                const filename = docMap.get(emb.document_id) || 'Unknown'
                if (emb.summary) {
                    contentSummary += `${filename}: ${emb.summary}\n`
                }
                if (emb.tags && Array.isArray(emb.tags)) {
                    emb.tags.forEach((tag: string) => allTags.add(tag))
                }
            })
        } else {
            contentSummary = documents.map(d => d.filename).join(', ')
        }

        const tagsString = Array.from(allTags).slice(0, 10).join(', ')

        // Get Gemini API key
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
            return new Response(
                JSON.stringify({ success: false, error: 'Gemini API key not configured' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create infographic prompt - Sketchnote style
        const infographicPrompt = `Design a sketchnote style infographic for "${mainTitle}".

CONTENT TO VISUALIZE:
${contentSummary}

KEY TOPICS: ${tagsString || 'General Overview'}

STYLE REQUIREMENTS:
- Background: Crumpled graph paper texture
- Visuals: Doodle-style thick marker lines, hand-drawn arrows, circled text, highlighted emphasis
- Font: Realistic handwriting style
- Casual, clean, minimalistic, and creative vibe
- Landscape orientation, 16:9 aspect ratio
- Include icons, simple illustrations, and visual elements drawn in sketch style
- Organize information in clear sections with hand-drawn headers
- Use bullet points and key concepts with emphasis markers

Create an engaging, visually rich sketchnote infographic that summarizes and explains the key concepts from this content.`

        // Call Gemini API for image generation
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: infographicPrompt
                        }]
                    }],
                    generationConfig: {
                        responseModalities: ["IMAGE", "TEXT"]
                    }
                })
            }
        )

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Gemini API error:', errorText)
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to generate image' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const result = await response.json()

        // Extract image data from response
        let imageData = null
        let mimeType = 'image/png'

        if (result.candidates && result.candidates[0]?.content?.parts) {
            for (const part of result.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageData = part.inlineData.data
                    mimeType = part.inlineData.mimeType || 'image/png'
                    break
                }
            }
        }

        if (!imageData) {
            return new Response(
                JSON.stringify({ success: false, error: 'No image generated' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                success: true,
                image: imageData,
                mimeType: mimeType,
                title: mainTitle
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Infographic generation error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message || 'Failed to generate infographic' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
