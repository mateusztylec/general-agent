export type CredentialData = {
  openai_api_key: {
    apiKey: string;
    organization?: string;
  };
  anthropic_api_key: {
    apiKey: string;
  };
  s3_credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket?: string;
  };
  r2_credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    accountId: string;
    bucket?: string;
  };
  aws_credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
  };
  custom: Record<string, unknown>;
};
