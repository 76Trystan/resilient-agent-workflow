export const activities = {
  async selfGetCup(): Promise<void> {
    console.log('selfGetCup');
  },

  async kettleFill(): Promise<void> {
    console.log('kettleFill');
  },

  async kettleTurnOn(): Promise<void> {
    console.log('kettleTurnOn');
  },

  async kettleWaitWhistle(): Promise<void> {
    console.log('kettleWaitWhistle');
  },

  async cupAddTeabag(): Promise<void> {
    console.log('cupAddTeabag');
  },

  async cupAddWater(): Promise<void> {
    console.log('cupAddWater');
  },

  async cupMashTea(): Promise<void> {
    console.log('cupMashTea');
  },

  async cupRemoveTeabag(): Promise<void> {
    console.log('cupRemoveTeabag');
  },

  async cupAddMilk(): Promise<void> {
    console.log('cupAddMilk');
  },

  async cupAddSugar(): Promise<void> {
    console.log('cupAddSugar');
  },

  async cupAddSalt(): Promise<void> {
    console.log('cupAddSalt');
  },

  async cupStir(): Promise<void> {
    console.log('cupStir');
  },

  async selfDrinkCup(): Promise<void> {
    console.log('selfDrinkCup');
  },

  async selfEmptyCup(): Promise<void> {
    console.log('selfEmptyCup');
  },

  async selfTidyUp(): Promise<void> {
    console.log('selfTidyUp');
  },
};

export type Activities = typeof activities;