import { createApp } from "../server";

let cachedApp: any = null;

export default async (req: any, res: any) => {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  return cachedApp(req, res);
};
