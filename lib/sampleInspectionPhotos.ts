/**
 * Realistic SVG base64 test images for moisture meter displays, FLIR thermal screens, and structural loss.
 * Allows on-site technicians and office staff to test multimodal vision without physical printouts.
 */

function svgToDataUrl(svg: string): string {
  if (typeof window !== 'undefined') {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 1. Digital Moisture Meter Screen (Delmhorst / Protimeter LCD reading 34.5% WME)
export const SAMPLE_MOISTURE_METER_PHOTO = svgToDataUrl(`
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="400" fill="#1E293B" rx="20"/>
  <!-- Meter Body -->
  <rect x="80" y="40" width="440" height="320" rx="24" fill="#0F172A" stroke="#334155" stroke-width="4"/>
  <!-- Brand Label -->
  <text x="300" y="75" font-family="Arial, sans-serif" font-size="16" font-weight="900" fill="#94A3B8" text-anchor="middle" letter-spacing="3">PROTIMETER DIGITAL SURVEYOR</text>
  <!-- LCD Screen Bezel -->
  <rect x="130" y="95" width="340" height="180" rx="12" fill="#84CC16" stroke="#4D7C0F" stroke-width="6"/>
  <!-- LCD Backlight Tint -->
  <rect x="140" y="105" width="320" height="160" rx="8" fill="#A3E635" opacity="0.9"/>
  <!-- LCD Digits -->
  <text x="300" y="195" font-family="monospace" font-size="76" font-weight="900" fill="#14532D" text-anchor="middle" letter-spacing="2">34.5</text>
  <text x="385" y="235" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#14532D">% WME</text>
  <text x="170" y="235" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#15803D">SUBSTRATE: DRYWALL</text>
  <text x="300" y="130" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#166534" text-anchor="middle">IICRC S500 WET THRESHOLD: &gt;16% [CRITICAL]</text>
  <!-- Pins / Sensor header -->
  <circle cx="260" cy="30" r="12" fill="#E2E8F0" stroke="#64748B" stroke-width="2"/>
  <circle cx="340" cy="30" r="12" fill="#E2E8F0" stroke="#64748B" stroke-width="2"/>
  <!-- Buttons -->
  <circle cx="220" cy="315" r="18" fill="#3B82F6"/>
  <circle cx="300" cy="315" r="18" fill="#EF4444"/>
  <circle cx="380" cy="315" r="18" fill="#10B981"/>
  <text x="300" y="352" font-family="Arial, sans-serif" font-size="11" fill="#64748B" text-anchor="middle">HOLD / RECALL / CAL</text>
</svg>
`);

// 2. FLIR Thermal Imaging Screen (-6.8°F Delta T Cold Boundary)
export const SAMPLE_THERMAL_IMAGING_PHOTO = svgToDataUrl(`
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ironbow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#000004"/>
      <stop offset="25%" stop-color="#3B0F70"/>
      <stop offset="50%" stop-color="#8C2981"/>
      <stop offset="75%" stop-color="#DE4968"/>
      <stop offset="90%" stop-color="#FE9F6D"/>
      <stop offset="100%" stop-color="#FCFDBF"/>
    </linearGradient>
    <radialGradient id="waterAnomaly" cx="40%" cy="75%" r="45%">
      <stop offset="0%" stop-color="#1E1B4B" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#312E81" stop-opacity="0.8"/>
      <stop offset="70%" stop-color="#4F46E5" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#C084FC" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Camera Frame -->
  <rect width="600" height="400" fill="#0B132B"/>
  <!-- Thermal Viewport Canvas -->
  <rect x="20" y="20" width="510" height="360" rx="8" fill="#BE185D"/>
  <!-- Ambient Wall Heat Gradient -->
  <rect x="20" y="20" width="510" height="360" rx="8" fill="url(#ironbow)" opacity="0.65"/>
  <!-- Cold Evaporative Water Wick Anomaly along Baseboard -->
  <rect x="20" y="240" width="510" height="140" fill="url(#waterAnomaly)"/>
  <ellipse cx="230" cy="300" rx="180" ry="80" fill="#1E1B4B" opacity="0.9"/>
  <!-- Thermal Color Scale Bar on Right -->
  <rect x="545" y="40" width="22" height="320" rx="4" fill="url(#ironbow)"/>
  <text x="575" y="55" font-family="monospace" font-size="12" font-weight="bold" fill="#F8FAFC">72.4°F</text>
  <text x="575" y="355" font-family="monospace" font-size="12" font-weight="bold" fill="#93C5FD">58.2°F</text>
  <!-- Reticle & Readouts -->
  <circle cx="230" cy="300" r="16" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="3,3"/>
  <line x1="230" y1="276" x2="230" y2="324" stroke="#FFFFFF" stroke-width="1.5"/>
  <line x1="206" y1="300" x2="254" y2="300" stroke="#FFFFFF" stroke-width="1.5"/>
  <!-- Screen Text -->
  <text x="40" y="55" font-family="monospace" font-size="20" font-weight="black" fill="#FFFFFF">SPOT: 58.4°F</text>
  <text x="40" y="80" font-family="monospace" font-size="16" font-weight="bold" fill="#67E8F9">ΔT: -6.8°F [COLD ANOMALY]</text>
  <text x="40" y="105" font-family="monospace" font-size="13" font-weight="bold" fill="#E2E8F0">FLIR E8-XT RESTORATION FORENSIC</text>
  <text x="40" y="360" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#E0E7FF">MOISTURE MIGRATION: 3.5 FT ELEVATION ON GYPSUM</text>
</svg>
`);

// 3. Structural Damage Photo (Saturated Drywall & Mold Baseboard)
export const SAMPLE_STRUCTURAL_DAMAGE_PHOTO = svgToDataUrl(`
<svg width="600" height="400" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wallDrywall" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E2E8F0"/>
      <stop offset="50%" stop-color="#CBD5E1"/>
      <stop offset="85%" stop-color="#94A3B8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
  </defs>
  <!-- Wall Surface -->
  <rect width="600" height="340" fill="url(#wallDrywall)"/>
  <!-- Flooring -->
  <rect y="340" width="600" height="60" fill="#78350F"/>
  <!-- Baseboard Trim -->
  <rect y="315" width="600" height="30" fill="#475569" stroke="#334155"/>
  <!-- Water Tide Line on Drywall -->
  <path d="M 0,260 Q 90,240 180,265 T 360,255 T 540,270 L 600,265 L 600,315 L 0,315 Z" fill="#334155" opacity="0.8"/>
  <!-- Swollen / Mold spots along base plate -->
  <circle cx="120" cy="300" r="14" fill="#064E3B" opacity="0.85"/>
  <circle cx="135" cy="305" r="8" fill="#022C22" opacity="0.9"/>
  <circle cx="280" cy="295" r="18" fill="#064E3B" opacity="0.85"/>
  <circle cx="300" cy="298" r="12" fill="#022C22" opacity="0.9"/>
  <circle cx="440" cy="302" r="16" fill="#064E3B" opacity="0.85"/>
  <!-- Measuring Tape Overlay -->
  <rect x="520" y="80" width="28" height="240" fill="#FACC15" stroke="#CA8A04" stroke-width="2"/>
  <text x="534" y="200" font-family="monospace" font-size="12" font-weight="black" fill="#000000" transform="rotate(-90 534 200)" text-anchor="middle">24 INCH WATER MARK</text>
  <!-- Technical Scoping Annotation -->
  <rect x="25" y="25" width="310" height="55" rx="8" fill="#0F172A" opacity="0.9"/>
  <text x="40" y="48" font-family="Arial, sans-serif" font-size="13" font-weight="black" fill="#F8FAFC">STRUCTURAL DAMAGE EVIDENCE</text>
  <text x="40" y="68" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#34D399">Tide Mark: 24" • Recommendation: FLOOD_CUT</text>
</svg>
`);
