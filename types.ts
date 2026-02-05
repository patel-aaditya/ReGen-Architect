export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  REVIEW_ANALYSIS = 'REVIEW_ANALYSIS',
  GENERATING_VISION = 'GENERATING_VISION',
  PLANNING = 'PLANNING',
  COMPLETE = 'COMPLETE',
}

export enum RestorationType {
  POLLINATOR_HAVEN = 'Pollinator Haven',
  FOOD_FOREST = 'Urban Food Forest',
  RAIN_GARDEN = 'Stormwater Rain Garden',
  NATIVE_MEADOW = 'Native Wildflower Meadow',
  COMMUNITY_PARK = 'Sustainable Community Park',
}

export enum BudgetLevel {
  LOW = 'Low Cost (DIY & Seeds)',
  MEDIUM = 'Standard (Professional Assist)',
  HIGH = 'Premium (Full Contractor)',
}

export interface SiteAnalysis {
  sunlightExposure: string;
  soilSealingEstimate: number; // 0-100%
  biodiversityScore: number; // 0-10
  hardinessZoneEstimate: string;
  estimatedAreaSqM: string; // e.g. "15-20"
  observedFeatures: string[];
  ecologicalDeficits: string[];
  suitability: {
    [key in RestorationType]: number; // 0-100 score
  };
}

export interface PlanPhase {
  phaseName: string;
  durationWeeks: number;
  tasks: string[];
  materialsNeeded: string[];
  estimatedCost: number; // Renamed from estimatedCostUSD
  technicalNotes: string;
  recommendedServiceCategory: string; // New: e.g., "Waste Removal", "Landscaper", "Nursery"
}

export interface RestorationPlan {
  title: string;
  summary: string;
  totalDurationWeeks: number;
  totalEstimatedCost: number; // Renamed from totalEstimatedCostUSD
  currencySymbol: string; // New field for localized currency (e.g., '₹', '$')
  phases: PlanPhase[];
  maintenanceSchedule: string;
  longTermImpact: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ServiceProvider {
  name: string;
  description: string;
  phoneNumber: string;
  address: string;
}

export interface LocalSearchResult {
  providers: ServiceProvider[]; // Structured data instead of raw text
}

export interface ProjectState {
  originalImage: string | null; // Base64
  restoredImage: string | null; // Base64
  analysis: SiteAnalysis | null;
  selectedType: RestorationType | null;
  budget: BudgetLevel;
  plan: RestorationPlan | null;
  location: Coordinates | null;
}