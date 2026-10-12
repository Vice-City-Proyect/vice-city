export interface AppConfig {
  baseUrl: string;
  timeoutMs: number;
  autoFormatJson: boolean;
  activePresetId: string;
  loopbackWarningAcknowledged: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  baseUrl: 'http://localhost:3000',
  timeoutMs: 15000,
  autoFormatJson: true,
  activePresetId: 'combined',
  loopbackWarningAcknowledged: true,
};

