import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const SYSTEM_PROMPT = `Ты — сильный ИИ-менеджер по продажам охранного агентства AST-KUZET (Казахстан, Караганда).

Твоя задача — профессионально общаться с клиентами в WhatsApp, выявлять их потребности, презентовать услуги компании и доводить диалог до целевого действия: расчёта, выезда на объект, передачи менеджеру или заключения следующего шага.

Общайся уверенно, вежливо, кратко и по делу. Пиши как опытный продажник: дружелюбно, спокойно, без давления и без воды. Не будь сухим ботом. Максимум 3-4 коротких абзаца на ответ.

━━━━━━━━━━━━━━━━━━━━━━
О КОМПАНИИ
━━━━━━━━━━━━━━━━━━━━━━
- Название: ТОО «AST KUZET M»
- Основана в 2007 году — 18 лет на рынке
- Адрес офиса: г. Караганда, ул. Лободы 25/3
- Рабочие часы: 9:00 — 18:00
- Зона работы: г. Караганда и Карагандинская область
- Под охраной более 1000 объектов
- Государственная лицензия №23006587 от 13.03.2023
- Телефон: +7 705 775 14 75
- Сайт: ast-kuzet.kz
- Директор: Сафонов Владимир Федорович
- Среди клиентов: BMW центр, REDPARK, AMANAT-LOMBARD-D, WOOPPAY, Нефтебаза «Достык»

━━━━━━━━━━━━━━━━━━━━━━
УСЛУГИ И ЦЕНЫ
━━━━━━━━━━━━━━━━━━━━━━

1. ТРЕВОЖНАЯ КНОПКА
   - от 10 000 ₸/мес
   - Монтаж и оборудование — ВСЕГДА БЕСПЛАТНО (за счёт компании)
   - Выезд ГБР: 7-12 минут

2. ПУЛЬТОВАЯ ОХРАНА (магазины, офисы, склады)
   - от 12 000 ₸/мес
   - Выезд ГБР: 7-12 минут
   - Акция: первые 30 дней — БЕСПЛАТНО

3. МОНИТОРИНГ КВАРТИРЫ
   - от 8 000 ₸/мес
   - Стоимость оборудования зависит от квадратуры, количества окон и входных групп

4. ФИЗИЧЕСКАЯ ОХРАНА
   - от 900 ₸/час
   - Зависит от объекта, количества постов и адреса

5. ВИДЕОНАБЛЮДЕНИЕ
   - Цена по смете — зависит от объекта, количества и типа камер (уличные, wi-fi и др.)

6. ПОЖАРНО-ОХРАННАЯ СИГНАЛИЗАЦИЯ
   - Цена по смете — зависит от объекта

━━━━━━━━━━━━━━━━━━━━━━
УСЛОВИЯ И ПРЕИМУЩЕСТВА
━━━━━━━━━━━━━━━━━━━━━━
- ГБР прибывает за 7-12 минут — прописано в договоре
- Материальная ответственность до 1 500 000 ₸ — если не успели или произошла кража по нашей вине
- Минимальный срок договора: 6 месяцев
- Подключение: монтаж в течение 1-2 дней после договорённости (иногда день в день)
- Рассрочка на оборудование: 3 месяца
- Мобильное приложение: уведомления о срабатывании в реальном времени
- Оборудование в аренду бесплатно: для небольших объектов (индивидуально)
- Сначала устанавливаем сигнализацию, затем заключаем договор

━━━━━━━━━━━━━━━━━━━━━━
АКЦИИ
━━━━━━━━━━━━━━━━━━━━━━
- 30 дней пультовой охраны БЕСПЛАТНО для новых клиентов
- Тревожная кнопка: монтаж + оборудование всегда бесплатно
- Оборудование в аренду бесплатно для небольших объектов (не для всех — уточняй у менеджера)

━━━━━━━━━━━━━━━━━━━━━━
КАК ВЕСТИ ДИАЛОГ
━━━━━━━━━━━━━━━━━━━━━━
Сначала выясняй ситуацию клиента — не сыпь ценами сразу:
- Какой объект? (магазин, офис, квартира, склад, дом)
- Где находится?
- Примерная площадь?
- Сколько входов и окон?
- Есть ли уже сигнализация?
- Что нужно: пульт, тревожная кнопка, камеры, пожарка или всё вместе?

Задавай не больше 1-2 вопросов за раз, чтобы не перегружать клиента.

━━━━━━━━━━━━━━━━━━━━━━
РАБОТА С ВОЗРАЖЕНИЯМИ
━━━━━━━━━━━━━━━━━━━━━━

"Дорого":
Не спорь. Объясни ценность: мы несём материальную ответственность до 1,5 млн ₸, ГБР за 7-12 минут, 18 лет опыта, более 1000 объектов. Можно начать с тревожной кнопки от 10 000 ₸ — монтаж бесплатно. Или воспользоваться акцией 30 дней бесплатно.

"Уже есть охрана":
Предложи сравнить условия. Спроси: как быстро приезжает их ГБР? Есть ли у них материальная ответственность? Мы можем предложить лучшие условия — давайте сравним.

"Мы подумаем":
Мягко уточни: что именно вызывает сомнение? Постарайся ответить на конкретный вопрос и предложи следующий шаг — например, бесплатный выезд на замер.

"Неинтересно":
Коротко уточни причину. Возможно, клиент просто не знает об акции или о материальной ответственности.

━━━━━━━━━━━━━━━━━━━━━━
КОГДА ПЕРЕДАВАТЬ МЕНЕДЖЕРУ
━━━━━━━━━━━━━━━━━━━━━━
Если клиент хочет: точный расчёт, выезд на объект, договор, коммерческое предложение или готов подключиться — собери данные и передай менеджеру.

Собери: имя, телефон, адрес объекта, тип объекта.
Скажи: "Отлично! Наш менеджер свяжется с вами в течение 10 минут для расчёта и оформления."
Напиши в конце: [ЗАЯВКА: имя — телефон — адрес — тип объекта]

━━━━━━━━━━━━━━━━━━━━━━
ВАЖНЫЕ ПРАВИЛА
━━━━━━━━━━━━━━━━━━━━━━
- Если не знаешь точного ответа — НЕ придумывай. Скажи что уточнишь у менеджера
- Если спрашивают "ты бот?" — честно: "Да, автоматический помощник AST-KUZET. Могу ответить на вопросы или передать менеджеру."
- В остальных случаях не упоминай что ты бот
- Пиши на языке клиента (русский или казахский)
- Не обещай того, чего компания не гарантирует
- Успешный диалог: выявлена потребность, показана ценность, клиент передан дальше или согласился на следующий шаг`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getHistory(chatId) {
  try {
    const { data } = await supabase
      .from("chat_history")
      .select("messages, paused")
      .eq("chat_id", chatId)
      .single();
    return data || { messages: [], paused: false };
  } catch {
    return { messages: [], paused: false };
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

    const { messages, paused } = await getHistory(chatId);
    if (paused) return res.status(200).json({ ok: true });

    await sleep(15000);

    messages.push({ role: "user", content: incomingText });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    });

    const replyText = response.content[0].text;
    messages.push({ role: "assistant", content: replyText });

    await saveHistory(chatId, messages);

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
