/*

    Copyright (C) 2022  James Headon

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

console.log("DHL Checker  Copyright (C) 2022  James Headon\n\
This program comes with ABSOLUTELY NO WARRANTY.\n\
This is free software, and you are welcome to redistribute it\n\
under certain conditions.");

const fileDialog = require("node-file-dialog");
const fs         = require("fs");
const fetch      = require("node-fetch");

const date = new Date(Date.now());
const dateString = date.toISOString().substring(0, 10); // Date format as needed by DHL API - YYYY-MM-DD

async function run()
{
    let inputFile;
    await fileDialog({type: "open-file"}).then(file => inputFile = file[0]); // Select input file by opening file dialog
    const outputFile = inputFile + ".csv";
    fs.writeFileSync(outputFile, ""); // Clear the output file

    const inputFileContents = fs.readFileSync(inputFile, "utf-8");
    inputFileContents.split(/\r?\n/).forEach(async line => { // Run over every line of the file
        let cityName;
        let valid = "";

        await fetch(`https://dct.dhl.com/data/postLoc?start=0&max=1500&queryBy=2&cntryCd=CN&postcdStart=${line}&t=${Date.now()}`, { // Get city name from postcode
            "headers": {
              "accept": "application/json", // Require json response format
            },
            "method": "GET"
          }).then(res => res.text())
            .then(text => {
                text = JSON.parse(text);
                if(text.errorCode)
                    throw text.errorMessage;
                if(text.count)
                    cityName = text.postalLocationList.postalLocation[0].cityName.replace(/ /g, "+"); // Get city name from json response
                else
                    valid = "INVALID";
        });
        await fetch(`https://dct.dhl.com/data/quotation/?dtbl=N&declVal=&declValCur=GBP&wgtUom=kg&dimUom=cm&noPce=1&wgt0=0.1&w0=0&l0=0&h0=0&shpDate=${dateString}&orgCtry=GB&orgCity=EDINBURGH&orgSub=&orgZip=EH87&dstCtry=CN&dstCity=${cityName}&dstSub=&dstZip=${line}`, { // Request postal routes
                    "headers": {
                        "accept": "application/json"
                    },
                    "method": "GET"
                    }).then(res => res.text())
                    .then(text => valid = JSON.parse(text).count ? "VALID" : "INVALID");
        fs.appendFileSync(outputFile, `${line},${valid}\n`); // Write to output file
    });
}

run();