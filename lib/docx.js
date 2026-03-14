import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel,
  Header, Footer, ShadingType,
} from 'docx';

// ── Brand colors (hex) ──────────────────────
const DARK_GREEN = '13201F';
const GOLD = 'CBA135';
const GOLD_MUTED = 'A88620';
const TEXT_COLOR = '1A1A1A';
const TEXT_MUTED = '6B6B6B';
const SECTION_BG = 'F0EDDF';

// ── Helpers ─────────────────────────────────
function brandHeader(subtitle) {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 100 },
        children: [
          new TextRun({ text: 'RESOLUTE', bold: true, size: 36, color: GOLD, font: 'Helvetica' }),
          new TextRun({ text: '   ' }),
          new TextRun({ text: subtitle, size: 18, color: GOLD_MUTED, font: 'Helvetica' }),
        ],
      }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GOLD } },
        spacing: { after: 200 },
        children: [],
      }),
    ],
  });
}

function brandFooter() {
  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: GOLD } },
        spacing: { before: 100 },
        children: [
          new TextRun({ text: 'RESOLUTE, INC.', bold: true, size: 16, color: GOLD, font: 'Helvetica' }),
          new TextRun({ text: '  ·  Commercial Real Estate Private Equity  ·  Colorado', size: 14, color: GOLD_MUTED }),
        ],
      }),
    ],
  });
}

function sectionHeading(title) {
  return new Paragraph({
    spacing: { before: 300, after: 100 },
    shading: { type: ShadingType.CLEAR, fill: SECTION_BG },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: GOLD } },
    indent: { left: 100 },
    children: [
      new TextRun({ text: title.toUpperCase(), bold: true, size: 20, color: DARK_GREEN, font: 'Helvetica' }),
    ],
  });
}

function fieldRow(label, value) {
  if (!value) return null;
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 200 },
    children: [
      new TextRun({ text: `${label}: `, size: 18, color: TEXT_MUTED }),
      new TextRun({ text: String(value), size: 20, color: TEXT_COLOR }),
    ],
  });
}

function twoFieldParagraph(label1, value1, label2, value2) {
  if (!value1 && !value2) return null;
  const children = [];
  if (value1) {
    children.push(new TextRun({ text: `${label1}: `, size: 18, color: TEXT_MUTED }));
    children.push(new TextRun({ text: String(value1), size: 20, color: TEXT_COLOR }));
  }
  if (value1 && value2) {
    children.push(new TextRun({ text: '        ', size: 20 }));
  }
  if (value2) {
    children.push(new TextRun({ text: `${label2}: `, size: 18, color: TEXT_MUTED }));
    children.push(new TextRun({ text: String(value2), size: 20, color: TEXT_COLOR }));
  }
  return new Paragraph({ spacing: { after: 60 }, indent: { left: 200 }, children });
}

function textBlock(text, { bold: isBold = false, size = 20 } = {}) {
  if (!text) return null;
  // Split by newlines to create separate paragraphs for each line
  const paragraphs = String(text).split('\n');
  return paragraphs.map(line =>
    new Paragraph({
      spacing: { after: 40 },
      indent: { left: 200 },
      children: [
        new TextRun({
          text: line,
          size,
          color: TEXT_COLOR,
          bold: isBold,
        }),
      ],
    })
  );
}

function signatureLine(label) {
  return [
    new Paragraph({ spacing: { before: 300 }, children: [] }),
    new Paragraph({
      indent: { left: 200 },
      children: [
        new TextRun({ text: `${label}: `, size: 18, color: TEXT_MUTED }),
        new TextRun({ text: '________________________________', size: 20, color: TEXT_MUTED }),
        new TextRun({ text: '        Date: ', size: 18, color: TEXT_MUTED }),
        new TextRun({ text: '________________', size: 20, color: TEXT_MUTED }),
      ],
    }),
    new Paragraph({
      indent: { left: 200 },
      spacing: { after: 100 },
      children: [
        new TextRun({ text: '                    Printed Name & Title', size: 16, color: TEXT_MUTED, italics: true }),
      ],
    }),
  ];
}

// Flatten nested arrays + filter nulls
function flat(items) {
  return items.flat(Infinity).filter(Boolean);
}

// ── Template Renderers ──────────────────────

