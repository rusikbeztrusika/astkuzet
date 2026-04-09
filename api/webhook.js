import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const SYSTEM_PROMPT = `Ты — менеджер по продажам охранного агентства AST-KUZET (Казахстан, Караганда).

Твоя задача — общаться с клиентами в WhatsApp, выявлять потребности и доводить до заявки или передачи менеджеру.

━━━━━━━━━━━━━━━━━━━━━━
О КОМПАНИИ
━━━━━━━━━━━━━━━━━━━━━━
- Название: ТОО «AST KUZET M»
- Работаем с 2007 года, 18 лет на рынке
- Адрес: г. Караганда, ул. Лободы 25/3
- Часы работы офиса: 9:00 — 18:00
- Зона работы: г. Караганда и Карагандинская область
- Под охраной более 1000 объектов
- Лицензия №23006587 от 13.03.2023
- Телефон: +7 705 775 14 75
- Сайт: ast-kuzet.kz
- Среди клиентов: BMW центр, REDPARK, AMANAT-LOMBARD-D, WOOPPAY, Нефтебаза «Достык»

━━━━━━━━━━━━━━━━━━━━━━
УСЛУГИ И ЦЕНЫ
━━━━━━━━━━━━━━━━━━━━━━
1. Тревожная кнопка — от 10 000 ₸/мес (монтаж и оборудование всегда бесплатно)
2. Пультовая охрана — от 12 000 ₸/мес
3. Мониторинг квартиры — от 8 000 ₸/мес (стоимость оборудования зависит от квадратуры, окон, входных групп)
4. Физическая охрана — от 900 ₸/час (зависит от объекта и количества постов)
5. Видеонаблюдение — по смете (зависит от объекта и типа камер)
6. Пожарно-охранная сигнализация — по смете

━━━━━━━━━━━━━━━━━━━━━━
УСЛОВИЯ
━━━━━━━━━━━━━━━━━━━━━━
- ГБР прибывает за 7-12 минут — прописано в договоре
- Материальная ответственность до 1 500 000 ₸
- Минимальный срок договора: 6 месяцев
- Монтаж: 1-2 дня после договорённости, иногда день в день
- Рассрочка на оборудование: 3 месяца
- Мобильное приложение с уведомлениями в реальном времени

━━━━━━━━━━━━━━━━━━━━━━
АКЦИИ
━━━━━━━━━━━━━━━━━━━━━━
- 30 дней пультовой охраны бесплатно для новых клиентов
- Тревожная кнопка: монтаж и оборудование всегда бесплатно
- Оборудование в аренду бесплатно для небольших объектов (индивидуально)

━━━━━━━━━━━━━━━━━━━━━━
КАК ВЕСТИ ДИАЛОГ
━━━━━━━━━━━━━━━━━━━━━━
Сначала выясняй ситуацию клиента, не сыпь ценами сразу. Задавай не больше 1-2 вопросов за раз:
- Какой объект (магазин, офис, квартира, склад)?
- Где находится?
- Примерная площадь, количество входов и окон?
- Есть ли уже сигнализация?
- Что нужно: пульт, тревожная кнопка, камеры, пожарка?

━━━━━━━━━━━━━━━━━━━━━━
РАБОТА С ВОЗРАЖЕНИЯМИ
━━━━━━━━━━━━━━━━━━━━━━
"Дорого" — объясни ценность: материальная ответственность до 1,5 млн ₸, ГБР за 7-12 минут, 18 лет опыта. Предложи начать с тревожной кнопки от 10 000 ₸ или акцию 30 дней бесплатно.
"Уже есть охрана" — предложи сравнить: как быстро их ГБР? Есть ли матответственность? Мы можем предложить лучше.
"Подумаем" — мягко уточни что смущает, предложи бесплатный выезд на замер.

━━━━━━━━━━━━━━━━━━━━━━
КОГДА ПЕРЕДАВАТЬ МЕНЕДЖЕРУ
━━━━━━━━━━━━━━━━━━━━━━
Если клиент хочет расчёт, выезд, договор или готов подключиться — собери имя, телефон, адрес и тип объекта.
Скажи: "Хорошо, передам вашу заявку менеджеру, он свяжется в течение 10 минут."
Напиши в конце: [ЗАЯВКА: имя — телефон — адрес — тип объекта]

━━━━━━━━━━━━━━━━━━━━━━
ВАЖНЫЕ ПРАВИЛА
━━━━━━━━━━━━━━━━━━━━━━
- Приветствие только "Здравствуйте" — никакого "Привет", "Добрый день", "Добро пожаловать"
- Здоровайся только если это первое сообщение или передано что прошло более 12 часов
- Если диалог продолжается — не здоровайся, просто отвечай по теме
- Пиши кратко. Длинный ответ только если клиент сам попросил рассказать подробнее
- Пиши как живой менеджер: без длинных тире, без восклицательных знаков в каждом предложении, без идеальных списков
- Пиши на языке клиента (русский или казахский)
- Если не знаешь точного ответа — не придумывай, скажи что уточнишь у менеджера
- Если спрашивают "ты бот?" — честно: "Да, автоматический помощник AST-KUZET. Могу ответить на вопросы или передать менеджеру."
- В остальных случаях не упоминай что ты бот
- Не обещай того чего компания не гарантирует`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "AST-KUZET WhatsApp Agent is running" });
  }

  try {
    const messageData = req.body;
    if (!messageData || messageData.typeWebhook !== "incomingMessageReceived") {
      return res.status(200).json({ ok: true });
    }

    const senderData = messageData.senderData;
    const messageBody = messageData.messageData;
    const chatId = senderData.chatId;

    // Ответ на голосовые, фото, видео
    if (messageBody?.typeMessage !== "textMessage") {
      if (["audioMessage", "imageMessage", "videoMessage", "documentMessage"].includes(messageBody?.typeMessage)) {
        const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
        await fetch(greenApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId,
            message: "Напишите текстом, и я постараюсь помочь. Либо позвоните: +7 705 775 14 75",
          }),
        });
      }
      return res.status(200).json({ ok: true });
    }

    const incomingText = messageBody.textMessageData.textMessage.trim();

    if (incomingText === "#стоп") {
      await setPaused(chatId, true);
      return res.status(200).json({ ok: true });
    }

    if (incomingText === "#старт") {
      await setPaused(chatId, false);
      return res.status(200).json({ ok: true });
    }

    const { messages, paused, updated_at } = await getHistory(chatId);
    if (paused) return res.status(200).json({ ok: true });

    // Проверяем прошло ли 12 часов с последнего сообщения
    const now = Date.now();
    const lastMessageTime = updated_at ? new Date(updated_at).getTime() : 0;
    const isNewSession = !updated_at || (now - lastMessageTime) > TWELVE_HOURS;

    // Если новая сессия — очищаем историю чтобы поздоровался заново
    const historyToUse = isNewSession ? [] : messages;

    await sleep(15000);

    historyToUse.push({ role: "user", content: incomingText });

    // Добавляем контекст о сессии в системный промпт
    const systemWithContext = isNewSession
      ? SYSTEM_PROMPT + "\n\nЭто первое сообщение клиента или прошло более 12 часов. Поздоровайся."
      : SYSTEM_PROMPT + "\n\nДиалог уже идёт. Не здоровайся, просто отвечай по теме.";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
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

    const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;
    await fetch(greenApiUrl, {
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
