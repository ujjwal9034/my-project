import { validate } from 'deep-email-validator';

interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates an email address for:
 *  - Correct format (regex)
 *  - Valid domain with real MX records
 *  - Not a disposable / temporary email provider
 *
 * Has a 5-second timeout — if the DNS lookup times out we fail OPEN
 * (allow registration to proceed) so slow networks never block users.
 */
export const validateEmailDeliverable = async (
  email: string
): Promise<EmailValidationResult> => {
  const timeoutPromise = new Promise<EmailValidationResult>((resolve) =>
    setTimeout(() => resolve({ valid: true, reason: 'timeout' }), 5000)
  );

  const validationPromise = (async (): Promise<EmailValidationResult> => {
    try {
      const result = await validate({
        email,
        sender: email,
        validateRegex: true,
        validateMx: true,
        validateTypo: false,   // typo suggestions aren't needed here
        validateDisposable: true,
        validateSMTP: false,   // SMTP probing is slow & often blocked by firewalls
      });

      if (result.valid) {
        return { valid: true };
      }

      // Map deep-email-validator's reason codes to a human-readable reason
      const reason = result.reason ?? 'unknown';
      return { valid: false, reason };
    } catch {
      // Any unexpected error → fail open so registration isn't blocked
      return { valid: true, reason: 'error' };
    }
  })();

  return Promise.race([validationPromise, timeoutPromise]);
};
