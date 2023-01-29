import { https } from "follow-redirects";
import fs from "node:fs";
import { execAsync } from "../utils/execAsync";
import { default as Logger } from "../utils/logger";

const {
  EXPORTABLE_SPREADSHEET_BASE_URL,
  EXPORTABLE_STATIONS_GID,
  EXPORTABLE_LINES_GID,
  EXPORTABLE_SST_GID,
  EXPROTABLE_TYPES_GID,
  EXPROTABLE_COMPANIES_GID,
} = process.env;

const EXPORTABLE_SPREADSHEET_FILE_NAMES = [
  "1!companies.csv",
  "2!lines.csv",
  "3!stations.csv",
  "4!types.csv",
  "5!station_station_types.csv",
];
const EXPORTABLE_SPREADSHEET_URLS = [
  EXPROTABLE_COMPANIES_GID,
  EXPORTABLE_LINES_GID,
  EXPORTABLE_STATIONS_GID,
  EXPROTABLE_TYPES_GID,
  EXPORTABLE_SST_GID,
].map(
  (gid) => `${EXPORTABLE_SPREADSHEET_BASE_URL}/export?gid=${gid}&format=csv`
);

const CLONE_BASE_DIR = `${process.cwd()}/tmp`;
const CLONED_DIR = `${CLONE_BASE_DIR}/StationAPI`;

const downloadCSV = (uri: string, filename: string) =>
  new Promise((resolve, reject) =>
    https.get(uri, (res) =>
      res.pipe(
        fs.createWriteStream(filename).on("close", resolve).on("error", reject)
      )
    )
  );

export const deploySapidataCmd = (logger: Logger) =>
  new Promise<void>(async (resolve, reject) => {
    try {
      // ファイルが存在するとクローン時エラーになってしまうのでディレクトリがあったら消す
      if (fs.existsSync(CLONED_DIR)) {
        logger.debug(`${CLONED_DIR} exists.`);
        fs.rmSync(CLONED_DIR, { recursive: true, force: true });
        logger.debug(`${CLONED_DIR} has been deleted.`);
      }

      await execAsync(
        `cd ${CLONE_BASE_DIR} && git clone git@github.com:TrainLCD/StationAPI.git`
      );

      logger.debug(`The repository has been cloned into ${CLONE_BASE_DIR}.`);

      // CSVファイルをスプシからダウンロード
      await Promise.all(
        EXPORTABLE_SPREADSHEET_URLS.map(async (url, idx) => {
          const outputPath = `${CLONED_DIR}/migrations/${EXPORTABLE_SPREADSHEET_FILE_NAMES[idx]}`;
          await downloadCSV(url, outputPath);
          logger.debug(`${outputPath} downloaded.`);
        })
      );

      // 差分が1行もないときは何もしないでresolve
      const diff = await execAsync(`cd ${CLONED_DIR} && git diff --stat`);

      if (!diff.length) {
        logger.success("No differences.");
        return resolve();
      }

      await execAsync(`cd ${CLONED_DIR} && git add .`);
      logger.debug("Changes are staged.");

      // 変更がある場合のみpush&resolve
      await execAsync(
        `cd ${CLONED_DIR} && git commit -m "Commited automatically"`
      );
      logger.debug("attempting git push -u origin dev...");
      await execAsync(`cd ${CLONED_DIR} && git push -u origin dev`);
      logger.debug("git push` successfully completed.");
      // 後片付け(不要となったファイルの削除)
      fs.rmSync(CLONED_DIR, { recursive: true, force: true });
      logger.debug(`${CLONED_DIR} has been deleted.`);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
