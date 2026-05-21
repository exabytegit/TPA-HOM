type MetricName =
  | "toyota_plan_link_generation_started_total"
  | "toyota_plan_link_generation_success_total"
  | "toyota_plan_link_generation_failed_total"
  | "toyota_plan_oauth_refresh_started_total"
  | "toyota_plan_oauth_refresh_success_total"
  | "toyota_plan_oauth_refresh_failed_total";

const counters = new Map<MetricName, number>([
  ["toyota_plan_link_generation_started_total", 0],
  ["toyota_plan_link_generation_success_total", 0],
  ["toyota_plan_link_generation_failed_total", 0],
  ["toyota_plan_oauth_refresh_started_total", 0],
  ["toyota_plan_oauth_refresh_success_total", 0],
  ["toyota_plan_oauth_refresh_failed_total", 0]
]);

export const incrementMetric = (name: MetricName): void => {
  counters.set(name, (counters.get(name) ?? 0) + 1);
};

export const renderMetrics = (): string =>
  Array.from(counters.entries())
    .map(([name, value]) => `# TYPE ${name} counter\n${name} ${value}`)
    .join("\n");

export const resetMetrics = (): void => {
  for (const key of counters.keys()) {
    counters.set(key, 0);
  }
};
