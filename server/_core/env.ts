type EnvConfig = {
  NODE_ENV?: string;
  VITE_APP_ID?: string;
  JWT_SECRET?: string;
  DATABASE_URL?: string;
  OAUTH_SERVER_URL?: string;
  OWNER_OPEN_ID?: string;
  BUILT_IN_FORGE_API_URL?: string;
  BUILT_IN_FORGE_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_API_URL?: string;
  AMAP_API_KEY?: string;
};

let envConfig: EnvConfig = {};

export function initEnv(config: EnvConfig) {
  envConfig = config;
}

function getEnv(key: keyof EnvConfig, defaultValue: string = ''): string {
  if (envConfig[key]) {
    return envConfig[key] as string;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
}

export const ENV = {
  get appId() { return getEnv('VITE_APP_ID', 'dev-app'); },
  get cookieSecret() { return getEnv('JWT_SECRET', 'dev-secret-key-for-jwt-signing-min-32-chars'); },
  get databaseUrl() { return getEnv('DATABASE_URL', ''); },
  get oAuthServerUrl() { return getEnv('OAUTH_SERVER_URL', ''); },
  get ownerOpenId() { return getEnv('OWNER_OPEN_ID', ''); },
  get isProduction() { return getEnv('NODE_ENV') === 'production'; },
  get forgeApiUrl() { return getEnv('BUILT_IN_FORGE_API_URL', ''); },
  get forgeApiKey() { return getEnv('BUILT_IN_FORGE_API_KEY', ''); },
  get deepseekApiKey() { return getEnv('DEEPSEEK_API_KEY', ''); },
  get deepseekApiUrl() { return getEnv('DEEPSEEK_API_URL', 'https://api.deepseek.com'); },
  get amapApiKey() { return getEnv('AMAP_API_KEY', ''); },
};
