import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InfoTooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function InfoTooltip({ content, children }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center cursor-help">
            {children || <HelpCircle size={14} className="text-slate-400 hover:text-slate-600 transition-colors ml-1.5" />}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[200px] text-[11px] font-medium leading-relaxed bg-slate-900 text-white border-slate-800 p-2.5 shadow-xl">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
