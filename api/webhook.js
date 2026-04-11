import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const SHEETS_EMAIL = process.env.GOOGLE_SERVICE_EMAIL;
const SHEETS_KEY = process.env.GOOGLE_PRIVATE_KEY;

const SYSTEM_PROMPT = `Ты представитель охранного агентства AST-KUZET (Казахстан, Караганда). Переписка в WhatsApp.

СТИЛЬ: профессиональный и вежливый, но кратко. Можно сказать "рад помочь" или "хорошо" — но только один раз и по месту. Без длинных объяснений. Один вопрос за раз. Максимум 2-3 строки на ответ. Если клиент сказал "спасибо" или не ответил — не пиши больше ничего.

О КОМПАНИИ: ТОО «AST KUZET M», с 2007 года, 18 лет, 1000+ объектов, лицензия №23006587, ул.Лободы 25/3, 9:00-18:00, тел. +7 705 775 14 75, ast-kuzet.kz.

УСЛУГИ И ЦЕНЫ:
- Тревожная кнопка: от 10 000 ₸/мес (монтаж и оборудование бесплатно)
- Пультовая охрана: от 12 000 ₸/мес
- Охрана квартиры: от 8 000 ₸/мес
- Физическая охрана: от 900 ₸/час — по вопросам писать Данияру: +7 701 336 66 93
- Видеонаблюдение, пожарная сигнализация: по смете
- Оборудование отдельно не продаём

ПРЕИМУЩЕСТВА: ГБР за 7-12 минут (в договоре), материальная ответственность до 1,5 млн ₸, первые 30 дней бесплатно.

ПЕРЕАДРЕСАЦИЯ:
- Вакансии, работа, трудоустройство → "По трудоустройству: Диана, +7 702 214 53 36"
- Физическая охрана → "По физохране: Данияр, +7 701 336 66 93"
- Оборудование отдельно → "Оборудование отдельно не продаём. Только в комплексе с услугами."

ЦЕЛЬ: узнать тип объекта → назвать цену или направить к нужному человеку → получить контакты.

ЗАЯВКА: когда клиент готов подключиться — собери имя, телефон, адрес. Напиши: [ЗАЯВКА: имя — телефон — адрес — тип объекта]

ЗАПРЕЩЕНО:
- Писать больше 2-3 строк
- Задавать 2 вопроса сразу
- Комментировать слова клиента
- Здороваться повторно
- Придумывать цены и факты`;

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

// Google Sheets JWT Auth
async function getGoogleToken() {
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: SHEETS_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }));

  const pemKey = SHEETS_KEY.replace(/\\n/g, "\n");
  const keyData = pemKey.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signingInput = `${header}.${claim}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function addToSheets(name, phone, firstMessage) {
  try {
    const token = await getGoogleToken();
    const date = new Date().toLocaleString("ru-RU", { timeZone: "Asia/Almaty" });
    const values = [[
      "", // № — автоматически
      date,
      name,
      `+${phone}`,
      firstMessage,
      "",
      "Новый",
      "",
      "",
    ]];

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_ID}/values/CRM_Клиенты!A:I:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    });
  } catch (e) {
    console.error("Sheets error:", e);
  }
}

async function sendTelegramWithButtons(text, phone) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "⏸ Остановить бота", callback_data: `stop_${phone}` },
            { text: "▶️ Бот работает", callback_data: `start_${phone}` },
          ]],
        },
      }),
    });
  } catch {}
}

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML" }),
    });
  } catch {}
}

async function getHistory(chatId) {
  try {
    const { data } = await supabase
      .from("chat_history")
      .select("messages, paused, updated_at")
      .eq("chat_id", chatId)
      .single();
    return data || { messages: [], paused: false, updated_at: null };
  } catch {
    return { messages: [], paused: false, updated_at: null };
  }
}

async function saveHistory(chatId, messages) {
  await supabase.from("chat_history").upsert({
    chat_id: chatId,
    messages: messages.slice(-20),
    updated_at: new Date().toISOString(),
  });
}

async function setPaused(chatId, paused) {
  await supabase.from("chat_history").upsert({
    chat_id: chatId,
    paused,
    updated_at: new Date().toISOString(),
  });
}

async function isProcessed(messageId) {
  try {
    const { data } = await supabase
      .from("processed_messages")
      .select("message_id")
      .eq("message_id", messageId)
      .single();
    return !!data;
  } catch {
    return false;
  }
}

async function markProcessed(messageId) {
  try {
    await supabase.from("processed_messages").insert({ message_id: messageId });
  } catch {}
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "AST-KUZET Agent running" });
  }

  try {
    const body = req.body;
    const webhookType = body?.typeWebhook;

    if (webhookType === "outgoingMessageReceived") {
      const chatId = body.senderData?.chatId;
      if (chatId) await setPaused(chatId, true);
      return res.status(200).json({ ok: true });
    }

    if (webhookType !== "incomingMessageReceived") {
      return res.status(200).json({ ok: true });
    }

    const senderData = body.senderData;
    const messageBody = body.messageData;
    const chatId = senderData.chatId;
    const messageId = body.idMessage;
    const senderName = senderData.senderName || "Клиент";
    const phone = chatId.replace("@c.us", "");

    if (messageId) {
      const alreadyProcessed = await isProcessed(messageId);
      if (alreadyProcessed) return res.status(200).json({ ok: true });
      await markProcessed(messageId);
    }

    const { messages, paused, updated_at } = await getHistory(chatId);
    if (paused) return res.status(200).json({ ok: true });

    if (messageBody?.typeMessage !== "textMessage") {
      if (["audioMessage", "imageMessage", "videoMessage", "documentMessage"].includes(messageBody?.typeMessage)) {
        await fetch(`https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chatId, message: "Напишите текстом или позвоните: +7 705 775 14 75" }),
        });
      }
      return res.status(200).json({ ok: true });
    }

    const incomingText = messageBody.textMessageData.textMessage.trim();
    const isNewSession = !updated_at || (Date.now() - new Date(updated_at).getTime()) > TWELVE_HOURS;

    if (isNewSession) {
      // Уведомление в Telegram
      await sendTelegramWithButtons(
        `📩 <b>Новый клиент!</b>\n👤 ${senderName} (+${phone})\n\n💬 ${incomingText}`,
        phone
      );
      // Добавляем в Google Sheets
      await addToSheets(senderName, phone, incomingText);
    }

    const historyToUse = isNewSession ? [] : messages;
    historyToUse.push({ role: "user", content: incomingText });

    const systemWithContext = SYSTEM_PROMPT + (isNewSession
      ? "\n\nПервое сообщение клиента — поздоровайся кратко и задай один уточняющий вопрос."
      : "\n\nДиалог продолжается — не здоровайся. Отвечай коротко.");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: systemWithContext,
      messages: historyToUse,
    });

    const replyText = response.content[0].text;
    historyToUse.push({ role: "assistant", content: replyText });
    await saveHistory(chatId, historyToUse);

    if (replyText.includes("[ЗАЯВКА:")) {
      const match = replyText.match(/\[ЗАЯВКА:([^\]]+)\]/);
      if (match) {
        await sendTelegram(`🔔 <b>НОВАЯ ЗАЯВКА!</b>\n${match[1].trim()}\nНомер: +${phone}`);
      }
    }

    await fetch(`https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message: replyText }),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
}
