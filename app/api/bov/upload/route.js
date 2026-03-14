import * as XLSX from 'xlsx';

export const maxDuration = 30;
export const maxRequestBodySize = '50mb';

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

    const { fileBase64, fileName } = await request.json();

    if (!fileBase64) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Parse the Excel file
    const buffer = Buffer.from(fileBase64, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Search all sheets and cells for the HTML cell
    let htmlContent = null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      for (const cellRef of Object.keys(sheet)) {
        if (cellRef.startsWith('!')) continue; // skip metadata keys
        const cell = sheet[cellRef];
        const value = cell?.v || cell?.w || '';
        const str = String(value).trim();

        // AutoSheets puts the full HTML document in a single cell
        if (str.length > 50 && (str.startsWith('<') || str.startsWith('<!DOCTYPE'))) {
          if (!htmlContent || str.length > htmlContent.length) {
            htmlContent = str;
          }
        }
      }
    }

    if (!htmlContent) {
      return Response.json({
        error: 'No HTML content found in the Excel file. Make sure you uploaded the correct file from AutoSheets.',
      }, { status: 400 });
    }

    return Response.json({ ok: true, html: htmlContent });

  } catch (err) {
    console.error('BOV upload error:', err);
    return Response.json({ error: `Failed to parse Excel file: ${err.message}` }, { status: 500 });
  }
}
