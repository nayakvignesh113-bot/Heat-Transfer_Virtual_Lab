# Setting up report submissions (about 10 minutes, once)

Students press **Submit to faculty** on the Report tab, and must complete a short **feedback form** before they can print, download or submit. Each submission becomes one row of the *Submissions* sheet and each feedback form one row of the *Feedback* sheet, in a Google Sheet that you own. A submission row holds server time, Report ID, experiment, name, USN, section, safety acknowledgement time, whether the student set up the machine themselves (and how many interlock alarms they triggered), pre- and post-test scores (first attempt and current), normalised gain, results within tolerance, numericals, explainer concept checks, the conclusion and the four discussion answers.

## 1. Create the sheet and script

1. Sign in to Google with the account that should own the data.
   * Use **nayak.vignesh113@gmail.com** if in doubt. College Google Workspace accounts (such as @mite.co.in) are often set by the administrator so that web apps cannot be opened by "Anyone"; if the option *Anyone* is missing in step 3, switch to the Gmail account.
2. Open <https://sheets.new>. Name the sheet, e.g. *Heat Transfer Virtual Lab submissions*. Use a new sheet, separate from the NTM and Materials Testing labs' sheets, so that submissions stay apart.
3. Menu **Extensions → Apps Script**. Delete the sample code, paste the whole of `Code.gs` from this folder, and press **Save** (disk icon).

## 2. Set the class code

4. In Apps Script, click **Project Settings** (gear icon, left) → **Script properties** → **Add script property**.
   * Property: `CLASS_CODE`  Value: a short code, e.g. `ME5A-HTL`.
   * Change it each semester or section. Submissions with a wrong code go to a separate *Rejected* sheet.
   * If you leave the property out, every submission is accepted.

## 3. Publish the script as a web app

5. **Deploy → New deployment** → gear next to *Select type* → **Web app**.
   * Description: `Heat Transfer submissions`
   * Execute as: **Me**
   * Who has access: **Anyone**
6. Press **Deploy**, then **Authorize access**. Google warns that the app is unverified, because you wrote it yourself. Click **Advanced → Go to (project name) (unsafe) → Allow**. The script can only write to this one spreadsheet.
7. Copy the **Web app URL** (it ends in `/exec`).
8. Check it: open the URL in a browser. You should see `{"ok":true,"service":"Heat Transfer Virtual Lab submissions"}`.

## 4. Connect the website

9. In the GitHub repository, open `config.js` → pencil icon (Edit) → paste the URL between the quotes:

   ```js
   window.HTL_CONFIG = { submitUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec' };
   ```
10. **Commit changes**. GitHub Pages updates in 1–2 minutes. The Submit button is now active on every Report tab.
11. Give students the class code in class.

## Changing the script later

**Deploy → Manage deployments → pencil → Version: New version → Deploy.** This keeps the same URL. Creating a *new deployment* instead gives a new URL, which you would then have to put in `config.js` again.

## What this does and does not prove

* The **Received** column is Google's server time, so late submissions are visible.
* Students can submit more than once; every submission is kept, so judge by the latest row or the first, as you prefer.
* The Report ID links a sheet row to the printed or downloaded report.
* This is not tamper-proof. A determined student with browser developer tools could send made-up scores. Treat the sheet as a record of work, and spot-check by asking a student to repeat a calculation.
* Data stays in your Google account. Tell students that submitting sends their name, USN, scores and written answers to you.
* Capacity: Google allows about 30 submissions to be processed at the same moment. A class of 60 pressing Submit together will be fine; the script queues them.

## Certificates of completion

Students who have passed the post-test (60 % or more by default), checked their results in Validation, given feedback and submitted their report can press **Request certificate** on the Report tab. The request appears in a **Certificates** tab of your sheet. The student can download the certificate (PDF or PNG) only after you approve it.

**One-time setup**
1. **Project Settings → Script properties → Add script property**: `FACULTY_KEY` = a password only you know (not the class code).
2. If you deployed before adding this property, nothing else is needed; script properties take effect at once.

**Approving**
* In the sheet: tick **Approved** in the Certificates tab. The approval date fills in automatically. Untick to withdraw.
* Or on the website: open the **Faculty** link at the bottom of any page (`…/Heat-Transfer_Virtual_Lab/#faculty`), enter your faculty key, then **Approve** one request or **Approve all shown**. **Preview** and **Draft PDF** show the certificate, stamped *DRAFT — NOT APPROVED*, before you approve it.

**Downloading as faculty**: on the Faculty page, **PDF** downloads one certificate; **Download … certificates (one PDF)** gives every approved certificate shown, one per page.

**Verification**: every certificate carries an ID and the link `…/Heat-Transfer_Virtual_Lab/#verify-<ID>`. Anyone opening it sees whether the certificate is valid and approved. Withdrawn approvals show as not valid.

**Changing the wording**: the pass mark, faculty name, institution and department can be set in `config.js` (see the commented lines there).

## Full reports, issuing without a request, downloads from the link (version 2.1)

* **Full reports.** Each *Submit to faculty* now also saves the student's complete report (observations, graphs, calculations, uncertainty, discussion) as an HTML file in a Drive folder named **Heat Transfer Virtual Lab reports**. The *Full report (Drive)* column of the Submissions sheet links to it. On the Faculty page, **Submissions & reports → Download** fetches one report; **Download … reports (one file)** puts all shown reports in a single file that prints one report per page. Reports submitted before this version have only the sheet summary.
* **Issue certificate.** In **Submissions & reports**, students without a certificate have an **Issue certificate** button. It creates an approved certificate from their submission, even if they never requested one.
* **Download from the link.** The verification link of an approved certificate (`…/#verify-<ID>`) has **Download certificate** buttons, so a student can download it on any computer. In **Certificate requests**, **Copy link** copies a student's link to send them.
* **Logo.** Certificates and lab reports carry the MITE logo.

**After updating `Code.gs`**: paste the new file over the old one, save, then **Deploy → Manage deployments → pencil → Version: New version → Deploy**. The URL stays the same. Google will ask you to authorise again, because the script now saves files to your Drive: choose your account, then *Advanced → Go to … (unsafe) → Allow*. Two new columns (*Experiment code*, *Full report (Drive)*) are added to the Submissions sheet automatically.

## Feedback without the sheet

If `config.js` has no `submitUrl`, the feedback form is still required, but the answers stay only in the student's browser. Set up the sheet to collect them.
