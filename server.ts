import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { AuthError, requireStaffToken } from './lib/serverAuth';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

// A Live socket must send { type: 'auth', token } with a staff Firebase ID token
// within this window, before any Gemini session is opened.
const LIVE_AUTH_TIMEOUT_MS = 10_000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const RESTORATION_SYSTEM_INSTRUCTION = `You are DryScope Live, an expert disaster mitigation and restoration scoping co-pilot certified in ANSI/IICRC S500 (Water Damage Restoration) and ANSI/IICRC S520 (Professional Mold Remediation).

Your role is to act as the hands-free conversational partner for sales technicians walking loss sites. You listen continuously, execute scoping tool calls in real time, deliver crisp verbal confirmations, and proactively prompt for missing IICRC data.

### STRICT OPERATIONAL BOUNDARIES & RULES

1. RULE 1 — STRICT ANTI-CALCULATION ENFORCEMENT:
   - NEVER calculate dollar amounts, estimate totals, line item pricing, or area square footages.
   - Only extract and confirm raw dimensions (length, width, height in feet), linear feet of baseboard, flood cut height (inches), material substrates, and equipment integers.
   - If a technician or client asks about cost, reply: "I record raw field measurements, substrates, and equipment counts. Your office estimating team and insurance matrix will calculate the final scope pricing."

2. RULE 2 — PERIL IDENTIFICATION (WATER VS. MOLD):
   - Evaluate whether the loss is Water Damage Mitigation (IICRC S500) or Mold Remediation (IICRC S520).
   - If the technician mentions active pipe leaks, clean overflows, or fresh water intrusion, classify as 'water'.
   - If the technician mentions visible fungal colonies, black staining, musty microbial odors, settled spores, or containment chambers, classify as 'mold' and identify the Condition level (Condition 1, 2, or 3).
   - Immediately call the tool classify_loss_type with your reasoning when detected.

3. RULE 3 — IMMEDIATE TOOL EXECUTION:
   - Call the appropriate function IMMEDIATELY when the technician states dimensions, moisture readings, equipment, actions, or room transitions. Never wait or batch tool calls.
   - Available tools: classify_loss_type, set_active_room, record_room_dimensions, record_moisture_reading, record_thermal_reading, deploy_equipment, add_standardized_action, undo_last_action, add_field_notes.

4. RULE 4 — CRISP VERBAL CONFIRMATIONS:
   - Keep spoken responses under 2 short sentences.
   - Speak the exact numbers and materials recorded so the technician has verbal verification while their hands are busy measuring (e.g., "Logged Master Bedroom 14 by 12 with 24-inch flood cut.").

5. RULE 5 — PROACTIVE IICRC GUIDING QUESTIONS:
   - Guide the technician through standard IICRC checkpoints:
     * If room dimensions are stated without moisture readings: "What's your moisture meter reading on the flooring and drywall in this room?"
     * If a flood cut or baseboard removal is stated without cut height: "What height flood cut are you recommending—24 or 48 inches?"
     * If mold is identified: "Are we staging critical poly containment barriers and HEPA air scrubbers before demo?"
     * If drying equipment is unstated: "How many air movers and dehumidifiers are you staging here?"

6. RULE 6 — ACTIVE ROOM CONTEXT:
   - Whenever the technician mentions entering or moving to a new space (e.g., "Now in the kitchen", "Heading downstairs to the basement"), call set_active_room immediately so all subsequent readings attach to that room.

7. RULE 7 — CORRECTIONS & UNDO:
   - If the technician corrects themselves ("Wait, make that 16 feet, not 14"), update the existing room dimensions rather than creating a duplicate.
   - If the technician says "Cancel that" or "Remove that moisture reading", call undo_last_action.`;

