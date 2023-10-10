import pinyin from "./pinyin";
import { PontxTranslatePlugin, PontDictManager, PontLogger, PontInnerManagerConfig, PontxPlugins } from "pontx-manager";

import * as path from "path";
import * as _ from "lodash";
const { youdao, baidu, google } = require("translation.js");
import * as assert from "assert";
const baiduTranslateService = require("baidu-translate-service");

export class TranslateOptions {
  cacheFilePath?: string;
  baidu?: {
    appId: string;
    secret: string;
  };
}

export default class PontxMetaTranslatePlugin extends PontxTranslatePlugin {
  private PontDictManager = null;
  private translateOptions = null;
  private dictName = "dict.json";
  private engines = [
    {
      name: "baidu-open",
      translate: (text) => {
        const { appId, secret } = this.translateOptions?.baidu || {};
        return baiduTranslateService({ appid: appId, key: secret, q: text, to: "en", from: "auto" })
          .then((data) => {
            try {
              if (data.error_msg) {
                throw new Error(data.error_msg);
              }
              return _.get(data, "trans_result.0.dst");
            } catch (error) {
              throw new Error(error.message);
            }
          })
          .catch((err) => {
            throw new Error(err.message);
          });
      },
      translateCollect: (text) => {
        const { appId, secret } = this.translateOptions?.baidu || {};
        return baiduTranslateService({ appid: appId, key: secret, q: text, to: "en", from: "auto" })
          .then((data) => {
            try {
              if (data.error_msg) {
                throw new Error(data.error_msg);
              }
              return _.get(data, "trans_result");
            } catch (error) {
              throw new Error(error.message);
            }
          })
          .catch((err) => {
            throw new Error(err.message);
          });
      },
    },
    // {
    //   name: "google",
    //   translate: (text) => google.translate(text).then((res) => res.result[0]),
    // },
    // {
    //   name: "youdao",
    //   translate: (text) => youdao.translate(text).then((res) => res.result[0]),
    // },
    // {
    //   name: "baidu",
    //   translate: (text) => baidu.translate(text).then((res) => res.result[0]),
    // },
    {
      name: "pinyin",
      translate: (text) => pinyin.getCamelChars(text),
    },
  ];
  public logger = null;
  static tanslateSingleInstance = null as PontxMetaTranslatePlugin;
  dict = {} as { [cn: string]: string };
  innerConfig: any;

  public apply(logger: PontLogger, translateOptions: TranslateOptions = {}, config: PontInnerManagerConfig) {
    let translatePlugin = PontxMetaTranslatePlugin.tanslateSingleInstance;
    if (!translatePlugin) {
      translatePlugin = new PontxMetaTranslatePlugin();
      PontxMetaTranslatePlugin.tanslateSingleInstance = translatePlugin;
    }
    translatePlugin.logger = logger;
    translatePlugin.translateOptions = translateOptions;
    try {
      let localDictDir = undefined;
      if (translateOptions?.cacheFilePath) {
        translatePlugin.dictName = path.basename(translateOptions?.cacheFilePath);
        localDictDir = path.resolve(config?.configDir, path.dirname(translateOptions.cacheFilePath));
      }
      translatePlugin.PontDictManager = PontDictManager(localDictDir);
      const localDict = translatePlugin.PontDictManager.loadFileIfExistsSync(translatePlugin.dictName);

      if (localDict) {
        try {
          translatePlugin.dict = JSON.parse(localDict);
        } catch (err) {
          logger.error("[translate] local dict is invalid, attempting auto fix");
          translatePlugin.PontDictManager.removeFile(translatePlugin.dictName);
          translatePlugin.dict = {};
        }
      }
    } catch (e) {}
    return translatePlugin;
  }

