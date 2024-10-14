import { readConfig } from "./config";
import { Filter, ForwardWsFilter, ReverseWsFilter } from "./filters";
import { getLogger } from "./utils";

const config = readConfig();

const logger = getLogger("main", config);

const filters: Filter[] = [];

for (const filterConfig of config.filters) {
  if (filterConfig.type === "forward") {
    logger.debug(`Creating forward filter: ${filterConfig.name}`);
    filters.push(new ForwardWsFilter(filterConfig, config));
  } else if (filterConfig.type === "reverse") {
    logger.debug(`Creating reverse filter: ${filterConfig.name}`);
    filters.push(new ReverseWsFilter(filterConfig, config));
  }
}
