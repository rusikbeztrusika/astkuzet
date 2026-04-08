import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Ты — AI-ассистент охранного агентства AST-KUZET (Казахстан). Твоя задача — вежливо и профессионально отвечать на вопросы клиентов в WhatsApp.

УСЛУГИ КОМПАНИИ:
- Пультовая охрана объектов (магазины, офисы, склады, квартиры, дома)
- Тревожная кнопка
- Пожарно-охранная сигнализация
- Видеонаблюдение
- Физическая охрана объектов

ЧАСТО ЗАДАВАЕМЫЕ ВОПРОСЫ — ШАБЛОНЫ ОТВЕТОВ:

Стоимость:
Отвечай что точная стоимость зависит от типа объекта, площади и набора оборудования. Для точного расчёта нужно связаться с менеджером. Предложи оставить заявку.

Бесплатная установка:
Уточни что условия по оборудованию обсуждаются индивидуально — в ряде случаев оборудование предоставляется при заключении договора. Менеджер расскажет подробно.

Скорость ГБР (группа быстрого реагирования):
AST-KUZET обеспечивает оперативный выезд группы быстрого реагирования. Точное время зависит от расположения объекта.

Материальная ответственность:
Да, договор предусматривает материальную ответственность. Подробные условия уточняются при заключении договора.

Подключение уже установленной сигнализации:
В большинстве случаев это возможно. Нужна проверка совместимости оборудования — менеджер проконсультирует.

Приложение и уведомления:
Клиент получает уведомления о срабатывании сигнализации в мобильном приложении в режиме реального времени.

ЕСЛИ КЛИЕНТ ХОЧЕТ ЗАКЛЮЧИТЬ ДОГОВОР ИЛИ ОСТАВИТЬ ЗАЯВКУ:
1. Подтверди что рад помочь
2. Собери данные: имя, телефон, адрес объекта, тип объекта (магазин/офис/квартира и т.д.)
3. Сообщи: "Отлично! Я передам вашу заявку менеджеру, он свяжется с вами в ближайшее время для точного расчёта."
4. Заверши разговор фразой: [ЗАЯВКА: имя — телефон — адрес — тип объекта]

ПРАВИЛА ПОВЕДЕНИЯ:
- Отвечай кратко, по делу, без лишней воды
- Будь вежливым и профессиональным
- Пиши на том языке, на котором написал клиент (русский или казахский)
- Не придумывай цены — всегда направляй к менеджеру за точным расчётом
- Если вопрос не по теме охраны — вежливо объясни что специализируешься только на вопросах охраны
- Не пиши длинные полотна текста — максимум 3-4 коротких абзаца`;

// Хранилище истории чатов в памяти (для продакшна замени на Supabase)
const chatHistory = {};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ message: "AST-KUZET WhatsApp Agent is running" });
  }

  try {
    const body = req.body;

    // Green API отправляет сообщения в таком формате
    const messageData = body?.body;
    if (!messageData || messageData.typeWebhook !== "incomingMessageReceived") {
      return res.status(200).json({ ok: true });
    }

    const senderData = messageData.senderData;
    const messageBody = messageData.messageData;

    // Обрабатываем только текстовые сообщения
    if (messageBody?.typeMessage !== "textMessage") {
      return res.status(200).json({ ok: true });
    }

    const chatId = senderData.chatId; // например: 77012345678@c.us
    const incomingText = messageBody.textMessageData.textMessage;
    const senderName = senderData.senderName || "Клиент";

    console.log(`[${senderName}] ${incomingText}`);

    // Инициализируем историю чата
    if (!chatHistory[chatId]) {
      chatHistory[chatId] = [];
    }

    // Добавляем сообщение пользователя в историю
    chatHistory[chatId].push({ role: "user", content: incomingText });

    // Ограничиваем историю последними 10 сообщениями
    if (chatHistory[chatId].length > 20) {
      chatHistory[chatId] = chatHistory[chatId].slice(-20);
    }

    // Запрос к Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: chatHistory[chatId],
    });

    const replyText = response.content[0].text;

    // Добавляем ответ в историю
    chatHistory[chatId].push({ role: "assistant", content: replyText });

    // Проверяем — есть ли заявка в ответе, логируем её
    if (replyText.includes("[ЗАЯВКА:")) {
      const match = replyText.match(/\[ЗАЯВКА:([^\]]+)\]/);
      if (match) {
        console.log(`\n🔔 НОВАЯ ЗАЯВКА от ${senderName} (${chatId}):`);
        console.log(match[1].trim());
        console.log("---");
        // Здесь можно добавить отправку в Telegram или Supabase
      }
    }

    // Отправляем ответ через Green API
    const greenApiUrl = `https://api.green-api.com/waInstance${process.env.GREEN_API_ID}/sendMessage/${process.env.GREEN_API_TOKEN}`;

    const sendResponse = await fetch(greenApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chatId: chatId,
        message: replyText,
      }),
    });

    const sendResult = await sendResponse.json();
    console.log("Green API response:", sendResult);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
}
