type ReportSession = {
  variant: string;
  status: string;
  success: boolean | null;
  stepCount: number;
  friction: string | null;
};

export function buildAbReport(sessions: ReportSession[]) {
  const variants = ["A", "B"]
    .filter((variant) => sessions.some((session) => session.variant === variant))
    .map((variant) => {
      const completed = sessions.filter(
        (session) => session.variant === variant && session.status === "COMPLETED",
      );
      const successes = completed.filter((session) => session.success).length;
      const averageSteps = completed.length
        ? completed.reduce((sum, session) => sum + session.stepCount, 0) / completed.length
        : 0;
      return {
        variant,
        completed: completed.length,
        successes,
        rate: completed.length ? Math.round((successes / completed.length) * 100) : 0,
        averageSteps: Math.round(averageSteps * 10) / 10,
        frictions: completed.flatMap((session) => session.friction?.split("\n").filter(Boolean) ?? []),
      };
    });

  const ranked = [...variants].sort(
    (a, b) => b.rate - a.rate || a.averageSteps - b.averageSteps,
  );
  const winner =
    ranked.length === 2 && (ranked[0].rate !== ranked[1].rate || ranked[0].averageSteps !== ranked[1].averageSteps)
      ? ranked[0].variant
      : null;
  return { variants, winner };
}

type StaticReportSession = {
  variant: string;
  status: string;
  stepCount: number;
  friction: string | null;
};

export function buildStaticReport(sessions: StaticReportSession[]) {
  const variants = ["A", "B"]
    .filter((variant) => sessions.some((session) => session.variant === variant))
    .map((variant) => {
      const variantSessions = sessions.filter((session) => session.variant === variant);
      const completed = variantSessions.filter((session) => session.status === "COMPLETED");
      const frictions = Array.from(
        new Set(completed.flatMap((session) => session.friction?.split("\n").filter(Boolean) ?? [])),
      );
      const screens = completed.reduce((max, session) => Math.max(max, session.stepCount), 0);
      return {
        variant,
        reviews: variantSessions.length,
        screens,
        frictions,
      };
    });
  return { variants };
}
