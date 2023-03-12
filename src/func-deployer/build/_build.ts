import fs from "fs";
import path from "path";
import process from "process";
import child_process from "child_process";
import glob from "fast-glob";
import { Cell } from "ton";
import semver from "semver";

async function main() {
  if (fs.existsSync("bin")) {
    process.env.PATH = path.join(__dirname, "..", "bin") + path.delimiter + process.env.PATH;
    process.env.FIFTPATH = path.join(__dirname, "..", "bin", "fiftlib");
  }

  const rootContracts = glob.sync(["contracts/*.fc", "contracts/*.func"]);
  for (const rootContract of rootContracts) {
    const contractName = path.parse(rootContract).name;
    const fiftArtifact = `build/${contractName}.fif`;

    if (fs.existsSync(fiftArtifact)) {
      fs.unlinkSync(fiftArtifact);
    }

    const mergedFuncArtifact = `build/${contractName}.merged.fc`;

    if (fs.existsSync(mergedFuncArtifact)) {
      fs.unlinkSync(mergedFuncArtifact);
    }

    const fiftCellArtifact = `build/${contractName}.cell.fif`;
    if (fs.existsSync(fiftCellArtifact)) {
      fs.unlinkSync(fiftCellArtifact);
    }

    const cellArtifact = `build/${contractName}.cell`;
    if (fs.existsSync(cellArtifact)) {
      fs.unlinkSync(cellArtifact);
    }

    const hexArtifact = `build/${contractName}.compiled.json`;
    if (fs.existsSync(hexArtifact)) {
      fs.unlinkSync(hexArtifact);
    }

    let buildErrors: string;
    try {
      buildErrors = child_process.execSync(`func -APS -o build/${contractName}.fif ${rootContract} 2>&1 1>node_modules/.tmpfunc`).toString();
    } catch (e) {
      buildErrors = e.stdout.toString();
    }

    if (buildErrors.length > 0) {
      console.log(" - OH NO! Compilation Errors! The compiler output was:");
      console.log(`\n${buildErrors}`);
      process.exit(1);
    } else {
      console.log(" - Compilation successful!");
    }

    if (!fs.existsSync(fiftArtifact)) {
      console.log(` - For some reason '${fiftArtifact}' was not created!`);
      process.exit(1);
    } else {
      console.log(` - Build artifact created '${fiftArtifact}'`);
    }

    let fiftCellSource = '"Asm.fif" include\n';
    fiftCellSource += `${fs.readFileSync(fiftArtifact).toString()}\n`;
    fiftCellSource += `boc>B "${cellArtifact}" B>file`;
    fs.writeFileSync(fiftCellArtifact, fiftCellSource);

    try {
      child_process.execSync(`fift ${fiftCellArtifact}`);
    } catch (e) {
      console.log("FATAL ERROR: 'fift' executable failed, is FIFTPATH env variable defined?");
      process.exit(1);
    }

    fs.unlinkSync(fiftCellArtifact);

    if (!fs.existsSync(cellArtifact)) {
      console.log(` - For some reason, intermediary file '${cellArtifact}' was not created!`);
      process.exit(1);
    }

    fs.writeFileSync(
      hexArtifact,
      JSON.stringify({
        hex: Cell.fromBoc(fs.readFileSync(cellArtifact))[0].toBoc().toString("hex"),
      })
    );

    fs.unlinkSync(cellArtifact);

    if (!fs.existsSync(hexArtifact)) {
      console.log(` - For some reason '${hexArtifact}' was not created!`);
      process.exit(1);
    } else {
      console.log(` - Build artifact created '${hexArtifact}'`);
    }
  }

  console.log("");
}

main();

// helpers

function crc32(r: string) {
  for (var a, o = [], c = 0; c < 256; c++) {
    a = c;
    for (let f = 0; f < 8; f++) a = 1 & a ? 3988292384 ^ (a >>> 1) : a >>> 1;
    o[c] = a;
  }
  for (var n = -1, t = 0; t < r.length; t++) n = (n >>> 8) ^ o[255 & (n ^ r.charCodeAt(t))];
  return (-1 ^ n) >>> 0;
}
