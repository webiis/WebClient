import { VERIFICATION_STATUS, ENCRYPTED_STATUS, SIGNATURE_START } from '../app/constants';

/**
 * Some complicated logic after internal discussions.
 * This function returns whether we should display a lock with check / warning (indicating the signature status)
 * or we just display a lock.
 * The following logic is applied:
 *  1. If a message is not encrypted the unlocked lock is displayed.
 *  2. If a SENT message has been correctly verified, a lonesome lock is displayed, unaccompanied by its check
 *      (because we don't consciously do key pinning here)
 *  3. If a SENT message doesn't have a signature, but should have, we display a warning. A SENT message should have a signature if:
 *      - it is not an autoreply AND
 *      - it is not an import AND
 *      - it is send after the time when we started signing all messages
 *  4. If a message fails the signature check, we display a warning
 *  5. If a (non-sent) message has been correctly verified, we display a check.
 *  6. Else we just display the appropriate lock.
 *      - this happens when there is no signature or it hasn't been verified (meaning unverified SENT message fall in this case).
 *  This logic is caused by sent message's signatures always being verified without requiring the user to enable key pinning
 *  (key pinning for your own keys happens as a consequence of our authentication method).
 *  Thus we don't want to display this check for people that don't understand key pinning, but still keep the
 *  same security.
 *  @return {() => boolean} whether to display the signature status
 */
const displaySignatureStatus = (message) => {
    const isSentByMe = message.isSentByMe();
    const isEncrypted = Number.parseInt(message.IsEncrypted, 10);
    // Rule 1:
    if (isEncrypted === ENCRYPTED_STATUS.NONE) {
        return () => false;
    }
    // Rule 4 + 5 + 6 for non-SENT messages
    if (!isSentByMe) {
        return () =>
            message.Verified === VERIFICATION_STATUS.SIGNED_AND_INVALID ||
            message.Verified === VERIFICATION_STATUS.SIGNED_AND_VALID;
    }
    // SENT messages
    return () => {
        const isImport = message.ParsedHeaders && message.ParsedHeaders['X-Pm-Origin'] === 'import';
        // Rule 2:
        if (message.Verified === VERIFICATION_STATUS.SIGNED_AND_VALID) {
            return false;
        }
        // Rule 3:
        if (
            message.Verified === VERIFICATION_STATUS.NOT_SIGNED &&
            isEncrypted !== ENCRYPTED_STATUS.AUTOREPLY &&
            !isImport &&
            message.Time > SIGNATURE_START
        ) {
            // warning
            return true;
        }
        // Rule 4 + 6:
        return message.Verified === VERIFICATION_STATUS.SIGNED_AND_INVALID;
    };
};

export default displaySignatureStatus;