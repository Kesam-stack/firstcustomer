function intEnv(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) return fallback;
  return value;
}

export const config = {
  launchFeeCents: intEnv("FC_LAUNCH_FEE_CENTS", 900, 0, 100_000),
  platformFeeBps: intEnv("FC_PLATFORM_FEE_BPS", 1000, 0, 5000),
  minimumRewardCents: intEnv("FC_MIN_REWARD_CENTS", 500, 100, 10_000_000),
  networkNotificationLimit: intEnv("FC_NETWORK_NOTIFICATION_LIMIT", 25, 0, 250),
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  emailFrom: process.env.EMAIL_FROM || "FirstCustomer <alerts@firstcustomer.app>",
};

export const launchFeeDollars = config.launchFeeCents / 100;
export const platformFeePercent = config.platformFeeBps / 100;
