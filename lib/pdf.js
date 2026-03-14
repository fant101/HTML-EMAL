import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ── Colors ──────────────────────────────────
const C = {
  darkGreen: rgb(0.075, 0.122, 0.075),
  gold: rgb(0.796, 0.631, 0.208),
  goldMuted: rgb(0.66, 0.525, 0.176),
  lightBg: rgb(0.969, 0.961, 0.941),
  sectionBg: rgb(0.941, 0.929, 0.898),
  text: rgb(0.1, 0.1, 0.1),
  textMuted: rgb(0.42, 0.42, 0.42),
  white: rgb(1, 1, 1),
  border: rgb(0.831, 0.812, 0.773),
  fieldBg: rgb(0.98, 0.98, 0.97),
};

const W = 612; // letter width
const H = 792; // letter height
const MARGIN = 50;
const CONTENT_W = W - MARGIN * 2;

// ── Text Wrapping ───────────────────────────
function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [];
  const lines = [];
  const paragraphs = text.split('\n');
  for (const para of paragraphs) {
    const words = para.split(' ').filter(Boolean);
    if (words.length === 0) { lines.push(''); continue; }
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

// ── Page Manager ────────────────────────────
class PageManager {
  constructor(doc, fonts, subtitle) {
    this.doc = doc;
    this.fonts = fonts;
    this.subtitle = subtitle;
    this.page = null;
    this.y = 0;
    this.pageNum = 0;
    this.addPage(true);
  }

  addPage(isFirst = false) {
    this.page = this.doc.addPage([W, H]);
    this.pageNum++;

    // Background
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.lightBg });

    if (isFirst) {
      // Full header
      this.page.drawRectangle({ x: 0, y: H - 100, width: W, height: 100, color: C.darkGreen });
      this.page.drawLine({ start: { x: MARGIN, y: H - 100 }, end: { x: W - MARGIN, y: H - 100 }, color: C.gold, thickness: 2 });
      this.page.drawText('RESOLUTE', { x: MARGIN, y: H - 55, size: 28, font: this.fonts.bold, color: C.gold });
      this.page.drawText(this.subtitle, { x: MARGIN, y: H - 78, size: 11, font: this.fonts.regular, color: C.goldMuted });
      this.y = H - 125;
    } else {
      // Mini header
      this.page.drawRectangle({ x: 0, y: H - 50, width: W, height: 50, color: C.darkGreen });
      this.page.drawText('RESOLUTE', { x: MARGIN, y: H - 35, size: 16, font: this.fonts.bold, color: C.gold });
      this.page.drawText(this.subtitle + ' — CONTINUED', { x: MARGIN + 110, y: H - 33, size: 9, font: this.fonts.regular, color: C.goldMuted });
      this.page.drawLine({ start: { x: MARGIN, y: H - 50 }, end: { x: W - MARGIN, y: H - 50 }, color: C.gold, thickness: 2 });
      this.y = H - 75;
    }

    // Footer
    this.page.drawRectangle({ x: 0, y: 0, width: W, height: 35, color: C.darkGreen });
    this.page.drawText('RESOLUTE, INC.', { x: MARGIN, y: 12, size: 9, font: this.fonts.bold, color: C.gold });
    this.page.drawText('Commercial Real Estate Private Equity  ·  Colorado', { x: MARGIN + 105, y: 12, size: 8, font: this.fonts.regular, color: C.goldMuted });
  }

  ensureSpace(needed) {
    if (this.y - needed < 50) {
      this.addPage();
    }
  }

  sectionHeader(title) {
    this.ensureSpace(35);
    this.y -= 10;
    this.page.drawRectangle({ x: MARGIN, y: this.y - 4, width: CONTENT_W, height: 22, color: C.sectionBg, borderRadius: 2 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 4, width: 4, height: 22, color: C.gold });
    this.page.drawText(title.toUpperCase(), { x: MARGIN + 12, y: this.y + 2, size: 10, font: this.fonts.bold, color: C.darkGreen });
    this.y -= 30;
  }

  fieldRow(label, value) {
    if (!value) return;
    this.ensureSpace(22);
    const labelW = 140;
    this.page.drawText(label + ':', { x: MARGIN + 8, y: this.y + 3, size: 9, font: this.fonts.regular, color: C.textMuted });

    // Wrap value if long
    const maxW = CONTENT_W - labelW - 20;
    const lines = wrapText(String(value), this.fonts.regular, 10, maxW);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        this.y -= 14;
        this.ensureSpace(16);
      }
      this.page.drawText(lines[i], { x: MARGIN + labelW, y: this.y + 2, size: 10, font: this.fonts.regular, color: C.text });
    }
    this.y -= 22;
  }

  twoFieldRow(label1, value1, label2, value2) {
    if (!value1 && !value2) return;
    this.ensureSpace(22);
    const colW = CONTENT_W / 2;
    const labelW = 120;

    if (value1) {
      this.page.drawText(label1 + ':', { x: MARGIN + 8, y: this.y + 3, size: 9, font: this.fonts.regular, color: C.textMuted });
      this.page.drawText(String(value1), { x: MARGIN + labelW, y: this.y + 2, size: 10, font: this.fonts.regular, color: C.text });
    }
    if (value2) {
      this.page.drawText(label2 + ':', { x: MARGIN + colW + 8, y: this.y + 3, size: 9, font: this.fonts.regular, color: C.textMuted });
      this.page.drawText(String(value2), { x: MARGIN + colW + labelW, y: this.y + 2, size: 10, font: this.fonts.regular, color: C.text });
    }
    this.y -= 22;
  }

  textBlock(text, fontSize = 9) {
    if (!text) return;
    const lines = wrapText(String(text), this.fonts.regular, fontSize, CONTENT_W - 16);
    for (const line of lines) {
      this.ensureSpace(16);
      this.page.drawText(line, { x: MARGIN + 8, y: this.y, size: fontSize, font: this.fonts.regular, color: C.text });
      this.y -= 14;
    }
    this.y -= 4;
  }

  boldTextBlock(text, fontSize = 9) {
    if (!text) return;
    const lines = wrapText(String(text), this.fonts.bold, fontSize, CONTENT_W - 16);
    for (const line of lines) {
      this.ensureSpace(16);
      this.page.drawText(line, { x: MARGIN + 8, y: this.y, size: fontSize, font: this.fonts.bold, color: C.text });
      this.y -= 14;
    }
    this.y -= 4;
  }

  spacer(amount = 10) {
    this.y -= amount;
  }

  signatureBlock(label) {
    this.ensureSpace(50);
    this.y -= 10;
    this.page.drawText(label + ':', { x: MARGIN + 8, y: this.y + 3, size: 9, font: this.fonts.regular, color: C.textMuted });
    this.page.drawLine({ start: { x: MARGIN + 130, y: this.y }, end: { x: MARGIN + 300, y: this.y }, color: C.border, thickness: 0.5 });
    this.page.drawText('Date:', { x: MARGIN + 320, y: this.y + 3, size: 9, font: this.fonts.regular, color: C.textMuted });
    this.page.drawLine({ start: { x: MARGIN + 360, y: this.y }, end: { x: W - MARGIN, y: this.y }, color: C.border, thickness: 0.5 });
    this.y -= 14;
    this.page.drawText('Printed Name & Title', { x: MARGIN + 130, y: this.y, size: 8, font: this.fonts.regular, color: C.textMuted });
    this.y -= 30;
  }
}

