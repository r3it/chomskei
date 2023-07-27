import * as childProcess from "child_process";
import * as fs from "fs-extra";

export const NODE_LAMBDA_LAYER_DIR = `${process.cwd()}/bundle/`;
export const NODE_LAMBDA_LAYER_RUNTIME_DIR_NAME = `nodejs`;

function getModulesInstallDirName(): string {
  return `${NODE_LAMBDA_LAYER_DIR}/${NODE_LAMBDA_LAYER_RUNTIME_DIR_NAME}`;
}

function copyPackageJson(packageJSON: "package.json"): boolean {
  // copy package.json
  fs.mkdirsSync(getModulesInstallDirName());
  fs.copyFileSync(
    `${process.cwd()}/${packageJSON}`,
    `${getModulesInstallDirName()}/${packageJSON}`
  );
  return true;
}

export function bundleNpm() {
  // create bundle directory
  copyPackageJson("package.json");

  // install package.json (production)
  childProcess.execSync(
    `set -eux && npm --prefix ${getModulesInstallDirName()} install --omit=dev`,
    {
      stdio: ["ignore", "inherit", "inherit"],
      env: { ...process.env },
      shell: "bash",
    }
  );
}
