export function googleProviderOptions(clientId: string, clientSecret: string, authUrl: string) {
  return {
    socialProviders: {
      google: {
        clientId,
        clientSecret,
        redirectURI: `${authUrl}/api/auth/callback/google`,
        scope: ['openid', 'email', 'profile'],
        disableDefaultScope: true,
        requireEmailVerification: true,
        disableIdTokenSignIn: true,
        includeGrantedScopes: false,
      },
    },
  };
}