// ── Template Renderers ──────────────────────
function renderSaleLoi(pm, d) {
  pm.sectionHeader('Parties');
  pm.fieldRow('Buyer', d.buyer_name);
  pm.fieldRow('Buyer Entity', d.buyer_entity);
  pm.fieldRow('Seller', d.seller_name);

  pm.sectionHeader('Property');
  pm.fieldRow('Address', d.property_address);
  pm.twoFieldRow('Type', d.property_type, 'Square Footage', d.square_footage);
  pm.fieldRow('Legal Description', d.legal_description);

  pm.sectionHeader('Price & Terms');
  pm.twoFieldRow('Purchase Price', d.purchase_price, 'Price/SF', d.price_per_sf);
  pm.twoFieldRow('Earnest Money', d.earnest_money, 'EM Hard Date', d.em_hard_date);
  pm.fieldRow('Financing', d.financing_type);

  pm.sectionHeader('Timeline');
  pm.twoFieldRow('Inspection Period', d.inspection_period, 'Closing', d.closing_date);
  pm.twoFieldRow('Financing Contingency', d.financing_contingency, 'Title Review', d.title_review);

  pm.sectionHeader('Contingencies');
  pm.textBlock(d.contingencies);

  pm.sectionHeader('Additional Terms');
  pm.textBlock(d.additional_terms);

  pm.sectionHeader('Broker Information');
  pm.twoFieldRow('Listing Broker', d.listing_broker, 'Company', d.listing_company);
  pm.twoFieldRow("Buyer's Broker", d.buyers_broker, 'Company', d.buyers_company);

  if (d.property_notes) {
    pm.sectionHeader('Property Notes');
    pm.textBlock(d.property_notes);
  }

  pm.sectionHeader('Non-Binding Acknowledgment');
  pm.textBlock('This Letter of Intent is non-binding and is intended solely to outline the principal terms upon which the parties may enter into a definitive Purchase and Sale Agreement. Neither party shall have any binding obligations unless and until a definitive agreement is fully executed by both parties.', 8.5);

  pm.sectionHeader('Signatures');
  pm.signatureBlock('Buyer');
  pm.signatureBlock('Seller');
}

