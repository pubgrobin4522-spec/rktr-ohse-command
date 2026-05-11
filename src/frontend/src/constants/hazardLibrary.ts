export interface HazardLibraryEntry {
  id: number;
  hazardType: string;
  examples: string;
  defaultControls: string;
}

export const HAZARD_LIBRARY: HazardLibraryEntry[] = [
  {
    id: 1,
    hazardType: "Physical Hazards",
    examples: "Noise, vibration, heat, cold, radiation",
    defaultControls: "PPE, insulation, barriers, ventilation, monitoring",
  },
  {
    id: 2,
    hazardType: "Mechanical Hazards",
    examples: "Moving machinery, rotating parts, conveyors",
    defaultControls: "Machine guarding, lockout/tagout (LOTO), interlocks",
  },
  {
    id: 3,
    hazardType: "Electrical Hazards",
    examples: "Live wires, short circuits, electric shock",
    defaultControls: "Earthing, insulation, MCCB/ELCB, authorized access",
  },
  {
    id: 4,
    hazardType: "Fire Hazards",
    examples: "Flammable materials, sparks, gas leaks",
    defaultControls: "Fire extinguishers, detectors, hot work permit",
  },
  {
    id: 5,
    hazardType: "Explosion Hazards",
    examples: "Gas cylinders, combustible dust",
    defaultControls: "Explosion-proof equipment, ventilation, gas detection",
  },
  {
    id: 6,
    hazardType: "Chemical Hazards",
    examples: "Acids, solvents, fumes",
    defaultControls: "MSDS/SDS, chemical storage, PPE, spill kits",
  },
  {
    id: 7,
    hazardType: "Biological Hazards",
    examples: "Bacteria, viruses, mold",
    defaultControls: "Hygiene, vaccination, disinfection, PPE",
  },
  {
    id: 8,
    hazardType: "Ergonomic Hazards",
    examples: "Poor posture, repetitive work",
    defaultControls: "Ergonomic design, lifting aids, job rotation",
  },
  {
    id: 9,
    hazardType: "Slip / Trip / Fall Hazards",
    examples: "Wet floors, uneven surfaces",
    defaultControls: "Housekeeping, anti-slip mats, signage",
  },
  {
    id: 10,
    hazardType: "Working at Height",
    examples: "Ladders, scaffolding, rooftops",
    defaultControls: "Full-body harness, guardrails, work permits",
  },
  {
    id: 11,
    hazardType: "Confined Space Hazards",
    examples: "Tanks, pits, silos",
    defaultControls: "Gas testing, confined space permit, standby person",
  },
  {
    id: 12,
    hazardType: "Pressure Hazards",
    examples: "Boilers, compressed air systems",
    defaultControls: "Pressure relief valves, inspections",
  },
  {
    id: 13,
    hazardType: "Thermal Hazards",
    examples: "Hot surfaces, molten metal",
    defaultControls: "Heat shields, insulated gloves",
  },
  {
    id: 14,
    hazardType: "Noise Hazards",
    examples: "Compressors, forging hammers",
    defaultControls: "Ear protection, acoustic barriers",
  },
  {
    id: 15,
    hazardType: "Dust Hazards",
    examples: "Grinding, sand blasting",
    defaultControls: "Dust collectors, respirators",
  },
  {
    id: 16,
    hazardType: "Radiation Hazards",
    examples: "Welding UV, X-ray",
    defaultControls: "Shielding, restricted zones",
  },
  {
    id: 17,
    hazardType: "Manual Handling Hazards",
    examples: "Lifting heavy materials",
    defaultControls: "Crane, forklift, lifting training",
  },
  {
    id: 18,
    hazardType: "Vehicle Hazards",
    examples: "Forklifts, trucks, EOT cranes",
    defaultControls: "Traffic management, alarms, speed limits",
  },
  {
    id: 19,
    hazardType: "Crane & Lifting Hazards",
    examples: "Overloading, falling loads",
    defaultControls: "SWL marking, inspection, trained operator",
  },
  {
    id: 20,
    hazardType: "Welding Hazards",
    examples: "Arc flash, fumes",
    defaultControls: "Welding screen, fume extraction",
  },
  {
    id: 21,
    hazardType: "Hot Work Hazards",
    examples: "Cutting, brazing, grinding",
    defaultControls: "Hot work permit, fire watch",
  },
  {
    id: 22,
    hazardType: "Stored Energy Hazards",
    examples: "Hydraulic, pneumatic pressure",
    defaultControls: "LOTO, pressure release",
  },
  {
    id: 23,
    hazardType: "Sharp Edge Hazards",
    examples: "Metal burrs, tools",
    defaultControls: "Cut-resistant gloves",
  },
  {
    id: 24,
    hazardType: "Falling Object Hazards",
    examples: "Overhead storage, crane operations",
    defaultControls: "Helmet, barricading",
  },
  {
    id: 25,
    hazardType: "Environmental Hazards",
    examples: "Wastewater, emissions",
    defaultControls: "ETP/STP, pollution control",
  },
  {
    id: 26,
    hazardType: "Psychological Hazards",
    examples: "Stress, fatigue, harassment",
    defaultControls: "Counseling, workload management",
  },
  {
    id: 27,
    hazardType: "Fatigue Hazards",
    examples: "Long shifts, night work",
    defaultControls: "Shift rotation, rest breaks",
  },
  {
    id: 28,
    hazardType: "Human Error Hazards",
    examples: "Unsafe acts, lack of training",
    defaultControls: "SOPs, supervision, competency training",
  },
  {
    id: 29,
    hazardType: "Housekeeping Hazards",
    examples: "Scrap accumulation",
    defaultControls: "5S implementation",
  },
  {
    id: 30,
    hazardType: "Illumination Hazards",
    examples: "Poor lighting",
    defaultControls: "Adequate lux levels",
  },
  {
    id: 31,
    hazardType: "Ventilation Hazards",
    examples: "Poor airflow, fumes",
    defaultControls: "Exhaust systems",
  },
  {
    id: 32,
    hazardType: "Corrosion Hazards",
    examples: "Rusted structures",
    defaultControls: "Preventive maintenance",
  },
  {
    id: 33,
    hazardType: "Structural Hazards",
    examples: "Weak platforms, damaged floors",
    defaultControls: "Inspection, repair",
  },
  {
    id: 34,
    hazardType: "Automation Hazards",
    examples: "Robot movement, PLC malfunction",
    defaultControls: "Safety interlocks, emergency stop",
  },
  {
    id: 35,
    hazardType: "Hydraulic Hazards",
    examples: "Oil leaks, pressure burst",
    defaultControls: "Hose inspection, relief valves",
  },
  {
    id: 36,
    hazardType: "Pneumatic Hazards",
    examples: "Air hose whipping",
    defaultControls: "Clamps, pressure control",
  },
  {
    id: 37,
    hazardType: "Gas Hazards",
    examples: "LPG, propane leaks",
    defaultControls: "Gas detectors, leak testing",
  },
  {
    id: 38,
    hazardType: "Oxygen Deficiency",
    examples: "Confined areas",
    defaultControls: "Oxygen monitoring",
  },
  {
    id: 39,
    hazardType: "Steam Hazards",
    examples: "Steam leakage",
    defaultControls: "Insulation, valve maintenance",
  },
  {
    id: 40,
    hazardType: "Water Hazards",
    examples: "Flooding, slippery areas",
    defaultControls: "Drainage systems",
  },
  {
    id: 41,
    hazardType: "Battery Hazards",
    examples: "Acid leakage, explosion",
    defaultControls: "Ventilation, battery PPE",
  },
  {
    id: 42,
    hazardType: "Electrical Arc Flash",
    examples: "Panel maintenance",
    defaultControls: "Arc-rated PPE",
  },
  {
    id: 43,
    hazardType: "Cybersecurity Hazards",
    examples: "Unauthorized system access",
    defaultControls: "Firewall, MFA, access control",
  },
  {
    id: 44,
    hazardType: "Data Loss Hazards",
    examples: "Server failure",
    defaultControls: "Backups, disaster recovery",
  },
  {
    id: 45,
    hazardType: "Security Hazards",
    examples: "Unauthorized entry",
    defaultControls: "CCTV, access control",
  },
  {
    id: 46,
    hazardType: "Pandemic / Health Hazards",
    examples: "Infectious disease spread",
    defaultControls: "Sanitization, distancing",
  },
  {
    id: 47,
    hazardType: "Contractor Hazards",
    examples: "Untrained external workers",
    defaultControls: "Contractor induction",
  },
  {
    id: 48,
    hazardType: "Improper PPE Usage",
    examples: "Wrong PPE selection",
    defaultControls: "PPE training and audits",
  },
  {
    id: 49,
    hazardType: "Unsafe Acts",
    examples: "Bypassing safety systems",
    defaultControls: "Behavior-based safety",
  },
  {
    id: 50,
    hazardType: "Unsafe Conditions",
    examples: "Damaged tools/equipment",
    defaultControls: "Inspection and corrective action",
  },
];

export const PERMIT_TYPE_HAZARD_IDS: Record<string, number[]> = {
  hotWork: [21, 4, 5, 13, 20, 15, 16, 1, 31],
  electrical: [3, 42, 22, 1, 2, 4, 34],
  excavation: [9, 33, 24, 37, 38, 40, 17, 18],
  heightWork: [10, 24, 1, 9, 17, 2, 27],
  confinedSpace: [11, 38, 37, 6, 5, 1, 31, 7],
  lineBreaking: [6, 22, 12, 37, 39, 35, 36, 1],
  liftingPermit: [19, 17, 24, 18, 2, 33, 1],
  generalWorkPermit: [1, 2, 9, 17, 29, 30, 28, 49, 50],
};

export function getPreSelectedHazards(
  permitType: string,
): HazardLibraryEntry[] {
  const ids = PERMIT_TYPE_HAZARD_IDS[permitType] ?? [];
  return HAZARD_LIBRARY.filter((entry) => ids.includes(entry.id));
}
