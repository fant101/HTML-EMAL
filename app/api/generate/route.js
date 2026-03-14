import { getToolById } from '@/lib/tools';
import { generatePDF } from '@/lib/pdf';

export const maxDuration = 60; // Vercel Pro plan; change to 10 if on Hobby plan
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { toolId, formData } = await request.json();

    // Validate
    const tool = getToolById(toolId);
    if (!tool) {
      return Response.json({ error: 'Unknown tool' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Build the user prompt from form data
    const filledFields = Object.entries(formData)
      .filter(([, v]) => v && String(v).trim())
      .map(([k, v]) => {
        // Find the field label for better context
        const fieldDef = tool.fields.find(f => f.key === k);
        const label = fieldDef ? fieldDef.label : k;
        return `${label}: ${v}`;
      })
      .join('\n');

    if (!filledFields) {
      return Response.json({ error: 'No fields provided' }, { status: 400 });
    }

    // Call Claude
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: tool.systemPrompt,
        messages: [{
          role: 'user',
          content: `Here are the inputs:\n\n${filledFields}\n\nGenerate the output as specified. Return ONLY valid JSON.`,
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error('Anthropic API error:', errBody);
      return Response.json({ error: 'AI generation failed' }, { status: 502 });
    }

    const anthropicData = await anthropicRes.json();

    // Extract text from response
    const responseText = anthropicData.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Parse JSON from Claude's response
    let parsedData;
    try {
      // Strip any markdown fencing if present
      const cleaned = responseText.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr, 'Raw:', responseText);
      return Response.json({
        error: 'Failed to parse AI response',
        raw: responseText,
      }, { status: 500 });
    }

    // Generate PDF
    const pdfBytes = await generatePDF(tool.pdfTemplate, parsedData);

    // Return PDF
    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="resolute-${tool.id}-${Date.now()}.pdf"`,
      },
    });

  } catch (err) {
    console.error('Generate error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
