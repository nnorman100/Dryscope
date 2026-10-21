import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaffRequest } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireStaffRequest(req);
  if (errorResponse) return errorResponse;

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
      // Never guess: a missing key is a server misconfiguration, not a reason
      // to invent scope data that looks real
      console.error('[api/scope] GEMINI_API_KEY is not set');
      return NextResponse.json(
        { error: 'Dictation parsing is unavailable: GEMINI_API_KEY is not configured on the server.' },
        { status: 503 }
      );
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
