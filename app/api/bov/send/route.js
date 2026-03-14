export const maxDuration = 30;

export async function POST(request) {
  try {
    // Password gate
    const sitePassword = process.env.SITE_PASSWORD;
    if (sitePassword) {
      const provided = request.headers.get('x-site-password');
      if (provided !== sitePassword) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return Response.json({ error: 'Email service not configured (RESEND_API_KEY)' }, { status: 500 });
    }

    const bovFrom = process.env.BOV_FROM_EMAIL || 'team@resolute-tools.com';

    const { formData, attachments } = await request.json();

    const senderEmail = formData?.senderEmail?.trim();
    if (!senderEmail) {
      return Response.json({ error: 'Your email address is required so AutoSheets can send the response back to you.' }, { status: 400 });
    }

    // Build email body from form fields
    const lines = [];
    if (formData?.propertyAddress) lines.push(`Property Address: ${formData.propertyAddress}`);
    if (formData?.propertyType) lines.push(`Property Type: ${formData.propertyType}`);
    if (formData?.squareFootage) lines.push(`Square Footage: ${formData.squareFootage}`);
    if (formData?.context) lines.push(`\nAdditional Context:\n${formData.context}`);

    const bodyText = lines.join('\n') || 'BOV request — see attached documents.';

    // Build Resend email payload
    // reply_to = user's email so AutoSheets responds directly to them
    // cc = user's email so they get a copy of the outgoing request
    const emailPayload = {
      from: bovFrom,
      to: 'agent@autosheets.io',
      reply_to: senderEmail,
      cc: senderEmail,
      subject: 'BOV',
      text: bodyText,
    };

    // Add attachments if present (Resend accepts base64)
    if (attachments && attachments.length > 0) {
      emailPayload.attachments = attachments
        .filter(a => a.content && a.name)
        .map(a => ({
          filename: a.name,
          content: a.content, // already base64
        }));
    }

    // Send via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Resend API error:', errBody);
      return Response.json({ error: 'Failed to send BOV request email' }, { status: 502 });
    }

    const data = await res.json();
    return Response.json({ ok: true, emailId: data.id });

  } catch (err) {
    console.error('BOV send error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
