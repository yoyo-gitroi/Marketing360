'use client';

import { useMemo } from 'react';
import BrandIdentityStep from './steps/BrandIdentityStep';
import ValuesPillarsStep from './steps/ValuesPillarsStep';
import VisualIdentityStep from './steps/VisualIdentityStep';
import VoiceToneStep from './steps/VoiceToneStep';
import TargetAudienceStep from './steps/TargetAudienceStep';
import ProductInfoStep from './steps/ProductInfoStep';
import BrandHistoryStep from './steps/BrandHistoryStep';
import ResearchSynthesisStep from './steps/ResearchSynthesisStep';

const SECTION_KEYS = [
  'brand_identity',
  'values_pillars',
  'visual_identity',
  'voice_tone',
  'target_audience',
  'product_info',
  'brand_history',
  'research_synthesis',
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

interface BrandBookSection {
  id: string;
  brand_book_id: string;
  section_key: SectionKey;
  user_input: Record<string, unknown>;
  ai_generated: Record<string, unknown>;
  final_content: Record<string, unknown>;
  ai_status: string;
}

interface StepWizardProps {
  brandBookId: string;
  currentStep: number;
  sections: BrandBookSection[];
  onStepChange: (step: number) => void;
  onSave: (sectionKey: SectionKey, userInput: Record<string, unknown>) => Promise<void>;
}

const STEP_COMPONENTS = [
  BrandIdentityStep,
  ValuesPillarsStep,
  VisualIdentityStep,
  VoiceToneStep,
  TargetAudienceStep,
  ProductInfoStep,
  BrandHistoryStep,
  ResearchSynthesisStep,
];

export default function StepWizard({
  brandBookId,
  currentStep,
  sections,
  onStepChange,
  onSave,
}: StepWizardProps) {
  const sectionKey = SECTION_KEYS[currentStep - 1];
  const sectionData = useMemo(
    () => sections.find((s) => s.section_key === sectionKey) || null,
    [sections, sectionKey]
  );

  const StepComponent = STEP_COMPONENTS[currentStep - 1];

  if (!StepComponent) return null;

  const handleSave = (userInput: Record<string, unknown>) => {
    return onSave(sectionKey, userInput);
  };

  return (
    <div className="pb-20">
      <StepComponent
        sectionData={sectionData}
        onSave={handleSave}
        brandBookId={brandBookId}
      />
    </div>
  );
}