  /** 翻译中文类名等 */
  async translateChinese(jsonString: string, errCallback: (err) => any): Promise<string> {
    let retString = jsonString;
    try {
      const matchItems = jsonString
        // 匹配中英文混合及包含 空格，«，»，-, (,)的情况
        .match(/"[a-z0-9\s-]*[\u4e00-\u9fa5]+[a-z0-9\s-«»()\u4e00-\u9fa5]*":/gi);
      if (!matchItems) {
        return retString;
      }

      let chineseKeyCollect = matchItems.map((item) => item.replace(/["":]/g, ""));

      // 去重
      chineseKeyCollect = _.uniq(chineseKeyCollect.map((item) => (item.includes("«") ? item.split("«")[0] : item)));

      // 按长度倒序排序，防止替换时中文名部分重名
      // 例如: 请求参数vo, 请求参数, 替换时先替换 请求参数vo, 后替换请求参数
      chineseKeyCollect.sort((pre, next) => next.length - pre.length);

      const result = await this.translateCollect(chineseKeyCollect);
      if (result?.length !== chineseKeyCollect.length) {
        throw new Error("翻译失败");
      }
      // const normalizeRegStr = (str: string) => str.replace(/(\W)/g, '$1');
      const toRegStr = (str) => str.replace(/(\W)/g, "\\$1");
      result.forEach((enKey: string, index) => {
        const chineseKey = chineseKeyCollect[index];
        // this.report(chineseKey + ' ==> ' + enKey);
        if (enKey) {
          retString = retString.replace(eval(`/${toRegStr(chineseKey)}/g`), enKey);
        }
      });
      await this.saveCacheFile();
      return retString;
    } catch (err) {
      errCallback(err);
      return retString;
    }
  }

  async saveCacheFile() {
    const latestDict = PontxMetaTranslatePlugin.tanslateSingleInstance.PontDictManager.loadJsonFileIfExistsSync(
      this.dictName,
    );
    const dict = {
      ...(latestDict || {}),
      ...(this.dict || {}),
    };
    const saveFileStatus = await PontxMetaTranslatePlugin.tanslateSingleInstance.PontDictManager.saveFile(
      this.dictName,
      JSON.stringify(dict, null, 2),
    );
    return saveFileStatus;
  }

  async appendToDict(pairKey: { cn: string; en: string }) {
    if (!this.dict[pairKey.cn]) {
      this.dict[pairKey.cn] = pairKey.en;
    }
  }

  startCaseClassName(result) {
    let wordArray = _.startCase(result).split(" ");
    if (wordArray.length > 6) {
      wordArray = [].concat(wordArray.slice(0, 5), wordArray.slice(-1));
    }
    return wordArray.join("");
  }

  async translateAsync(text: string, engineIndex = 0) {
    if (this.dict[text]) {
      return this.dict[text];
    }

    if (engineIndex >= this.engines.length) {
      throw new Error("translate error, all translate engine can not access");
    }

    let enKey;
    let index = engineIndex;

    try {
      let res = await this.engines[index].translate(text);
      enKey = this.startCaseClassName(res);

      assert.ok(enKey);

      this.appendToDict({ cn: text, en: enKey });
      return enKey;
    } catch (err) {
      this.logger.error(
        `translateEngine:${this.engines[index].name} options:${this.translateOptions} text:${text} err:${err}`,
      );
      return this.translateAsync(text, index + 1);
    }
  }

  async translateCollect(texts: string[], engineIndex: number = 0) {
    const needTranslatedTexts = texts.filter((text) => !this.dict[text]);
    const collectText = needTranslatedTexts.join("\n\n");

    if (engineIndex >= this.engines.length) {
      throw new Error("translate error, all translate engine can not access");
    }

    if (needTranslatedTexts.length === 0) {
      return texts.map((text) => this.dict[text]);
    }

    let enKey;
    let index = engineIndex;

    try {
      const request = engineIndex === 0 ? "translateCollect" : "translate";
      let collectResults = await this.engines[engineIndex][request](collectText);
      if (this.engines[engineIndex].name === "baidu-open") {
        (collectResults || []).forEach((item) => {
          const { src, dst } = item;
          if (src && dst && !src.includes?.("\n")) {
            this.appendToDict({ cn: src, en: this.startCaseClassName(dst) });
          }
        });
      } else {
        this.appendToDict({ cn: collectText, en: collectResults });
      }

      await this.saveCacheFile();
      return texts.map((text) => this.dict[text]);
    } catch (err) {
      this.translateCollect(texts, ++engineIndex);
    }
  }
}
