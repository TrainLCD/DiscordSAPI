import chalk from "chalk";
import dayjs from "dayjs";

const LOG_DATE_FORMAT = "YYYY-MM-DDTHH:mm:ssZ[Z]";

export default class Logger {
  username: string;

  constructor(username: string | undefined) {
    this.username = username ?? "UNKNOWN";
  }

  success = (...data: any[]) =>
    console.log(
      chalk.green("[SUCCESS]"),
      ...data,
      dayjs().format(LOG_DATE_FORMAT)
    );
  failed = (...data: any[]) =>
    console.log(
      chalk.red("[FAILED]"),
      ...data,
      dayjs().format(LOG_DATE_FORMAT)
    );
  denied = (...data: any[]) =>
    console.log(
      chalk.yellow("[DENIED]"),
      ...data,
      dayjs().format(LOG_DATE_FORMAT)
    );
  debug = (...data: any[]) =>
    console.log(
      chalk.blue("[DEBUG]"),
      ...data,
      dayjs().format(LOG_DATE_FORMAT)
    );
}
