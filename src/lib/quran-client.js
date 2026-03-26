import { QuranClient, Language } from "@quranjs/api";

const client = new QuranClient({
  clientId: process.env.QF_CLIENT_ID,
  clientSecret: process.env.QF_CLIENT_SECRET,
  authBaseUrl: process.env.QF_AUTH_URL,
  contentBaseUrl: process.env.QF_BASE_URL,
  defaults: { language: Language.ENGLISH },
});

export default client;
