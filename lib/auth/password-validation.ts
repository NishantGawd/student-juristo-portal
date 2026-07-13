export interface PasswordValidationResult {
  isValid: boolean;
  message: string;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

export function validatePasswordStrength(
  password: string
): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  let isValid = false;

  if (passedChecks === 5) {
    strength = 'strong';
    isValid = true;
  } else if (passedChecks === 4) {
    strength = 'good';
    isValid = true;
  } else if (passedChecks >= 3) {
    strength = 'fair';
    isValid = true;
  } else {
    strength = 'weak';
  }

  const message = isValid
    ? 'Password meets requirements'
    : 'Password must contain at least 8 characters, uppercase, lowercase, number, and special character';

  return {
    isValid: checks.minLength && checks.hasUppercase && checks.hasLowercase && checks.hasNumber && checks.hasSpecialChar,
    message:
      checks.minLength &&
      checks.hasUppercase &&
      checks.hasLowercase &&
      checks.hasNumber &&
      checks.hasSpecialChar
        ? 'Password is strong'
        : 'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
    strength,
    checks,
  };
}

export function getPasswordStrengthPercentage(password: string): number {
  const validation = validatePasswordStrength(password);
  const passedChecks = Object.values(validation.checks).filter(
    Boolean
  ).length;
  return (passedChecks / 5) * 100;
}