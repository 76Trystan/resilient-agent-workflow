const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
import { readFile } from "fs";
import { writeFile } from "fs/promises";

// Sample data to write to JSON file
const data = {
  name: "Alice",
  age: 30,
  time: new Date().toISOString(),
};

async function writeJson() {
  await writeFile(
    "data.json",
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}


export const activities = {
  async selfGetCup(): Promise<void> {
    await sleep(1000);
    writeJson().catch(console.error);
    console.log('selfGetCup');
  },

  async kettleFill(): Promise<void> {
    await sleep(1000);
    console.log('kettleFill');
  },

  async kettleTurnOn(): Promise<void> {
    await sleep(1000);
   console.log('kettleTurnOn');
  },

  async kettleWaitWhistle(): Promise<void> {
    await sleep(1000);
   console.log('kettleWaitWhistle');
  },

  async cupAddTeabag(): Promise<void> {
    await sleep(1000);
    console.log('cupAddTeabag');
  },

  async cupAddWater(): Promise<void> {
    await sleep(1000);
    console.log('cupAddWater');
  },

  async cupMashTea(): Promise<void> {
    await sleep(1000);
    console.log('cupMashTea');
  },

  async cupRemoveTeabag(): Promise<void> {
    await sleep(1000);
    console.log('cupRemoveTeabag');
  },

  async cupAddMilk(): Promise<void> {
    await sleep(1000);
    console.log('cupAddMilk');
  },

  async cupAddSugar(): Promise<void> {
    await sleep(1000);
    console.log('cupAddSugar');
  },

  async cupAddSalt(): Promise<void> {
    await sleep(1000);
    console.log('cupAddSalt');
  },

  async cupStir(): Promise<void> {
    await sleep(1000);
    console.log('cupStir');
  },

  async selfDrinkCup(): Promise<void> {
    await sleep(1000);
    console.log('selfDrinkCup');
  },

  async selfEmptyCup(): Promise<void> {
    await sleep(1000);
    console.log('selfEmptyCup');
  },

  async selfTidyUp(): Promise<void> {
    await sleep(1000);
    console.log('selfTidyUp');
  },
};

export type Activities = typeof activities;