function renderLeaseLoi(pm, d) {
  pm.sectionHeader('Parties');
  pm.fieldRow('Landlord', d.landlord_name);
  pm.fieldRow('Tenant', d.tenant_name);

  pm.sectionHeader('Premises');
  pm.fieldRow('Address', d.property_address);
  pm.fieldRow('Space', d.space_description);
  pm.fieldRow('Permitted Use', d.permitted_use);

  pm.sectionHeader('Lease Terms');
  pm.twoFieldRow('Lease Type', d.lease_type, 'Term', d.lease_term);
  pm.twoFieldRow('Base Rent', d.base_rent, 'Escalation', d.annual_escalation);
  pm.twoFieldRow('Commencement', d.commencement_date, 'Free Rent', d.free_rent);
  pm.twoFieldRow('TI Allowance', d.ti_allowance, 'Renewal Options', d.renewal_options);
  pm.fieldRow('Operating Expenses', d.operating_expenses);

  pm.sectionHeader('Contingencies');
  pm.textBlock(d.contingencies);

  pm.sectionHeader('Additional Terms');
  pm.textBlock(d.additional_terms);

  pm.sectionHeader('Broker Information');
  pm.twoFieldRow('Listing Broker', d.listing_broker, 'Company', d.listing_company);
  pm.twoFieldRow('Tenant Rep', d.tenant_rep_broker, 'Company', d.tenant_rep_company);

  pm.sectionHeader('Non-Binding Acknowledgment');
  pm.textBlock('This Letter of Intent is non-binding and is intended solely to outline the principal terms upon which the parties may negotiate a definitive Lease Agreement. Neither party shall have any binding obligations unless and until a definitive lease is fully executed by both parties.', 8.5);

  pm.sectionHeader('Signatures');
  pm.signatureBlock('Landlord');
  pm.signatureBlock('Tenant');
}

function renderBrokerage(pm, d) {
  pm.sectionHeader('Agreement Details');
  pm.fieldRow('Agreement Type', d.agreement_type);
  pm.twoFieldRow('Date', d.agreement_date, 'Term', d.term_length);
  pm.twoFieldRow('Term Start', d.term_start, 'Term End', d.term_end);

  pm.sectionHeader('Parties');
  pm.fieldRow('Broker', d.broker_name);
  pm.fieldRow('Broker Contact', d.broker_contact);
  pm.fieldRow('Client', d.client_name);
  pm.fieldRow('Client Contact', d.client_contact);

  pm.sectionHeader('Property');
  pm.fieldRow('Address', d.property_address);
  pm.fieldRow('Type', d.property_type);
  pm.fieldRow('Price / Budget', d.list_price_or_budget);

  pm.sectionHeader('Commission');
  pm.fieldRow('Rate', d.commission_rate);
  pm.textBlock(d.commission_structure);

  pm.sectionHeader('Scope of Services');
  pm.textBlock(d.scope_of_services);

  pm.sectionHeader('Exclusivity');
  pm.textBlock(d.exclusivity_clause);

  pm.sectionHeader('Termination');
  pm.textBlock(d.termination_clause);

  if (d.additional_terms) {
    pm.sectionHeader('Additional Terms');
    pm.textBlock(d.additional_terms);
  }

  pm.sectionHeader('Signatures');
  pm.signatureBlock('Broker');
  pm.signatureBlock('Client');
}

function renderTenantRep(pm, d) {
  pm.sectionHeader('Prepared For');
  pm.fieldRow('Company', d.prospect_name);
  pm.fieldRow('Contact', d.contact_person);
  pm.fieldRow('Industry', d.industry);
  pm.fieldRow('Date', d.proposal_date);

  pm.sectionHeader('Executive Summary');
  pm.textBlock(d.executive_summary);

  pm.sectionHeader('Understanding of Needs');
  pm.textBlock(d.understanding_of_needs);

  pm.sectionHeader('Space Requirements');
  pm.fieldRow('Target Markets', d.target_submarkets);
  pm.fieldRow('Requirements', d.space_requirements);
  pm.fieldRow('Budget', d.budget_range);

  pm.sectionHeader('Market Overview');
  pm.textBlock(d.market_overview);

  pm.sectionHeader('Scope of Services');
  pm.textBlock(d.scope_of_services);

  pm.sectionHeader('Proposed Timeline');
  pm.textBlock(d.proposed_timeline);

  pm.sectionHeader('Team Qualifications');
  pm.textBlock(d.team_qualifications);

  pm.sectionHeader('Fee Structure');
  pm.textBlock(d.fee_structure);

  pm.sectionHeader('Next Steps');
  pm.textBlock(d.next_steps);
}

