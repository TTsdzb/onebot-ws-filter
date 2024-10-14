import * as fs from "fs";
import * as yaml from "js-yaml";
import * as z from "zod";

export const baseFilterConfigSchema = z.object({
  name: z.string(),
  filteredGroup: z.number().int().array(),
});

export const forwardWsFilterConfigSchema = z
  .object({
    type: z.literal("forward"),
    forwardListenPort: z.number().int().min(1).max(65535),
    forwardServerUrl: z.string().url(),
  })
  .merge(baseFilterConfigSchema);

export const reverseWsFilterConfigSchema = z
  .object({
    type: z.literal("reverse"),
    reverseListenPort: z.number().int().min(1).max(65535),
    reverseListenPath: z.string(),
    reverseServerUrl: z.string().url(),
  })
  .merge(baseFilterConfigSchema);

export const loggingConfigSchema = z.object({
  logLevel: z.number().int().min(0).max(6).default(3),
  logTemplateStr: z
    .string()
    .default("[{{dateIsoStr}}][{{logLevelName}}][{{name}}] "),
});

export const configSchema = z
  .object({
    filters: z
      .union([forwardWsFilterConfigSchema, reverseWsFilterConfigSchema])
      .array(),
  })
  .merge(loggingConfigSchema);

export type BaseFilterConfig = z.infer<typeof baseFilterConfigSchema>;
export type ForwardWsFilterConfig = z.infer<typeof forwardWsFilterConfigSchema>;
export type ReverseWsFilterConfig = z.infer<typeof reverseWsFilterConfigSchema>;
export type LoggingConfig = z.infer<typeof loggingConfigSchema>;
export type Config = z.infer<typeof configSchema>;

export const readConfig = (): Config => {
  const fileContents = fs.readFileSync("./config.yml", { encoding: "utf-8" });
  const data = yaml.load(fileContents);
  return configSchema.parse(data);
};
