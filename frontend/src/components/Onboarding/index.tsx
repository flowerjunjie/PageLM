import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const ONBOARDING_STORAGE_KEY = "pagelm_onboarding_complete";

type Props = {
  onComplete?: () => void;
};

export default function Onboarding({ onComplete }: Props) {
  const { t } = useTranslation("onboarding");
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: t("steps.welcome.title"),
      description: t("steps.welcome.description"),
      icon: "👋",
    },
    {
      title: t("steps.ask.title"),
      description: t("steps.ask.description"),
      icon: "💬",
    },
    {
      title: t("steps.tools.title"),
      description: t("steps.tools.description"),
      icon: "🛠️",
    },
    {
      title: t("steps.ready.title"),
      description: t("steps.ready.description"),
      icon: "🎉",
    },
  ];

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!hasCompletedOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-stone-950 border border-stone-800 rounded-3xl p-8 shadow-2xl animate-[fadeIn_300ms_ease-out]">
        {/* Skip button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={handleSkip}
            className="text-stone-400 hover:text-stone-200 text-sm transition-colors"
          >
            {t("skip")}
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                index === currentStep
                  ? "bg-sky-500"
                  : index < currentStep
                  ? "bg-sky-500/50"
                  : "bg-stone-800"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-6xl mb-6 flex justify-center">{step.icon}</div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-white text-center mb-4">{step.title}</h2>

        {/* Description */}
        <p className="text-stone-300 text-center leading-relaxed mb-8">{step.description}</p>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {!isFirstStep && (
            <button
              onClick={handlePrevious}
              className="flex-1 px-6 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 font-medium transition-all duration-300"
            >
              {t("previous")}
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white font-medium transition-all duration-300"
          >
            {isLastStep ? t("getStarted") : t("next")}
          </button>
        </div>

        {/* Step counter */}
        <div className="text-center mt-6 text-sm text-stone-500">
          {currentStep + 1} / {steps.length}
        </div>
      </div>
    </div>
  );
}
