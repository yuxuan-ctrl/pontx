import * as PontSpec from "pontx-spec";
export {
  InnerOriginConfig,
  PluginConfig,
  PontxFetchPlugin,
  PontxGeneratorPlugin,
  PontInnerManagerConfig,
  PontxConfigPlugin,
  PontxMocksPlugin,
  PontxParserPlugin,
  PontxTransformPlugin,
  Snippet,
  PontxPlugin,
  PontxPlugins,
  PontPublicManagerConfig,
  PontxReportPlugin,
  PontxTranslatePlugin,
} from "./config";
export { PontManager, getSpecByName } from "./manager";
export { PontDictManager } from "./LocalDictManager";
export * from "./logger";
export { requireTsFile, findRealPath, requireUncached } from "./utils";
export { PontSpec };
export { lookForFiles } from "./scan";
