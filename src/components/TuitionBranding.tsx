import { Building2 } from 'lucide-react';

interface TuitionBrandingProps {
  name: string;
  logoUrl?: string | null;
  showPoweredBy?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TuitionBranding({ 
  name, 
  logoUrl, 
  showPoweredBy = true,
  size = 'md' 
}: TuitionBrandingProps) {
  const sizeClasses = {
    sm: { container: 'w-8 h-8', icon: 'h-4 w-4', title: 'text-base', sub: 'text-[10px]' },
    md: { container: 'w-10 h-10', icon: 'h-5 w-5', title: 'text-lg', sub: 'text-xs' },
    lg: { container: 'w-12 h-12', icon: 'h-6 w-6', title: 'text-xl', sub: 'text-sm' },
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center gap-3 min-w-0">
      {logoUrl ? (
        <img 
          src={logoUrl} 
          alt={`${name} logo`}
          className={`${classes.container} rounded-lg object-contain bg-white shadow-md flex-shrink-0`}
        />
      ) : (
        <div className={`${classes.container} bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0`}>
          <Building2 className={`${classes.icon} text-white`} />
        </div>
      )}
      <div className="min-w-0">
        <h2 className={`${classes.title} font-bold text-gray-900 truncate`}>
          {name || 'Dashboard'}
        </h2>
        {showPoweredBy && (
          <p className={`${classes.sub} text-gray-500`}>
            Powered by <span className="font-semibold text-indigo-600">Upskillr Tutly</span>
          </p>
        )}
      </div>
    </div>
  );
}
