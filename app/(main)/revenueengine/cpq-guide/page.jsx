"use client";

import { useState, useEffect } from "react";
import {
  Wrench,
  DollarSign,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Package
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Import components from the original pages or recreate the logic
import ConfigureProductSection from "./ConfigureProductSection";
import PricingDetailsSection from "./PricingDetailsSection";
import PreviewQuoteSection from "./PreviewQuoteSection";

const steps = [
  {
    id: 1,
    name: "Configure",
    description: "Product Customization",
    icon: Wrench,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: 2,
    name: "Price",
    description: "Pricing & Discounts",
    icon: DollarSign,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: 3,
    name: "Quote",
    description: "Preview & Generate",
    icon: FileText,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
];

export default function CPQGuidePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDealId, setSelectedDealId] = useState(null);
  const [dealHasProducts, setDealHasProducts] = useState(false);

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="w-full min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="w-full md:w-auto text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
            CPQ Guide
          </h1>
          <p className="text-slate-500 mt-2 text-sm md:text-base max-w-md mx-auto md:mx-0">
            A step-by-step sequence to handle your Configure, Price, and Quote process efficiently.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory')}
          variant="outline"
          className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white hover:text-white font-bold rounded-2xl px-6 h-12 md:h-14 shadow-xl shadow-teal-600/20 gap-3"
        >
          <Package className="w-4 h-4" />
          <span>View Inventory</span>
        </Button>
      </div>

      {/* Stepper */}
      <div className="mb-12 md:mb-16">
        <div className="relative flex justify-between max-w-2xl lg:max-w-4xl mx-auto px-2 md:px-0">
          {/* Background Line */}
          <div className="absolute top-6 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />

          {/* Active Line */}
          <div
            className="absolute top-6 left-0 h-0.5 bg-teal-500 z-0 origin-left transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-300 border-2 shadow-lg hover:scale-110",
                    isActive
                      ? "bg-white dark:bg-slate-900 border-teal-500 text-teal-500 scale-110"
                      : isCompleted
                        ? "bg-teal-500 border-teal-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" /> : <Icon className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
                <div className="absolute -bottom-10 md:-bottom-12 flex flex-col items-center">
                  <p className={cn(
                    "text-[10px] md:text-sm font-bold transition-colors duration-300 whitespace-nowrap",
                    isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-500"
                  )}>
                    <span className="hidden md:inline">Level {step.id}: </span>{step.name}
                  </p>
                  <p className="hidden md:block text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-16 md:mt-24 w-full max-w-7xl mx-auto min-h-[50vh] pb-32">
        {currentStep === 1 && (
          <ConfigureProductSection
            onDealSelect={(id, hasProducts) => {
              setSelectedDealId(id);
              setDealHasProducts(hasProducts);
            }}
            onNext={nextStep}
          />
        )}
        {currentStep === 2 && (
          <PricingDetailsSection
            selectedDealId={selectedDealId}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 3 && (
          <PreviewQuoteSection
            selectedDealId={selectedDealId}
            onBack={prevStep}
          />
        )}
      </div>

      {/* Navigation Buttons (Floating or Bottom) */}
      <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 md:px-6 py-2 md:py-3 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xl z-[100] w-[90%] max-w-fit">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="rounded-full gap-1 md:gap-2 h-9 md:h-11 px-3 md:px-4 text-sm md:text-base"
        >
          <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
          Back
        </Button>
        <div className="w-px h-5 md:h-6 bg-slate-200 dark:bg-slate-800" />
        <Button
          onClick={nextStep}
          disabled={currentStep === 3 || (currentStep === 1 && (!selectedDealId || !dealHasProducts))}
          className="rounded-full bg-teal-600 hover:bg-teal-500 text-white px-5 md:px-8 gap-1 md:gap-2 h-9 md:h-11 text-sm md:text-base grow md:grow-0"
        >
          <span className="whitespace-nowrap">
            {currentStep === 3 ? "Complete" : "Next Level"}
          </span>
          <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
        </Button>
      </div>

      {/* Info Warning */}
      {currentStep === 1 && (!selectedDealId || !dealHasProducts) && (
        <div className="mt-12 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-amber-700 dark:text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {!selectedDealId 
              ? "Please select a deal to proceed to the next level." 
              : "This deal has no products. Please add a product to proceed."}
          </div>
        </div>
      )}
    </div>
  );
}
