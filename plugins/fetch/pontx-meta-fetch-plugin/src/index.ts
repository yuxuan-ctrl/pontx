import fetch from "node-fetch";
import * as _ from "lodash";
import { InnerOriginConfig, PontxFetchPlugin, PontLogger, PontManager } from "pontx-manager";
import * as fs from "fs-extra";
import * as path from "path";
export default class PontMetaFetchPlugin extends PontxFetchPlugin {
  async apply(originConf: InnerOriginConfig, options: any) {
    let remoteStr = "";

    try {
      remoteStr = await fetch(originConf.url, {}).then((res) => res.text());
      return remoteStr;
    } catch (e) {
      this.logger.error({
        originName: originConf.name,
        message: `远程数据获取失败，请确认您配置的 pont origin url(${
          originConf.url || ""
        })，在您当前的网络环境中允许访问。${e.message}`,
        processType: "fetch",
      });
    }
  }
}
