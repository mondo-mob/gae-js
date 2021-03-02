import crypto from "crypto";
import fs from "fs";
import path from "path";

export const generateHash = (fullFilePath: string): Promise<string> =>
  new Promise(function (resolve, reject) {
    const hash = crypto.createHash("md5");
    const input = fs.createReadStream(fullFilePath);
    input.on("error", reject);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("close", () => resolve(hash.digest("hex")));
  });

export const fetchFileList = async (rootFolder: string, folder = "/"): Promise<string[]> => {
  let filePaths: string[] = [];

  const files = await fs.promises.readdir(path.join(rootFolder, folder));
  for (const file of files) {
    const filePath = path.join(folder, file);
    const fullFilePath = path.join(rootFolder, filePath);
    const stat = await fs.promises.stat(fullFilePath);

    if (stat.isFile()) {
      filePaths.push(filePath);
    } else if (stat.isDirectory()) {
      filePaths = filePaths.concat(await fetchFileList(rootFolder, filePath));
    }
  }

  return filePaths;
};
