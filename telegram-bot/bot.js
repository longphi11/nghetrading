require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { getRandomQuestions, evaluateResult } = require('./questions');

// Kiểm tra BOT TOKEN
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.ADMIN_CHAT_ID;

if (!token || token === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  console.log('⚠️ CHƯA CẤU HÌNH TELEGRAM_BOT_TOKEN!');
  console.log('👉 Vui lòng tạo file .env từ file .env.example và điền TELEGRAM_BOT_TOKEN vào.');
  process.exit(1);
}

// HTTP Health Check Server cho Render Web Service
const http = require('http');
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('🤖 Telegram Bot Nghề Trading đang hoạt động 24/7!\n');
}).listen(port, () => {
  console.log(`🌐 HTTP Server listening on port ${port} for Render Health Check`);
});

const bot = new TelegramBot(token, { polling: true });
const geminiApiKey = process.env.GEMINI_API_KEY;

// Lưu trữ trạng thái phiên làm việc của người dùng (in-memory)
// Session: { step: 'CHAT_CONVERSATION' | 'QUIZ' | 'AWAITING_BOOKING_INFO', history: [], obstacle: '', questions: [], currentIdx: 0, score: 0, traits: [] }
const userSessions = new Map();

console.log('🤖 Telegram Bot Nghề Trading đã sẵn sàng hoạt động với chế độ Trò Chuyện Tự Nhiên!');

/**
 * Menu chức năng (Chỉ hiện khi khách gõ /menu hoặc yêu cầu)
 */
function getMainMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🧠 Bắt Bệnh Tâm Lý (Test Mark Douglas)', callback_data: 'START_QUIZ' }
        ],
        [
          { text: '📊 Phân Tích Vàng Mới Nhất (XAU/USD)', url: 'https://nghetrading.com/nhat-ky.html' },
          { text: '📖 Đọc Bài Tư Duy Gốc', url: 'https://nghetrading.com/tu-van.html' }
        ],
        [
          { text: '☕ Đặt Lịch Cafe / Coaching 1-1 với ĐẠI KA', callback_data: 'BOOK_COACHING' }
        ]
      ]
    }
  };
}

/**
 * Gọi Google Gemini AI trò chuyện tự nhiên (có bộ nhớ cuộc trò chuyện)
 */
async function askGeminiAI(userText, session) {
  if (!geminiApiKey || geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE') return null;

  const systemInstruction = 
`Bạn là ĐẠI KA - Chuyên gia Trading thực chiến và là chủ sáng lập thương hiệu Nghề Trading (website nghetrading.com).

TÔN CHỈ PHONG CÁCH TRÒ CHUYỆN:
1. TRÒ CHUYỆN NHƯ NGƯỜI THẬT: Bạn là một người anh/người thầy đi trước trong nghề trading. Nói chuyện tự nhiên, thấu cảm, điềm tĩnh, ấm áp nhưng rất thẳng thắn và sắc bén. Tuyệt đối KHÔNG giống robot hay mẫu quảng cáo.
2. THẤU HIỂU NỖI ĐAU: Khách nhắn tin vào đây thường đang mệt mỏi, bế tắc, cay đắng vì thua lỗ (gồng lỗ, trả thù thị trường, sợ vào lệnh, coi trading là cờ bạc...). Bạn lắng nghe họ tâm sự, giúp họ định hình lại Tư Duy Gốc.
3. CHUYÊN MÔN CỐT LÕI: Định hình tư duy trading theo trường phái tâm lý "Trading in the Zone" (Mark Douglas) và quản trị rủi ro nghiêm ngặt. Sản phẩm phân tích chính là Vàng (XAU/USD).
4. ĐIỀU HƯỚNG TỰ NHIÊN: Khi trò chuyện qua 2-3 lượt tin nhắn hoặc khi bạn cảm thấy khách đã giải tỏa tâm lý, bạn có thể tự nhiên rủ họ: "Nếu muốn chẩn đoán chính xác tính cách trading qua 8 câu test Mark Douglas hoặc hẹn cafe 1-1 với tôi để mổ xẻ nút thắt này, bạn gõ /menu nhé."`;

  // Xây dựng lịch sử trò chuyện
  const contents = [
    {
      role: 'user',
      parts: [{ text: systemInstruction }]
    },
    {
      role: 'model',
      parts: [{ text: 'Tôi hiểu rõ phong cách của mình. Tôi sẽ trò chuyện như một người anh đi trước, lắng nghe thấu cảm và định hướng tư duy trading chuẩn cho khách hàng.' }]
    }
  ];

  // Thêm lịch sử hội thoại gần nhất của khách
  if (session.history && session.history.length > 0) {
    session.history.slice(-6).forEach(h => {
      contents.push({
        role: h.role,
        parts: [{ text: h.text }]
      });
    });
  }

  // Thêm tin nhắn mới nhất
  contents.push({
    role: 'user',
    parts: [{ text: userText }]
  });

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await res.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const reply = data.candidates[0].content.parts[0].text;
      
      // Lưu lại vào bộ nhớ history
      session.history.push({ role: 'user', text: userText });
      session.history.push({ role: 'model', text: reply });

      return reply;
    }
  } catch (err) {
    console.error('⚠️ Lỗi gọi Gemini API:', err.message);
  }
  return null;
}

