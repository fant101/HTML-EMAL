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

    // Search all sheets and cells for HTML content
    let htmlContent = null;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];

      // First try: check if the sheet itself can be converted to HTML
      // (AutoSheets may put the HTML as the sheet content)
      const sheetHtml = XLSX.utils.sheet_to_html(sheet);

      // Second: scan cells for raw HTML strings
      for (const cellRef of Object.keys(sheet)) {
        if (cellRef.startsWith('!')) continue; // skip metadata keys
        const cell = sheet[cellRef];
        const value = cell?.v || cell?.w || '';
        const str = String(value).trim();

        // Look for cells containing HTML (starts with < or <!DOCTYPE)
        if (str.length > 50 && (str.startsWith('<') || str.startsWith('<!DOCTYPE'))) {
          // Prefer the longest HTML string found (most likely the full document)
          if (!htmlContent || str.length > htmlContent.length) {
            htmlContent = str;
          }
        }
      }

      // If no raw HTML found in cells, use the sheet-to-HTML conversion
      if (!htmlContent && sheetHtml) {
        htmlContent = sheetHtml;
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
