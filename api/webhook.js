import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SYSTEM_PROMPT = `Ты менеджер охранного агентства AST-KUZET (Казахстан, Караганда). Переписка в WhatsApp.

СТИЛЬ ОБЩЕНИЯ:
Пиши как живой человек в мессенджере. Коротко. Одна мысль — одно сообщение. Максимум 2-3 строки. Никаких длинных объяснений. Никаких вводных фраз типа "Понятно", "Отлично", "Хороший вопрос". Сразу по делу. Один вопрос за раз — никогда не задавай два вопроса в одном сообщении.

Примеры правильных ответов:
— "Какой объект — магазин, офис, склад?"
— "Есть ли сейчас охрана?"
— "Тревожная кнопка от 10 000 ₸/мес, монтаж бесплатно. Какой объект?"
— "Для точного расчёта нужен выезд менеджера. Оставите контакты?"

КОМПАНИЯ: ТОО «AST KUZET M», с 2007 года, 18 лет, 1000+ объектов, лицензия №23006587, ул.Лободы 25/3, 9:00-18:00, тел. +7 705 775 14 75, ast-kuzet.kz.

ЦЕНЫ:
- Тревожная кнопка: от 10 000 ₸/мес, монтаж и оборудование бесплатно
- Пультовая охрана: от 12 000 ₸/мес
- Квартира: от 8 000 ₸/мес
- Физохрана: от 900 ₸/час
- Видеонаблюдение, пожарка: по смете

КЛЮЧЕВЫЕ ПРЕИМУЩЕСТВА (упоминай когда уместно):
- ГБР за 7-12 минут, прописано в договоре
- Матответственность до 1,5 млн ₸
- 18 лет на рынке, 1000+ объектов
- Первые 30 дней бесплатно

ЦЕЛЬ: выяснить тип объекта → предложить решение → получить контакты для менеджера.

ЗАЯВКА: когда клиент готов — собери имя, телефон, адрес. Напиши: [ЗАЯВКА: имя — телефон — адрес — тип объекта]

НЕЛЬЗЯ:
- Комментировать слова клиента ("действительно дорого", "серьёзный объект")
- Задавать два вопроса сразу
- Писать длинные абзацы
- Придумывать цены и факты
- Здороваться повторно если диалог уже идёт`;

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

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

    // Сначала проверяем паузу
    const { messages, paused, updated_at } = await getHistory(chatId);
    if (paused) return res.status(200).json({ ok: true });

    // Голосовые и файлы — только если не на паузе
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
      await sendTelegramWithButtons(
        `📩 <b>Новый клиент!</b>\n👤 ${senderName} (+${phone})\n\n💬 ${incomingText}`,
        phone
      );
    }

    const historyToUse = isNewSession ? [] : messages;
    historyToUse.push({ role: "user", content: incomingText });

    const systemWithContext = SYSTEM_PROMPT + (isNewSession
      ? "\n\nПервое сообщение клиента — поздоровайся одним словом и задай один уточняющий вопрос."
      : "\n\nДиалог продолжается — не здоровайся. Отвечай коротко.");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
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
