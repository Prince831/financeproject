import React from 'react';

interface NpontuLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

const NpontuLogo: React.FC<NpontuLogoProps> = ({
  size = 'md',
  variant = 'full',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };

  const icon = (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-npontu-500 to-npontu-700 rounded-lg flex items-center justify-center shadow-lg ${className}`}>
      <div className="w-2/3 h-2/3 bg-white rounded-md"></div>
    </div>
  );

  const text = (
    <span className={`${textSizeClasses[size]} font-display font-bold bg-gradient-to-r from-npontu-600 to-npontu-800 bg-clip-text text-transparent`}>
      Npontu Technologies
    </span>
  );

  const subtitle = (
    <p className="text-npontu-100 text-sm mt-1">Financial Technology Solutions</p>
  );

  if (variant === 'icon') {
    return icon;
  }

  if (variant === 'text') {
    return (
      <div className={className}>
        {text}
        {subtitle}
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {icon}
      <div>
        {text}
        {subtitle}
      </div>
    </div>
  );
};

export default NpontuLogo;