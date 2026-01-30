import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
    message: string;
    notebook_id: string;
    user_id: string;
    conversation_history?: Array<{ role: string; content: string }>;
}

interface Citation {
    chunk_id: string;
    document_id: string;
    filename: string;
    excerpt: string;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

        if (!geminiApiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });

        const { message, notebook_id, user_id, conversation_history = [] }: ChatRequest = await req.json();

        console.log(`Chat query: "${message}" for notebook ${notebook_id}`);

        // Get documents for this notebook
        const { data: docs } = await supabase
            .from('documents')
            .select('id, filename')
            .eq('notebook_id', notebook_id);

        if (!docs || docs.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    response: "No documents found in this notebook. Please upload some documents first.",
                    citations: []
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const docIds = docs.map(d => d.id);
        const docMap = new Map(docs.map(d => [d.id, d.filename]));

        // Generate embedding for the user's query
        const embeddingResult = await embeddingModel.embedContent(message);
        const queryEmbedding = embeddingResult.embedding.values;

        // Search for relevant chunks using vector similarity
        const { data: searchResults, error: searchError } = await supabase.rpc('match_embeddings', {
            query_embedding: queryEmbedding,
            match_threshold: 0.3,
            match_count: 8,
            filter_document_ids: docIds
        });

        if (searchError) {
            console.error('Search error:', searchError);
        }

        // Build context from search results
        let context = '';
        const citations: Citation[] = [];
        const uniqueResults = searchResults?.filter((r: any, i: number, arr: any[]) =>
            arr.findIndex(x => x.id === r.id) === i
        ) || [];

        uniqueResults.forEach((result: any, index: number) => {
            const filename = docMap.get(result.document_id) || 'Unknown';
            context += `\n[Source ${index + 1}: ${filename}]\n${result.chunk_text}\n`;
            citations.push({
                chunk_id: result.id,
                document_id: result.document_id,
                filename: filename,
                excerpt: result.chunk_text?.substring(0, 150) + '...'
            });
        });

        // Get document overview/summary for general questions
        const { data: summaries } = await supabase
            .from('embeddings')
            .select('summary, document_id')
            .in('document_id', docIds)
            .not('summary', 'is', null)
            .limit(5);

        let overviewContext = '';
        if (summaries && summaries.length > 0) {
            overviewContext = '\n=== DOCUMENT OVERVIEW ===\n';
            summaries.forEach((s: any) => {
                const filename = docMap.get(s.document_id) || 'Unknown';
                overviewContext += `${filename}: ${s.summary}\n`;
            });
        }

        // Build system prompt with MULTILINGUAL support
        const systemPrompt = `You are a helpful AI assistant that answers questions about documents. You have access to the following document content.

=== IMPORTANT: MULTILINGUAL SUPPORT ===
**LANGUAGE DETECTION AND RESPONSE RULE:**
- Detect the language of the user's question
- ALWAYS respond in the SAME LANGUAGE as the user's question
- If the user asks in Hindi, respond in Hindi
- If the user asks in Telugu, respond in Telugu
- If the user asks in Spanish, respond in Spanish
- If the user asks in any other language, respond in that language
- If the user explicitly asks for a response in a specific language (e.g., "explain in Hindi"), respond in that requested language
- You are capable of responding in ANY language the user requests

${overviewContext}

=== GUIDELINES ===

1. **General Questions ("What is this document about?", "Tell me about this", etc.)**:
   - ALWAYS start by identifying the document type and main subject from the overview above
   - For resumes: Introduce the person (name, role, contact), then experience, skills, education, and projects
   - For reports/articles: State the main topic, key findings, and conclusions
   - Be comprehensive - cover ALL major sections of the document

2. **Specific Questions**:
   - Focus on the asked topic but provide context
   - Use details from the document chunks below

3. **Always**:
   - Cite sources using [Source X] format
   - Be accurate and factual
   - Structure your response logically
   - RESPOND IN THE SAME LANGUAGE AS THE USER'S QUESTION

=== DOCUMENT CONTENT (Retrieved Chunks) ===
${context || 'No content retrieved.'}`;

        // Generate response
        const chat = textModel.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: 'I understand. I will provide comprehensive answers in the same language as the user\'s question, starting with document identification and overview before diving into details, and I will cite all sources. I can respond in any language including Hindi, Telugu, Spanish, French, German, and many others.' }] },
                ...conversation_history.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }))
            ],
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();

        console.log(`Generated response with ${citations.length} sources`);

        return new Response(
            JSON.stringify({
                success: true,
                response,
                citations,
                sources_used: uniqueResults.length
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
