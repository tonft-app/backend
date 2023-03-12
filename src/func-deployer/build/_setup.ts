import fs from "fs";
import child_process from "child_process";

try {
  fs.unlinkSync(__dirname + "/../node_modules/.bin/func");
  fs.unlinkSync(__dirname + "/../node_modules/.bin/fift");
} catch (e) { }
try {
  fs.unlinkSync(__dirname + "/../node_modules/.bin/func.cmd");
  fs.unlinkSync(__dirname + "/../node_modules/.bin/fift.cmd");
} catch (e) { }

if (fs.existsSync("/app/.glitchdotcom.json")) {
  if (!fs.existsSync("/app/bin")) {
    child_process.execSync(`mkdir bin`);
    child_process.execSync(`wget https://github.com/ton-defi-org/ton-binaries/releases/download/ubuntu-16/fift -P ./bin`);
    child_process.execSync(`chmod +x ./bin/fift`);
    child_process.execSync(`wget https://github.com/ton-defi-org/ton-binaries/releases/download/ubuntu-16/func -P ./bin`);
    child_process.execSync(`chmod +x ./bin/func`);
    child_process.execSync(`wget https://github.com/ton-defi-org/ton-binaries/releases/download/fiftlib/fiftlib.zip -P ./bin`);
    child_process.execSync(`unzip ./bin/fiftlib.zip -d ./bin/fiftlib`);
  }
}
