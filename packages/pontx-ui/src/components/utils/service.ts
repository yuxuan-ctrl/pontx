import { PontSpec } from "pontx-spec";

let localPontSpecs = {};

// import testSpec from "./.mocks/spec.json";
// localPontSpecs = {
//   localSpecs: [testSpec as any],
// };

// import remoteSpec from "./.mocks/remoteSpec.jpon";
// import { PontSpecDiff } from "pontx-spec-diff";
// import { PontUIService as LocalPontUIService } from "./service.local";

// let localSpec = testSpec as any;
// let localSpec = null;

/** 不同使用场景，各自注册服务来源 */
export const PontUIService = {
  /** 获取本地元数据列表 */
  requestPontSpecs: async () => {
    return {
      localSpecs: [] as any[] as PontSpec[],
      remoteSpecs: [] as any[] as PontSpec[],
      currentOriginName: "",
      ...localPontSpecs,
    };
  },

  requestDefinitions: async (specName: string) => {
    return {} as any;
  },

  /** 获取 本地/远程 的diff信息 */
  requestDiffs: async () => {
    return [] as any;
  },

  /** 重新生成SDK */
  requestGenerateSdk: async (): Promise<void> => {},

  /** 重新拉取远程数据源 */
  syncRemoteSpec: async (specNames = ""): Promise<void> => {},

  updateLocalSpec: async (spec: PontSpec): Promise<void> => {},

  /** 更新本地数据源 */
  updateSpecBySpecNames: async (specNames = ""): Promise<void> => {},

  /** 更新本地模块  */
  updateMod: async (modName: string, specName = ""): Promise<void> => {},

  /** 更新本地 API */
  updateAPI: async (modName: string, apiName: string, specName = ""): Promise<void> => {},

  /** 更新类 */
  updateBaseClass: async (className: string, specName = ""): Promise<void> => {},

  openMeta: async (meta: {
    name: string;
    specName: string;
    modName?: string;
    type: string;
    spec: any;
  }): Promise<void> => {},
};
