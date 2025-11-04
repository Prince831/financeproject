import React from 'react';
import { Loader2 } from 'lucide-react';

interface NpontuButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  icon?: React.ReactNode;
}

const NpontuButton: React.FC<NpontuButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  icon
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold font-display transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-npontu-500 to-npontu-600 text-white hover:from-npontu-600 hover:to-npontu-700 focus:ring-npontu-500 shadow-card',
    secondary: 'bg-white border border-npontu-300 text-npontu-700 hover:bg-npontu-50 focus:ring-npontu-500 shadow-card',
    accent: 'bg-gradient-to-r from-accent to-purple-700 text-white hover:from-accent hover:to-purple-800 focus:ring-accent shadow-floating',
    outline: 'border border-npontu-300 text-npontu-700 hover:bg-npontu-50 focus:ring-npontu-500'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-2xl'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export default NpontuButton;