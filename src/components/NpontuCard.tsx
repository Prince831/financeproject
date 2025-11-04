import React from 'react';

interface NpontuCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  variant?: 'default' | 'elevated' | 'bordered';
}

interface NpontuCardHeaderProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  title?: string;
}

interface NpontuCardContentProps {
  children: React.ReactNode;
  className?: string;
}

const NpontuCard: React.FC<NpontuCardProps> = ({
  children,
  className = '',
  hover = true,
  variant = 'default'
}) => {
  const baseClasses = 'bg-white rounded-2xl border border-npontu-200 overflow-hidden transition-all duration-300';

  const variantClasses = {
    default: 'shadow-floating',
    elevated: 'shadow-card',
    bordered: 'border-2'
  };

  const hoverClasses = hover ? 'transform hover:scale-[1.02]' : '';

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
};

const NpontuCardHeader: React.FC<NpontuCardHeaderProps> = ({
  children,
  className = '',
  icon,
  title
}) => {
  return (
    <div className={`bg-gradient-to-r from-npontu-500 to-npontu-600 p-6 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
      <div className="relative flex items-center space-x-3">
        {icon && (
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            {icon}
          </div>
        )}
        {title && (
          <h3 className="text-xl font-semibold text-white font-display">{title}</h3>
        )}
        {children}
      </div>
    </div>
  );
};

const NpontuCardContent: React.FC<NpontuCardContentProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`p-8 ${className}`}>
      {children}
    </div>
  );
};

export { NpontuCardHeader as NpontuCardHeader, NpontuCardContent as NpontuCardContent };
export default NpontuCard;