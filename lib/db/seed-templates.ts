/**
 * Juristo Template Seed Script
 * 
 * Run with: npx tsx lib/db/seed-templates.ts
 * 
 * Seeds the JuristoTemplate table with state-wise contract templates
 * following the standard contract structure.
 */

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { juristoTemplate } from "./schema";

const STANDARD_OUTLINE = [
    { title: "Preamble", description: "Who the parties are and the date" },
    { title: "Recitals / Background", description: "WHEREAS clauses explaining why the contract exists" },
    { title: "Definitions", description: "Define key terms used throughout" },
    { title: "Core Obligations", description: "What each party must do" },
    { title: "Payment Terms", description: "If money is involved" },
    { title: "Term & Termination", description: "How long it lasts and how to end it" },
    { title: "Confidentiality", description: "Non-disclosure obligations if applicable" },
    { title: "Dispute Resolution", description: "Arbitration, mediation, or court" },
    { title: "Governing Law", description: "Which state's law applies" },
    { title: "Signatures", description: "With dates, printed names, titles, and company" },
];

// --- TEMPLATE DEFINITIONS ---

interface TemplateDefinition {
    name: string;
    slug: string;
    category: string;
    state: string;
    stateCode: string;
    description: string;
    outline: any[];
    contentTemplate: string;
    requiredFields: any[];
    applicableActs: string;
    registrationRequired: boolean;
}

// Helper to generate rental agreement for specific states
function createRentalTemplate(state: string, stateCode: string, specificAct: string, specificClauses: string): TemplateDefinition {
    return {
        name: `Rental / Lease Agreement — ${state}`,
        slug: `rental-agreement-${state.toLowerCase().replace(/\s+/g, "-")}`,
        category: "rental",
        state,
        stateCode,
        description: `State-specific rental/lease agreement for ${state}. Covers residential and commercial tenancies under ${specificAct}.`,
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Property Details", description: "Complete description of the rented premises" },
            { title: "Rent & Security Deposit", description: "Monthly rent, escalation, deposit amount and refund terms" },
            { title: "Maintenance & Repairs", description: "Responsibilities for upkeep" },
            { title: "Use of Premises", description: "Permitted use and restrictions" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# RENTAL / LEASE AGREEMENT

THIS RENTAL AGREEMENT ("**Agreement**") is made and executed on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Landlord Name}}**, aged about {{Landlord Age}} years, residing at {{Landlord Address}}, PAN: {{Landlord PAN}}
(hereinafter referred to as the "**Lessor/Landlord**", which expression shall include their heirs, executors, administrators, and assigns of the ONE PART)

AND

**{{Tenant Name}}**, aged about {{Tenant Age}} years, residing at {{Tenant Address}}, PAN: {{Tenant PAN}}
(hereinafter referred to as the "**Lessee/Tenant**", which expression shall include their heirs, executors, administrators, and assigns of the OTHER PART)

## RECITALS

WHEREAS, the Landlord is the absolute owner of the property described herein and is entitled to lease the same;

WHEREAS, the Tenant has approached the Landlord for taking the said property on rent for {{Purpose}} purposes;

WHEREAS, both parties have agreed to enter into this Agreement on the terms and conditions set forth herein.

NOW, THEREFORE, in consideration of the mutual covenants herein contained, the parties agree as follows:

## 1. DEFINITIONS

1.1 **"Premises"** means the property situated at {{Property Address}}, comprising {{Property Description}}.

1.2 **"Rent"** means the monthly rental consideration as specified in Clause 3.

1.3 **"Lease Term"** means the period specified in Clause 2.

## 2. TERM OF LEASE

2.1 The Lease shall commence on {{Start Date}} and shall expire on {{End Date}}, unless terminated earlier in accordance with this Agreement.

2.2 The Lease may be renewed for a further period of {{Renewal Period}} upon mutual written agreement, subject to revised terms.

## 3. RENT & SECURITY DEPOSIT

3.1 The Tenant shall pay a monthly rent of **₹{{Monthly Rent}}** (Rupees {{Rent in Words}} only), payable on or before the {{Rent Due Day}} of each calendar month.

3.2 An annual escalation of {{Escalation Percentage}}% shall apply upon each renewal.

3.3 The Tenant shall deposit a sum of **₹{{Security Deposit}}** (Rupees {{Deposit in Words}} only) as refundable security deposit, to be returned within {{Deposit Return Days}} days of vacating, after deducting any outstanding dues or damages.

## 4. MAINTENANCE & REPAIRS

4.1 The Landlord shall be responsible for structural repairs and major maintenance.

4.2 The Tenant shall maintain the premises in good condition and bear costs of day-to-day maintenance and minor repairs.

4.3 The Tenant shall not make any structural alterations without written consent.

## 5. USE OF PREMISES

5.1 The Premises shall be used solely for {{Purpose}} purposes.

5.2 The Tenant shall not sublet, assign, or transfer the Premises without prior written consent.

5.3 The Tenant shall not carry on any illegal or immoral activity on the Premises.

${specificClauses}

## 6. UTILITIES

6.1 The Tenant shall bear all charges for electricity, water, gas, internet, and other utilities consumed during the tenancy.

6.2 Existing utility connections shall be transferred/maintained as mutually agreed.

## 7. TERMINATION

7.1 Either party may terminate this Agreement by giving {{Notice Period}} months' written notice.

7.2 The Landlord may terminate immediately if the Tenant defaults on rent for more than {{Default Period}} consecutive months.

7.3 Upon termination, the Tenant shall vacate and hand over possession in the original condition, subject to normal wear and tear.
`,
        requiredFields: [
            { id: "Landlord Name", label: "Landlord / Owner Name", type: "text", section: "Party Details", required: true },
            { id: "Landlord Address", label: "Landlord Address", type: "textarea", section: "Party Details", required: true },
            { id: "Landlord PAN", label: "Landlord PAN Number", type: "text", section: "Party Details", required: false },
            { id: "Tenant Name", label: "Tenant Name", type: "text", section: "Party Details", required: true },
            { id: "Tenant Address", label: "Tenant Current Address", type: "textarea", section: "Party Details", required: true },
            { id: "Tenant PAN", label: "Tenant PAN Number", type: "text", section: "Party Details", required: false },
            { id: "Property Address", label: "Property Address (being rented)", type: "textarea", section: "Property Details", required: true },
            { id: "Property Description", label: "Property Description (e.g., 2BHK flat, Ground Floor)", type: "text", section: "Property Details", required: true },
            { id: "Purpose", label: "Purpose of Use", type: "select", options: [{ value: "residential", label: "Residential" }, { value: "commercial", label: "Commercial" }], section: "Property Details", required: true },
            { id: "Monthly Rent", label: "Monthly Rent (₹)", type: "number", section: "Financial Terms", required: true },
            { id: "Security Deposit", label: "Security Deposit (₹)", type: "number", section: "Financial Terms", required: true },
            { id: "Escalation Percentage", label: "Annual Rent Escalation (%)", type: "number", section: "Financial Terms", required: true, description: "Typically 5-10%" },
            { id: "Start Date", label: "Lease Start Date", type: "date", section: "Term", required: true },
            { id: "End Date", label: "Lease End Date", type: "date", section: "Term", required: true },
            { id: "Notice Period", label: "Notice Period (months)", type: "number", section: "Term", required: true, description: "Typically 1-3 months" },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Tamil Nadu", label: "Tamil Nadu" }, { value: "Uttar Pradesh", label: "Uttar Pradesh" }, { value: "Gujarat", label: "Gujarat" },
                    { value: "West Bengal", label: "West Bengal" }, { value: "Telangana", label: "Telangana" }, { value: "Rajasthan", label: "Rajasthan" },
                ]
            },
        ],
        applicableActs: specificAct,
        registrationRequired: true,
    };
}

// --- ALL TEMPLATES ---

const TEMPLATES: TemplateDefinition[] = [
    // RENTAL — Maharashtra
    createRentalTemplate("Maharashtra", "IN-MH",
        "Maharashtra Rent Control Act, 1999; Indian Registration Act, 1908; Maharashtra Transfer of Property Act",
        `## STATE-SPECIFIC PROVISIONS (Maharashtra)

5.4 As per the Maharashtra Rent Control Act, 1999, this Agreement shall be compulsorily registered with the Sub-Registrar if the lease term exceeds 12 months.

5.5 Leave and License: If structured as a Leave and License agreement under the Maharashtra Rent Control Act, the Licensee acknowledges that no tenancy rights are created.

5.6 The landlord shall provide Form 29 (Police Verification) details as required under Maharashtra Police Act.`
    ),

    // RENTAL — Delhi
    createRentalTemplate("Delhi", "IN-DL",
        "Delhi Rent Control Act, 1958; Delhi Rent Act, 2020 (proposed); Indian Registration Act, 1908",
        `## STATE-SPECIFIC PROVISIONS (Delhi)

5.4 As per the Delhi Rent Control Act, 1958, fair rent provisions shall apply where applicable.

5.5 The Tenant shall provide valid Aadhaar-based address proof and complete police verification within 15 days of moving in.

5.6 The Agreement shall be notarized and registered if exceeding 11 months.`
    ),

    // RENTAL — Karnataka
    createRentalTemplate("Karnataka", "IN-KA",
        "Karnataka Rent Control Act, 2001; Indian Registration Act, 1908; Karnataka Land Revenue Act",
        `## STATE-SPECIFIC PROVISIONS (Karnataka)

5.4 As per the Karnataka Rent Act, 2001, the landlord shall not charge rent exceeding the standard rent determination.

5.5 All rental agreements must be registered on the Karnataka RERA portal (if applicable) and with the Sub-Registrar.

5.6 The deposit shall not exceed 10 months' rent as per local practice in Bangalore/Karnataka.`
    ),

    // RENTAL — Uttar Pradesh
    createRentalTemplate("Uttar Pradesh", "IN-UP",
        "Uttar Pradesh Urban Buildings (Regulation of Letting, Rent and Eviction) Act, 1972; Indian Registration Act, 1908",
        `## STATE-SPECIFIC PROVISIONS (Uttar Pradesh)

5.4 As per the UP Urban Buildings Act, 1972, the landlord cannot evict the tenant except on grounds specified in Section 20 of the Act.

5.5 No premium or pugree shall be charged for the tenancy.

5.6 The landlord shall register this Agreement with the local municipal authority as required by state regulations.`
    ),

    // RENTAL — Tamil Nadu
    createRentalTemplate("Tamil Nadu", "IN-TN",
        "Tamil Nadu Buildings (Lease and Rent Control) Act, 1960; Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act, 2017",
        `## STATE-SPECIFIC PROVISIONS (Tamil Nadu)

5.4 This Agreement shall be registered as mandated by the Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act, 2017.

5.5 The advance rent collected shall not exceed 3 months' rent as per the 2017 Act.

5.6 Both parties shall complete the tenancy registration on the Tamil Nadu online portal within 30 days.`
    ),

    // RENTAL — Gujarat
    createRentalTemplate("Gujarat", "IN-GJ",
        "Bombay Rents, Hotel and Lodging House Rates Control Act, 1947 (as applicable to Gujarat); Indian Registration Act, 1908",
        `## STATE-SPECIFIC PROVISIONS (Gujarat)

5.4 The provisions of the Bombay Rent Control Act, 1947 shall apply to premises within notified areas of Gujarat.

5.5 The tenant shall submit police verification documents within 14 days of occupying the premises.

5.6 Any dispute regarding standard rent shall be referred to the Rent Controller appointed under the Act.`
    ),

    // NDA — Pan-India
    {
        name: "Non-Disclosure Agreement (NDA)",
        slug: "nda-pan-india",
        category: "nda",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Standard bilateral NDA for protecting confidential information. Applicable across all Indian states under Indian Contract Act, 1872.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Definition of Confidential Information", description: "What constitutes confidential information" },
            { title: "Obligations of Receiving Party", description: "How the information must be protected" },
            { title: "Exclusions", description: "What is NOT considered confidential" },
            { title: "Return of Information", description: "What happens when the NDA ends" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# NON-DISCLOSURE AGREEMENT

THIS NON-DISCLOSURE AGREEMENT ("**Agreement**") is made and executed on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Disclosing Party Name}}**, a {{Disclosing Party Type}} having its registered office at {{Disclosing Party Address}}
(hereinafter referred to as the "**Disclosing Party**")

