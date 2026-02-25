import React from 'react';
import { cn } from '@/lib/utils';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormInput({ label, className, ...props }: FormInputProps) {
  return (
    <div className="space-y-2.5">
      <label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">
        {label}
      </label>
      <input
        className={cn(
          "flex h-12 w-full rounded-2xl border-none bg-muted/40 px-5 py-2 text-sm font-bold ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          className
        )}
        {...props}
      />
    </div>
  );
}
