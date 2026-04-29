"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="w-full min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
            CPQ Guide
          </h1>
          <p className="text-slate-500 mt-2">
            A step-by-step sequence to handle your Configure, Price, and Quote process efficiently.
          </p>
        </div>
        <Button
          onClick={() => router.push('/inventory')}
          variant="outline"
          className="bg-teal-600 hover:bg-teal-500 text-white hover:text-white font-bold rounded-2xl px-6 h-14 shadow-xl shadow-teal-600/20 gap-3"
        >
          <Package className="w-4 h-4" />
          <span>View Inventory</span>
        </Button>
      </div>

      {/* Stepper */}
      <div className="mb-12">
        <div className="relative flex justify-between max-w-4xl mx-auto">
          {/* Background Line */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />

          {/* Active Line */}
          <motion.div
            className="absolute top-1/2 left-0 h-0.5 bg-teal-500 -translate-y-1/2 z-0 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: (currentStep - 1) / 2 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%' }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <motion.button
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 shadow-lg",
                    isActive
                      ? "bg-white dark:bg-slate-900 border-teal-500 text-teal-500 scale-110"
                      : isCompleted
                        ? "bg-teal-500 border-teal-500 text-white"
                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400"
                  )}
                  whileHover={{ scale: step.id <= currentStep ? 1.1 : 1 }}
                >
                  {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </motion.button>
                <div className="absolute -bottom-10 whitespace-nowrap text-center">
                  <p className={cn(
                    "text-sm font-bold transition-colors duration-300",
                    isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-500"
                  )}>
                    Level {step.id}: {step.name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mt-20 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="min-h-[60vh] pb-32"
          >
            {currentStep === 1 && (
              <ConfigureProductSection
                onDealSelect={(id) => setSelectedDealId(id)}
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons (Floating or Bottom) */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-slate-200 dark:border-slate-800 shadow-2xl z-[100]">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="rounded-full gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
        <Button
          onClick={nextStep}
          disabled={currentStep === 3 || (currentStep === 1 && !selectedDealId)}
          className="rounded-full bg-teal-600 hover:bg-teal-500 text-white px-8 gap-2"
        >
          {currentStep === 3 ? "Complete" : "Next Level"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Info Warning */}
      {currentStep === 1 && !selectedDealId && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 flex justify-center"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-amber-700 dark:text-amber-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            Please select a deal to proceed to the next level.
          </div>
        </motion.div>
      )}
    </div>
  );
}
