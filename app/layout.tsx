import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DryScope – Disaster Mitigation & Restoration Scoping Platform',
  description:
    'Professional IICRC S500/S520 field scoping, speech-to-text dictation, moisture & thermal vision OCR, cell-traced estimating matrix, and multi-role recovery portal for disaster restoration teams.',
  keywords: [
    'disaster restoration scoping',
    'IICRC S500 water damage',
    'mold remediation field estimator',
    'field scoping voice dictation',
    'moisture meter reading OCR',
    'thermal imaging delta T',
    'insurance adjuster scope defense',
    'restoration client portal',
    'work authorization digital signature',
  ],
  authors: [{ name: 'DryScope / Alert Disaster Restoration' }],
  openGraph: {
    title: 'DryScope – Disaster Mitigation & Restoration Scoping Platform',
    description:
      'On-site field intelligence, voice scoping, moisture vision, cell-traced pricing, and instant client authorization for restoration contractors.',
    type: 'website',
    siteName: 'DryScope',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DryScope – Disaster Mitigation & Restoration Scoping Platform',
    description:
      'On-site field intelligence, voice scoping, moisture vision, cell-traced pricing, and instant client authorization for restoration contractors.',
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      'name': 'DryScope',
      'applicationCategory': 'BusinessApplication',
      'operatingSystem': 'Web, iOS, Android',
      'description':
        'Field scoping assistant for disaster mitigation and restoration technicians with voice dictation, moisture meter vision, and cell-traced estimating math.',
      'offers': {
        '@type': 'Offer',
        'price': '0.00',
        'priceCurrency': 'USD',
      },
      'featureList': [
        'Speech-to-text damage dictation',
        'Multimodal moisture meter and thermal OCR',
        'Strict IICRC S500/S520 non-hallucinated data extraction',
        'Cell-traced estimating matrix with exact workbook formulas',
        'Homeowner emergency work authorization with digital signature',
        'Itemized insurance adjuster scope and defense letter suite',
      ],
    },
    {
      '@type': 'EmergencyService',
      'name': 'Alert Disaster Restoration Services (ADR)',
      'serviceType': 'Water, Fire, and Mold Damage Mitigation',
      'areaServed': 'United States',
      'availableLanguage': 'English',
    },
    {
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'What is DryScope and how does it assist restoration technicians?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text':
              'DryScope is an on-site scoping and estimating platform that captures raw technician dictation and photo evidence, extracts IICRC S500/S520 compliant specifications without hallucinations, and generates defensible adjuster reports.',
          },
        },
        {
          '@type': 'Question',
          'name': 'How does DryScope handle moisture meter and thermal camera readings?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text':
              'DryScope uses multimodal vision to read numeric moisture values (% WME or Pinless Relative), substrate types, and thermal deltas directly from field photos.',
          },
        },
        {
          '@type': 'Question',
          'name': 'How are restoration estimates calculated?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text':
              'Estimates are calculated using exact cell-traced industry formulas with Category 1-3 rates ($1.21 to $8.39/SF), baseline charges ($1,180.20), equipment day counts, and labor hours.',
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-full bg-slate-50 text-slate-900 antialiased font-sans selection:bg-emerald-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
