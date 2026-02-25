import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Warehouse, 
  Settings, 
  FileUp,
  Fuel
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

const steps = [
  {
    title: "Welcome to HDA ECO",
    content: "A high-precision interface for fuel analytics and fleet efficiency management.",
    icon: <Fuel className="text-primary" size={32} />
  },
  {
    title: "Analytics",
    content: "Real-time insights and automated forecasting based on your historical data.",
    icon: <TrendingUp className="text-primary" size={32} />
  },
  {
    title: "Inventory",
    content: "Live tank level monitoring calculated from supply arrival and asset consumption.",
    icon: <Warehouse className="text-primary" size={32} />
  },
  {
    title: "Integration",
    content: "Seamlessly import .TXT files from your HDA ECO terminal for instant processing.",
    icon: <FileUp className="text-primary" size={32} />
  },
  {
    title: "Master Data",
    content: "Define aliases for assets and operators to ensure meaningful reporting.",
    icon: <Settings className="text-primary" size={32} />
  }
];

export function TutorialOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hda_tutorial_seen');
    if (!hasSeenTutorial) {
      setIsOpen(true);
    }
  }, []);

  const closeTutorial = () => {
    setIsOpen(false);
    localStorage.setItem('hda_tutorial_seen', 'true');
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      closeTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-700">
      <Card className="w-full max-w-sm border-none shadow-2xl bg-card rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-500">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-muted/50 rounded-2xl flex items-center justify-center shadow-inner">
              {steps[currentStep].icon}
            </div>
          </div>
          <div className="space-y-2 px-4">
            <h3 className="text-2xl font-bold tracking-tight">{steps[currentStep].title}</h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              {steps[currentStep].content}
            </p>
          </div>
          <div className="flex justify-center gap-1.5 pt-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-primary' : 'w-1 bg-muted'}`} 
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="p-8 pt-0 flex gap-3">
          <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0} className="flex-1 h-12 font-bold rounded-xl">
            Back
          </Button>
          <Button onClick={nextStep} className="flex-[2] h-12 font-bold rounded-xl shadow-lg shadow-primary/20">
            {currentStep === steps.length - 1 ? 'Start Analytics' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
