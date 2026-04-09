import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const SYSTEM_PROMPT = `Ты менеджер по продажам охранного агентства AST-KUZET, Караганда. Общаешься с клиентами в WhatsApp. Цель — выявить потребность и довести до заявки.

КОМПАНИЯ: ТОО «AST KUZET M», с 2007 года, 18 лет, 1000+ объектов, лицензия №23006587, ул.Лободы 25/3, 9:00-18:00, тел. +7 705 775 14 75, ast-kuzet.kz. Клиенты: BMW центр, REDPARK, WOOPPAY.

ЦЕНЫ:
- Тревожная кнопка: от 10 000 ₸/мес, монтаж и оборудование бесплатно
- Пультовая охрана: от 12 000 ₸/мес
- Квартира: от 8 000 ₸/мес
- Физохрана: от 900 ₸/час
- Видеонаблюдение, пожарка: по смете

УСЛОВИЯ: ГБР 7-12 мин (в договоре), матответственность до 1,5 млн ₸, договор от 6 мес, монтаж 1-2 дня, рассрочка 3 мес, мобильное приложение.

АКЦИИ: 30 дней пультовой охраны бесплатно новым клиентам. Оборудование в аренду для малых объектов.

ПРОДАЖИ: Сначала выясняй — тип объекта, площадь, входы, окна, есть ли сигнализация. Не больше 2 вопросов за раз. Продавай ценность: скорость ГБР, матответственность, опыт 18 лет. На возражение "дорого" — объясняй ценность, предлагай тревожную кнопку или акцию. На "есть охрана" — предлагай сравнить условия.

ЗАЯВКА: Если клиент готов — собери имя, телефон, адрес, тип объекта. Скажи что менеджер свяжется за 10 минут. Напиши: [ЗАЯВКА: имя — телефон — адрес — тип объекта]

ПРАВИЛА:
- Приветствие только "Здравствуйте", только при первом сообщении или после 12 часов молчания
- Пиши кратко, как живой менеджер в WhatsApp — без длинных тире, без восклицаний везде
- Длинный ответ только если клиент сам попросил подробнее
- Язык клиента (русский или казахский)
- Не придумывай цены и факты которых нет выше
- На вопрос "ты бот?" — честно: "Да, помощник AST-KUZET. Могу ответить на вопросы или передать менеджеру"`;

const TWELVE_HOURS = 12 * 60 * 60 * 1000;

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
      .select("id")
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
    const messageData = req.body;
    const webhookType = messageData?.typeWebhook;

    // Обрабатываем исходящие сообщения (команды #стоп/#старт от менеджера)
    if (webhookType === "outgoingMessageReceived") {
      const text = messageData.messageData?.textMessageData?.textMessage?.trim();
      const chatId = messageData.senderData?.chatId;
      if (chatId) {
        if (text === "#стоп") await setPaused(chatId, true);
        if (text === "#старт") await setPaused(chatId, false);
      }
      return res.status(200).json({ ok: true });
    }

    // Обрабатываем только входящие сообщения
    if (webhookType !== "incomingMessageReceived") {
      return res.status(200).json({ ok: true });
    }

    const senderData = messageData.senderData;
    const messageBody = messageData.messageData;
    const chatId = senderData.chatId;
    const messageId = messageData.idMessage;

    // Защита от дублей — проверяем ID сообщения
    if (messageId) {
      const alreadyProcessed = await isProcessed(messageId);
      if (alreadyProcessed) return res.status(200).json({ ok: true });
      await markProcessed(messageId);
    }

    // Ответ на голосовые, фото, видео
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

    const { messages, paused, updated_at } = await getHistory(chatId);
    if (paused) return res.status(200).json({ ok: true });

    const isNewSession = !updated_at || (Date.now() - new Date(updated_at).getTime()) > TWELVE_HOURS;
    const historyToUse = isNewSession ? [] : messages;

    historyToUse.push({ role: "user", content: incomingText });

    const systemWithContext = SYSTEM_PROMPT + (isNewSession
      ? "\n\nПервое сообщение или прошло 12+ часов — поздоровайся."
      : "\n\nДиалог продолжается — не здоровайся.");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemWithContext,
      messages: historyToUse,
    });

    const replyText = response.content[0].text;
    historyToUse.push({ role: "assistant", content: replyText });
    await saveHistory(chatId, historyToUse);

    if (replyText.includes("[ЗАЯВКА:")) {
      const match = replyText.match(/\[ЗАЯВКА:([^\]]+)\]/);
      if (match) console.log(`🔔 ЗАЯВКА (${chatId}): ${match[1].trim()}`);
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