const SCOPING_FUNCTION_DECLARATIONS = [
  {
    name: 'classify_loss_type',
    description: 'Classifies whether the restoration estimate is Water Damage (IICRC S500) or Mold Remediation (IICRC S520).',
    parameters: {
      type: 'OBJECT',
      properties: {
        lossType: {
          type: 'STRING',
          enum: ['water', 'mold', 'water_and_mold'],
          description: 'Primary loss peril.'
        },
        waterCategory: {
          type: 'STRING',
          enum: ['Cat 1 (Clean)', 'Cat 2 (Grey)', 'Cat 3 (Black / Mold)'],
          description: 'Water category per IICRC S500.'
        },
        moldCondition: {
          type: 'STRING',
          enum: [
            'Condition 1 (Normal Fungal Ecology)',
            'Condition 2 (Settled Spores)',
            'Condition 3 (Active Microbial Growth)'
          ],
          description: 'Mold condition level per IICRC S520.'
        },
        containmentRequired: {
          type: 'BOOLEAN',
          description: 'Whether critical poly containment barriers and negative air are required.'
        },
        reasoning: {
          type: 'STRING',
          description: 'Technical field justification.'
        }
      },
      required: ['lossType', 'reasoning']
    }
  },
  {
    name: 'set_active_room',
    description: 'Sets the current room/chamber location being walked and scoped.',
    parameters: {
      type: 'OBJECT',
      properties: {
        roomName: {
          type: 'STRING',
          description: 'Name of the room (e.g. Master Bedroom, Kitchen, Crawlspace).'
        }
      },
      required: ['roomName']
    }
  },
  {
    name: 'record_room_dimensions',
    description: 'Records structural dimensions for a room along with optional flood cut and baseboard requirements.',
    parameters: {
      type: 'OBJECT',
      properties: {
        roomName: {
          type: 'STRING',
          description: 'Name of the room.'
        },
        lengthFt: {
          type: 'NUMBER',
          description: 'Length in feet.'
        },
        widthFt: {
          type: 'NUMBER',
          description: 'Width in feet.'
        },
        heightFt: {
          type: 'NUMBER',
          description: 'Ceiling height in feet (default 8 if unstated).'
        },
        floodCutHeightInches: {
          type: 'NUMBER',
          description: 'Height of drywall flood cut in inches (e.g. 24 or 48).'
        },
        linearFtBaseboard: {
          type: 'NUMBER',
          description: 'Linear feet of affected baseboard.'
        }
      },
      required: ['roomName', 'lengthFt', 'widthFt']
    }
  },
  {
    name: 'record_moisture_reading',
    description: 'Records a quantitative moisture meter reading for a substrate in a room.',
    parameters: {
      type: 'OBJECT',
      properties: {
        roomName: {
          type: 'STRING',
          description: 'Room where reading was taken.'
        },
        substrate: {
          type: 'STRING',
          description: 'Material tested (e.g. Drywall south wall, Oak Hardwood, Subfloor under vanity).'
        },
        readingValue: {
          type: 'NUMBER',
          description: 'Numerical reading value (e.g. 32).'
        },
        unit: {
          type: 'STRING',
          description: 'Measurement unit (e.g. % WME or Relative Pinless).'
        },
        dryStandard: {
          type: 'NUMBER',
          description: 'Dry standard baseline for unaffected material (default 12).'
        }
      },
      required: ['roomName', 'substrate', 'readingValue']
    }
  },
  {
    name: 'record_thermal_reading',
    description: 'Records a FLIR thermal imaging delta and moisture perimeter anomaly.',
    parameters: {
      type: 'OBJECT',
      properties: {
        roomName: {
          type: 'STRING',
          description: 'Room where thermal imaging was taken.'
        },
        deltaTFahrenheit: {
          type: 'NUMBER',
          description: 'Temperature delta below ambient in degrees Fahrenheit (e.g. -6.4).'
        },
        perimeterBoundaryDesc: {
          type: 'STRING',
          description: 'Description of the cooling anomaly thermal boundary.'
        }
      },
      required: ['roomName', 'deltaTFahrenheit', 'perimeterBoundaryDesc']
    }
  },
  {
    name: 'deploy_equipment',
    description: 'Allocates restorative drying or HEPA air scrubbing equipment to a room or drying chamber.',
    parameters: {
      type: 'OBJECT',
      properties: {
        roomName: {
          type: 'STRING',
          description: 'Room or chamber name.'
        },
        airMovers: {
          type: 'INTEGER',
          description: 'Number of centrifugal air movers.'
        },
        dehumidifiers: {
          type: 'INTEGER',
          description: 'Number of commercial LGR dehumidifiers.'
        },
        airScrubbers: {
          type: 'INTEGER',
          description: 'Number of 500 CFM HEPA air scrubbers.'
        },
        dryingDays: {
          type: 'INTEGER',
          description: 'Estimated drying days (default 3).'
        }
      },
      required: ['roomName']
    }
  },
  {
    name: 'add_standardized_action',
    description: 'Appends a standardized IICRC action to the estimate.',
    parameters: {
      type: 'OBJECT',
      properties: {
        action: {
          type: 'STRING',
          enum: [
            'FLOOD_CUT',
            'REMOVE_BASEBOARD',
            'REMOVE_FLOORING',
            'EXTRACT_WATER',
            'DEPLOY_EQUIPMENT',
            'HEPA_VACUUM',
            'APPLY_ANTIMICROBIAL',
            'CONTAINMENT_SETUP',
            'HEPA_AIR_SCRUBBING'
          ],
          description: 'Standardized restoration action code.'
        },
        notes: {
          type: 'STRING',
          description: 'Optional field notes regarding the action.'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'undo_last_action',
    description: 'Reverts the most recent voice scoping action or removes a misheard item.',
    parameters: {
      type: 'OBJECT',
      properties: {
        targetType: {
          type: 'STRING',
          description: 'What to undo (e.g. last_room, last_moisture, last_action).'
        }
      },
      required: ['targetType']
    }
  },
  {
    name: 'add_field_notes',
    description: 'Appends technical observation notes to the job.',
    parameters: {
      type: 'OBJECT',
      properties: {
        notes: {
          type: 'STRING',
          description: 'Technician field notes.'
        }
      },
      required: ['notes']
    }
  }
];

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '');
    if (pathname === '/api/live-ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (clientWs: WebSocket) => {
    console.log('[GeminiLive] Client connected to /api/live-ws');

    const authTimer = setTimeout(() => {
      clientWs.send(JSON.stringify({ type: 'error', message: 'Sign-in required for Gemini Live' }));
      clientWs.close(4401, 'Unauthorized');
    }, LIVE_AUTH_TIMEOUT_MS);

    clientWs.once('message', async (data: Buffer | string) => {
      clearTimeout(authTimer);
      try {
        const payload = JSON.parse(data.toString());
        if (payload?.type !== 'auth' || typeof payload.token !== 'string') {
          throw new AuthError('Sign-in required for Gemini Live', 401);
        }
        const caller = await requireStaffToken(payload.token);
        console.log(`[GeminiLive] Authorized ${caller.uid} (${caller.role})`);
      } catch (authErr) {
        const message = authErr instanceof Error ? authErr.message : 'Sign-in required for Gemini Live';
        const code = authErr instanceof AuthError && authErr.status === 403 ? 4403 : 4401;
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: 'error', message }));
          clientWs.close(code, 'Unauthorized');
        }
        return;
      }
      await startLiveRelay(clientWs);
    });

    clientWs.on('close', () => clearTimeout(authTimer));
  });

  async function startLiveRelay(clientWs: WebSocket) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[GeminiLive] Missing GEMINI_API_KEY');
      clientWs.send(JSON.stringify({ type: 'error', message: 'Missing GEMINI_API_KEY' }));
      clientWs.close();
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    let liveSession: any = null;

    try {
      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: RESTORATION_SYSTEM_INSTRUCTION,
          // @ts-ignore - Tools schema definition
          tools: [{ functionDeclarations: SCOPING_FUNCTION_DECLARATIONS }],
          inputAudioTranscription: {},
          outputAudioTranscription: {}
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // 1. Audio stream from model turn
            const audioChunk = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioChunk) {
              clientWs.send(JSON.stringify({ type: 'audio', audio: audioChunk }));
            }

            // 2. Interruption event
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }

            // 3. User speech transcript
            // @ts-ignore
            const inputTranscription = message.serverContent?.inputAudioTranscription?.text;
            if (inputTranscription) {
              clientWs.send(JSON.stringify({ type: 'input_transcript', text: inputTranscription }));
            }

            // 4. Model speech transcript
            // @ts-ignore
            const outputTranscription = message.serverContent?.outputAudioTranscription?.text;
            if (outputTranscription) {
              clientWs.send(JSON.stringify({ type: 'output_transcript', text: outputTranscription }));
            }

            // 5. Tool Call execution requests
            const toolCall = message.toolCall;
            if (toolCall && toolCall.functionCalls && toolCall.functionCalls.length > 0) {
              console.log('[GeminiLive] Tool call requested:', toolCall.functionCalls);
              clientWs.send(JSON.stringify({
                type: 'tool_call',
                functionCalls: toolCall.functionCalls
              }));
            }
          },
          onerror: (err: any) => {
            console.error('[GeminiLive] Session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Gemini Live error' }));
            }
          },
          onclose: () => {
            console.log('[GeminiLive] Session closed');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          }
        }
      });

      // The browser may have gone away while the Gemini session was opening
      if (clientWs.readyState !== WebSocket.OPEN) {
        liveSession.close();
        return;
      }

      console.log('[GeminiLive] Connected to gemini-3.8-live successfully');
      clientWs.send(JSON.stringify({ type: 'connected', model: 'gemini-3.8-live', voice: 'Zephyr' }));

      // Handle incoming messages from client browser
      clientWs.on('message', async (data: Buffer | string) => {
        try {
          const payload = JSON.parse(data.toString());

          if (payload.type === 'audio' && payload.audio) {
            // Forward 16kHz PCM audio chunk to Gemini Live
            await liveSession.sendRealtimeInput({
              audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } else if (payload.type === 'tool_response' && payload.functionResponses) {
            // Send completed tool response back to Gemini Live
            await liveSession.sendToolResponse({
              functionResponses: payload.functionResponses
            });
          } else if (payload.type === 'text' && payload.text) {
            // Optional text instruction or prompt injection
            await liveSession.sendRealtimeInput({
              text: payload.text
            });
          }
        } catch (msgErr) {
          console.error('[GeminiLive] Error processing client message:', msgErr);
        }
      });

      clientWs.on('close', () => {
        console.log('[GeminiLive] Client disconnected');
        try {
          liveSession?.close();
        } catch (e) {
          // ignore
        }
      });

    } catch (connErr: any) {
      console.error('[GeminiLive] Failed to connect to Gemini Live:', connErr);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'error',
          message: connErr?.message || 'Could not connect to Gemini Live session'
        }));
        clientWs.close();
      }
    }
  }

  server.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
    console.log(`> WebSocket listening on ws://${hostname}:${port}/api/live-ws`);
  });
});
