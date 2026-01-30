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
    type: 'central' | 'category' | 'concept' | 'detail';
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
    jsonStr = jsonStr.replace(/:\s*'([^']*)'/g, ':"$1"');

    // 4. Remove any control characters that might break parsing
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, ' ');

    // 5. Handle truncated arrays by trying to close them
    const openBrackets = (jsonStr.match(/\[/g) || []).length;
    const closeBrackets = (jsonStr.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
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
        const contentSample = embeddings.slice(0, 10).map((e: any) => e.chunk_text).join('\n\n');

        const prompt = `**MIND MAP CREATION TASK**

Create a detailed, hierarchical mind map based strictly on the provided document content below. This mind map must serve as a complete study and review tool.

---

## DOCUMENT CONTENT TO ANALYZE:

**Document summaries:**
${summaries.join('\n')}

**Existing tags:** ${allTags.join(', ')}

**Content:**
${contentSample.slice(0, 8000)}

---

## STRICT RULES:

**1. CONTENT ACCURACY & COMPLETENESS**
- Include EVERY major topic, concept, and significant point from the document
- Use ONLY information explicitly stated in the document - NO external knowledge
- Do NOT invent, assume, or extrapolate points not present in the document
- Use the document's exact terminology where possible

**2. HIERARCHICAL STRUCTURE (3-5 levels)**
- Level 1 (Center): Main topic/subject (1-3 words)
- Level 2 (Main Branches): 3-8 major categories/themes - fundamentally different aspects
- Level 3 (Sub-branches): 2-6 sub-topics per main branch - more specific concepts
- Level 4 (Details): Specific facts, examples, supporting points
- Level 5 (Fine details): Only if document provides this depth

**3. MUTUAL EXCLUSIVITY - CRITICAL**
- Each branch at the same level must represent a DISTINCT, separate concept
- Sibling branches must NOT overlap in meaning or content
- Do NOT repeat the same information in multiple places
- If a concept relates to multiple areas, place it under the MOST logical parent ONLY
- A topic should appear EXACTLY ONCE in the entire mind map

**4. FORMATTING**
- Use KEYWORDS and SHORT PHRASES only (2-6 words maximum per node)
- Maintain PARALLEL STRUCTURE within the same level
- Use the EXACT terminology from the document

---

## REQUIRED OUTPUT FORMAT (JSON ONLY):

Return ONLY valid JSON, no markdown, no extra text. Use this exact structure with up to 4 levels of depth:

{"centralLabel": "Main Topic", "branches": [{"name": "Main Branch 1", "children": [{"name": "Sub-topic 1.1", "children": [{"name": "Detail 1.1.1"}, {"name": "Detail 1.1.2"}]}, {"name": "Sub-topic 1.2", "children": [{"name": "Detail 1.2.1"}]}]}, {"name": "Main Branch 2", "children": [{"name": "Sub-topic 2.1"}, {"name": "Sub-topic 2.2", "children": [{"name": "Detail 2.2.1"}]}]}]}

**QUALITY CHECKLIST before output:**
- [ ] All major topics included, no omissions
- [ ] No overlapping branches at same level
- [ ] Each concept appears ONLY ONCE
- [ ] Concise keywords (2-6 words)
- [ ] Hierarchy flows from general to specific`;

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

        // Convert to nodes and edges format with support for deeper hierarchy
        const nodes: MindMapNode[] = [];
        const edges: MindMapEdge[] = [];

        // Central node
        nodes.push({
            id: 'central',
            label: (mindMapData.centralLabel || notebook_name || 'Notebook').substring(0, 50),
            type: 'central'
        });

        // Recursive function to process branches at any depth
        function processBranch(branch: any, parentId: string, level: number, indexPath: string) {
            if (!branch || !branch.name) return;

            const nodeId = `node-${indexPath}`;
            const nodeType = level === 2 ? 'category' : level === 3 ? 'concept' : 'detail';
            
            nodes.push({
                id: nodeId,
                label: String(branch.name).substring(0, 40),
                type: nodeType as 'category' | 'concept' | 'detail'
            });
            edges.push({ source: parentId, target: nodeId });

            // Process children recursively
            if (branch.children && Array.isArray(branch.children)) {
                branch.children.forEach((child: any, childIndex: number) => {
                    processBranch(child, nodeId, level + 1, `${indexPath}-${childIndex}`);
                });
            }
        }

        // Process all main branches
        const branches = mindMapData.branches || mindMapData.categories || [];
        branches.forEach((branch: any, branchIndex: number) => {
            processBranch(branch, 'central', 2, `${branchIndex}`);
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