/**
 * Lệnh /start - Đón tiếp mở lời tự nhiên (KHÔNG HIỆN BẢNG BẤM)
 */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'bạn';

  // Khởi tạo phiên trò chuyện mới
  userSessions.set(chatId, {
    step: 'CHAT_CONVERSATION',
    history: [],
    obstacle: '',
    questions: [],
    currentIdx: 0,
    score: 0,
    traits: []
  });

  const welcomeMsg = 
`Chào ${firstName}, mừng bạn ghé thăm Nghề Trading.

Tôi hiểu khi bạn chủ động nhắn tin vào đây, có thể bạn đang cảm thấy mệt mỏi, bế tắc hoặc cay đắng sau những lệnh thua trên thị trường đúng không?

Hãy cứ coi đây là một góc nhỏ riêng tư. Điều gì đang khiến bạn trăn trở hoặc vướng mắc nhất trong trading hiện tại, cứ thoải mái chia sẻ với tôi nhé...`;

  bot.sendMessage(chatId, welcomeMsg);
});

/**
 * Lệnh /menu - Hiển thị bảng chức năng khi khách yêu cầu
 */
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `📋 **MENU CHỨC NĂNG NGHỀ TRADING**\nBạn có thể chọn công cụ hỗ trợ bên dưới:`, {
    parse_mode: 'Markdown',
    ...getMainMenuKeyboard()
  });
});

