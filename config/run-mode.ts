export enum RunMode { test, production }

const envRunMode = process.env.RUN_MODE

export const runMode = envRunMode ? RunMode[envRunMode] : RunMode.test