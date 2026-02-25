import { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  TrendingUp, 
  Warehouse, 
  Settings, 
  FileUp,
  Fuel
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  {
    title: "Welcome to HDA ECO",
    content: "This application helps you track fuel consumption, vehicle efficiency, and station inventory. Let's take a quick 1-minute tour.",
    icon: <Fuel className="text-blue-500" size={32} />
  },
  {
    title: "Dashboard & Analytics",
    content: "View real-time operational insights, fuel forecasts, and efficiency metrics. Use the timeframe filters to drill down into specific dates.",
    icon: <TrendingUp className="text-green-500" size={32} />
  },
  {
    title: "Station Monitoring",
    content: "Track your virtual tank level. It calculates inventory by subtracting vehicle transactions from your recorded fuel deliveries.",
    icon: <Warehouse className="text-purple-500" size={32} />
  },
  {
    title: "Importing Data",
    content: "Import your HDA ECO .TXT files (DATA0001/DATAOUT) using the sidebar. The system automatically detects vehicle IDs and PINs.",
    icon: <FileUp className="text-orange-500" size={32} />
  },
  {
    title: "Management",
    content: "Assign human-readable names to Vehicle IDs and PINs in the Management tab to make your reports easier to read.",
    icon: <Settings className="text-slate-500" size={32} />
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-300">
        <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">System Tour</CardTitle>
          <button onClick={closeTutorial} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </CardHeader>
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="flex justify-center mb-2">
            <div className="p-4 bg-slate-50 rounded-2xl shadow-inner border border-slate-100">
              {steps[currentStep].icon}
            </div>
          </div>
          <h3 className="text-xl font-bold text-slate-900">{steps[currentStep].title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed font-medium">
            {steps[currentStep].content}
          </p>
          <div className="flex justify-center gap-1.5 pt-2">
            {steps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200'}`} 
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 flex justify-between py-4">
          <Button variant="ghost" onClick={prevStep} disabled={currentStep === 0} className="text-xs font-bold gap-1">
            <ChevronLeft size={14} /> Back
          </Button>
          <Button onClick={nextStep} className="bg-blue-600 hover:bg-blue-500 text-xs font-bold gap-1 shadow-lg shadow-blue-200">
            {currentStep === steps.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={14} />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
