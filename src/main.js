import { EggheadApplication } from "./application.js";

export function main(argv) {
  const application = new EggheadApplication();
  return application.runAsync(argv);
}