/**
 * Xử lý tất cả tin nhắn văn bản tự nhiên từ người dùng
 */
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Bỏ qua nếu là lệnh hệ thống /start hoặc /menu
  if (!text || text.startsWith('/')) return;

  let session = userSessions.get(chatId);
  if (!session) {
    session = { step: 'CHAT_CONVERSATION', history: [], obstacle: '', questions: [], currentIdx: 0, score: 0, traits: [] };
    userSessions.set(chatId, session);
  }

  // 1. Nếu khách đang ở bước nhập thông tin Đặt lịch Cafe
  if (session.step === 'AWAITING_BOOKING_INFO') {
    session.step = 'CHAT_CONVERSATION';

    await bot.sendMessage(chatId,
`✅ **Đã ghi nhận thông tin của bạn!**

Tôi sẽ xem qua thông tin và liên hệ trực tiếp với bạn qua Telegram/Điện thoại để chốt lịch hẹn cafe 1-1 nhé. 

Chúc bạn giữ vững tâm lý và giao dịch kỷ luật!`
    );

    // Báo cáo về Telegram cho ĐẠI KA
    if (adminChatId) {
      const adminMsg =
`🚨 **YÊU CẦU ĐẶT LỊCH CAFE / COACHING 1-1 MỚI!**

👤 **Khách hàng:** ${msg.from.first_name || ''} ${msg.from.last_name || ''} (@${msg.from.username || 'N/A'})
📞 **Thông tin liên hệ/Thời gian hẹn:** ${text}
💬 **Lịch sử tâm sự:** ${session.history.map(h => h.text).slice(-4).join(' | ')}

👉 *ĐẠI KA hãy bấm vào @${msg.from.username || ''} để phản hồi khách ngay!*`;

      bot.sendMessage(adminChatId, adminMsg, { parse_mode: 'Markdown' }).catch(err => console.error('Lỗi gửi tin admin:', err.message));
    }
    return;
  }

  // 2. Nếu khách gõ các từ khóa muốn mở trắc nghiệm hoặc đặt lịch
  const lowerText = text.toLowerCase();
  if (lowerText.includes('trắc nghiệm') || lowerText.includes('làm test') || lowerText.includes('bắt bệnh') || lowerText.includes('mark douglas')) {
    session.step = 'QUIZ';
    session.questions = getRandomQuestions(8);
    session.currentIdx = 0;
    session.score = 0;
    session.traits = [];

    await bot.sendMessage(chatId, `Bây giờ chúng ta sẽ bắt đầu **8 câu hỏi trắc nghiệm ngắn** từ bộ tư duy Mark Douglas để bóc tách tính cách trading của bạn!`, { parse_mode: 'Markdown' });
    return sendQuestion(chatId, session);
  }

  if (lowerText.includes('đặt lịch') || lowerText.includes('cafe') || lowerText.includes('gặp trực tiếp') || lowerText.includes('coaching')) {
    session.step = 'AWAITING_BOOKING_INFO';
    return bot.sendMessage(chatId,
`☕ **ĐẶT LỊCH HẸN CAFE / TƯ VẤN 1-1 VỚI ĐẠI KA**

Buổi trò chuyện 1-1 sẽ giúp bạn mổ xẻ chính xác nút thắt tâm lý & định hình lại con đường trading chuyên nghiệp.

👉 **Vui lòng nhập Số điện thoại + Khoảng thời gian bạn rảnh (VD: 0912345678 - Chiều T7 tuần này):**`
    );
  }

  // 3. Trò chuyện 1-1 tự nhiên bằng Gemini AI (Phản hồi thuần văn bản)
  bot.sendChatAction(chatId, 'typing');

  const aiReply = await askGeminiAI(text, session);
  if (aiReply) {
    await bot.sendMessage(chatId, aiReply).catch(async () => {
      await bot.sendMessage(chatId, aiReply);
    });

    // Báo cáo tóm tắt bế tắc của khách về Telegram cá nhân cho ĐẠI KA
    if (adminChatId && session.history.length === 2) {
      const alertMsg = 
`📥 **TÂM SỰ MỚI TỪ KHÁCH HÀNG!**

👤 **Khách hàng:** ${msg.from.first_name || ''} ${msg.from.last_name || ''} (@${msg.from.username || 'Không username'})
💬 **Nội dung tâm sự:** "${text}"

👉 *ĐẠI KA có thể vào theo dõi hoặc nhắn trực tiếp cho khách qua @${msg.from.username || ''}!*`;

      bot.sendMessage(adminChatId, alertMsg, { parse_mode: 'Markdown' }).catch(err => console.error('Lỗi báo admin:', err.message));
    }
  } else {
    // Fallback nếu không gọi được Gemini API Key
    await bot.sendMessage(chatId, 
`Tôi hiểu cảm giác của bạn. Trading là một hành trình quản trị tâm lý và rủi ro rất khắc nghiệt.

Nếu bạn muốn bóc tách bài test tâm lý Mark Douglas hoặc đặt lịch cafe 1-1 với tôi, bạn gõ lệnh /menu nhé.`
    );
  }
});

/**
 * Gửi 1 câu hỏi trắc nghiệm kèm Inline Keyboard
 */
