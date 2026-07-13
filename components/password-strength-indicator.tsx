'use client';

import {
  validatePasswordStrength,
  getPasswordStrengthPercentage,
} from '@/lib/auth/password-validation';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({
  password,
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const validation = validatePasswordStrength(password);
  const percentage = getPasswordStrengthPercentage(password);

  const strengthColors = {
    weak: 'bg-red-500',
    fair: 'bg-yellow-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          Password Strength
        </span>
        <span
          className={`text-sm font-semibold ${
            validation.strength === 'weak'
              ? 'text-red-600'
              : validation.strength === 'fair'
                ? 'text-yellow-600'
                : validation.strength === 'good'
                  ? 'text-blue-600'
                  : 'text-green-600'
          }`}
        >
          {strengthLabels[validation.strength]}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            strengthColors[validation.strength]
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              validation.checks.minLength ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          At least 8 characters
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              validation.checks.hasUppercase ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          One uppercase letter (A-Z)
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              validation.checks.hasLowercase ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          One lowercase letter (a-z)
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              validation.checks.hasNumber ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          One number (0-9)
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              validation.checks.hasSpecialChar ? 'bg-green-500' : 'bg-gray-300'
            }`}
          />
          One special character (!@#$%^&*)
        </div>
      </div>
    </div>
  );
}