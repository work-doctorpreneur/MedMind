import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OVERVIEW_PROMPT = `You are creating a spoken audio overview. Write in a natural, conversational way as if explaining to a friend.

Based on the document content below, create an engaging overview that covers:

1. What this topic is about (in simple terms)
2. The 3-5 most important concepts or ideas
3. How it works or how things connect
4. Key facts everyone should know
5. Real-world applications or examples
6. A memorable summary

IMPORTANT WRITING RULES:
- Write in flowing paragraphs, NOT bullet points or lists
- Use simple words a 10-year-old can understand
- Keep sentences short and clear
- Explain any technical terms immediately
- Make it engaging and conversational
- Keep total length around 600-800 words (about 3-4 minutes when spoken)
- Do NOT use markdown, headers, or special formatting

Document Content:
{DOCUMENT_CONTENT}

Now write the overview as natural flowing text:`;

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

        if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');

        const supabase = createClient(supabaseUrl, supabaseKey);
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const { notebook_id } = await req.json();
        console.log(`Generating Audio Overview for notebook ${notebook_id}`);

        const { data: docs } = await supabase
            .from('documents')
            .select('id, filename')
            .eq('notebook_id', notebook_id);

        if (!docs || docs.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: 'No documents found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const docIds = docs.map(d => d.id);
        const { data: embeddings } = await supabase
            .from('embeddings')
            .select('chunk_text, summary')
            .in('document_id', docIds)
            .limit(20);

        let documentContent = '';
        if (embeddings) {
            const summaries = embeddings.filter(e => e.summary).map(e => e.summary);
            if (summaries.length > 0) documentContent += summaries.join('\n\n') + '\n\n';
            const chunks = embeddings.filter(e => e.chunk_text).map(e => e.chunk_text);
            if (chunks.length > 0) documentContent += chunks.join('\n\n');
        }

        if (!documentContent) {
            return new Response(
                JSON.stringify({ success: false, error: 'No document content found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Generate overview - directly in speakable format
        const overviewPrompt = OVERVIEW_PROMPT.replace('{DOCUMENT_CONTENT}', documentContent.substring(0, 12000));
        const overviewResult = await textModel.generateContent(overviewPrompt);
        const overviewText = overviewResult.response.text();
        console.log('Overview generated, length:', overviewText.length);

        // Generate TTS audio - same pattern as working Pixar Story
        const ttsResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: overviewText }] }],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                    }
                })
            }
        );

        if (!ttsResponse.ok) throw new Error(`TTS API error: ${ttsResponse.status}`);

        const ttsData = await ttsResponse.json();
        const audioData = ttsData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!audioData) throw new Error('No audio data in TTS response');

        const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));

        function createWavHeader(dataLength: number): Uint8Array {
            const header = new ArrayBuffer(44);
            const view = new DataView(header);
            view.setUint32(0, 0x52494646, false);
            view.setUint32(4, 36 + dataLength, true);
            view.setUint32(8, 0x57415645, false);
            view.setUint32(12, 0x666d7420, false);
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, 24000, true);
            view.setUint32(28, 48000, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            view.setUint32(36, 0x64617461, false);
            view.setUint32(40, dataLength, true);
            return new Uint8Array(header);
        }

        const wavHeader = createWavHeader(audioBytes.length);
        const wavFile = new Uint8Array(wavHeader.length + audioBytes.length);
        wavFile.set(wavHeader, 0);
        wavFile.set(audioBytes, wavHeader.length);

        let base64Audio = '';
        for (let i = 0; i < wavFile.length; i += 8192) {
            base64Audio += String.fromCharCode(...wavFile.slice(i, i + 8192));
        }
        base64Audio = btoa(base64Audio);

        console.log('Audio Overview generated successfully');

        return new Response(
            JSON.stringify({ success: true, audio: base64Audio, mimeType: 'audio/wav', title: 'Audio Overview' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Error:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
