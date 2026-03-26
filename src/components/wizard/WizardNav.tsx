import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WizardStep, ExtractionType } from '@/lib/types'

function getSteps(extractionType: ExtractionType): { step: WizardStep; label: string }[] {
  return [
    { step: 1, label: 'Entity Setup' },
    { step: 2, label: 'Columns' },
    { step: 3, label: extractionType === 'BICC' ? 'Mashup View' : 'Review' },
    { step: 4, label: 'Generate' },
  ]
}

interface WizardNavProps {
  currentStep: WizardStep
  extractionType: ExtractionType
  onStepClick: (step: WizardStep) => void
  completedSteps: Set<number>
}

export function WizardNav({ currentStep, extractionType, onStepClick, completedSteps }: WizardNavProps) {
  const steps = getSteps(extractionType)

  return (
    <nav className="flex items-center justify-center gap-2 py-6">
      {steps.map(({ step, label }, i) => {
        const isCompleted = completedSteps.has(step)
        const isCurrent = step === currentStep
        const isClickable = step <= currentStep || completedSteps.has(step - 1)

        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className={cn('h-px w-8', isCurrent || isCompleted ? 'bg-[var(--primary)]' : 'bg-[var(--border)]')} />}
            <button
              onClick={() => isClickable && onStepClick(step)}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer',
                isCurrent && 'bg-[var(--primary)] text-[var(--primary-foreground)]',
                isCompleted && !isCurrent && 'bg-[var(--secondary)] text-[var(--secondary-foreground)]',
                !isCurrent && !isCompleted && 'text-[var(--muted-foreground)]',
                !isClickable && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isCompleted && !isCurrent ? (
                <Check className="h-4 w-4" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                  {step}
                </span>
              )}
              {label}
            </button>
          </div>
        )
      })}
    </nav>
  )
}
