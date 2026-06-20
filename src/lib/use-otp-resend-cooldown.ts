"use client";

import { useCallback, useEffect, useState } from "react";

export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function useOtpResendCooldown(cooldownSeconds = OTP_RESEND_COOLDOWN_SECONDS) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const startCooldown = useCallback(() => {
    setSecondsLeft(cooldownSeconds);
  }, [cooldownSeconds]);

  const resetCooldown = useCallback(() => {
    setSecondsLeft(0);
  }, []);

  return {
    secondsLeft,
    canResend: secondsLeft === 0,
    startCooldown,
    resetCooldown,
  };
}

export function formatOtpResendLabel(baseLabel: string, secondsLeft: number, isResend: boolean): string {
  if (secondsLeft > 0 && isResend) {
    return `Resend in ${secondsLeft}s`;
  }
  return baseLabel;
}
