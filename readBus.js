import fs from "node:fs/promises";
import {XMLHttpRequest} from "xmlhttprequest";
import convert from "xml-js";
import "dotenv/config";

const stations = Object.values(JSON.parse(await fs.readFile("서울시 정류장마스터 정보.json")))[1]

const BASE_URI = "http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll";
const SERVICE_KEY = process.env.SERVICE_KEY

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

/**
 * @description returns three random elements from received array
 * @param {Array} arr
 * @returns {*[]}
 */
function getThreeRandomElement(arr) {
    const items = []
    for (let i = 0; i < 3; i++) {
        const randomNumber = (Math.floor(Math.random() * stations.length))+1
        items.push(stations[randomNumber])
    }
    return items
}

/**
 * @param {number} busRouteId
 * @returns {Promise<unknown>}
 */
function getResponseText(busRouteId) {
        const urlSearchParams = new URLSearchParams({
            serviceKey: SERVICE_KEY,
            busRouteId
        })

        const requestURI = `${BASE_URI}?${urlSearchParams.toString()}`;

        return new Promise(function (resolve) {
            const xhr = new XMLHttpRequest();
            xhr.open('get', requestURI, true);
            xhr.responseType = 'document';
            xhr.onreadystatechange = function () {
                if (this.readyState === 4) {
                    resolve(convert.xml2json(this.responseText, {compact: true, spaces: 4}));
                }
            };
            xhr.send();
        });
}

/**
 * @description
 * @param {string} response
 * @returns {Object}
 */
function getItemList(response) {
    return JSON.parse(response).ServiceResult.msgBody.itemList
}

async function getStationInfo(busRoutes) {
    const itemListArr = []
    for (const busRoute of busRoutes) {
        itemListArr.push(getItemList(await getResponseText(busRoute.sttn_id)))
    }
    return itemListArr
}

/**
 * @description returns an array that has buses that are arriving in 5 minutes and the first arrival message is not "출발대기"
 * @param {Array} route
 * @returns {Array}
 */
function getStationsWithScheduledBuses(route) {
    return route.filter(item => Number(item.exps1._text) < 300 && Number(item.exps2._text) < 300 && item.arrmsg1._text !== '출발대기')
}

//step1. Extract 3 routes information randomly from Seoul bus routes by interfacing with government data portal on a real time basis.
let arr = await getStationInfo(getThreeRandomElement(stations))

while(!arr[0] && !arr[1] && !arr[2]) {
    arr = await getStationInfo(getThreeRandomElement(stations))
}

//step2. Pull out 3 bus stations with the most scheduled buses to arrive in 5 minutes among extracted routes information from step 1.
const result = []

for (const v of arr) {
    if (!v) continue;
    result.push(...getStationsWithScheduledBuses(v));
}

//step3. Arrange bus information (bus number, plate number, and ETA (estimate time of arrival)) sorting by fastest arriving bus regardless of station in pulled data from step2.
const buses = result.map(r => new Bus(r)).sort((a, b) => a.ETA - b.ETA)
console.log(buses)

process.exit(0)