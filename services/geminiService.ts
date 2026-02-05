import { GoogleGenAI, Type, Schema } from "@google/genai";
import { SiteAnalysis, RestorationPlan, RestorationType, Coordinates, LocalSearchResult, BudgetLevel } from "../types";

// Helper to initialize AI only when needed, preventing crash on load if key is missing
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Retry Logic ---

async function retryOperation<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const shouldRetry = error.status === 429 || error.status === 503;
      
      if (shouldRetry && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Attempt ${i + 1} failed with status ${error.status}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// --- Schemas ---

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sunlightExposure: { type: Type.STRING, description: "Estimated sunlight (Full Sun, Partial Shade, Deep Shade)" },
    soilSealingEstimate: { type: Type.NUMBER, description: "Percentage of surface covered by concrete/asphalt (0-100)" },
    biodiversityScore: { type: Type.NUMBER, description: "Current ecological value score (0-10)" },
    hardinessZoneEstimate: { type: Type.STRING, description: "Estimated USDA hardiness zone or local equivalent" },
    estimatedAreaSqM: { type: Type.STRING, description: "Approximate area size in square meters (e.g., '10-20')" },
    observedFeatures: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of visible features (e.g., fence, pavement, weeds)" },
    ecologicalDeficits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of missing ecological functions" },
    suitability: {
      type: Type.OBJECT,
      properties: {
        "Pollinator Haven": { type: Type.NUMBER },
        "Urban Food Forest": { type: Type.NUMBER },
        "Stormwater Rain Garden": { type: Type.NUMBER },
        "Native Wildflower Meadow": { type: Type.NUMBER },
        "Sustainable Community Park": { type: Type.NUMBER },
      },
      description: "Suitability score (0-100) for each project type based on spatial constraints and local realism",
    },
  },
  required: ["sunlightExposure", "soilSealingEstimate", "biodiversityScore", "hardinessZoneEstimate", "estimatedAreaSqM", "observedFeatures", "ecologicalDeficits", "suitability"],
};

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING },
    totalDurationWeeks: { type: Type.NUMBER },
    totalEstimatedCost: { type: Type.NUMBER, description: "Total cost in local currency" },
    currencySymbol: { type: Type.STRING, description: "Currency symbol, e.g. '$', '₹', '€'" },
    maintenanceSchedule: { type: Type.STRING, description: "Brief overview of monthly maintenance" },
    longTermImpact: { type: Type.STRING, description: "Ecological benefits after 5 years" },
    phases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phaseName: { type: Type.STRING },
          durationWeeks: { type: Type.NUMBER },
          tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
          materialsNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
          estimatedCost: { type: Type.NUMBER, description: "Cost for this phase in local currency" },
          technicalNotes: { type: Type.STRING, description: "Specific instructions for this phase" },
          recommendedServiceCategory: { type: Type.STRING, description: "The specific type of professional or shop needed for this phase (e.g., 'Waste Removal', 'Landscape Architect', 'Native Plant Nursery', 'Hardware Store')" },
        },
        required: ["phaseName", "durationWeeks", "tasks", "materialsNeeded", "estimatedCost", "technicalNotes", "recommendedServiceCategory"],
      },
    },
  },
  required: ["title", "summary", "totalDurationWeeks", "totalEstimatedCost", "currencySymbol", "phases", "maintenanceSchedule", "longTermImpact"],
};

const servicesSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    providers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          phoneNumber: { type: Type.STRING, description: "Phone number with country code if available" },
          address: { type: Type.STRING },
        },
        required: ["name", "description", "phoneNumber", "address"],
      },
    },
  },
  required: ["providers"],
};

// --- API Functions ---

export const analyzeSiteImage = async (base64Image: string, location: Coordinates | null): Promise<SiteAnalysis> => {
  return retryOperation(async () => {
    try {
      const ai = getAI();
      const locationContext = location 
        ? `Location Coordinates: Lat ${location.latitude}, Lng ${location.longitude}. Use this to infer strict local climate data (e.g. India, UK, USA), native plant species availability, and rainfall patterns.` 
        : "Location not provided. Infer climate from visual cues.";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            {
              text: `Analyze this image as an expert landscape architect. 
              ${locationContext}
              
              CRITICAL: You must estimate the SCALE of the space (sq meters) based on reference objects (doors, cars).
              
              Scoring Rules for Suitability:
              - If area < 20 sq meters: Score 'Sustainable Community Park' and 'Urban Food Forest' below 20. Suggest 'Pollinator Haven' or vertical gardens.
              - If area is paved/concrete: High potential for 'Pollinator Haven' (pots) or 'Depaving' but strictly evaluate cost.
              - If location is arid: 'Rain Garden' suitability depends on actual rainfall data for the region.
              
              Output a realistic assessment.`,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as SiteAnalysis;
      }
      throw new Error("No analysis generated");
    } catch (error) {
      console.error("Analysis failed:", error);
      throw error;
    }
  });
};

