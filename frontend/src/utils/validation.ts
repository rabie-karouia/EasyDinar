export const validateClientId = (value: string): string => {
  if (!value.trim()) {
    return 'Client identifier is required';
  }
  return '';
};

export const validatePassword = (value: string): string => {
  if (!value) {
    return 'Password is required';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return '';
};