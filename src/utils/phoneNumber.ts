export const formatSouthAfricanPhoneNumber = (input: string): string => {
  let cleaned = input.replace(/\s+/g, '');

  if (cleaned.startsWith('+27')) {
    return cleaned;
  }

  if (cleaned.startsWith('0027')) {
    return '+' + cleaned.substring(2);
  }

  if (cleaned.startsWith('27')) {
    return '+' + cleaned;
  }

  if (cleaned.startsWith('0')) {
    return '+27' + cleaned.substring(1);
  }

  if (/^\d/.test(cleaned)) {
    return '+27' + cleaned;
  }

  return cleaned;
};

export const validateSouthAfricanPhoneNumber = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/\s+/g, '');

  const pattern = /^\+27\d{9}$/;

  return pattern.test(cleaned);
};

export const formatPhoneNumberDisplay = (phoneNumber: string): string => {
  const cleaned = phoneNumber.replace(/\s+/g, '');

  if (cleaned.startsWith('+27') && cleaned.length >= 4) {
    const countryCode = '+27';
    const rest = cleaned.substring(3);

    if (rest.length >= 2) {
      const part1 = rest.substring(0, 2);
      const part2 = rest.substring(2, 5);
      const part3 = rest.substring(5);

      if (part3) {
        return `${countryCode} ${part1} ${part2} ${part3}`;
      } else if (part2) {
        return `${countryCode} ${part1} ${part2}`;
      } else {
        return `${countryCode} ${part1}`;
      }
    }
  }

  return phoneNumber;
};
