import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { transcript, existingJobData } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Field transcript is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Graceful fallback with deterministic heuristic extraction if API key is not yet set
      const parsed = fallbackHeuristicParser(transcript);
      return NextResponse.json({
        success: true,
        data: parsed,
        source: 'heuristic_fallback',
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert field scoping assistant for disaster mitigation and restoration (Water, Fire, Mold).
Your task is to parse unstructured technician field dictations and extract raw restoration data.

STRICT RULES:
1. NEVER calculate dollar amounts, areas, square footage, or financial totals. Only extract raw dimensions, materials, and directives.
2. If room dimensions are stated (e.g., "12 by 15 with 8-foot ceiling" or "14x10x8"), extract length, width, and height as raw numeric values (lengthFt, widthFt, heightFt).
3. For moisture meter mentions, record the substrate and the numerical reading value (e.g., "32% WME", readingValue: 32).
4. For thermal mentions, record the thermal delta (e.g. -7.2) or boundary if mentioned.
5. Standardize actions strictly to: "FLOOD_CUT", "REMOVE_BASEBOARD", "REMOVE_FLOORING", "EXTRACT_WATER", "DEPLOY_EQUIPMENT", "HEPA_VACUUM", "APPLY_ANTIMICROBIAL".
6. If the technician specifies an equipment count (e.g., "4 air movers, 1 dehu"), extract the exact integer and type (airMovers, dehumidifiers, airScrubbers, woodFloorSystems, dryingDays).
7. Extract loss category: "Cat 1 (Clean)", "Cat 2 (Grey)", or "Cat 3 (Black / Mold)".
8. Extract finish type: "Finished" or "Unfinished".
9. Extract flags: cabinetryMultiplier (true if cabinetry is damaged/needs double demo), afterHours (true if after hours/emergency mentioned).

Return ONLY valid JSON matching this schema:
{
  "category": "Cat 1 (Clean)" | "Cat 2 (Grey)" | "Cat 3 (Black / Mold)",
  "finishType": "Finished" | "Unfinished",
  "cabinetryMultiplier": boolean,
  "afterHours": boolean,
  "dimensions": [
    {
      "roomName": string,
      "lengthFt": number,
      "widthFt": number,
      "heightFt": number,
      "floodCutHeightInches": number,
      "linearFtBaseboard": number
    }
  ],
  "actions": string[],
  "moistureReadings": [
    {
      "roomName": string,
      "substrate": string,
      "readingValue": number,
      "unit": string,
      "dryStandard": number,
      "isAffected": boolean,
      "notes": string
    }
  ],
  "thermalReadings": [
    {
      "roomName": string,
      "deltaTFahrenheit": number,
      "perimeterBoundaryDesc": string
    }
  ],
  "equipment": {
    "airMovers": number,
    "dehumidifiers": number,
    "airScrubbers": number,
    "woodFloorSystems": number,
    "dryingDays": number,
    "techHoursOnSite": number,
    "monitoringHoursPerDay": number
  },
  "technicianSummary": string
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Parse this field technician dictation:\n"""\n${transcript}\n"""`,
            },
          ],
        },
      ],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      data: parsedData,
      source: 'gemini-flash-latest',
    });
  } catch (error: any) {
    console.error('Error in /api/scope:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to parse field scope' },
      { status: 500 }
    );
  }
}

// Resilient heuristic parser if API key is temporarily unavailable
function fallbackHeuristicParser(transcript: string) {
  const lower = transcript.toLowerCase();

  let category: 'Cat 1 (Clean)' | 'Cat 2 (Grey)' | 'Cat 3 (Black / Mold)' =
    'Cat 1 (Clean)';
  if (lower.includes('cat 3') || lower.includes('black') || lower.includes('sewer') || lower.includes('mold')) {
    category = 'Cat 3 (Black / Mold)';
  } else if (lower.includes('cat 2') || lower.includes('grey') || lower.includes('dishwasher') || lower.includes('washing machine')) {
    category = 'Cat 2 (Grey)';
  }

  const finishType = lower.includes('unfinished') || lower.includes('subfloor only') ? 'Unfinished' : 'Finished';
  const afterHours = lower.includes('after hours') || lower.includes('emergency') || lower.includes('night') || lower.includes('weekend');
  const cabinetryMultiplier = lower.includes('cabinet') || lower.includes('vanity');

  // Extract dimensions like "14 by 10 with 8-foot ceiling" or "12x10x8"
  const dimensions: any[] = [];
  const dimRegex = /(\d+)\s*(?:by|x)\s*(\d+)(?:\s*(?:with|by|x)\s*(\d+)(?:-foot|\s*ft|\s*foot)?\s*(?:ceiling)?)?/gi;
  let match;
  let roomIndex = 1;
  while ((match = dimRegex.exec(transcript)) !== null) {
    dimensions.push({
      roomName: `Area ${roomIndex++}`,
      lengthFt: parseFloat(match[1]) || 12,
      widthFt: parseFloat(match[2]) || 10,
      heightFt: parseFloat(match[3]) || 8,
      floodCutHeightInches: lower.includes('flood cut') ? (lower.includes('48') ? 48 : 24) : 0,
      linearFtBaseboard: (parseFloat(match[1]) + parseFloat(match[2])) * 2,
    });
  }

  if (dimensions.length === 0) {
    dimensions.push({
      roomName: 'Main Affected Area',
      lengthFt: 14,
      widthFt: 12,
      heightFt: 8,
      floodCutHeightInches: 24,
      linearFtBaseboard: 52,
    });
  }

  // Extract equipment
  const airMoversMatch = transcript.match(/(\d+)\s*(?:air mover|fan|blower)/i);
  const dehuMatch = transcript.match(/(\d+)\s*(?:dehu|dehumidifier)/i);
  const scrubberMatch = transcript.match(/(\d+)\s*(?:air scrubber|scrubber|hepa)/i);
  const daysMatch = transcript.match(/(\d+)\s*(?:day|days)/i);

  const airMovers = airMoversMatch ? parseInt(airMoversMatch[1], 10) : 4;
  const dehumidifiers = dehuMatch ? parseInt(dehuMatch[1], 10) : 1;
  const airScrubbers = scrubberMatch ? parseInt(scrubberMatch[1], 10) : 0;
  const dryingDays = daysMatch ? parseInt(daysMatch[1], 10) : 3;

  // Extract moisture
  const moistureMatch = transcript.match(/(\d+(?:\.\d+)?)\s*%\s*(?:wme)?/i);
  const moistureReadings = [];
  if (moistureMatch) {
    const val = parseFloat(moistureMatch[1]);
    moistureReadings.push({
      roomName: dimensions[0].roomName,
      substrate: 'Drywall & Subfloor',
      readingValue: val,
      unit: '% WME',
      dryStandard: 12.0,
      isAffected: val > 16.0,
      notes: 'Extracted from field dictation audio',
    });
  }

  const actions: string[] = [];
  if (lower.includes('extract') || lower.includes('water')) actions.push('EXTRACT_WATER');
  if (lower.includes('baseboard')) actions.push('REMOVE_BASEBOARD');
  if (lower.includes('floor') || lower.includes('carpet')) actions.push('REMOVE_FLOORING');
  if (lower.includes('flood cut') || lower.includes('cut drywall')) actions.push('FLOOD_CUT');
  if (lower.includes('antimicrobial') || lower.includes('sanitize')) actions.push('APPLY_ANTIMICROBIAL');
  if (lower.includes('hepa') || lower.includes('vacuum')) actions.push('HEPA_VACUUM');
  actions.push('DEPLOY_EQUIPMENT');

  return {
    category,
    finishType,
    cabinetryMultiplier,
    afterHours,
    dimensions,
    actions,
    moistureReadings,
    thermalReadings: [],
    equipment: {
      airMovers,
      dehumidifiers,
      airScrubbers,
      woodFloorSystems: 0,
      dryingDays,
      techHoursOnSite: 4,
      monitoringHoursPerDay: 1,
    },
    technicianSummary: `Technician recorded scope for ${dimensions.length} area(s). ${category} loss with ${airMovers} air movers and ${dehumidifiers} dehumidifier(s) placed.`,
  };
}