AND

**{{Receiving Party Name}}**, a {{Receiving Party Type}} having its registered office at {{Receiving Party Address}}
(hereinafter referred to as the "**Receiving Party**")

(The Disclosing Party and Receiving Party are individually referred to as a "**Party**" and collectively as the "**Parties**")

## RECITALS

WHEREAS, the Disclosing Party possesses certain confidential and proprietary information relating to {{Purpose}};

WHEREAS, the Receiving Party desires to receive such information for the purpose of {{Purpose}};

WHEREAS, both Parties wish to protect the confidentiality of such information under the terms of this Agreement.

## 1. DEFINITIONS

1.1 **"Confidential Information"** means all non-public, proprietary, or confidential information disclosed by the Disclosing Party, whether in written, oral, electronic, or visual form, including but not limited to: business plans, financial data, trade secrets, technical specifications, customer lists, marketing strategies, research and development, software, algorithms, and any information marked as "Confidential."

1.2 **"Purpose"** means {{Purpose}}.

## 2. OBLIGATIONS OF RECEIVING PARTY

2.1 The Receiving Party shall hold all Confidential Information in strict confidence and shall not disclose it to any third party without prior written consent.

2.2 The Receiving Party shall use the Confidential Information solely for the Purpose stated herein.

2.3 The Receiving Party shall restrict disclosure to employees and advisors who have a need-to-know and who are bound by confidentiality obligations no less restrictive than those herein.

## 3. EXCLUSIONS

3.1 Confidential Information shall not include information that:
   (a) is or becomes publicly available without breach of this Agreement;
   (b) was known to the Receiving Party before disclosure;
   (c) is independently developed by the Receiving Party;
   (d) is disclosed pursuant to a court order or legal requirement.

## 4. TERM

4.1 This Agreement shall remain in force for a period of {{NDA Duration}} from the date of execution.

4.2 The confidentiality obligations shall survive termination for a period of {{Survival Period}} years.

## 5. RETURN OF INFORMATION

