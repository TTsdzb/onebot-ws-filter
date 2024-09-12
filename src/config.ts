import * as fs from "fs";
import * as yaml from "js-yaml";
import * as z from "zod";

export const configSchema = z.object({
  logLevel: z.number().int().min(0).max(6).default(3),
  logTemplateStr: z.string().default("[{{dateIsoStr}}][{{logLevelName}}] "),
  listenPort: z.number().int().min(1).max(65535),
  serverUrl: z.string().url(),
  filteredGroup: z.number().int().array(),
});

export type Config = z.infer<typeof configSchema>;

export const readConfig = (): Config => {
  const fileContents = fs.readFileSync("./config.yml", { encoding: "utf-8" });
  const data = yaml.load(fileContents);
  return configSchema.parse(data);
};
