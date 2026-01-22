import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PIXAR_STORY_PROMPT = `You are a storyteller. Turn this information into a Pixar-style story that makes learning fun.

Document Content:
{DOCUMENT_CONTENT}

Use this Pixar story structure:

**Once upon a time,** [introduce a relatable character in a world related to the topic]
**Every day,** [show their normal routine]
**One day,** [something changes - introduce the problem]
**Because of that,** [the character starts their journey]
**Because of that,** [they learn the first concept]
**Because of that,** [they discover more]
**Until finally,** [they understand the full picture - the "aha!" moment]
**And ever since then,** [show how this knowledge changed them]
**The moral of the story is:** [summarize the key learning]

Rules:
- Use simple words a 5-year-old can understand
- Short sentences only
- Make it visual with colors, shapes, descriptions
- Give characters feelings: scared, excited, curious, happy
- Create a relatable character (child, animal, or friendly object)
- 400-800 words total

Now create the story!`;

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
        console.log(`Generating Pixar Story for notebook ${notebook_id}`);

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

        const storyPrompt = PIXAR_STORY_PROMPT.replace('{DOCUMENT_CONTENT}', documentContent.substring(0, 12000));
        const storyResult = await textModel.generateContent(storyPrompt);
        const storyText = storyResult.response.text();
        console.log('Story generated, length:', storyText.length);

        const ttsResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: storyText }] }],
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

        console.log('Pixar Story audio generated successfully');

        return new Response(
            JSON.stringify({ success: true, audio: base64Audio, mimeType: 'audio/wav', title: 'Pixar Story' }),
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
