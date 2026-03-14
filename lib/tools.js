// All tool definitions for Resolute Team Tools
// Each tool has: client-side config (fields, UI) and server-side config (prompts, PDF layout)

export const TOOLS = [
  // ═══════════════════════════════════════════
  // DEAL DOCUMENTS
  // ═══════════════════════════════════════════
  {
    id: 'sale-loi',
    label: 'Sale LOI',
    icon: '📄',
    description: 'Letter of Intent for acquisition',
    category: 'Deal Documents',
    fields: [
      { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: '4820 S Monaco St, Denver, CO 80237' },
      { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Office Condo', 'Small-Bay Industrial', 'Retail Strip', 'Multifamily', 'Other'] },
      { key: 'squareFootage', label: 'Square Footage', type: 'text', placeholder: '18,500 SF' },
      { key: 'askingPrice', label: 'Asking Price', type: 'text', placeholder: '$3,200,000' },
      { key: 'offerPrice', label: 'Offer Price', type: 'text', placeholder: '$2,775,000' },
      { key: 'earnestMoney', label: 'Earnest Money', type: 'text', placeholder: '$50,000' },
      { key: 'inspectionPeriod', label: 'Inspection Period (days)', type: 'text', placeholder: '45' },
      { key: 'closingTimeline', label: 'Closing Timeline (days)', type: 'text', placeholder: '60' },
      { key: 'financingType', label: 'Financing', type: 'select', options: ['Conventional', 'SBA', 'Cash', 'Seller Financing', 'Assumption'] },
      { key: 'sellerName', label: 'Seller / Owner', type: 'text', placeholder: 'Thompson Family Trust' },
      { key: 'listingBroker', label: 'Listing Broker & Company', type: 'text', placeholder: 'Mike Johnson, CBRE' },
      { key: 'additionalTerms', label: 'Additional Terms / Notes', type: 'textarea', placeholder: 'Subject to financing, Phase I environmental, roof inspection...' },
    ],
    systemPrompt: `You are a commercial real estate LOI assistant for Resolute, Inc., a Colorado-based CRE private equity firm. Given deal inputs, produce a complete, professional Sale LOI. Return ONLY valid JSON with these exact keys:
{
  "loi_date": "(today's date)",
  "buyer_name": "Resolute, Inc.",
  "buyer_entity": "(suggest appropriate entity name, e.g. 'Resolute Fund III, LLC')",
  "seller_name": "(from input)",
  "property_address": "(from input)",
  "property_type": "(from input)",
  "square_footage": "(from input)",
  "purchase_price": "(offer price, formatted with $)",
  "price_per_sf": "(calculated)",
  "earnest_money": "(from input)",
  "em_hard_date": "Day 30",
  "financing_type": "(from input)",
  "inspection_period": "(from input, e.g. '45 days')",
  "closing_date": "(from input, e.g. '60 days from execution')",
  "financing_contingency": "(same as inspection period)",
  "title_review": "30 days",
  "contingencies": "(2-3 sentence paragraph of standard CRE contingencies plus any from additional terms)",
  "additional_terms": "(2-3 sentence paragraph incorporating any additional terms, always include: seller to provide T12, rent roll, and leases within 5 business days; buyer may assign to affiliated entity)",
  "listing_broker": "(name from input)",
  "listing_company": "(company from input)",
  "buyers_broker": "Jack Rohr",
  "buyers_company": "Resolute, Inc.",
  "property_notes": "(brief professional summary of the deal if any notes provided, otherwise empty string)"
}
Return ONLY the JSON. No markdown, no backticks, no explanation.`,
    pdfTemplate: 'sale-loi',
  },

  {
    id: 'lease-loi',
    label: 'Lease LOI',
    icon: '📝',
    description: 'Letter of Intent for a lease deal',
    category: 'Deal Documents',
    fields: [
      { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: '1500 Market St, Suite 200, Denver, CO' },
      { key: 'landlord', label: 'Landlord / Owner', type: 'text', placeholder: 'Market Street Partners LLC' },
      { key: 'tenant', label: 'Tenant', type: 'text', placeholder: 'Acme Corp' },
      { key: 'spaceDescription', label: 'Space Description', type: 'text', placeholder: 'Suite 200, 5,500 SF on 2nd floor' },
      { key: 'leaseType', label: 'Lease Type', type: 'select', options: ['NNN', 'Full Service', 'Modified Gross', 'Industrial Gross'] },
      { key: 'baseRent', label: 'Proposed Base Rent', type: 'text', placeholder: '$18.50/SF NNN' },
      { key: 'annualEscalation', label: 'Annual Escalation', type: 'text', placeholder: '3% annually' },
      { key: 'leaseTerm', label: 'Lease Term', type: 'text', placeholder: '5 years' },
      { key: 'commencementDate', label: 'Target Commencement', type: 'text', placeholder: 'July 1, 2026' },
      { key: 'tiAllowance', label: 'TI Allowance', type: 'text', placeholder: '$25/SF' },
      { key: 'freeRent', label: 'Free Rent', type: 'text', placeholder: '2 months' },
      { key: 'renewalOptions', label: 'Renewal Options', type: 'text', placeholder: '1 x 5-year at 95% FMV' },
      { key: 'listingBroker', label: 'Listing Broker & Company', type: 'text', placeholder: 'Sarah Chen, JLL' },
      { key: 'additionalTerms', label: 'Additional Terms', type: 'textarea', placeholder: 'Parking requirements, signage, exclusivity clause...' },
    ],
    systemPrompt: `You are a commercial real estate lease LOI assistant for Resolute, Inc. Given lease deal inputs, produce a professional Lease LOI. Return ONLY valid JSON:
{
  "loi_date": "(today's date)",
  "landlord_name": "(from input)",
  "tenant_name": "(from input)",
  "property_address": "(from input)",
  "space_description": "(from input)",
  "lease_type": "(from input)",
  "base_rent": "(from input, formatted)",
  "annual_escalation": "(from input)",
  "lease_term": "(from input)",
  "commencement_date": "(from input)",
  "ti_allowance": "(from input)",
  "free_rent": "(from input)",
  "renewal_options": "(from input)",
  "operating_expenses": "(infer from lease type — e.g. 'Tenant responsible for pro-rata share of taxes, insurance, and CAM' for NNN)",
  "permitted_use": "(infer from tenant name if possible, otherwise 'General office use')",
  "contingencies": "(2-3 sentence paragraph: subject to lease review by counsel, landlord financial review, board approval)",
  "additional_terms": "(incorporate any additional terms from input into a professional paragraph)",
  "listing_broker": "(name from input)",
  "listing_company": "(company from input)",
  "tenant_rep_broker": "Jack Rohr",
  "tenant_rep_company": "Resolute, Inc."
}
Return ONLY the JSON.`,
    pdfTemplate: 'lease-loi',
  },

  {
    id: 'brokerage',
    label: 'Brokerage Agreement',
    icon: '🤝',
    description: 'Listing or buyer rep agreement',
    category: 'Deal Documents',
    fields: [
      { key: 'agreementType', label: 'Agreement Type', type: 'select', options: ['Exclusive Listing Agreement', 'Buyer Representation Agreement', 'Tenant Representation Agreement'] },
      { key: 'clientName', label: 'Client Name', type: 'text', placeholder: 'ABC Holdings LLC' },
      { key: 'clientContact', label: 'Client Contact Person', type: 'text', placeholder: 'John Smith, Managing Partner' },
      { key: 'propertyAddress', label: 'Property Address (if listing)', type: 'text', placeholder: '4820 S Monaco St, Denver, CO' },
      { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Office', 'Industrial', 'Retail', 'Multifamily', 'Mixed-Use', 'Land', 'Other'] },
      { key: 'listPrice', label: 'List Price or Budget', type: 'text', placeholder: '$3,200,000' },
      { key: 'commissionRate', label: 'Commission Rate', type: 'text', placeholder: '6%' },
      { key: 'termLength', label: 'Agreement Term', type: 'text', placeholder: '12 months' },
      { key: 'scope', label: 'Scope / Requirements', type: 'textarea', placeholder: 'Describe the assignment scope, target market, property specs...' },
    ],
    systemPrompt: `You are a CRE brokerage agreement assistant for Resolute, Inc. Given deal inputs, produce a professional brokerage agreement summary. Return ONLY valid JSON:
{
  "agreement_date": "(today's date)",
  "agreement_type": "(from input)",
  "broker_name": "Resolute, Inc.",
  "broker_contact": "Jack Rohr, Principal",
  "client_name": "(from input)",
  "client_contact": "(from input)",
  "property_address": "(from input or 'Per scope of services')",
  "property_type": "(from input)",
  "list_price_or_budget": "(from input)",
  "commission_rate": "(from input)",
  "commission_structure": "(e.g. 'X% of gross sale price, split per cooperating broker agreement' or 'X% of aggregate lease value')",
  "term_length": "(from input)",
  "term_start": "(today's date)",
  "term_end": "(calculated)",
  "scope_of_services": "(professional 3-4 sentence paragraph describing broker duties based on agreement type and scope input)",
  "exclusivity_clause": "(standard exclusivity language appropriate to agreement type)",
  "termination_clause": "Either party may terminate with 30 days written notice. Broker protection period of 180 days applies to all prospects introduced during the term.",
  "additional_terms": "(any additional relevant terms)"
}
Return ONLY the JSON.`,
    pdfTemplate: 'brokerage',
  },

  // ═══════════════════════════════════════════
  // CLIENT-FACING
  // ═══════════════════════════════════════════
  {
    id: 'tenant-rep',
    label: 'Tenant Rep Proposal',
    icon: '🏢',
    description: 'Pitch for tenant representation',
    category: 'Client-Facing',
    fields: [
      { key: 'prospectName', label: 'Prospect / Company', type: 'text', placeholder: 'Acme Corp' },
      { key: 'contactPerson', label: 'Contact Person & Title', type: 'text', placeholder: 'Jane Doe, VP of Operations' },
      { key: 'industry', label: 'Industry', type: 'text', placeholder: 'Technology / SaaS' },
      { key: 'currentLocation', label: 'Current Location', type: 'text', placeholder: '2000 Blake St, Denver — lease expires Dec 2026' },
      { key: 'spaceNeeds', label: 'Space Requirements', type: 'textarea', placeholder: '8,000-12,000 SF, open floor plan, 2 conference rooms, near light rail...' },
      { key: 'targetSubmarkets', label: 'Target Submarkets', type: 'text', placeholder: 'LoDo, RiNo, Cherry Creek' },
      { key: 'budget', label: 'Budget Range', type: 'text', placeholder: '$20-28/SF Full Service' },
      { key: 'timeline', label: 'Decision Timeline', type: 'text', placeholder: 'Need to be in new space by Q4 2026' },
      { key: 'whyResolute', label: 'Why Resolute (key differentiators)', type: 'textarea', placeholder: 'Deep relationships with landlords in target markets, recent similar deals...' },
    ],
    systemPrompt: `You are a CRE tenant representation proposal writer for Resolute, Inc., a Colorado-based commercial real estate firm. Create a polished, persuasive tenant rep proposal. Return ONLY valid JSON:
{
  "proposal_date": "(today's date)",
  "prospect_name": "(from input)",
  "contact_person": "(from input)",
  "industry": "(from input)",
  "executive_summary": "(3-4 sentence compelling overview of why Resolute is the right choice for this tenant)",
  "understanding_of_needs": "(2-3 paragraph section demonstrating understanding of the client's situation, current space, and requirements)",
  "scope_of_services": "(bullet-point style list as a single string with newlines: market survey, tour coordination, lease negotiation, financial analysis, etc.)",
  "market_overview": "(2-3 sentences about current conditions in the target submarkets)",
  "target_submarkets": "(from input)",
  "space_requirements": "(from input, cleaned up)",
  "budget_range": "(from input)",
  "proposed_timeline": "(create a realistic timeline: Week 1-2 market survey, Week 3-4 tours, Week 5-6 LOI/negotiation, etc.)",
  "team_qualifications": "(2-3 sentences about Resolute's expertise, with Jack Rohr as lead broker)",
  "fee_structure": "Resolute's tenant representation services are provided at no cost to the tenant. Broker compensation is paid by the landlord per market standard.",
  "next_steps": "(2-3 concrete next steps)"
}
Return ONLY the JSON.`,
    pdfTemplate: 'tenant-rep',
  },

  {
    id: 'brochure',
    label: 'Brochure Summary',
    icon: '📑',
    description: 'Digest brochures into a client email',
    category: 'Client-Facing',
    fields: [
      { key: 'clientName', label: 'Client Name', type: 'text', placeholder: 'Jane Doe' },
      { key: 'clientCompany', label: 'Client Company', type: 'text', placeholder: 'Acme Corp' },
      { key: 'searchCriteria', label: 'What they\'re looking for', type: 'text', placeholder: '10,000-15,000 SF industrial in south metro' },
      { key: 'brochureContent', label: 'Paste brochure details (one or more)', type: 'textarea', placeholder: 'Paste the key details from each brochure here:\n\nProperty 1: 4820 S Monaco St - 18,500 SF industrial, $14/SF NNN...\n\nProperty 2: 7200 S Alton Way - 12,000 SF flex...' },
      { key: 'brokerNotes', label: 'Your notes / recommendations', type: 'textarea', placeholder: 'Property 1 is the best fit because of clear height and dock doors. Property 2 is tight on size but great price...' },
    ],
    systemPrompt: `You are a CRE broker's email assistant for Resolute, Inc. Given brochure details and broker notes, create a polished client-facing email summarizing the options. Return ONLY valid JSON:
{
  "email_subject": "(e.g. 'New Space Options for Your Review — [search description]')",
  "greeting": "(e.g. 'Hi Jane,')",
  "intro_paragraph": "(1-2 sentences: we've identified some options matching your criteria, here's a summary)",
  "properties": [
    {
      "name": "(property name/address)",
      "summary": "(3-4 sentence summary: size, rate, key features, pros/cons)",
      "broker_note": "(1 sentence personal recommendation)"
    }
  ],
  "recommendation": "(1-2 sentence overall recommendation — which to tour first and why)",
  "closing": "(1-2 sentences: suggest next steps, offer to schedule tours)",
  "sign_off": "Best,\nJack Rohr\nResolute, Inc."
}
Return ONLY the JSON.`,
    pdfTemplate: 'brochure',
  },

  // ═══════════════════════════════════════════
  // WORKFLOW
  // ═══════════════════════════════════════════
  {
    id: 'tour',
    label: 'Tour Summary',
    icon: '🚶',
    description: 'Recap a property tour for the file',
    category: 'Workflow',
    fields: [
      { key: 'propertyAddress', label: 'Property Address', type: 'text', placeholder: '4820 S Monaco St, Denver, CO' },
      { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Office', 'Industrial', 'Retail', 'Multifamily', 'Mixed-Use', 'Land'] },
      { key: 'tourDate', label: 'Tour Date', type: 'text', placeholder: 'March 14, 2026' },
      { key: 'attendees', label: 'Attendees', type: 'text', placeholder: 'Jack Rohr, Kris Barnes, Mike Johnson (CBRE)' },
      { key: 'squareFootage', label: 'Square Footage', type: 'text', placeholder: '18,500 SF' },
      { key: 'askingPrice', label: 'Asking Price or Rate', type: 'text', placeholder: '$2,775,000 ($150/SF)' },
      { key: 'observations', label: 'Tour Notes / Observations', type: 'textarea', placeholder: 'Good bones, roof needs work, 2 units vacant, clear height 18-22 ft, 3 dock doors, parking ratio 3:1...' },
      { key: 'pros', label: 'Pros', type: 'textarea', placeholder: 'Great location, below replacement cost, repositioning upside...' },
      { key: 'cons', label: 'Cons', type: 'textarea', placeholder: 'Roof replacement $80K, environmental unknown, month-to-month tenants...' },
      { key: 'recommendation', label: 'Recommendation', type: 'select', options: ['Pursue — Submit LOI', 'Pursue — Need More Info', 'Pass', 'Watchlist'] },
    ],
    systemPrompt: `You are a CRE tour summary writer for Resolute, Inc. Create a professional tour summary for internal records. Return ONLY valid JSON:
{
  "tour_date": "(from input)",
  "property_address": "(from input)",
  "property_type": "(from input)",
  "square_footage": "(from input)",
  "asking_price": "(from input)",
  "attendees": "(from input)",
  "property_overview": "(2-3 sentence professional description of the property based on the notes)",
  "condition_assessment": "(2-3 sentences on physical condition, any deferred maintenance, capital needs)",
  "pros": "(clean bulleted list as string with newlines)",
  "cons": "(clean bulleted list as string with newlines)",
  "financial_notes": "(1-2 sentences on pricing relative to market, value-add potential)",
  "recommendation": "(from input selection)",
  "recommendation_detail": "(2-3 sentence explanation of the recommendation, suggested next steps)",
  "action_items": "(list of concrete next steps as string with newlines, e.g. 'Request T12 from listing broker', 'Order Phase I quote', etc.)"
}
Return ONLY the JSON.`,
    pdfTemplate: 'tour',
  },

  {
    id: 'email',
    label: 'Draft Email',
    icon: '✉️',
    description: 'Deal-related correspondence',
    category: 'Workflow',
    fields: [
      { key: 'to', label: 'To (name & role)', type: 'text', placeholder: 'Mike Johnson, listing broker at CBRE' },
      { key: 'purpose', label: 'Purpose', type: 'select', options: ['Initial Inquiry', 'Follow-Up', 'LOI Transmittal', 'Due Diligence Request', 'Offer / Counter', 'Meeting Request', 'Thank You', 'Other'] },
      { key: 'property', label: 'Property (if applicable)', type: 'text', placeholder: '4820 S Monaco St, 18,500 SF industrial' },
      { key: 'keyPoints', label: 'Key Points to Cover', type: 'textarea', placeholder: 'We toured last week, interested but need T12 and rent roll before submitting LOI...' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['Professional / Direct', 'Warm / Relationship-Building', 'Firm / Negotiation'] },
    ],
    systemPrompt: `You are a CRE email drafting assistant for Resolute, Inc. Draft a professional, concise email. Return ONLY valid JSON:
{
  "subject": "(clear, specific subject line)",
  "body": "(complete email body — greeting, content, closing. Keep it concise. No fluff. Sign off as Jack Rohr, Resolute, Inc. Include phone placeholder.)"
}
Return ONLY the JSON.`,
    pdfTemplate: 'email',
  },

  {
    id: 'contact',
    label: 'Add Contact',
    icon: '👤',
    description: 'Structure a new CRM record',
    category: 'Workflow',
    fields: [
      { key: 'name', label: 'Contact Name', type: 'text', placeholder: 'John Smith' },
      { key: 'company', label: 'Company', type: 'text', placeholder: 'Smith Capital Partners' },
      { key: 'role', label: 'Role / Title', type: 'text', placeholder: 'Managing Partner' },
      { key: 'phone', label: 'Phone', type: 'text', placeholder: '(303) 555-1234' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'john@smithcapital.com' },
      { key: 'contactType', label: 'Contact Type', type: 'select', options: ['Seller', 'Broker', 'Lender', 'Investor', 'Vendor', 'Attorney', 'Tenant', 'Landlord', 'Other'] },
      { key: 'notes', label: 'Notes / Context', type: 'textarea', placeholder: 'Met at ICSC, owns 3 retail strips in south metro, interested in selling one...' },
    ],
    systemPrompt: `You are a CRM data assistant for Resolute, Inc. Given contact info, produce a clean structured record. Return ONLY valid JSON:
{
  "full_name": "(properly cased)",
  "company": "(cleaned up)",
  "title": "(from input)",
  "phone": "(formatted: (XXX) XXX-XXXX)",
  "email": "(from input)",
  "contact_type": "(from input)",
  "relationship_summary": "(2-3 sentence paragraph capturing who this person is, what they do, and why they matter to Resolute — based on notes)",
  "tags": "(comma-separated relevant tags, e.g. 'seller, retail, south metro, ICSC contact')",
  "follow_up": "(suggested next action based on notes, e.g. 'Schedule introductory call to discuss retail portfolio')",
  "date_added": "(today's date)"
}
Return ONLY the JSON.`,
    pdfTemplate: 'contact',
  },
];

// Helper to get tool by ID
export function getToolById(id) {
  return TOOLS.find(t => t.id === id);
}

// Get tools grouped by category
export function getToolsByCategory() {
  const categories = {};
  for (const tool of TOOLS) {
    if (!categories[tool.category]) categories[tool.category] = [];
    categories[tool.category].push(tool);
  }
  return categories;
}
