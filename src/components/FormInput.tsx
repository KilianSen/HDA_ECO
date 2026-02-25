import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FormInput({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      <Input 
        className="h-9 text-xs border-slate-200 focus-visible:ring-blue-500/20 focus-visible:border-blue-500"
        {...props} 
      />
    </div>
  );
}
