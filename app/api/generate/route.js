import { getToolById, resolveToolFromSubject } from '@/lib/tools';
import { generatePDF } from '@/lib/pdf';
import { generateDocx, DOCX_TOOL_IDS } from '@/lib/docx';

export const maxDuration = 60;  // Vercel Pro plan; change to 10 if on Hobby plan
export const runtime = 'nodejs';
export const maxRequestBodySize = '50mb'; // Support large PDF attachments (Vercel Pro)

export async function POST(request) {
  try {
    // Password gate — if SITE_PASSWORD is set, require it via header
    const sitePassword = process.env.SITE_PASSWORD;
    if (sitePassword) {
      const provided = request.headers.get('x-site-password');
      if (provided !== sitePassword) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

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

    // Validate attachment sizes (base64 ≈ 1.37x raw bytes)
    const MAX_SINGLE_MB = 30; // Claude's per-document limit
    const MAX_TOTAL_MB = 45;  // Stay under Vercel Pro 50MB with headroom
    if (attachments && attachments.length > 0) {
      let totalBytes = 0;
      for (const att of attachments) {
        if (!att.content) continue;
        const sizeBytes = att.content.length * 0.75; // base64 → raw
        const sizeMB = sizeBytes / (1024 * 1024);
        if (sizeMB > MAX_SINGLE_MB) {
          return Response.json({
            error: `Attachment "${att.name || 'unknown'}" is ${sizeMB.toFixed(1)}MB — max is ${MAX_SINGLE_MB}MB per file. Try a smaller or compressed PDF.`,
          }, { status: 413 });
        }
        totalBytes += sizeBytes;
      }
      const totalMB = totalBytes / (1024 * 1024);
      if (totalMB > MAX_TOTAL_MB) {
        return Response.json({
          error: `Total attachments are ${totalMB.toFixed(1)}MB — max is ${MAX_TOTAL_MB}MB combined. Remove some files or use smaller PDFs.`,
        }, { status: 413 });
      }
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

    // Call Claude with retry logic and timeout
    const API_TIMEOUT_MS = 50000; // 50s timeout (under Vercel's 60s limit)
    const MAX_RETRIES = 2;        // Up to 2 retries (3 attempts total)
    const requestBody = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: tool.systemPrompt,
      messages: [{
        role: 'user',
        content: messageContent,
      }],
    });

    let anthropicRes;
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

        anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: requestBody,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // Don't retry on auth errors or rate limits with no retry-after
        if (anthropicRes.ok || anthropicRes.status === 401 || anthropicRes.status === 403) {
          break;
        }

        // Retry on 429 (rate limit) or 5xx (server error)
        if (anthropicRes.status === 429 || anthropicRes.status >= 500) {
          lastError = `API returned ${anthropicRes.status}`;
          if (attempt < MAX_RETRIES) {
            await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
            continue;
          }
        }

        break; // Non-retryable error
      } catch (fetchErr) {
        lastError = fetchErr.name === 'AbortError' ? 'Request timed out' : fetchErr.message;
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
      }
    }

    if (!anthropicRes || !anthropicRes.ok) {
      const errBody = anthropicRes ? await anthropicRes.text().catch(() => '') : '';
      console.error('Anthropic API error:', lastError || errBody);
      return Response.json({
        error: lastError === 'Request timed out'
          ? 'AI request timed out. Try again or simplify your input.'
          : 'AI generation failed. Try again in a moment.',
      }, { status: 502 });
    }

    const anthropicData = await anthropicRes.json();

    // Extract text from response
    const responseText = anthropicData.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Parse JSON from Claude's response — multiple fallback strategies
    let parsedData;
    const parseStrategies = [
      // Strategy 1: Direct parse
      (text) => JSON.parse(text),
      // Strategy 2: Strip markdown fencing (```json ... ``` or ``` ... ```)
      (text) => {
        const stripped = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/g, '').trim();
        return JSON.parse(stripped);
      },
      // Strategy 3: Extract first JSON object from the text
      (text) => {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('No JSON object found');
        return JSON.parse(match[0]);
      },
    ];

    for (const strategy of parseStrategies) {
      try {
        parsedData = strategy(responseText.trim());
        break;
      } catch {
        // Try next strategy
      }
    }

    if (!parsedData) {
      console.error('All JSON parse strategies failed. Raw:', responseText);
      return Response.json({
        error: 'Failed to parse AI response. Try again.',
      }, { status: 500 });
    }

    // Generate document — Word for editable tools, PDF for the rest
    if (DOCX_TOOL_IDS.has(tool.pdfTemplate)) {
      const docxBytes = await generateDocx(tool.pdfTemplate, parsedData);
      return new Response(docxBytes, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="resolute-${tool.id}-${Date.now()}.docx"`,
        },
      });
    }

    const pdfBytes = await generatePDF(tool.pdfTemplate, parsedData);
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
