import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
}

async function setPaused(chatId, paused) {
  await supabase.from("chat_history").upsert({
    chat_id: chatId,
    paused,
    updated_at: new Date().toISOString(),
  });
}

export default async function handler(req, res) {
  const text = req.body?.message?.text?.trim();
  const fromId = String(req.body?.message?.chat?.id);

  if (fromId === String(TELEGRAM_CHAT_ID)) {
    if (text?.startsWith("/стоп ")) {
      const phone = text.replace("/стоп ", "").trim();
      await setPaused(`${phone}@c.us`, true);
      await sendTelegram(`✅ Бот остановлен для ${phone}`);
    } else if (text?.startsWith("/старт ")) {
      const phone = text.replace("/старт ", "").trim();
      await setPaused(`${phone}@c.us`, false);
      await sendTelegram(`✅ Бот включён для ${phone}`);
    }
  }

  return res.status(200).json({ ok: true });
}