5.1 Upon termination or request, the Receiving Party shall promptly return or destroy all Confidential Information and certify in writing that it has done so.
`,
        requiredFields: [
            { id: "Disclosing Party Name", label: "Disclosing Party Name", type: "text", section: "Party Details", required: true },
            { id: "Disclosing Party Type", label: "Entity Type (e.g., Company, LLP, Individual)", type: "text", section: "Party Details", required: true },
            { id: "Disclosing Party Address", label: "Disclosing Party Address", type: "textarea", section: "Party Details", required: true },
            { id: "Receiving Party Name", label: "Receiving Party Name", type: "text", section: "Party Details", required: true },
            { id: "Receiving Party Type", label: "Entity Type", type: "text", section: "Party Details", required: true },
            { id: "Receiving Party Address", label: "Receiving Party Address", type: "textarea", section: "Party Details", required: true },
            { id: "Purpose", label: "Purpose of Disclosure", type: "textarea", section: "Terms", required: true, description: "E.g., evaluating a potential business partnership" },
            { id: "NDA Duration", label: "Agreement Duration", type: "text", section: "Terms", required: true, description: "E.g., 2 years, 36 months" },
            { id: "Survival Period", label: "Confidentiality Survival Period (years)", type: "number", section: "Terms", required: true, description: "How long after termination obligations continue" },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Tamil Nadu", label: "Tamil Nadu" }, { value: "Pan-India", label: "Pan-India (Central Law)" },
                ]
            },
        ],
        applicableActs: "Indian Contract Act, 1872; Information Technology Act, 2000; Indian Copyright Act, 1957",
        registrationRequired: false,
    },

    // EMPLOYMENT AGREEMENT — Pan-India
    {
        name: "Employment Agreement",
        slug: "employment-agreement-pan-india",
        category: "employment",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Standard employment contract covering terms of employment, compensation, termination, and post-employment restrictions. Applicable across India under central labor laws.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Position & Duties", description: "Role, responsibilities, and reporting structure" },
            { title: "Compensation & Benefits", description: "Salary, bonuses, allowances, and benefits" },
            { title: "Working Hours & Leave", description: "Work schedule and leave entitlements" },
            { title: "Intellectual Property", description: "Ownership of work product" },
            { title: "Non-Compete & Non-Solicitation", description: "Post-employment restrictions" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# EMPLOYMENT AGREEMENT

THIS EMPLOYMENT AGREEMENT ("**Agreement**") is made and executed on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Employer Name}}**, a company incorporated under the laws of India, having its registered office at {{Employer Address}}, represented by {{Employer Representative}} ({{Employer Representative Designation}})
(hereinafter referred to as the "**Employer**" or "**Company**")

AND

**{{Employee Name}}**, aged {{Employee Age}} years, residing at {{Employee Address}}, PAN: {{Employee PAN}}
(hereinafter referred to as the "**Employee**")

## RECITALS

WHEREAS, the Employer is engaged in the business of {{Business Description}};

WHEREAS, the Employee possesses the qualifications and experience suitable for the position of {{Designation}};

WHEREAS, the Employer desires to employ the Employee and the Employee desires to accept employment on the terms herein.

## 1. DEFINITIONS

1.1 **"Confidential Information"** means all proprietary information of the Company.

1.2 **"Intellectual Property"** means all inventions, designs, works, and creations arising from employment.

## 2. POSITION & DUTIES

2.1 The Employee shall serve as **{{Designation}}** reporting to {{Reporting Manager}}.

2.2 The Employee's primary duties shall include {{Key Responsibilities}}.

2.3 The Employee shall devote their full working time and attention to the duties of this position.

## 3. COMPENSATION & BENEFITS

3.1 The Employee shall receive a gross annual salary of **₹{{Annual CTC}}** (Cost to Company), payable monthly.

3.2 The salary structure shall include: Basic Salary, HRA, Special Allowance, and statutory contributions (PF, ESI as applicable).

3.3 The Employee shall be entitled to {{Benefits}} as per Company policy.

## 4. PROBATION

4.1 The Employee shall serve a probation period of {{Probation Period}} months from the date of joining.

4.2 During probation, either party may terminate with {{Probation Notice}} days' notice.

## 5. WORKING HOURS & LEAVE

5.1 Standard working hours shall be {{Working Hours}} per week, {{Days}} days a week.

5.2 Leave entitlement shall be as per Company policy: {{Leave Policy}}.

## 6. INTELLECTUAL PROPERTY

6.1 All Intellectual Property created during the course of employment shall vest exclusively with the Employer.

## 7. TERMINATION

7.1 After confirmation, either party may terminate by giving {{Notice Period}} months' written notice or salary in lieu thereof.

7.2 The Employer may terminate immediately for misconduct, breach of trust, or violation of Company policies.
`,
        requiredFields: [
            { id: "Employer Name", label: "Company / Employer Name", type: "text", section: "Employer Details", required: true },
            { id: "Employer Address", label: "Company Registered Address", type: "textarea", section: "Employer Details", required: true },
            { id: "Employee Name", label: "Employee Full Name", type: "text", section: "Employee Details", required: true },
            { id: "Employee Address", label: "Employee Address", type: "textarea", section: "Employee Details", required: true },
            { id: "Designation", label: "Job Title / Designation", type: "text", section: "Position", required: true },
            { id: "Reporting Manager", label: "Reporting Manager / Supervisor", type: "text", section: "Position", required: true },
            { id: "Annual CTC", label: "Annual CTC (₹)", type: "number", section: "Compensation", required: true },
            { id: "Probation Period", label: "Probation Period (months)", type: "number", section: "Terms", required: true },
            { id: "Notice Period", label: "Notice Period (months)", type: "number", section: "Terms", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Tamil Nadu", label: "Tamil Nadu" }, { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Indian Contract Act, 1872; Industrial Disputes Act, 1947; Payment of Wages Act, 1936; Employees' Provident Funds Act, 1952; Payment of Gratuity Act, 1972; Shops and Establishments Act (state-specific)",
        registrationRequired: false,
    },

    // SERVICE AGREEMENT — Pan-India
    {
        name: "Service Agreement / Consulting Agreement",
        slug: "service-agreement-pan-india",
        category: "service",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Standard service/consulting agreement for engaging independent contractors or service providers. Applicable across India.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Scope of Services", description: "Detailed description of services to be provided" },
            { title: "Deliverables & Milestones", description: "What will be delivered and when" },
            { title: "Intellectual Property", description: "Ownership of work product" },
            ...STANDARD_OUTLINE.slice(4),
        ],
        contentTemplate: `# SERVICE AGREEMENT

THIS SERVICE AGREEMENT ("**Agreement**") is made and executed on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Client Name}}**, a {{Client Type}} having its office at {{Client Address}}
(hereinafter referred to as the "**Client**")

AND

**{{Service Provider Name}}**, a {{Provider Type}} having its office at {{Provider Address}}
(hereinafter referred to as the "**Service Provider**" or "**Consultant**")

## RECITALS

WHEREAS, the Client requires certain professional services as described herein;

WHEREAS, the Service Provider has the expertise and capability to provide such services;

WHEREAS, both parties wish to formalize this engagement on the terms set forth below.

## 1. SCOPE OF SERVICES

1.1 The Service Provider shall provide the following services: {{Service Description}}.

1.2 The detailed scope, deliverables, and milestones are set forth in Schedule A attached hereto.

## 2. COMPENSATION

2.1 The Client shall pay the Service Provider a fee of **₹{{Service Fee}}** for the services rendered.

2.2 Payment shall be made as follows: {{Payment Schedule}}.

2.3 All amounts are exclusive of GST, which shall be charged at applicable rates.

## 3. TERM

3.1 This Agreement shall commence on {{Start Date}} and continue until {{End Date}} or completion of services, whichever is earlier.

## 4. INDEPENDENT CONTRACTOR

4.1 The Service Provider is an independent contractor and not an employee of the Client.

4.2 The Service Provider shall be responsible for their own taxes, insurance, and statutory compliance.
`,
        requiredFields: [
            { id: "Client Name", label: "Client / Company Name", type: "text", section: "Client Details", required: true },
            { id: "Client Address", label: "Client Address", type: "textarea", section: "Client Details", required: true },
            { id: "Service Provider Name", label: "Service Provider / Consultant Name", type: "text", section: "Provider Details", required: true },
            { id: "Provider Address", label: "Provider Address", type: "textarea", section: "Provider Details", required: true },
            { id: "Service Description", label: "Description of Services", type: "textarea", section: "Scope", required: true },
            { id: "Service Fee", label: "Total Service Fee (₹)", type: "number", section: "Compensation", required: true },
            { id: "Payment Schedule", label: "Payment Schedule", type: "text", section: "Compensation", required: true, description: "E.g., 50% upfront, 50% on completion" },
            { id: "Start Date", label: "Start Date", type: "date", section: "Term", required: true },
            { id: "End Date", label: "End Date", type: "date", section: "Term", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Indian Contract Act, 1872; Goods and Services Tax Act, 2017; Information Technology Act, 2000",
        registrationRequired: false,
    },

    // PARTNERSHIP DEED — Pan-India
    {
        name: "Partnership Deed",
        slug: "partnership-deed-pan-india",
        category: "partnership",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Standard partnership deed for forming a partnership firm under the Indian Partnership Act, 1932. Covers profit-sharing, capital contributions, and management.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Name & Business of Firm", description: "Partnership firm name and business nature" },
            { title: "Capital Contributions", description: "Each partner's contribution" },
            { title: "Profit & Loss Sharing", description: "Ratio and distribution rules" },
            { title: "Management & Authority", description: "Decision-making and signing authority" },
            { title: "Admission & Retirement of Partners", description: "How partners join or leave" },
            { title: "Dissolution", description: "Grounds and process for dissolution" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# PARTNERSHIP DEED

THIS PARTNERSHIP DEED ("**Deed**") is made and executed on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Partner 1 Name}}**, aged {{Partner 1 Age}} years, residing at {{Partner 1 Address}}, PAN: {{Partner 1 PAN}}
(hereinafter referred to as the "**First Partner**")

AND

**{{Partner 2 Name}}**, aged {{Partner 2 Age}} years, residing at {{Partner 2 Address}}, PAN: {{Partner 2 PAN}}
(hereinafter referred to as the "**Second Partner**")

(collectively referred to as the "**Partners**")

## RECITALS

WHEREAS, the Partners desire to carry on the business of {{Business Nature}} in partnership;

WHEREAS, the Partners have agreed to the terms of partnership as set forth herein.

## 1. NAME & PLACE OF BUSINESS

1.1 The partnership firm shall be known as **"{{Firm Name}}"**.

1.2 The principal place of business shall be at {{Business Address}}.

## 2. CAPITAL CONTRIBUTIONS

2.1 The initial capital contributions shall be:
   - First Partner: ₹{{Partner 1 Capital}}
   - Second Partner: ₹{{Partner 2 Capital}}

## 3. PROFIT & LOSS SHARING

3.1 Profits and losses shall be shared in the ratio of {{Profit Sharing Ratio}}.

3.2 Accounts shall be settled on {{Accounting Date}} each year.

## 4. MANAGEMENT

4.1 All partners shall have equal rights in the management of the firm unless otherwise agreed.

4.2 Banking operations shall require the signature of {{Banking Authority}}.

## 5. TERM

5.1 The partnership shall commence on {{Start Date}} and continue as a partnership at will / for a fixed term of {{Duration}}.
`,
        requiredFields: [
            { id: "Partner 1 Name", label: "First Partner Name", type: "text", section: "Partner 1 Details", required: true },
            { id: "Partner 1 Address", label: "First Partner Address", type: "textarea", section: "Partner 1 Details", required: true },
            { id: "Partner 1 Capital", label: "First Partner Capital (₹)", type: "number", section: "Partner 1 Details", required: true },
            { id: "Partner 2 Name", label: "Second Partner Name", type: "text", section: "Partner 2 Details", required: true },
            { id: "Partner 2 Address", label: "Second Partner Address", type: "textarea", section: "Partner 2 Details", required: true },
            { id: "Partner 2 Capital", label: "Second Partner Capital (₹)", type: "number", section: "Partner 2 Details", required: true },
            { id: "Firm Name", label: "Partnership Firm Name", type: "text", section: "Firm Details", required: true },
            { id: "Business Nature", label: "Nature of Business", type: "text", section: "Firm Details", required: true },
            { id: "Business Address", label: "Principal Place of Business", type: "textarea", section: "Firm Details", required: true },
            { id: "Profit Sharing Ratio", label: "Profit Sharing Ratio (e.g., 50:50 or 60:40)", type: "text", section: "Terms", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Indian Partnership Act, 1932; Indian Contract Act, 1872; Income Tax Act, 1961",
        registrationRequired: true,
    },

    // POWER OF ATTORNEY — Pan-India
    {
        name: "Power of Attorney",
        slug: "power-of-attorney-pan-india",
        category: "power-of-attorney",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "General/Special Power of Attorney authorizing an agent to act on behalf of the principal. Applicable under the Powers of Attorney Act, 1882.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Powers Granted", description: "Specific powers being delegated" },
            { title: "Scope & Limitations", description: "What the agent can and cannot do" },
            { title: "Duration & Revocation", description: "How long and how to cancel" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# POWER OF ATTORNEY

THIS POWER OF ATTORNEY ("**POA**") is made and executed on this {{Date}}, at {{City}}, {{State}}.

## BY

**{{Principal Name}}**, aged {{Principal Age}} years, residing at {{Principal Address}}, PAN: {{Principal PAN}}
(hereinafter referred to as the "**Principal**")

## IN FAVOUR OF

**{{Agent Name}}**, aged {{Agent Age}} years, residing at {{Agent Address}}, PAN: {{Agent PAN}}
(hereinafter referred to as the "**Attorney/Agent**")

## RECITALS

WHEREAS, the Principal is unable to personally attend to certain matters described herein;

WHEREAS, the Principal reposes full trust and confidence in the Agent to act on their behalf.

## 1. GRANT OF POWER

1.1 The Principal hereby appoints and authorizes the Agent to act on their behalf for the following purposes:

{{Powers Description}}

## 2. SCOPE

2.1 This is a **{{POA Type}}** Power of Attorney.

2.2 The Agent shall act within the scope of powers granted and shall not exceed the authority herein.

## 3. DURATION

3.1 This POA shall remain valid from {{Start Date}} until {{End Date}} / until revoked in writing.

## 4. REVOCATION

4.1 The Principal may revoke this POA at any time by giving written notice to the Agent.
`,
        requiredFields: [
            { id: "Principal Name", label: "Principal (Person Granting Power)", type: "text", section: "Principal Details", required: true },
            { id: "Principal Address", label: "Principal Address", type: "textarea", section: "Principal Details", required: true },
            { id: "Agent Name", label: "Agent / Attorney Name", type: "text", section: "Agent Details", required: true },
            { id: "Agent Address", label: "Agent Address", type: "textarea", section: "Agent Details", required: true },
            { id: "Powers Description", label: "Powers Being Granted", type: "textarea", section: "Scope", required: true, description: "Describe specific powers (e.g., sell property, sign documents, operate bank accounts)" },
            {
                id: "POA Type", label: "Type of Power of Attorney", type: "select", section: "Scope", required: true, options: [
                    { value: "General", label: "General (broad powers)" }, { value: "Special", label: "Special (specific purpose)" },
                ]
            },
            { id: "Start Date", label: "Effective From", type: "date", section: "Term", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Powers of Attorney Act, 1882; Indian Registration Act, 1908; Indian Contract Act, 1872",
        registrationRequired: true,
    },

    // LEAVE AND LICENSE AGREEMENT — Maharashtra
    {
        name: "Leave and License Agreement (Maharashtra)",
        slug: "leave-and-license-maharashtra",
        category: "rental",
        state: "Maharashtra",
        stateCode: "IN-MH",
        description: "Mandatory format for renting premises in Maharashtra under Section 24 of the Maharashtra Rent Control Act, 1999. Prevents creation of tenancy rights.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Grant of License", description: "Explicit statement that this is a license, not a lease" },
            { title: "License Fee & Deposit", description: "Monthly fee and refundable deposit" },
            { title: "Use of Premises", description: "Strict limitations on usage" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# LEAVE AND LICENSE AGREEMENT

THIS LEAVE AND LICENSE AGREEMENT ("**Agreement**") is made and executed on this {{Date}}, at {{City}}, Maharashtra.

## BETWEEN

**{{Licensor Name}}**, aged about {{Licensor Age}} years, residing at {{Licensor Address}}, PAN: {{Licensor PAN}}
(hereinafter referred to as the "**Licensor**", which expression shall unless repugnant to the context mean and include their heirs, executors, administrators, and assigns of the FIRST PART)

AND

**{{Licensee Name}}**, aged about {{Licensee Age}} years, residing at {{Licensee Address}}, PAN: {{Licensee PAN}}
(hereinafter referred to as the "**Licensee**", which expression shall unless it be repugnant to the context mean and include their heirs, executors, administrators, and assigns of the SECOND PART)

## RECITALS

WHEREAS, the Licensor is the absolute owner and in possession of the premises situated at {{Property Address}} ("**Premises**");

WHEREAS, the Licensee has requested the Licensor to allow them to use and occupy the Premises on a Leave and License basis for {{Purpose}} purposes;

WHEREAS, the Licensor has agreed to grant such leave and license under Section 24 of the Maharashtra Rent Control Act, 1999.

## 1. GRANT OF LICENSE

1.1 The Licensor hereby grants to the Licensee a revocable leave and license to use and occupy the Premises for a period of {{Duration}} months, commencing from {{Start Date}} and ending on {{End Date}}.

1.2 It is expressly agreed that this Agreement does NOT create any tenancy, lease, or any other interest in the Premises in favor of the Licensee. The juridical possession remains with the Licensor.

## 2. LICENSE FEE & SECURITY DEPOSIT

2.1 The Licensee shall pay a monthly License Fee of **₹{{Monthly Fee}}** (Rupees {{Fee in Words}} only), payable on or before the {{Fee Due Day}} of each calendar month.

2.2 The Licensee has deposited a sum of **₹{{Security Deposit}}** (Rupees {{Deposit in Words}} only) as an interest-free refundable Security Deposit.

## 3. USE OF PREMISES

3.1 The Licensee shall use the Premises strictly for {{Purpose}} purposes and no other.

3.2 The Licensee shall not transfer, assign, or sublet the license or the Premises to any third party.

## 4. TERMINATION

4.1 Either party may terminate this Agreement by giving {{Notice Period}} months' prior written notice.

4.2 The Licensor may terminate immediately if the Licensee defaults on the License Fee for {{Default Period}} months or breaches any term herein.

## 5. STATUTORY COMPLIANCE (MAHARASHTRA)

5.1 As mandated by the Maharashtra Rent Control Act, 1999, this Agreement shall be compulsorily registered.

5.2 In the event the Licensee fails to vacate upon termination or expiry, the Licensor shall be entitled to damages at double the rate of the License Fee as per Section 24(2) of the Act.
`,
        requiredFields: [
            { id: "Licensor Name", label: "Licensor (Owner)", type: "text", section: "Party Details", required: true },
            { id: "Licensor Address", label: "Licensor Address", type: "textarea", section: "Party Details", required: true },
            { id: "Licensee Name", label: "Licensee (Tenant)", type: "text", section: "Party Details", required: true },
            { id: "Licensee Address", label: "Licensee Permanent Address", type: "textarea", section: "Party Details", required: true },
            { id: "Property Address", label: "Property Address", type: "textarea", section: "Property Details", required: true },
            { id: "Duration", label: "Duration in Months (Max 60)", type: "number", section: "Terms", required: true },
            { id: "Start Date", label: "Start Date", type: "date", section: "Terms", required: true },
            { id: "End Date", label: "End Date", type: "date", section: "Terms", required: true },
            { id: "Monthly Fee", label: "Monthly License Fee (₹)", type: "number", section: "Financial Terms", required: true },
            { id: "Security Deposit", label: "Security Deposit (₹)", type: "number", section: "Financial Terms", required: true },
            { id: "Purpose", label: "Purpose of Use", type: "select", options: [{ value: "Residential", label: "Residential" }, { value: "Commercial", label: "Commercial" }], section: "Terms", required: true },
            { id: "Notice Period", label: "Notice Period (Months)", type: "number", section: "Terms", required: true },
        ],
        applicableActs: "Maharashtra Rent Control Act, 1999 (Section 24); Registration Act, 1908",
        registrationRequired: true,
    },

    // FOUNDERS AGREEMENT — Pan-India
    {
        name: "Founders' Agreement",
        slug: "founders-agreement-pan-india",
        category: "corporate",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Essential agreement for startup founders outlining equity ownership, roles, vesting schedules, and intellectual property assignment.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Business Purpose", description: "Vision and goals of the startup" },
            { title: "Equity Ownership & Vesting", description: "Shares allocation and vesting schedule" },
            { title: "Roles and Responsibilities", description: "Operational duties of each founder" },
            { title: "Intellectual Property", description: "IP assignment to the company" },
            { title: "Decision Making & Deadlocks", description: "How major decisions are made" },
            { title: "Founder Departure", description: "What happens if a founder leaves" },
            ...STANDARD_OUTLINE.slice(6),
        ],
        contentTemplate: `# FOUNDERS' AGREEMENT

THIS FOUNDERS' AGREEMENT ("**Agreement**") is made and executed on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Founder 1 Name}}**, residing at {{Founder 1 Address}}, PAN: {{Founder 1 PAN}} (hereinafter "**Founder 1**")

AND

**{{Founder 2 Name}}**, residing at {{Founder 2 Address}}, PAN: {{Founder 2 PAN}} (hereinafter "**Founder 2**")

(Collectively referred to as the "**Founders**")

## RECITALS

WHEREAS, the Founders have agreed to co-found a business entity for the purpose of {{Business Purpose}};

WHEREAS, they wish to set forth their respective rights, roles, equity ownership, and obligations.

## 1. THE BUSINESS

1.1 The Founders are incorporating/have incorporated a company named **{{Company Name}}** (the "**Company**").

1.2 The primary business of the Company shall be {{Business Purpose}}.

## 2. EQUITY OWNERSHIP & VESTING

2.1 The initial equity ownership shall be allocated as follows:
   - Founder 1: {{Founder 1 Equity}}%
   - Founder 2: {{Founder 2 Equity}}%

2.2 **Vesting Schedule:** The Founders' shares shall vest over a period of {{Vesting Period}} months, with a {{Cliff Period}}-month cliff. If a Founder leaves before the cliff, all unvested shares return to the Company.

## 3. ROLES AND RESPONSIBILITIES

3.1 Founder 1 shall act as **{{Founder 1 Role}}** and be responsible for {{Founder 1 Responsibilities}}.

3.2 Founder 2 shall act as **{{Founder 2 Role}}** and be responsible for {{Founder 2 Responsibilities}}.

## 4. INTELLECTUAL PROPERTY ASSIGNMENT

4.1 The Founders hereby assign to the Company all intellectual property rights related to the Company's business, whether created prior to or during the term of this Agreement.

## 5. DECISION MAKING

5.1 Day-to-day decisions shall be made by the respective Founders in their domains.

5.2 Major decisions (e.g., fundraising, pivot, dissolution) shall require unanimous consent.

## 6. FOUNDER DEPARTURE

6.1 If a Founder leaves the Company (Voluntary or Involuntary), their unvested equity shall be repurchased by the Company at nominal value.
`,
        requiredFields: [
            { id: "Founder 1 Name", label: "Founder 1 Name", type: "text", section: "Founders", required: true },
            { id: "Founder 2 Name", label: "Founder 2 Name", type: "text", section: "Founders", required: true },
            { id: "Company Name", label: "Startup / Company Name", type: "text", section: "Company Details", required: true },
            { id: "Business Purpose", label: "Vision / Purpose of Startup", type: "textarea", section: "Company Details", required: true },
            { id: "Founder 1 Equity", label: "Founder 1 Equity (%)", type: "number", section: "Equity", required: true },
            { id: "Founder 2 Equity", label: "Founder 2 Equity (%)", type: "number", section: "Equity", required: true },
            { id: "Vesting Period", label: "Vesting Period (Months, e.g., 48)", type: "number", section: "Equity", required: true },
            { id: "Cliff Period", label: "Cliff Period (Months, e.g., 12)", type: "number", section: "Equity", required: true },
            { id: "Founder 1 Role", label: "Founder 1 Role (e.g., CEO)", type: "text", section: "Roles", required: true },
            { id: "Founder 2 Role", label: "Founder 2 Role (e.g., CTO)", type: "text", section: "Roles", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Companies Act, 2013; Indian Contract Act, 1872; Copyright Act, 1957",
        registrationRequired: false,
    },

    // SOFTWARE DEVELOPMENT AGREEMENT
    {
        name: "Software Development Agreement",
        slug: "software-development-agreement",
        category: "service",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Comprehensive agreement between a client and a developer for creating software, detailing milestones, IP ownership, and warranties.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Scope of Work", description: "Software specifications and deliverables" },
            { title: "Development Phases & Milestones", description: "Timeline of development" },
            { title: "Acceptance Testing", description: "Client's right to review and approve" },
            { title: "Intellectual Property Rights", description: "Transfer of code ownership upon payment" },
            { title: "Warranties & Support", description: "Post-launch bug fixes and guarantees" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# SOFTWARE DEVELOPMENT AGREEMENT

THIS SOFTWARE DEVELOPMENT AGREEMENT ("**Agreement**") is made on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Client Name}}**, having its office at {{Client Address}} (hereinafter "**Client**")

AND

**{{Developer Name}}**, having its office at {{Developer Address}} (hereinafter "**Developer**")

## RECITALS

WHEREAS, the Client wishes to develop a software application/platform for {{Project Purpose}};

WHEREAS, the Developer possesses the necessary technical expertise and has agreed to develop the software.

## 1. SCOPE OF WORK

1.1 The Developer shall design, develop, and deliver software according to the specifications detailed in Schedule A attached hereto ("**Software**").

## 2. TIMELINE & MILESTONES

2.1 The project shall be completed in phases according to the following milestones:
   - Milestone 1: Design Approval ({{M1 Date}})
   - Milestone 2: Core Development ({{M2 Date}})
   - Milestone 3: Final Delivery & Testing ({{M3 Date}})

## 3. COMPENSATION

3.1 The Client shall pay the Developer a total fee of **₹{{Total Fee}}**.

3.2 Payment shall be released proportionately upon successful completion and acceptance of each milestone.

## 4. ACCEPTANCE TESTING

4.1 Upon delivery of each milestone, the Client shall have {{Testing Period}} days to test the Software. If the Software fails to meet the specifications, the Developer shall correct the defects at no additional cost.

## 5. INTELLECTUAL PROPERTY RIGHTS

5.1 Upon full payment of all fees, the Developer assigns all rights, title, and interest in the custom Software, including source code, to the Client (excluding Developer's pre-existing background technology).

## 6. WARRANTIES & SUPPORT

6.1 The Developer warrants that the Software will function substantially in accordance with the specifications for a period of {{Warranty Period}} days after final delivery.
`,
        requiredFields: [
            { id: "Client Name", label: "Client Name", type: "text", section: "Parties", required: true },
            { id: "Client Address", label: "Client Address", type: "textarea", section: "Parties", required: true },
            { id: "Developer Name", label: "Developer/Agency Name", type: "text", section: "Parties", required: true },
            { id: "Developer Address", label: "Developer Address", type: "textarea", section: "Parties", required: true },
            { id: "Project Purpose", label: "Project Description", type: "textarea", section: "Scope", required: true },
            { id: "Total Fee", label: "Total Project Fee (₹)", type: "number", section: "Financial Terms", required: true },
            { id: "Testing Period", label: "Acceptance Testing Period (Days)", type: "number", section: "Terms", required: true },
            { id: "Warranty Period", label: "Warranty Period (Days)", type: "number", section: "Terms", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Karnataka", label: "Karnataka (Bengaluru)" }, { value: "Maharashtra", label: "Maharashtra" }, { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Indian Contract Act, 1872; Information Technology Act, 2000; Copyright Act, 1957",
        registrationRequired: false,
    },

    // FREELANCER AGREEMENT
    {
        name: "Freelancer / Independent Contractor Agreement",
        slug: "freelancer-agreement-pan-india",
        category: "service",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Simple, robust agreement for hiring freelancers (writers, designers, developers) outlining deliverables, payment terms, and IP ownership.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Services Engagement", description: "Nature of freelance work" },
            { title: "Compensation", description: "Hourly vs fixed fee" },
            { title: "Independent Contractor Status", description: "Not an employment relationship" },
            { title: "Work Product Ownership", description: "Work made for hire" },
            ...STANDARD_OUTLINE.slice(5),
        ],
        contentTemplate: `# FREELANCER AGREEMENT

THIS FREELANCER AGREEMENT ("**Agreement**") is made on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Client Name}}**, having its address at {{Client Address}} ("**Client**")

AND

**{{Freelancer Name}}**, having its address at {{Freelancer Address}} ("**Freelancer**")

## 1. SERVICES

1.1 The Freelancer agrees to provide the following services: {{Services}}.

1.2 The Freelancer shall complete the services by {{Deadline}}.

## 2. COMPENSATION

2.1 The Client shall pay the Freelancer a fee of **₹{{Fee Amount}}** for the completed services.

2.2 Payment terms: {{Payment Terms}}.

## 3. INDEPENDENT CONTRACTOR RELATIONSHIP

3.1 The Freelancer is an independent contractor. Nothing in this Agreement creates an employer-employee, partnership, or joint venture relationship. The Freelancer is responsible for their own taxes and equipment.

## 4. WORK PRODUCT OWNERSHIP

4.1 Upon full payment, all deliverables created by the Freelancer under this Agreement shall belong exclusively to the Client as "work made for hire".

## 5. CONFIDENTIALITY

5.1 The Freelancer shall not disclose any confidential information of the Client to third parties.
`,
        requiredFields: [
            { id: "Client Name", label: "Client Name", type: "text", section: "Parties", required: true },
            { id: "Freelancer Name", label: "Freelancer Name", type: "text", section: "Parties", required: true },
            { id: "Services", label: "Description of Services", type: "textarea", section: "Scope", required: true },
            { id: "Deadline", label: "Final Deadline", type: "date", section: "Scope", required: true },
            { id: "Fee Amount", label: "Total Fee (₹)", type: "number", section: "Compensation", required: true },
            { id: "Payment Terms", label: "Payment Terms (e.g., 50% upfront, 50% on completion)", type: "text", section: "Compensation", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Indian Contract Act, 1872; Copyright Act, 1957",
        registrationRequired: false,
    },

    // NON-COMPETE AGREEMENT
    {
        name: "Non-Compete and Non-Solicitation Agreement",
        slug: "non-compete-agreement",
        category: "employment",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Restricts an employee or contractor from joining competitors or poaching clients/staff for a specified duration after termination.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Non-Competition", description: "Restriction on working for competitors" },
            { title: "Non-Solicitation of Clients", description: "Restriction on poaching customers" },
            { title: "Non-Solicitation of Employees", description: "Restriction on hiring away staff" },
            { title: "Reasonableness", description: "Acknowledgment that restrictions are fair" },
            ...STANDARD_OUTLINE.slice(6),
        ],
        contentTemplate: `# NON-COMPETE & NON-SOLICITATION AGREEMENT

THIS AGREEMENT is made on this {{Date}}, at {{City}}, {{State}}.

## BETWEEN

**{{Company Name}}**, having its address at {{Company Address}} ("**Company**")

AND

**{{Individual Name}}**, residing at {{Individual Address}} ("**Individual**")

## 1. NON-COMPETITION

1.1 During the term of engagement and for a period of {{Restriction Period}} months following termination, the Individual shall not, directly or indirectly, engage in, consult with, or be employed by any business that directly competes with the Company's business of {{Company Business}}.

1.2 The geographical scope of this restriction is limited to {{Geography Scope}}.

*(Note: Under Section 27 of the Indian Contract Act, post-employment non-competes are generally void unless drafted narrowly to protect trade secrets.)*

## 2. NON-SOLICITATION OF CLIENTS

2.1 For a period of {{Restriction Period}} months post-termination, the Individual shall not solicit or attempt to divert any clients, customers, or business partners of the Company with whom the Individual had direct contact.

## 3. NON-SOLICITATION OF EMPLOYEES

3.1 For a period of {{Restriction Period}} months post-termination, the Individual shall not recruit, solicit, or induce any employee or contractor of the Company to terminate their relationship with the Company.
`,
        requiredFields: [
            { id: "Company Name", label: "Company Name", type: "text", section: "Parties", required: true },
            { id: "Individual Name", label: "Employee / Contractor Name", type: "text", section: "Parties", required: true },
            { id: "Company Business", label: "Description of Company's Core Business", type: "text", section: "Scope", required: true },
            { id: "Restriction Period", label: "Restriction Period (Months)", type: "number", section: "Scope", required: true },
            { id: "Geography Scope", label: "Geographical Scope (e.g., India, Maharashtra)", type: "text", section: "Scope", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Indian Contract Act, 1872 (Section 27 limits application)",
        registrationRequired: false,
    },

    // WEBSITE TERMS AND CONDITIONS
    {
        name: "Website Terms & Conditions",
        slug: "website-terms-conditions",
        category: "terms",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Legal agreement between a website operator and its users, outlining rules, liability limitations, and IP policies.",
        outline: [
            { title: "Introduction", description: "Acceptance of terms" },
            { title: "User Obligations", description: "Rules of conduct" },
            { title: "Intellectual Property Policy", description: "Website content ownership" },
            { title: "Limitation of Liability", description: "Disclaimers" },
            { title: "Governing Law", description: "Jurisdiction for disputes" },
        ],
        contentTemplate: `# TERMS AND CONDITIONS

**Last Updated:** {{Date}}

Welcome to **{{Website Name}}** ("**Website**"), operated by **{{Company Name}}** ("**We**", "**Us**", or "**Our**"). By accessing or using our Website, you ("**User**") agree to be bound by these Terms and Conditions.

## 1. ACCEPTANCE OF TERMS

1.1 By accessing this Website, you represent that you are at least 18 years of age and hold the legal capacity to enter into a binding contract. If you do not agree to these terms, please do not use the Website.

## 2. USER OBLIGATIONS

2.1 You agree to use the Website only for lawful purposes. You shall not:
   a) Violate any applicable local, state, national, or international law.
   b) Transmit any malware, viruses, or harmful code.
   c) Attempt to gain unauthorized access to our systems.
   d) Infringe upon the intellectual property rights of others.

## 3. INTELLECTUAL PROPERTY

3.1 All content, trademarks, logos, and software on this Website are the exclusive property of {{Company Name}} and are protected by Indian and international copyright laws.

## 4. DISCLAIMERS & LIMITATION OF LIABILITY

4.1 The Website is provided on an "as-is" and "as-available" basis without any warranties of any kind.

4.2 To the maximum extent permitted by law, We shall not be liable for any direct, indirect, incidental, or consequential damages resulting from your use of the Website.

## 5. GOVERNING LAW & JURISDICTION

5.1 These Terms shall be governed by the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts located in {{City}}, {{State}}.
`,
        requiredFields: [
            { id: "Website Name", label: "Website Name / URL", type: "text", section: "Business Details", required: true },
            { id: "Company Name", label: "Operating Company Name", type: "text", section: "Business Details", required: true },
            {
                id: "State", label: "Governing State Jurisdiction", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" }, { value: "Delhi", label: "Delhi" }, { value: "Karnataka", label: "Karnataka" },
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Information Technology Act, 2000; Indian Contract Act, 1872",
        registrationRequired: false,
    },

    // PRIVACY POLICY
    {
        name: "Website Privacy Policy",
        slug: "website-privacy-policy-india",
        category: "terms",
        state: "Pan-India",
        stateCode: "IN-ALL",
        description: "Compliant privacy policy outlining how user data is collected, used, and protected under the IT Act and DPDP Act.",
        outline: [
            { title: "Data Collection", description: "What data is collected" },
            { title: "Use of Data", description: "How the data is utilized" },
            { title: "Data Sharing", description: "Who the data is shared with" },
            { title: "User Rights", description: "Opt-outs and access" },
            { title: "Security", description: "Data protection measures" },
        ],
        contentTemplate: `# PRIVACY POLICY

**Last Updated:** {{Date}}

**{{Company Name}}** ("**We**", "**Us**", or "**Our**") respects your privacy and is committed to protecting your personal data. This Privacy Policy outlines how we collect, use, and safeguard your information when you visit our website **{{Website Name}}**.

## 1. INFORMATION WE COLLECT

1.1 **Personal Information:** We may collect personally identifiable information such as your name, email address, phone number, and billing details when you register or make a purchase.

1.2 **Usage Data:** We automatically collect data regarding your IP address, browser type, pages visited, and time spent on the website via cookies.

## 2. HOW WE USE YOUR INFORMATION

2.1 We use your information to:
   - Provide and maintain our services.
   - Process transactions and send order confirmations.
   - Communicate with you regarding updates, offers, and support.
   - Improve our website functionality and user experience.

## 3. DATA SHARING & DISCLOSURE

3.1 We do not sell your personal data. We may share data with trusted third-party service providers (e.g., payment gateways, hosting providers) solely to facilitate our services, under strict confidentiality agreements.

3.2 We may disclose information if required by law or to respond to valid legal requests by public authorities.

## 4. DATA SECURITY

4.1 We implement appropriate technical and organizational security measures to protect your data against unauthorized access, alteration, or destruction, in compliance with the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.

## 5. YOUR RIGHTS

5.1 You have the right to access, correct, or request deletion of your personal data. You may also opt-out of marketing communications at any time by contacting us at {{Contact Email}}.
`,
        requiredFields: [
            { id: "Website Name", label: "Website Name / URL", type: "text", section: "Business Details", required: true },
            { id: "Company Name", label: "Operating Company Name", type: "text", section: "Business Details", required: true },
            { id: "Contact Email", label: "Privacy Contact Email", type: "text", section: "Business Details", required: true },
            {
                id: "State", label: "Governing State Jurisdiction", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Pan-India", label: "Pan-India" },
                ]
            },
        ],
        applicableActs: "Information Technology Act, 2000 (SPDI Rules 2011); Digital Personal Data Protection Act, 2023",
        registrationRequired: false,
    },

    // AGREEMENT TO SELL (REAL ESTATE) - Maharashtra
    {
        name: "Agreement to Sell Property (Maharashtra)",
        slug: "agreement-to-sell-maharashtra",
        category: "real-estate",
        state: "Maharashtra",
        stateCode: "IN-MH",
        description: "Preliminary agreement between buyer and seller of real estate in Maharashtra, outlining terms before the final Sale Deed is executed.",
        outline: [
            ...STANDARD_OUTLINE.slice(0, 3),
            { title: "Agreement for Sale", description: "Intent to transfer ownership" },
            { title: "Consideration & Payment Schedule", description: "Price and payment stages" },
            { title: "Title Clearances", description: "Seller's guarantee of clean title" },
            { title: "Handover of Possession", description: "When the property will be transferred" },
            ...STANDARD_OUTLINE.slice(6),
        ],
        contentTemplate: `# AGREEMENT TO SELL

THIS AGREEMENT TO SELL ("**Agreement**") is made on this {{Date}}, at {{City}}, Maharashtra.

## BETWEEN

**{{Seller Name}}**, residing at {{Seller Address}}, PAN: {{Seller PAN}}
(hereinafter referred to as the "**Vendor/Seller**")

AND

**{{Buyer Name}}**, residing at {{Buyer Address}}, PAN: {{Buyer PAN}}
(hereinafter referred to as the "**Purchaser/Buyer**")

## RECITALS

WHEREAS, the Seller is the absolute owner of the property bearing {{Property Details}} ("**Scheduled Property**").

WHEREAS, the Seller wishes to sell, and the Buyer wishes to purchase the Scheduled Property for a total consideration of **₹{{Total Consideration}}**.

## 1. CONSIDERATION AND PAYMENT

1.1 The Buyer has paid an earnest money deposit of **₹{{Deposit Amount}}** (Rupees {{Deposit in Words}} only) via {{Payment Mode}} on {{Deposit Date}}.

1.2 The balance consideration of **₹{{Balance Amount}}** shall be paid by the Buyer on or before the execution of the final Sale Deed, which shall be within {{Time Limit}} days from the date of this Agreement.

## 2. TITLE AND ENCUMBRANCES

2.1 The Seller guarantees that the Scheduled Property is free from all encumbrances, mortgages, charges, liens, and litigations.

2.2 The Seller shall provide all original title deeds to the Buyer for verification.

## 3. POSSESSION

3.1 Vacant and peaceful physical possession of the Scheduled Property shall be handed over to the Buyer simultaneously with the registration of the final Sale Deed.

## 4. FORFEITURE & REFUND

4.1 If the Buyer fails to pay the balance consideration within the stipulated time, the Seller shall be entitled to forfeit {{Forfeiture Percentage}}% of the earnest money, and this Agreement shall stand cancelled.

4.2 If the Seller fails to execute the Sale Deed despite the Buyer's readiness, the Seller shall refund the earnest money along with interest at {{Interest Rate}}% p.a., and the Buyer shall have the right to seek specific performance of this Agreement.
`,
        requiredFields: [
            { id: "Seller Name", label: "Seller Name", type: "text", section: "Parties", required: true },
            { id: "Buyer Name", label: "Buyer Name", type: "text", section: "Parties", required: true },
            { id: "Property Details", label: "Detailed Property Description (CTS No., Survey No., Area)", type: "textarea", section: "Property", required: true },
            { id: "Total Consideration", label: "Total Sale Price (₹)", type: "number", section: "Financials", required: true },
            { id: "Deposit Amount", label: "Token/Deposit Paid (₹)", type: "number", section: "Financials", required: true },
            { id: "Balance Amount", label: "Balance to be Paid (₹)", type: "number", section: "Financials", required: true },
            { id: "Time Limit", label: "Time Limit for Final Registry (Days)", type: "number", section: "Terms", required: true },
            {
                id: "State", label: "Jurisdiction / State", type: "select", section: "Legal Details", required: true, options: [
                    { value: "Maharashtra", label: "Maharashtra" },
                ]
            },
        ],
        applicableActs: "Transfer of Property Act, 1882; Indian Registration Act, 1908; Maharashtra Stamp Act, 1958",
        registrationRequired: true,
    },
];

// --- SEED EXECUTION ---

async function seed() {
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
        console.error("❌ POSTGRES_URL not set. Please set it in your .env file.");
        process.exit(1);
    }

    const client = postgres(connectionString);
    const db = drizzle(client);

    console.log("🌱 Seeding Juristo Templates...\n");

    for (const tpl of TEMPLATES) {
        try {
            await db.insert(juristoTemplate).values({
                name: tpl.name,
                slug: tpl.slug,
                category: tpl.category,
                state: tpl.state,
                stateCode: tpl.stateCode,
                description: tpl.description,
                outline: tpl.outline,
                contentTemplate: tpl.contentTemplate,
                requiredFields: tpl.requiredFields,
                applicableActs: tpl.applicableActs,
                registrationRequired: tpl.registrationRequired,
            }).onConflictDoNothing();

            console.log(`  ✅ ${tpl.name} (${tpl.state})`);
        } catch (error: any) {
            if (error.message?.includes("duplicate") || error.code === "23505") {
                console.log(`  ⏭️  ${tpl.name} (${tpl.state}) — already exists, skipping`);
            } else {
                console.error(`  ❌ ${tpl.name}:`, error.message);
            }
        }
    }

    console.log(`\n✨ Done! Seeded ${TEMPLATES.length} templates.`);
    await client.end();
    process.exit(0);
}

seed().catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
});
