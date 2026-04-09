import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(text, keyboard = null) {
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: "HTML",
  };
  if (keyboard) body.reply_markup = keyboard;
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function answerCallback(callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
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
  try {
    const body = req.body;
    const fromId = String(body?.message?.chat?.id || body?.callback_query?.from?.id);

    if (fromId !== String(TELEGRAM_CHAT_ID)) {
      return res.status(200).json({ ok: true });
    }

    // Нажатие кнопки
    if (body?.callback_query) {
      const data = body.callback_query.data;
      const callbackId = body.callback_query.id;

      if (data.startsWith("stop_")) {
        const phone = data.replace("stop_", "");
        await setPaused(`${phone}@c.us`, true);
        await answerCallback(callbackId, `⏸ Бот остановлен для ${phone}`);
      } else if (data.startsWith("start_")) {
        const phone = data.replace("start_", "");
        await setPaused(`${phone}@c.us`, false);
        await answerCallback(callbackId, `▶️ Бот включён для ${phone}`);
      }
      return res.status(200).json({ ok: true });
    }

    // Текстовые команды
    const text = body?.message?.text?.trim();
    if (text?.startsWith("/стоп ")) {
      const phone = text.replace("/стоп ", "").trim();
      await setPaused(`${phone}@c.us`, true);
      await sendTelegram(`⏸ Бот остановлен для ${phone}`);
    } else if (text?.startsWith("/старт ")) {
      const phone = text.replace("/старт ", "").trim();
      await setPaused(`${phone}@c.us`, false);
      await sendTelegram(`▶️ Бот включён для ${phone}`);
    } else if (text === "/список") {
      const { data } = await supabase
        .from("chat_history")
        .select("chat_id, paused")
        .eq("paused", true);
      if (data?.length) {
        const list = data.map(d => `• ${d.chat_id.replace("@c.us", "")}`).join("\n");
        await sendTelegram(`⏸ Боты на паузе:\n${list}`);
      } else {
        await sendTelegram("Нет чатов на паузе");
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram error:", error);
    return res.status(500).json({ error: error.message });
  }
}
