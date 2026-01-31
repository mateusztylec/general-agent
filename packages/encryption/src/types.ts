export type CredentialData = {
  openai_api_key: {
    apiKey: string;
    organization?: string;
  };
  anthropic_api_key: {
    apiKey: string;
  };
  s3_credentials: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  r2_credentials: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  aws_credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
  };
  custom: Record<string, unknown>;
};
