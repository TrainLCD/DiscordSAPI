import { https } from "follow-redirects";
import fs from "fs";
import simpleGit from "simple-git";

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

const updateMigrationCSV = () =>
  new Promise<void>(async (resolve, reject) => {
    try {
      // ファイルが存在するとクローン時エラーになってしまうのでディレクトリがあったら消す
      if (fs.existsSync(CLONED_DIR)) {
        fs.rmSync(CLONED_DIR, { recursive: true, force: true });
      }

      // StationAPIリポジトリをcloneする
      await simpleGit({
        baseDir: CLONE_BASE_DIR,
        binary: "git",
        maxConcurrentProcesses: 6,
        trimmed: false,
      }).clone("git@github.com:TrainLCD/StationAPI.git");

      // CSVファイルをスプシからダウンロード
      await Promise.all(
        EXPORTABLE_SPREADSHEET_URLS.map(async (url, idx) => {
          const outputPath = `${CLONED_DIR}/migrations/${EXPORTABLE_SPREADSHEET_FILE_NAMES[idx]}`;
          return downloadCSV(url, outputPath);
        })
      );

      // push専用Gitオブジェクト
      const gitForPush = simpleGit({
        baseDir: CLONED_DIR,
        binary: "git",
        maxConcurrentProcesses: 6,
        trimmed: false,
      });
      gitForPush.add("./*");

      // 差分が1行もないときは何もしないでresolve
      const diff = await gitForPush.diff();
      if (!diff.length) {
        return resolve();
      }

      // 変更がある場合のみpush&resolve
      gitForPush
        .commit("Commited automatically")
        .push(["origin", "dev"], () => resolve());

      // 後片付け(不要となったファイルの削除)
      fs.rmSync(CLONED_DIR, { recursive: true, force: true });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });

export const deploySapidataCmd = async () => {
  // CSVをダウンロードして古いデータを置換する
  await updateMigrationCSV();
};
