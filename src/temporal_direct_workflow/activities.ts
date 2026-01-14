const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const activities = {
  async selfGetCup(): Promise<void> {
    await sleep(1000);
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