function renderSaleLoi(d) {
  return flat([
    sectionHeading('Parties'),
    fieldRow('Buyer', d.buyer_name),
    fieldRow('Buyer Entity', d.buyer_entity),
    fieldRow('Seller', d.seller_name),

    sectionHeading('Property'),
    fieldRow('Address', d.property_address),
    twoFieldParagraph('Type', d.property_type, 'Square Footage', d.square_footage),
    fieldRow('Legal Description', d.legal_description),

    sectionHeading('Price & Terms'),
    twoFieldParagraph('Purchase Price', d.purchase_price, 'Price/SF', d.price_per_sf),
    twoFieldParagraph('Earnest Money', d.earnest_money, 'EM Hard Date', d.em_hard_date),
    fieldRow('Financing', d.financing_type),

    sectionHeading('Timeline'),
    twoFieldParagraph('Inspection Period', d.inspection_period, 'Closing', d.closing_date),
    twoFieldParagraph('Financing Contingency', d.financing_contingency, 'Title Review', d.title_review),

    sectionHeading('Contingencies'),
    textBlock(d.contingencies),

    sectionHeading('Additional Terms'),
    textBlock(d.additional_terms),

    sectionHeading('Broker Information'),
    twoFieldParagraph('Listing Broker', d.listing_broker, 'Company', d.listing_company),
    twoFieldParagraph("Buyer's Broker", d.buyers_broker, 'Company', d.buyers_company),

    d.property_notes ? [sectionHeading('Property Notes'), textBlock(d.property_notes)] : [],

    sectionHeading('Non-Binding Acknowledgment'),
    textBlock('This Letter of Intent is non-binding and is intended solely to outline the principal terms upon which the parties may enter into a definitive Purchase and Sale Agreement. Neither party shall have any binding obligations unless and until a definitive agreement is fully executed by both parties.'),

    sectionHeading('Signatures'),
    signatureLine('Buyer'),
    signatureLine('Seller'),
  ]);
}

function renderLeaseLoi(d) {
  return flat([
    sectionHeading('Parties'),
    fieldRow('Landlord', d.landlord_name),
    fieldRow('Tenant', d.tenant_name),

    sectionHeading('Premises'),
    fieldRow('Address', d.property_address),
    fieldRow('Space', d.space_description),
    fieldRow('Permitted Use', d.permitted_use),

    sectionHeading('Lease Terms'),
    twoFieldParagraph('Lease Type', d.lease_type, 'Term', d.lease_term),
    twoFieldParagraph('Base Rent', d.base_rent, 'Escalation', d.annual_escalation),
    twoFieldParagraph('Commencement', d.commencement_date, 'Free Rent', d.free_rent),
    twoFieldParagraph('TI Allowance', d.ti_allowance, 'Renewal Options', d.renewal_options),
    fieldRow('Operating Expenses', d.operating_expenses),

    sectionHeading('Contingencies'),
    textBlock(d.contingencies),

    sectionHeading('Additional Terms'),
    textBlock(d.additional_terms),

    sectionHeading('Broker Information'),
    twoFieldParagraph('Listing Broker', d.listing_broker, 'Company', d.listing_company),
    twoFieldParagraph('Tenant Rep', d.tenant_rep_broker, 'Company', d.tenant_rep_company),

    sectionHeading('Non-Binding Acknowledgment'),
    textBlock('This Letter of Intent is non-binding and is intended solely to outline the principal terms upon which the parties may negotiate a definitive Lease Agreement. Neither party shall have any binding obligations unless and until a definitive lease is fully executed by both parties.'),

    sectionHeading('Signatures'),
    signatureLine('Landlord'),
    signatureLine('Tenant'),
  ]);
}

function renderTour(d) {
  return flat([
    sectionHeading('Tour Details'),
    twoFieldParagraph('Date', d.tour_date, 'Type', d.property_type),
    fieldRow('Address', d.property_address),
    twoFieldParagraph('Size', d.square_footage, 'Asking', d.asking_price),
    fieldRow('Attendees', d.attendees),

    sectionHeading('Property Overview'),
    textBlock(d.property_overview),

    sectionHeading('Condition Assessment'),
    textBlock(d.condition_assessment),

    sectionHeading('Pros'),
    textBlock(d.pros),

    sectionHeading('Cons'),
    textBlock(d.cons),

    sectionHeading('Financial Notes'),
    textBlock(d.financial_notes),

    sectionHeading('Recommendation'),
    fieldRow('Verdict', d.recommendation),
    textBlock(d.recommendation_detail),

    sectionHeading('Action Items'),
    textBlock(d.action_items),
  ]);
}

function renderEmail(d) {
  return flat([
    sectionHeading('Email Draft'),
    new Paragraph({ spacing: { before: 100 }, children: [] }),
    textBlock(`Subject: ${d.subject}`, { bold: true }),
    new Paragraph({ children: [] }),
    textBlock(d.body),
  ]);
}

// ── Template Map ────────────────────────────
const DOCX_TEMPLATES = {
  'sale-loi':  { subtitle: 'LETTER OF INTENT — ACQUISITION', render: renderSaleLoi },
  'lease-loi': { subtitle: 'LETTER OF INTENT — LEASE', render: renderLeaseLoi },
  'tour':      { subtitle: 'TOUR SUMMARY', render: renderTour },
  'email':     { subtitle: 'EMAIL DRAFT', render: renderEmail },
};

export const DOCX_TOOL_IDS = new Set(Object.keys(DOCX_TEMPLATES));

// ── Main Export ─────────────────────────────
export async function generateDocx(templateId, data) {
  const template = DOCX_TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown docx template: ${templateId}`);

  const children = template.render(data);

  const doc = new Document({
    sections: [{
      headers: { default: brandHeader(template.subtitle) },
      footers: { default: brandFooter() },
      children,
    }],
  });

  return await Packer.toBuffer(doc);
}
