import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import NpontuLogo from './NpontuLogo';
import NpontuButton from './NpontuButton';
import NpontuInput from './NpontuInput';
import NpontuCard from './NpontuCard';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Shield } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  });

  const { login, register, isLoading, error } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password, formData.password_confirmation);
      }
    } catch (err) {
      // Error is handled by the auth hook
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: '',
      email: '',
      password: '',
      password_confirmation: ''
    });
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-gradient-to-br from-npontu-50 via-white to-professional-blue-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230ea5e9' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-npontu-200 rounded-full opacity-20 animate-float"></div>
      <div className="absolute bottom-20 right-20 w-24 h-24 bg-professional-blue-200 rounded-full opacity-20 animate-float-slow"></div>
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-accent/20 rounded-full opacity-30 animate-drift"></div>

      <div className="relative w-full max-w-7xl mx-auto p-6 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-white rounded-3xl shadow-floating mb-6">
              <NpontuLogo size="xl" />
            </div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-npontu-600 to-npontu-800 bg-clip-text text-transparent mb-2">
              {isLogin ? 'Welcome Back' : 'Join Npontu'}
            </h1>
            <p className="text-warm-grey-600 font-medium">
              {isLogin ? 'Sign in to access your reconciliation portal' : 'Create your account to get started'}
            </p>
          </div>

          {/* Auth Form */}
          <NpontuCard className="shadow-2xl border-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field (Register only) */}
              {!isLogin && (
                <NpontuInput
                  label="Full Name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  icon={<User className="w-4 h-4" />}
                  required
                />
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-npontu-500" />
                  Email Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                    autoComplete="email"
                    className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:border-transparent transition-all duration-300 bg-white shadow-inner hover:border-npontu-300"
                  />
                  {formData.email && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center">
                  <Lock className="w-4 h-4 mr-2 text-npontu-500" />
                  Password
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:border-transparent transition-all duration-300 bg-white shadow-inner hover:border-npontu-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-npontu-500 transition-colors p-1 rounded-md hover:bg-gray-50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="flex items-center space-x-1 mt-1">
                    <div className={`w-2 h-2 rounded-full ${formData.password.length >= 8 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-gray-500">At least 8 characters</span>
                  </div>
                )}
              </div>

              {/* Confirm Password Field (Register only) */}
              {!isLogin && (
                <NpontuInput
                  label="Confirm Password"
                  type="password"
                  name="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  icon={<Shield className="w-4 h-4" />}
                  required
                />
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <p className="text-red-800 font-medium text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {!error && formData.email && formData.password && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <p className="text-green-800 font-medium text-sm">Ready to sign in!</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !formData.email || !formData.password}
                className="w-full bg-gradient-to-r from-npontu-500 to-npontu-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-npontu-600 hover:to-npontu-700 focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
              <button
                onClick={toggleMode}
                className="text-npontu-600 hover:text-npontu-700 font-medium transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:ring-offset-2 rounded-md px-2 py-1"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>

            {/* Quick Login Hint */}
            <div className="mt-4 p-3 bg-npontu-50 border border-npontu-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-npontu-500 rounded-full animate-pulse"></div>
                <p className="text-xs text-npontu-700 font-medium">
                  Demo: admin@npontu.com / password123
                </p>
              </div>
            </div>
          </NpontuCard>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-warm-grey-500">
              Secure access to Npontu Technologies Reconciliation Portal
            </p>
            <div className="flex items-center justify-center space-x-2 mt-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">256-bit SSL Encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;