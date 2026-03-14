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

## Outlook Autoresponder Setup

To let brokers email `tools@resoluteinv.com` and get back the tool menu:

1. In Microsoft 365 Admin Center, create a shared mailbox: `tools@resoluteinv.com`
2. Open the mailbox in Outlook
3. Go to Settings → Mail → Rules
4. Create a rule: When message arrives → Reply with the HTML template
5. Paste in the HTML email template (the `resolute-team-tools-email.html` file)

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
