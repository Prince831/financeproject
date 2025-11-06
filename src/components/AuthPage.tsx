import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import NpontuLogo from './NpontuLogo';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Shield, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: ''
  });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  const { login, register, isLoading, error } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleInputBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
    validateField(field);
  };

  const validateField = (field: string) => {
    const errors: {[key: string]: string} = {};

    switch (field) {
      case 'name':
        if (!isLogin && !formData.name.trim()) {
          errors.name = 'Full name is required';
        } else if (!isLogin && formData.name.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters';
        }
        break;
      case 'email':
        if (!formData.email) {
          errors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          errors.email = 'Please enter a valid email address';
        }
        break;
      case 'password':
        if (!formData.password) {
          errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
          errors.password = 'Password must contain uppercase, lowercase, and number';
        }
        break;
      case 'password_confirmation':
        if (!isLogin && !formData.password_confirmation) {
          errors.password_confirmation = 'Please confirm your password';
        } else if (!isLogin && formData.password_confirmation !== formData.password) {
          errors.password_confirmation = 'Passwords do not match';
        }
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      ...errors
    }));

    return Object.keys(errors).length === 0;
  };

  const validateForm = () => {
    const fields = isLogin ? ['email', 'password'] : ['name', 'email', 'password', 'password_confirmation'];
    let isValid = true;

    fields.forEach(field => {
      if (!validateField(field)) {
        isValid = false;
      }
    });

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

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
    setValidationErrors({});
    setTouched({});
  };


  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-sm"
        style={{
          backgroundImage: `url('/images/npontu-logo.png')`,
        }}
      />
      <div className="absolute inset-0 bg-white bg-opacity-90" />

      <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 min-h-screen flex items-center justify-center py-8">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-xl mb-8 border border-gray-100">
              <img
                src="/images/npontu-logo.png"
                alt="Npontu Technologies Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
              {isLogin ? 'Welcome Back' : 'Join Npontu'}
            </h1>
            <p className="text-gray-600 text-base sm:text-lg leading-relaxed">
              {isLogin
                ? 'Sign in to access your reconciliation dashboard'
                : 'Create your account and start reconciling today'
              }
            </p>
          </div>

          {/* Auth Form */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              {/* Name Field (Register only) */}
              {!isLogin && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-800 flex items-center">
                    <User className="w-5 h-5 mr-3 text-blue-600" />
                    Full Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={() => handleInputBlur('name')}
                    placeholder="Enter your full name"
                    required={!isLogin}
                    className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-gray-900 placeholder-gray-400 ${
                      validationErrors.name && touched.name
                        ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
                        : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.name && touched.name && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <p className="text-sm font-medium">{validationErrors.name}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-800 flex items-center">
                  <Mail className="w-5 h-5 mr-3 text-blue-600" />
                  Email Address
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleInputBlur('email')}
                  placeholder="Enter your email address"
                  required
                  autoComplete="email"
                  className={`w-full px-5 py-4 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-gray-900 placeholder-gray-400 ${
                    validationErrors.email && touched.email
                      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
                      : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                  }`}
                />
                {validationErrors.email && touched.email && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm font-medium">{validationErrors.email}</p>
                  </div>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-800 flex items-center">
                  <Lock className="w-5 h-5 mr-3 text-blue-600" />
                  Password
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={() => handleInputBlur('password')}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className={`w-full px-5 py-4 pr-14 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-gray-900 placeholder-gray-400 ${
                      validationErrors.password && touched.password
                        ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
                        : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-50"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>


                {validationErrors.password && touched.password && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm font-medium">{validationErrors.password}</p>
                  </div>
                )}
              </div>

              {/* Confirm Password Field (Register only) */}
              {!isLogin && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-800 flex items-center">
                    <Shield className="w-5 h-5 mr-3 text-blue-600" />
                    Confirm Password
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="password_confirmation"
                      value={formData.password_confirmation}
                      onChange={handleInputChange}
                      onBlur={() => handleInputBlur('password_confirmation')}
                      placeholder="Confirm your password"
                      required={!isLogin}
                      className={`w-full px-5 py-4 pr-14 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-300 text-gray-900 placeholder-gray-400 ${
                        validationErrors.password_confirmation && touched.password_confirmation
                          ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
                          : 'border-gray-200 hover:border-gray-300 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-50"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {validationErrors.password_confirmation && touched.password_confirmation && (
                    <div className="flex items-center space-x-2 text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <p className="text-sm font-medium">{validationErrors.password_confirmation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-semibold text-sm mb-1">Authentication Error</p>
                      <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {!error && formData.email && formData.password && (isLogin || (formData.name && formData.password_confirmation)) && (
                <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-800 font-semibold text-sm mb-1">Ready to Proceed</p>
                      <p className="text-green-700 text-sm leading-relaxed">
                        {isLogin ? 'All fields completed. Click to sign in!' : 'All fields completed. Click to create your account!'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !formData.email || !formData.password || (!isLogin && (!formData.name || !formData.password_confirmation))}
                className="w-full bg-gradient-to-r from-lime-600 via-lime-700 to-lime-800 text-white py-4 px-8 rounded-2xl font-bold text-lg hover:from-lime-700 hover:via-lime-800 hover:to-lime-900 focus:outline-none focus:ring-4 focus:ring-lime-300 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:hover:transform-none group"
              >
                {isLoading ? (
                  <span className="font-semibold">{isLogin ? 'Signing In...' : 'Creating Account...'}</span>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
                    <span className="font-semibold">{isLogin ? 'Sign In Securely' : 'Create Account'}</span>
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" />
                  </>
                )}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="px-10 pb-8">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-gray-600 text-sm">
                    {isLogin ? "New to Npontu?" : 'Already have an account?'}
                  </span>
                  <button
                    onClick={toggleMode}
                    className="text-blue-600 hover:text-blue-700 font-semibold transition-colors hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-2 py-1 text-sm bg-blue-50 hover:bg-blue-100"
                  >
                    {isLogin ? "Create an account" : 'Sign in'}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-10">
            <p className="text-gray-600 text-base mb-3 font-medium">
              Enterprise-grade security for your reconciliation needs
            </p>
            <div className="flex items-center justify-center space-x-3">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700 font-semibold">Bank-level encryption & security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;