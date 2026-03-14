import { getToolById, resolveToolFromSubject } from '@/lib/tools';
import { generatePDF } from '@/lib/pdf';

export const maxDuration = 60; // Vercel Pro plan; change to 10 if on Hobby plan
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { toolId, formData, emailSubject, emailBody, attachments } = await request.json();

    // Resolve tool — from toolId (web app) or emailSubject (email flow)
    const resolvedToolId = toolId || resolveToolFromSubject(emailSubject);
    const tool = getToolById(resolvedToolId);
    if (!tool) {
      return Response.json({ error: 'Unknown tool' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Build the user prompt — from structured formData (web) or raw emailBody (email)
    let filledFields;
    if (emailBody) {
      filledFields = emailBody.trim();
    } else {
      filledFields = Object.entries(formData || {})
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => {
          const fieldDef = tool.fields.find(f => f.key === k);
          const label = fieldDef ? fieldDef.label : k;
          return `${label}: ${v}`;
        })
        .join('\n');
    }

    if (!filledFields && (!attachments || attachments.length === 0)) {
      return Response.json({ error: 'No fields or attachments provided' }, { status: 400 });
    }

    // Build message content — text + any PDF/image attachments
    const messageContent = [];

    // Add text input
    const textPrompt = filledFields
      ? `Here are the inputs:\n\n${filledFields}\n\nGenerate the output as specified. Return ONLY valid JSON.`
      : 'Generate the output based on the attached documents. Return ONLY valid JSON.';
    messageContent.push({ type: 'text', text: textPrompt });

    // Add attachments (PDFs sent as documents, images as images)
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (!att.content) continue;

        if (att.contentType === 'application/pdf') {
          messageContent.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: att.content,
            },
          });
        } else if (att.contentType && att.contentType.startsWith('image/')) {
          messageContent.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: att.contentType,
              data: att.content,
            },
          });
        }
        // Other file types are skipped
      }

      // Add context about attachments
      const attNames = attachments.filter(a => a.name).map(a => a.name).join(', ');
      if (attNames) {
        messageContent.push({
          type: 'text',
          text: `The above documents were attached: ${attNames}. Use their content as input alongside any text provided.`,
        });
      }
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
        max_tokens: 4096,
        system: tool.systemPrompt,
        messages: [{
          role: 'user',
          content: messageContent,
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
