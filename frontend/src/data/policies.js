/**
 * Legal policy content (Privacy / Terms / Refund) for Altus Corporation —
 * Productivity Shastra. Rendered by components/legal/PolicyModal.jsx.
 *
 * Each section's `body` is an array of blocks:
 *   "string"        → a paragraph
 *   { ul: [...] }   → a bullet list
 *   { note: "..." } → a highlighted call-out box
 * Source: the productivityshastra-*.html files in the repo root.
 */

export const POLICY_CONTACT = {
  org: 'Altus Corporation',
  line: 'Proprietorship — CA Manan Vasa · GSTIN: 27ACPPV1393L1ZQ',
  address: 'C-6, Ground Floor, Gambhir Ind. Estate, Kotkar Road, Off Aarey Road, Goregaon East, Mumbai 400063',
  email: 'manan@unleashed.in',
  phone: '+91 80970 10410',
  websites: 'productivityshastra.com · altuscorp.in',
};

export const POLICIES = [
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy',
    meta: 'Effective 13 June 2026 · Governed by Indian Law',
    intro:
      'This Privacy Policy applies to productivityshastra.com, operated by Altus Corporation, a proprietorship firm owned by CA Manan Vasa. GSTIN: 27ACPPV1393L1ZQ.',
    sections: [
      {
        n: '01',
        h: 'Who We Are',
        body: [
          'Productivity Shastra is a 6-week business productivity and performance programme developed and delivered by CA Manan Vasa under Altus Corporation. productivityshastra.com is the official registration and information website for this programme.',
          'This Privacy Policy is issued in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act), the Information Technology Act, 2000, and the IT (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.',
        ],
      },
      {
        n: '02',
        h: 'What Information We Collect',
        body: [
          'We collect the following categories of personal data through our registration forms:',
          {
            ul: [
              'Identity data: First name, last name',
              'Contact data: Email address, WhatsApp number (with country code)',
              'Professional data: Company or organisation name, designation or role',
              'Business data: City, nature of business or work, business category',
              'Referral data: How you learned about us, name of person who introduced you',
              'Participation preference: Online (Zoom) or in-person (Mumbai HQ)',
              'Session preference: Preferred date and time of programme session',
            ],
          },
          'We also automatically collect technical data: IP address, browser type, device type, pages visited, session duration, and referral URL.',
          'Payment card or bank details are not collected or stored by us — all payment processing is handled directly by our payment gateway partners (see Section 5).',
        ],
      },
      {
        n: '03',
        h: 'How We Use Your Information',
        body: [
          {
            ul: [
              'To process your programme registration and confirm your seat',
              'To share Zoom join links, session reminders, and programme materials via email and WhatsApp',
              'To send pre-programme preparation materials and post-programme follow-ups',
              'To contact you regarding schedule changes, cancellations, or rescheduling',
              'To send relevant information about future Altus Corp programmes (with your consent)',
              'To generate invoices and comply with GST and accounting obligations',
              'To improve our programmes and website experience',
            ],
          },
          'We will never sell, rent, or trade your personal data to any third party for commercial purposes.',
        ],
      },
      {
        n: '04',
        h: 'Legal Basis for Processing',
        body: [
          {
            ul: [
              'Consent: When you register for the programme and submit your data',
              'Contract: Processing necessary to deliver the programme you registered for',
              'Legal obligation: GST invoicing, income tax, and other statutory requirements',
              'Legitimate interests: Analytics, security, and programme improvement',
            ],
          },
          'You may withdraw consent at any time by contacting our Grievance Officer (Section 12).',
        ],
      },
      {
        n: '05',
        h: 'Payment Processing',
        body: [
          'Programme fees are collected through authorised payment gateway partners:',
          {
            ul: [
              'PayU Payments Private Limited — an RBI-registered Payment Aggregator processing card, UPI, net banking, or wallet payments.',
              'Jodo (Eduvanz Financing Pvt Ltd or applicable entity) — for EMI or deferred payment options.',
            ],
          },
          'All payment transactions are encrypted using SSL/TLS. We receive only a payment confirmation and transaction reference number upon successful payment.',
          {
            note: 'Important: Never share your OTP, card CVV, or banking credentials with anyone claiming to represent Productivity Shastra or Altus Corporation. We will never ask for this information.',
          },
        ],
      },
      {
        n: '06',
        h: 'Cookies & Tracking',
        body: [
          {
            ul: [
              'Strictly necessary cookies: Required for the registration flow and website operation. Cannot be disabled.',
              'Analytics cookies: Visitor behaviour tracking (e.g. Google Analytics) — enabled with consent only.',
              'Marketing cookies: Retargeting and audience insights (e.g. Meta Pixel) — enabled with consent only.',
            ],
          },
          'You may control cookies through your browser settings. Disabling non-essential cookies will not prevent you from completing registration.',
        ],
      },
      {
        n: '07',
        h: 'Third-Party Services',
        body: [
          {
            ul: [
              'PayU — payment processing (India)',
              'Jodo — EMI / deferred payment processing (India)',
              'Zoom Video Communications — online session delivery (USA)',
              'Google Analytics — website traffic analysis (USA)',
              'Meta Pixel — audience insights and retargeting (USA)',
              'WhatsApp Business (Meta) — registration confirmations and reminders',
              'Google Workspace — email delivery and form data storage (USA)',
            ],
          },
          'Data transferred outside India is governed by the standard contractual protections of those processors and applicable Indian cross-border transfer provisions under the DPDP Act.',
        ],
      },
      {
        n: '08',
        h: 'Data Retention',
        body: [
          {
            ul: [
              'Registration data: Retained for 36 months from programme completion, or as required by GST and accounting laws (whichever is longer)',
              'Payment transaction records: 7 years, as required under Indian accounting and GST law',
              'Session recordings (if applicable): Up to 6 months on Zoom servers, then deleted',
              'Analytics data: As per Google Analytics default retention (26 months)',
            ],
          },
        ],
      },
      {
        n: '09',
        h: 'Your Rights',
        body: [
          'Under the DPDP Act, 2023, you have the right to access, correct, erase (subject to legal obligations), withdraw consent, nominate a representative, and seek grievance redressal. Contact our Grievance Officer (Section 12) to exercise any right. We respond within 30 days.',
        ],
      },
      {
        n: '10',
        h: "Children's Privacy",
        body: [
          'Productivity Shastra is designed exclusively for business owners, founders, and working professionals aged 18 and above. We do not knowingly collect data from individuals under 18. If you believe a minor has registered, contact us immediately.',
        ],
      },
      {
        n: '11',
        h: 'Changes to This Policy',
        body: [
          'We may update this Policy periodically. Material changes will be notified via email to registered participants and via a prominent notice on this website. The Effective Date will reflect the latest revision.',
        ],
      },
      {
        n: '12',
        h: 'Grievance Officer & Contact',
        body: [
          {
            note: 'Grievance Officer: CA Manan Vasa, Altus Corporation. Email: manan@unleashed.in · Phone: +91 80970 10410. Acknowledgement within 24 hours; resolution within 30 days.',
          },
          'If unsatisfied with the resolution, you may approach the Data Protection Board of India once constituted under the DPDP Act, 2023.',
        ],
      },
    ],
  },

  {
    id: 'terms',
    label: 'Terms',
    title: 'Terms & Conditions',
    meta: 'Effective 13 June 2026 · Governed by Indian Law',
    intro:
      'By registering for Productivity Shastra or using productivityshastra.com, you agree to be bound by these Terms & Conditions — a legally binding agreement between you and Altus Corporation (Proprietor: CA Manan Vasa), governed by the laws of India.',
    sections: [
      {
        n: '01',
        h: 'Acceptance of Terms',
        body: [
          'These Terms govern your registration, participation, and use of productivityshastra.com and the Productivity Shastra programme, operated by Altus Corporation. By clicking "Confirm My Seat" or submitting the registration form, you confirm that you have read, understood, and agree to these Terms and our Privacy Policy.',
        ],
      },
      {
        n: '02',
        h: 'About the Programme',
        body: [
          'Productivity Shastra is a structured 6-week group learning programme focused on business productivity, time management, and performance for founders and professionals. Sessions are conducted online via Zoom and/or in-person at our Mumbai HQ, as per the participant’s selected preference.',
          'Programme content, schedule, format, facilitators, and session dates are subject to change at our discretion. We will notify registered participants of any material changes.',
        ],
      },
      {
        n: '03',
        h: 'Eligibility',
        body: [
          'Participation is open to individuals who are:',
          {
            ul: [
              'At least 18 years of age',
              'Competent to enter into a legally binding contract under the Indian Contract Act, 1872',
              'Business owners, founders, professionals, or employed individuals seeking to improve productivity',
            ],
          },
          'We reserve the right to refuse registration to any individual without providing reasons.',
        ],
      },
      {
        n: '04',
        h: 'Registration & Payment',
        body: [
          'Registration is confirmed only upon receipt of full payment. Partial payments do not guarantee a seat. Programme fees are inclusive of GST unless stated otherwise. A GST invoice will be issued upon successful payment.',
          'Payments are processed via PayU and/or Jodo. By proceeding with payment, you agree to their respective terms. Altus Corporation does not store card or bank account details.',
          'In the event of a payment failure or technical error, please contact us before attempting payment again to avoid duplicate charges. Refunds for duplicate payments are processed within 10 business days.',
        ],
      },
      {
        n: '05',
        h: 'Programme Delivery',
        body: [
          {
            ul: [
              'Zoom join links are shared 1 day and 1 hour before each session via email and/or WhatsApp.',
              'In-person participants must attend at the confirmed Mumbai venue.',
              'Sessions are conducted live. Recordings, if shared, remain our intellectual property.',
              'We are not responsible for participant connectivity issues, device incompatibility, or third-party platform disruptions.',
              'We may reschedule or cancel any session due to unforeseen circumstances. Rescheduled sessions do not entitle participants to a refund.',
            ],
          },
        ],
      },
      {
        n: '06',
        h: 'Intellectual Property',
        body: [
          'All programme materials — frameworks, templates, workbooks, slides, recordings, exercises, and methodologies — are the exclusive intellectual property of Altus Corporation or CA Manan Vasa, protected under the Copyright Act, 1957.',
          'Participants are granted a personal, non-transferable licence to use materials for their own learning. Participants may not:',
          {
            ul: [
              'Record, reproduce, or distribute any session or material without prior written consent',
              'Share login credentials, session links, or materials with non-registered individuals',
              'Use programme content for commercial training, resale, or consulting',
              'Post session recordings or materials on any public platform',
            ],
          },
          'Breach may result in immediate removal from the programme without refund and legal action under applicable IP laws.',
        ],
      },
      {
        n: '07',
        h: 'Prohibited Conduct',
        body: [
          'Participants must maintain professional conduct. The following are strictly prohibited:',
          {
            ul: [
              'Disruptive, abusive, or disrespectful behaviour toward the facilitator or other participants',
              'Sharing session access credentials with unauthorised persons',
              'Recording sessions without explicit written permission',
              'Making defamatory or misleading statements about the programme or Altus Corporation',
              'Spamming or soliciting other participants within programme channels',
            ],
          },
          'We reserve the right to remove any participant who violates these standards, without refund.',
        ],
      },
      {
        n: '08',
        h: 'Testimonials & Disclaimer of Results',
        body: [
          'Testimonials and case studies represent individual experiences of past participants, shared with consent and reflecting results achieved under specific circumstances.',
          {
            note: 'Results disclaimer: Participation does not guarantee any specific business outcome, revenue growth, productivity improvement, or personal transformation. Results depend on individual effort, application, and external factors beyond our control.',
          },
        ],
      },
      {
        n: '09',
        h: 'Disclaimer of Professional Advice',
        body: [
          'The content delivered is for educational and informational purposes only. It does not constitute financial, investment, tax, legal, or accounting advice. CA Manan Vasa’s professional qualifications are not engaged in his capacity as a programme facilitator. Participants requiring professional advice should engage a qualified professional directly.',
        ],
      },
      {
        n: '10',
        h: 'Cancellation & Refund Policy',
        body: [
          'Please read our Refund Policy carefully before registering. By completing payment, you confirm that you have read and accepted our refund terms. In summary: all sales are final and no refunds are issued under any circumstances once payment is made.',
        ],
      },
      {
        n: '11',
        h: 'Limitation of Liability',
        body: [
          'To the fullest extent permitted under Indian law, Altus Corporation’s total liability for any claim arising from participation shall not exceed the programme fee paid by that participant. We shall not be liable for any indirect, incidental, consequential, or punitive damages, including loss of business, data, or opportunity.',
        ],
      },
      {
        n: '12',
        h: 'Governing Law & Dispute Resolution',
        body: [
          'These Terms are governed by the laws of India. Any dispute is subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra. Disputes shall first be attempted through good-faith negotiation within 30 days, failing which they may be referred to arbitration under the Arbitration and Conciliation Act, 1996, seat at Mumbai.',
        ],
      },
      {
        n: '13',
        h: 'Modifications',
        body: [
          'We reserve the right to update these Terms at any time. Registered participants will be notified of material changes via email. Continued participation after such changes constitutes acceptance.',
        ],
      },
      {
        n: '14',
        h: 'Contact',
        body: [
          {
            note: 'CA Manan Vasa — Altus Corporation. Email: manan@unleashed.in · Phone: +91 80970 10410.',
          },
        ],
      },
    ],
  },

  {
    id: 'refund',
    label: 'Refund',
    title: 'Refund Policy',
    meta: 'Effective 13 June 2026 · Please read carefully before registering',
    intro:
      'All sales are final. Once payment is made for Productivity Shastra, no refunds are issued under any circumstances. Please read this policy in full before completing your registration.',
    sections: [
      {
        n: '01',
        h: 'Our Refund Position',
        body: [
          'Altus Corporation operates a strict no-refund policy for Productivity Shastra. By completing payment and submitting the registration form, you acknowledge that you have read, understood, and accepted this policy.',
          'This policy applies regardless of:',
          {
            ul: [
              'Whether you attended any, some, or all sessions',
              'Whether you chose online or in-person participation',
              'Personal, professional, or health-related reasons for non-attendance',
              'Changes to your business circumstances after registration',
              'Dissatisfaction with any aspect of the programme content or delivery',
            ],
          },
        ],
      },
      {
        n: '02',
        h: 'Why We Have a No-Refund Policy',
        body: [
          'Productivity Shastra is a group learning programme with a fixed cohort size. When you register, your seat is reserved and other interested participants may be turned away. Significant preparation goes into each cohort well before the programme begins.',
          'We encourage all prospective participants to attend our free orientation/discovery events before registering, to ensure the programme is the right fit.',
        ],
      },
      {
        n: '03',
        h: 'What Is and Is Not Covered',
        body: [
          'Not eligible for refund (all of the following):',
          {
            ul: [
              'Registrations cancelled after payment — regardless of timing',
              'Non-attendance at sessions, for any reason',
              'Partial attendance or early withdrawal from the programme',
              'Dissatisfaction with content, facilitator, or programme structure',
              'Technical issues on the participant’s end (connectivity, device problems)',
              'Failure to receive session links due to incorrect contact details provided',
            ],
          },
          'Transfer of registration: In exceptional circumstances, and at our sole discretion, we may allow a participant to transfer their seat to another individual for the same cohort. This must be requested at least 5 business days before the first session.',
        ],
      },
      {
        n: '04',
        h: 'Duplicate Payment Refunds',
        body: [
          'If you have been charged twice for the same registration due to a gateway error, contact us immediately at manan@unleashed.in with your transaction reference numbers. Verified duplicate payments are refunded within 10 business days to the original payment source.',
          'Please do not attempt a second payment before confirming with us that your first transaction failed.',
        ],
      },
      {
        n: '05',
        h: 'Programme Cancellation by Us',
        body: [
          'In the unlikely event that Altus Corporation cancels an entire programme cohort (not individual sessions), registered participants are offered one of the following at our discretion:',
          {
            ul: [
              'A transfer of their registration to the next available cohort at no additional cost, or',
              'A full refund of the programme fee paid (excluding gateway charges), processed within 15 business days',
            ],
          },
          'Rescheduling of individual sessions, changes to session format, or changes in facilitator do not constitute programme cancellation and do not entitle participants to a refund.',
        ],
      },
      {
        n: '06',
        h: 'Chargebacks & Payment Disputes',
        body: [
          'By registering and completing payment, you agree not to initiate a chargeback or payment dispute except in cases of verified fraudulent transactions. If you have a concern, please contact us first — we are committed to resolving genuine issues.',
          'Frivolous chargebacks may result in recovery of the programme fee plus associated charges, and may be reported to appropriate authorities.',
        ],
      },
      {
        n: '07',
        h: 'Jodo EMI Arrangements',
        body: [
          'If you opted for an EMI or deferred payment plan through Jodo, the no-refund policy applies equally. You remain obligated to complete all EMI instalments per your agreement with Jodo, regardless of attendance or withdrawal.',
        ],
      },
      {
        n: '08',
        h: 'GST on Refunds',
        body: [
          'Where a refund is applicable (Section 5), the refund will be of the programme fee net of GST, unless a valid credit note can be issued under GST law. GST amounts already deposited with the government cannot be refunded directly without following the applicable credit-note procedure under the CGST Act, 2017.',
        ],
      },
      {
        n: '09',
        h: 'Contact Us',
        body: [
          'For payment-related queries, duplicate payment claims, or to request a seat transfer:',
          {
            note: 'CA Manan Vasa — Altus Corporation. Email: manan@unleashed.in · Phone: +91 80970 10410. Response time: within 2 business days.',
          },
        ],
      },
    ],
  },
];
