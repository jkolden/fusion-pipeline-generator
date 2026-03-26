import { useMemo } from 'react'
import { WizardNav } from './WizardNav'
import { StepEntity } from './StepEntity'
import { StepColumns } from './StepColumns'
import { StepMashup } from './StepMashup'
import { StepGenerate } from './StepGenerate'
import { useWizardState } from '@/hooks/useWizardState'
import { useGenerate } from '@/hooks/useGenerate'
import { validateStep1, validateStep2 } from '@/lib/validators'
import type { WizardStep } from '@/lib/types'

interface WizardProps {
  apiKey: string
  onOpenApiKey: () => void
}

export function Wizard({ apiKey, onOpenApiKey }: WizardProps) {
  const wizard = useWizardState()
  const gen = useGenerate()

  const completedSteps = useMemo(() => {
    const set = new Set<number>()
    if (validateStep1(wizard.config.extractionType, wizard.config.entity, wizard.config.bipConfig, wizard.config.otbiConfig).valid) set.add(1)
    if (validateStep2(wizard.config.columns, wizard.config.dedup, wizard.config.extractionType).valid) set.add(2)
    // Step 3 is always "completable" (mashup is optional / not applicable for BIP/OTBI)
    if (wizard.config.columns.length > 0) set.add(3)
    return set
  }, [wizard.config])

  const handleGenerate = async () => {
    try {
      await gen.generate(apiKey, wizard.config)
    } catch {
      // error is captured in gen.error
    }
  }

  const navigateTo = (step: WizardStep) => {
    wizard.setStep(step)
    gen.clearResult()
  }

  return (
    <div className="mx-auto max-w-6xl px-4">
      <WizardNav
        currentStep={wizard.currentStep}
        extractionType={wizard.config.extractionType}
        onStepClick={navigateTo}
        completedSteps={completedSteps}
      />
      {wizard.currentStep === 1 && (
        <StepEntity
          extractionType={wizard.config.extractionType}
          entity={wizard.config.entity}
          bipConfig={wizard.config.bipConfig}
          otbiConfig={wizard.config.otbiConfig}
          columnCount={wizard.config.columns.length}
          onExtractionTypeChange={wizard.setExtractionType}
          onEntityChange={wizard.setEntity}
          onBipConfigChange={wizard.setBipConfig}
          onOtbiConfigChange={wizard.setOtbiConfig}
          onParseCsv={wizard.parseCsv}
          onParseBipColumns={wizard.parseBipColumns}
          onParseOtbiSql={wizard.parseOtbiSql}
          onNext={() => wizard.setStep(2)}
        />
      )}
      {wizard.currentStep === 2 && (
        <StepColumns
          columns={wizard.config.columns}
          dedup={wizard.config.dedup}
          extractionType={wizard.config.extractionType}
          onUpdateColumn={wizard.updateColumn}
          onSetDedup={wizard.setDedup}
          onBack={() => wizard.setStep(1)}
          onNext={() => wizard.setStep(3)}
        />
      )}
      {wizard.currentStep === 3 && (
        <StepMashup
          mashup={wizard.config.mashup}
          fusionColumns={wizard.config.columns}
          extractionType={wizard.config.extractionType}
          onSetMashup={wizard.setMashup}
          onBack={() => wizard.setStep(2)}
          onNext={() => wizard.setStep(4)}
        />
      )}
      {wizard.currentStep === 4 && (
        <StepGenerate
          config={wizard.config}
          apiKey={apiKey}
          loading={gen.loading}
          result={gen.result}
          error={gen.error}
          onGenerate={handleGenerate}
          onBack={() => wizard.setStep(3)}
          onOpenApiKey={onOpenApiKey}
        />
      )}
    </div>
  )
}