function sendQuestion(chatId, session) {
  const q = session.questions[session.currentIdx];
  const qNum = session.currentIdx + 1;

  const inlineKeyboard = q.options.map((opt, idx) => ([
    {
      text: opt.text,
      callback_data: `ANS_${qNum}_${idx}`
    }
  ]));

  bot.sendMessage(chatId, `**Câu ${qNum}/8:**\n${q.question}`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: inlineKeyboard
    }
  });
}

/**
 * Xử lý sự kiện Callback Query từ nút bấm Inline (khi khách gọi /menu hoặc làm quiz)
 */
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  let session = userSessions.get(chatId) || { step: 'CHAT_CONVERSATION', history: [], questions: [], currentIdx: 0, score: 0, traits: [] };

  bot.answerCallbackQuery(query.id);

  // 1. Nút bấm khởi động Quiz
  if (data === 'START_QUIZ') {
    session.step = 'QUIZ';
    session.questions = getRandomQuestions(8);
    session.currentIdx = 0;
    session.score = 0;
    session.traits = [];
    return sendQuestion(chatId, session);
  }

  // 2. Nút Đặt lịch Coaching
  if (data === 'BOOK_COACHING') {
    session.step = 'AWAITING_BOOKING_INFO';
    return bot.sendMessage(chatId,
`☕ **ĐẶT LỊCH HẸN CAFE / TƯ VẤN 1-1 VỚI ĐẠI KA**

Buổi trò chuyện 1-1 sẽ giúp bạn mổ xẻ chính xác nút thắt tâm lý & định hình lại con đường trading chuyên nghiệp.

👉 **Vui lòng nhập Số điện thoại + Khoảng thời gian bạn rảnh (VD: 0912345678 - Chiều T7 tuần này):**`
    );
  }

  // 3. Trả lời câu hỏi trắc nghiệm
  if (data.startsWith('ANS_')) {
    const parts = data.split('_');
    const qNum = parseInt(parts[1], 10);
    const optIdx = parseInt(parts[2], 10);

    if (session.step !== 'QUIZ' || session.currentIdx !== qNum - 1) return;

    const currentQ = session.questions[session.currentIdx];
    const selectedOpt = currentQ.options[optIdx];

    session.score += selectedOpt.score;
    session.traits.push(selectedOpt.trait);
    session.currentIdx++;

    if (session.currentIdx < session.questions.length) {
      sendQuestion(chatId, session);
    } else {
      session.step = 'CHAT_CONVERSATION';
      const evalResult = evaluateResult(session.score, 16);

      const reportMsg = 
`🎯 **BÁO CÁO CHẨN ĐOÁN TÂM LÝ TRADING CỦA BẠN**
---
📊 **Điểm tâm lý:** ${session.score}/16
🏷️ **Đánh giá:** *${evalResult.level}*
👤 **Tính cách:** ${session.traits.slice(0, 4).join(' • ')}

🔍 **Góc nhìn:** ${evalResult.summary}
💡 **Lời khuyên:** ${evalResult.advice}
---
*Nếu bạn muốn mổ xẻ trực tiếp nút thắt này, hãy chọn Đặt lịch cafe 1-1 với tôi nhé!*`;

      await bot.sendMessage(chatId, reportMsg, {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      });

      // Báo về Telegram cho ĐẠI KA
      if (adminChatId) {
        const adminAlert = 
`📥 **BÁO CÁO HỒ SƠ TÂM LÝ KHÁCH HÀNG MỚI!**

👤 **Khách hàng:** ${query.from.first_name || ''} ${query.from.last_name || ''} (@${query.from.username || 'Không username'})
🧠 **Điểm trắc nghiệm:** ${session.score}/16
🏷️ **Đánh giá tính cách:** ${session.traits.join(', ')}

👉 *ĐẠI KA hãy bấm vào @${query.from.username || ''} để nhắn tin tư vấn chốt sale!*`;

        bot.sendMessage(adminChatId, adminAlert, { parse_mode: 'Markdown' }).catch(err => console.error('Lỗi gửi tin admin:', err.message));
      }
    }
  }
});