export const generateVisionImage = async (originalBase64: string, type: RestorationType, analysis: SiteAnalysis, budget: BudgetLevel): Promise<string> => {
  return retryOperation(async () => {
    const ai = getAI();
    const budgetPrompt = budget === BudgetLevel.LOW 
      ? "Use cost-effective materials, gravel paths, young plants, and DIY aesthetics." 
      : budget === BudgetLevel.HIGH 
        ? "Use premium mature trees, stone hardscaping, and professional finish." 
        : "Standard landscape quality.";

    // Improved prompt for realism and detail
    const prompt = `
      Generate a hyper-realistic, high-resolution architectural photograph of a ${type} renovation.
      
      Input Constraints:
      - The perspective, camera angle, and building boundaries of the input image MUST be preserved exactly.
      - Context: A real urban site, approx ${analysis.estimatedAreaSqM} sq meters.
      
      Visual Style:
      - Photorealistic, 8k resolution, cinematic lighting.
      - Natural textures (weathered wood, real concrete, organic soil).
      - Soft shadows and ambient occlusion.
      - NO cartoon, illustration, or painterly effects.
      
      Content:
      - ${budgetPrompt}
      - Vegetation: Realistic ${analysis.hardinessZoneEstimate} flora.
      - Specifics: ${type === RestorationType.POLLINATOR_HAVEN ? 'wildflower drifts, bee blocks, potted lavender' :
      type === RestorationType.FOOD_FOREST ? 'apple trees, berry bushes, raised timber beds' :
      type === RestorationType.RAIN_GARDEN ? 'river stones, rushes, sunken bioswale' :
      type === RestorationType.NATIVE_MEADOW ? 'tall feathery grasses, local wildflowers' :
      'modern benches, shade sail, permeable paving'}.
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: originalBase64,
              },
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
      throw new Error("No image generated by Flash model");
      
    } catch (error: any) {
      console.error("Vision generation failed:", error);
      throw error;
    }
  });
};

export const createExecutionPlan = async (
  analysis: SiteAnalysis, 
  type: RestorationType,
  budget: BudgetLevel,
  location: Coordinates | null
): Promise<RestorationPlan> => {
  return retryOperation(async () => {
    try {
      const ai = getAI();
      const locationContext = location 
        ? `Location Coordinates: ${location.latitude}, ${location.longitude}. DETECT THE COUNTRY. Use the LOCAL CURRENCY (e.g., ₹ for India, £ for UK, € for Europe) for all cost estimates.` 
        : `Detect country from image cues and use local currency for costs.`;

      const prompt = `Create a realistic ecological restoration plan for a "${type}".
              
      Constraints:
      - Budget Strategy: ${budget} (CRITICAL: Adjust materials and labor accordingly).
      - Estimated Area: ${analysis.estimatedAreaSqM} sq meters.
      - Zone: ${analysis.hardinessZoneEstimate}.
      - ${locationContext}
      
      If Budget is LOW: Focus on seeds, recycled materials, volunteer labor, and propagation.
      If Budget is HIGH: Focus on mature stock, contractors, and stone/wood hardscaping.
      
      Context Data:
      - Current State: ${JSON.stringify(analysis.observedFeatures)}
      - Deficits: ${JSON.stringify(analysis.ecologicalDeficits)}

      CRITICAL for Phases:
      - Identify the specific 'recommendedServiceCategory' for each phase (e.g., 'Waste Removal' for demolition, 'Landscaper' for planting, 'Hardware Store' for materials).
      
      The plan must be physically possible for the space size.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: planSchema,
          thinkingConfig: { thinkingBudget: 4096 },
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as RestorationPlan;
      }
      throw new Error("No plan generated");
    } catch (error) {
      console.error("Plan generation failed:", error);
      throw error;
    }
  });
};

export const findLocalServices = async (query: string, location: Coordinates): Promise<LocalSearchResult> => {
  return retryOperation(async () => {
    try {
      const ai = getAI();
      // Use gemini-3-flash-preview with googleSearch and JSON schema to get structured data
      // This is better for "Calling" than the Maps tool which returns unformatted grounding chunks
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find 5 top-rated ${query} near latitude ${location.latitude}, longitude ${location.longitude}. 
        Return a valid JSON object with a list of providers. 
        MANDATORY: You must find valid phone numbers for them.
        `,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: servicesSchema
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as LocalSearchResult;
      }
      throw new Error("No services found");

    } catch (error) {
      console.error("Local search failed:", error);
      return { providers: [] };
    }
  });
};