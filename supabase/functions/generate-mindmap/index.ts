import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MindMapNode {
    id: string;
    label: string;
    type: 'central' | 'category' | 'concept';
}

interface MindMapEdge {
    source: string;
    target: string;
}

// Robust JSON extraction and cleanup
function extractAndParseJSON(text: string): any {
    // Find JSON object in the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON object found in response');
    }

    let jsonStr = jsonMatch[0];

    // Common fixes for malformed JSON from LLMs
    // 1. Remove trailing commas before } or ]
    jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    // 2. Fix unquoted property names (simple cases)
    jsonStr = jsonStr.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // 3. Replace single quotes with double quotes for strings
    // This is tricky, so we do it carefully
    jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, ':"$1"');

    // 4. Remove any control characters that might break parsing
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ');

    // 5. Handle truncated arrays by trying to close them
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
        // Try to close unclosed arrays
        jsonStr = jsonStr.replace(/,?\s*$/, '');
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
            jsonStr += ']';
        }
    }

    // 6. Handle truncated objects by trying to close them
    const openBraces = (jsonStr.match(/\{/g) || []).length;
    const closeBraces = (jsonStr.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
        jsonStr = jsonStr.replace(/,?\s*$/, '');
        for (let i = 0; i < openBraces - closeBraces; i++) {
            jsonStr += '}';
        }
    }

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('JSON parse failed after cleanup. Raw:', jsonStr.substring(0, 500));
        throw new Error('Failed to parse JSON after cleanup: ' + (e as Error).message);
    }
}

// Fallback mind map when parsing fails
function createFallbackMindMap(notebookName: string, tags: string[]): { nodes: MindMapNode[], edges: MindMapEdge[] } {
    const nodes: MindMapNode[] = [
        { id: 'central', label: notebookName || 'Notebook', type: 'central' }
    ];
    const edges: MindMapEdge[] = [];

    // Use tags as categories if available
    const uniqueTags = [...new Set(tags)].slice(0, 5);
    uniqueTags.forEach((tag, index) => {
        const catId = `cat-${index}`;
        nodes.push({ id: catId, label: tag, type: 'category' });
        edges.push({ source: 'central', target: catId });
    });

    return { nodes, edges };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');

        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const { notebook_id, user_id, notebook_name } = await req.json();

        console.log('Generating mind map for notebook:', notebook_id);

        // Get document IDs for this notebook
        const { data: docs } = await supabase
            .from('documents')
            .select('id, filename')
            .eq('notebook_id', notebook_id);

        if (!docs || docs.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    nodes: [{ id: 'central', label: notebook_name || 'Notebook', type: 'central' }],
                    edges: [],
                    message: 'No documents to analyze'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const docIds = docs.map((d: any) => d.id);

        // Get embeddings/content for those documents
        const { data: embeddings } = await supabase
            .from('embeddings')
            .select('chunk_text, summary, tags, document_id')
            .in('document_id', docIds);

        if (!embeddings || embeddings.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    nodes: [{ id: 'central', label: notebook_name || 'Notebook', type: 'central' }],
                    edges: [],
                    message: 'Documents not processed yet'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Collect content for analysis
        const summaries = embeddings.filter((e: any) => e.summary).map((e: any) => e.summary);
        const allTags = [...new Set(embeddings.flatMap((e: any) => e.tags || []))] as string[];
        const contentSample = embeddings.slice(0, 5).map((e: any) => e.chunk_text).join('\n\n');

        const prompt = `Analyze the following content and create a mind map structure.

Document summaries:
${summaries.join('\n')}

Existing tags: ${allTags.join(', ')}

Content sample:
${contentSample.slice(0, 4000)}

Generate a mind map with:
1. A central node representing the main theme
2. 3-5 category nodes (main topics)
3. 2-4 concept nodes under each category (specific ideas/details)

CRITICAL: Return ONLY valid JSON, no markdown code blocks, no extra text.
Return this exact structure:
{"centralLabel": "Main Theme", "categories": [{"name": "Category 1", "concepts": ["Concept A", "Concept B"]}, {"name": "Category 2", "concepts": ["Concept C", "Concept D"]}]}

Be specific and use actual terms from the content. Keep labels SHORT (under 30 chars).`;

        let mindMapData: any;
        let usedFallback = false;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            console.log('Raw Gemini response length:', responseText.length);

            mindMapData = extractAndParseJSON(responseText);
        } catch (parseError) {
            console.error('Mind map generation/parsing failed, using fallback:', parseError);
            usedFallback = true;
            const fallback = createFallbackMindMap(notebook_name, allTags);
            return new Response(
                JSON.stringify({
                    success: true,
                    nodes: fallback.nodes,
                    edges: fallback.edges,
                    message: 'Generated from document tags (AI response was invalid)'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Convert to nodes and edges format
        const nodes: MindMapNode[] = [];
        const edges: MindMapEdge[] = [];

        // Central node
        nodes.push({
            id: 'central',
            label: (mindMapData.centralLabel || notebook_name || 'Notebook').substring(0, 50),
            type: 'central'
        });

        // Category and concept nodes
        const categories = mindMapData.categories || [];
        categories.forEach((cat: any, catIndex: number) => {
            if (!cat || !cat.name) return;

            const catId = `cat-${catIndex}`;
            nodes.push({
                id: catId,
                label: String(cat.name).substring(0, 40),
                type: 'category'
            });
            edges.push({ source: 'central', target: catId });

            const concepts = cat.concepts || [];
            concepts.forEach((concept: any, conceptIndex: number) => {
                if (!concept) return;

                const conceptId = `concept-${catIndex}-${conceptIndex}`;
                nodes.push({
                    id: conceptId,
                    label: String(concept).substring(0, 40),
                    type: 'concept'
                });
                edges.push({ source: catId, target: conceptId });
            });
        });

        console.log('Generated mind map with', nodes.length, 'nodes and', edges.length, 'edges');

        return new Response(
            JSON.stringify({ success: true, nodes, edges }),
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