function renderBrochure(pm, d) {
  pm.sectionHeader('Client Email — Property Options');
  pm.spacer(5);
  pm.boldTextBlock(`Subject: ${d.email_subject}`);
  pm.spacer(5);
  pm.textBlock(d.greeting);
  pm.textBlock(d.intro_paragraph);

  if (d.properties && d.properties.length > 0) {
    for (let i = 0; i < d.properties.length; i++) {
      const p = d.properties[i];
      pm.sectionHeader(`Option ${i + 1}: ${p.name}`);
      pm.textBlock(p.summary);
      if (p.broker_note) {
        pm.boldTextBlock(`Broker Note: ${p.broker_note}`);
      }
    }
  }

  pm.sectionHeader('Recommendation');
  pm.textBlock(d.recommendation);

  pm.spacer(10);
  pm.textBlock(d.closing);
  pm.spacer(5);
  pm.textBlock(d.sign_off);
}

function renderTour(pm, d) {
  pm.sectionHeader('Tour Details');
  pm.twoFieldRow('Date', d.tour_date, 'Type', d.property_type);
  pm.fieldRow('Address', d.property_address);
  pm.twoFieldRow('Size', d.square_footage, 'Asking', d.asking_price);
  pm.fieldRow('Attendees', d.attendees);

  pm.sectionHeader('Property Overview');
  pm.textBlock(d.property_overview);

  pm.sectionHeader('Condition Assessment');
  pm.textBlock(d.condition_assessment);

  pm.sectionHeader('Pros');
  pm.textBlock(d.pros);

  pm.sectionHeader('Cons');
  pm.textBlock(d.cons);

  pm.sectionHeader('Financial Notes');
  pm.textBlock(d.financial_notes);

  pm.sectionHeader('Recommendation');
  pm.fieldRow('Verdict', d.recommendation);
  pm.textBlock(d.recommendation_detail);

  pm.sectionHeader('Action Items');
  pm.textBlock(d.action_items);
}

function renderEmail(pm, d) {
  pm.sectionHeader('Email Draft');
  pm.spacer(5);
  pm.boldTextBlock(`Subject: ${d.subject}`);
  pm.spacer(10);
  pm.textBlock(d.body);
}

function renderContact(pm, d) {
  pm.sectionHeader('Contact Record');
  pm.fieldRow('Name', d.full_name);
  pm.fieldRow('Company', d.company);
  pm.fieldRow('Title', d.title);
  pm.twoFieldRow('Phone', d.phone, 'Email', d.email);
  pm.fieldRow('Type', d.contact_type);
  pm.fieldRow('Date Added', d.date_added);

  pm.sectionHeader('Relationship Summary');
  pm.textBlock(d.relationship_summary);

  pm.sectionHeader('Tags');
  pm.textBlock(d.tags);

  pm.sectionHeader('Suggested Follow-Up');
  pm.textBlock(d.follow_up);
}

// ── Template Map ────────────────────────────
const TEMPLATES = {
  'sale-loi':  { subtitle: 'LETTER OF INTENT — ACQUISITION', render: renderSaleLoi },
  'lease-loi': { subtitle: 'LETTER OF INTENT — LEASE', render: renderLeaseLoi },
  'brokerage': { subtitle: 'BROKERAGE AGREEMENT', render: renderBrokerage },
  'tenant-rep':{ subtitle: 'TENANT REPRESENTATION PROPOSAL', render: renderTenantRep },
  'brochure':  { subtitle: 'PROPERTY OPTIONS — CLIENT EMAIL', render: renderBrochure },
  'tour':      { subtitle: 'TOUR SUMMARY', render: renderTour },
  'email':     { subtitle: 'EMAIL DRAFT', render: renderEmail },
  'contact':   { subtitle: 'CONTACT RECORD', render: renderContact },
};

// ── Main Export ─────────────────────────────
export async function generatePDF(templateId, data) {
  const template = TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown template: ${templateId}`);

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };

  const pm = new PageManager(doc, fonts, template.subtitle);
  template.render(pm, data);

  return await doc.save();
}
