export interface LinkedAuthAccount {
  providerId: string;
}

export function isPasswordlessGoogleAccount(accounts: LinkedAuthAccount[]): boolean {
  return accounts.some(account => account.providerId === 'google') &&
    !accounts.some(account => account.providerId === 'credential');
}

export function getAccountDeletionCapabilities(accounts: LinkedAuthAccount[]) {
  const canUseRecentGoogleSession = isPasswordlessGoogleAccount(accounts);
  return {
    requiresPassword: !canUseRecentGoogleSession,
    recentSessionAllowed: canUseRecentGoogleSession,
  };
}
