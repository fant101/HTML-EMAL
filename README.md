# Resolute Team Tools

AI-powered document generation for the Resolute team. Brokers fill in forms, get branded PDFs back in seconds.

## Tools Included

**Deal Documents**
- Sale LOI — Letter of Intent for acquisition
- Lease LOI — Letter of Intent for lease deals
- Brokerage Agreement — Listing or buyer/tenant rep agreements

**Client-Facing**
- Tenant Rep Proposal — Pitch for tenant representation
- Brochure Summary — Digest listing brochures into a client email

**Workflow**
- Tour Summary — Recap a property tour
- Draft Email — Deal-related correspondence
- Add Contact — Structure a new CRM record

---

## Deploy to Vercel (Step by Step)

### 1. Get your Anthropic API Key
- Go to https://console.anthropic.com/
- Click API Keys → Create Key
- Copy the key (starts with `sk-ant-`)
- Save it somewhere safe — you'll need it in step 4

### 2. Create a GitHub repo and upload the files
- Go to https://github.com/new
- Name it `resolute-team-tools`, set to **Private**, click "Create repository"
- On the next screen, click **"uploading an existing file"** (the link in the middle of the page)
- Unzip the downloaded zip file on your computer
- **IMPORTANT**: Open the unzipped folder. You should see files like `package.json`, `README.md`, and folders like `app/` and `lib/`. Select ALL of these files and folders and drag them into the GitHub upload area. Do NOT drag the outer folder itself — drag the contents.
- Scroll down and click **"Commit changes"**

### 3. Verify the upload
Your GitHub repo should look like this at the top level:
```
app/
lib/
.env.example
.gitignore
jsconfig.json
next.config.mjs
package.json
package-lock.json
README.md
vercel.json
```
If you see a single folder instead (like `resolute-team-tools/` containing everything), the files are nested one level too deep. Delete the repo and redo step 2, making sure you drag the *contents* of the folder, not the folder itself.

### 4. Deploy on Vercel
- Go to https://vercel.com/dashboard
- Click **"Add New → Project"**
- Connect your GitHub account if prompted
- Find and select `resolute-team-tools`
- Vercel should auto-detect "Next.js" as the framework. If it says "Other", something is wrong with step 2.
- Expand **"Environment Variables"** 
- Add one variable:
  - Name: `ANTHROPIC_API_KEY`
  - Value: paste your API key from step 1
- Click **"Deploy"**
- Wait 1-2 minutes. When it says "Congratulations!", you're live.

### 5. Done
Vercel gives you a URL like `resolute-team-tools.vercel.app`. That's your live app.

**Custom domain** (optional):
- In Vercel → your project → Settings → Domains
- Add `tools.resoluteinc.com` (or whatever you want)
- Vercel shows you DNS records to add at your domain registrar

---

## Outlook Email Workflow

Brokers stay in Outlook the entire time — no browser needed.

### How It Works

1. Broker emails `tools@resoluteinv.com` → gets an auto-reply with the tool menu
2. Broker clicks a tool button → Outlook opens a compose window with the subject pre-set
3. Broker types their deal info (freeform) and optionally attaches PDFs (e.g. listing brochures)
4. Power Automate picks up the email, sends the text + attachments to the API, and replies with the PDF

### Step 1: Create the Shared Mailbox

1. In **Microsoft 365 Admin Center** → Shared mailboxes → Add
2. Name: `tools@resoluteinv.com`
3. Grant "Send As" permissions to a service account or admin

### Step 2: Set Up the Menu Auto-Reply

1. Open the shared mailbox in Outlook
2. Go to **Settings → Mail → Rules**
3. Create a rule: "When a new message arrives" → "Reply using a specific template"
4. Paste the contents of `resolute-team-tools-email.html` as the reply template
5. Add a condition to exclude emails with tool subjects (SALE LOI, LEASE LOI, etc.) so the menu doesn't re-send when brokers submit a filled form

### Step 3: Set Up Power Automate

This flow watches for tool submissions, extracts text + attachments, calls the API, and replies with the PDF.

1. Go to **https://make.powerautomate.com** → Create → Automated cloud flow
2. Trigger: **"When a new email arrives (V3)"**
   - Mailbox: `tools@resoluteinv.com`
   - Subject filter: leave blank (the flow will filter by subject)
   - **Include Attachments**: Yes
3. Add a **Condition**: Check that the subject contains one of: `SALE LOI`, `LEASE LOI`, `BROKERAGE AGREEMENT`, `TENANT REP PROPOSAL`, `BROCHURE SUMMARY`, `TOUR SUMMARY`, `DRAFT EMAIL`, `ADD CONTACT`
4. If yes → Add an **Initialize variable** action:
   - Name: `attachmentsArray`
   - Type: Array
   - Value: `[]`
5. Add an **"Apply to each"** over `triggerOutputs()?['body/attachments']`:
   - Inside, add **Append to array variable**:
     - Name: `attachmentsArray`
     - Value:
       ```json
       {
         "name": "@{items('Apply_to_each')?['name']}",
         "contentType": "@{items('Apply_to_each')?['contentType']}",
         "content": "@{items('Apply_to_each')?['contentBytes']}"
       }
       ```
6. After the loop, add an **HTTP** action:
   - Method: `POST`
   - URI: `https://YOUR-VERCEL-URL.vercel.app/api/generate`
   - Headers: `Content-Type: application/json`
   - Body:
     ```json
     {
       "emailSubject": "@{triggerOutputs()?['body/subject']}",
       "emailBody": "@{triggerOutputs()?['body/body']}",
       "attachments": @{variables('attachmentsArray')}
     }
     ```
7. Add a **"Reply to email (V2)"** action:
   - Message ID: use the trigger's Message ID
   - Body: `Your document is attached.`
   - Attachments Name: `resolute-@{triggerOutputs()?['body/subject']}-@{utcNow()}.pdf`
   - Attachments Content: use the HTTP action's body (the PDF bytes)
8. If no (subject doesn't match) → Do nothing (the auto-reply rule handles menu requests)
9. **Save** and **Turn on** the flow

### Step 4: Test It

1. Send an email to `tools@resoluteinv.com` with no specific subject → you should get the menu
2. Click "Sale LOI" in the menu → type your deal info → send
3. Within ~30 seconds, you should get a reply with the branded PDF attached
4. Try "Brochure Summary" with PDF brochures attached — the system will read and summarize them

---

## Adding or Changing Tools

All tool definitions live in `lib/tools.js`. To add a new tool:

1. Copy an existing tool object in the `TOOLS` array
2. Change the `id`, `label`, `fields`, `systemPrompt`, and `pdfTemplate`
3. Add a matching render function in `lib/pdf.js`
4. Push to GitHub — Vercel auto-deploys

To tweak how a tool works, edit its `systemPrompt` in `lib/tools.js`.

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
# Open http://localhost:3000
```
