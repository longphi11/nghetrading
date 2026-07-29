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
const userSessions = new Map();

console.log('🤖 Telegram Bot Nghề Trading đã sẵn sàng ở chế độ Trò Chuyện Bạn Bè!');

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
 * Gọi Google Gemini AI trò chuyện tự nhiên như 2 người bạn trader
 */
async function askGeminiAI(userText, session) {
  if (!geminiApiKey || geminiApiKey === 'YOUR_GEMINI_API_KEY_HERE') return null;

  const systemInstruction = 
`Bạn là ĐẠI KA - Chủ sáng lập Nghề Trading (nghetrading.com), một trader thực chiến lâu năm và giàu kinh nghiệm.

PHONG CÁCH TRÒ CHUYỆN (NHƯ 2 NGƯỜI BẠN TRADING):
1. TRÒ CHUYỆN TỰ NHIÊN BẠN BÈ: Bạn xưng "tôi" - "bạn". Nói chuyện cởi mở, tự nhiên như 2 người bạn trader ngồi cafe trao đổi kinh nghiệm. Bạn chào hỏi thân tình, hỏi thăm về kinh nghiệm trading của đối phương (hỏi xem họ trade lâu chưa, đợt này kết quả ổn không, hay đánh cặp tiền gì - chủ yếu trao đổi về Vàng XAU/USD).
2. LẮNG NGHE & CHƯA ÉP CẦU: Tuyệt đối KHÔNG vội vàng giới thiệu menu, bán hàng hay chèn kịch bản web khi đối phương mới chỉ nhắn tin giao lưu bình thường.
3. CHỈ ĐIỀU HƯỚNG KHI KHÁCH BẾ TẮC / CẦN TƯ VẤN: Chỉ khi đối phương chia sẻ họ đang bế tắc, mệt mỏi, thua lỗ, cần tư vấn chiến lược hay tâm lý trading, bạn mới bắt đầu thấu cảm sâu sắc, chỉ ra nút thắt tư duy theo trường phái "Trading in the Zone" (Mark Douglas) và nhẹ nhàng gợi ý: "Nếu bạn muốn chẩn đoán chính xác tính cách trading qua bài test 8 câu Mark Douglas hoặc muốn hẹn cafe 1-1 để tôi mổ xẻ trực tiếp nút thắt này, bạn gõ /menu hoặc bảo tôi nhé!"`;

  // Xây dựng lịch sử trò chuyện
  const contents = [
    {
      role: 'user',
      parts: [{ text: systemInstruction }]
    },
    {
      role: 'model',
      parts: [{ text: 'Tôi hiểu rồi. Tôi sẽ trò chuyện hoàn toàn tự nhiên như 2 người bạn trader ngồi cafe giao lưu, lắng nghe họ chia sẻ trước khi điều hướng.' }]
    }
  ];

  // Thêm lịch sử hội thoại gần nhất của khách
  if (session.history && session.history.length > 0) {
    session.history.slice(-8).forEach(h => {
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
 * Lệnh /start - Đón tiếp mở lời tự nhiên như bạn bè (KHÔNG HIỆN BẢNG BẤM)
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

  const welcomeMsg = `Chào ${firstName} nhé! Mừng bạn ghé sang Nghề Trading.

Bạn đã bước chân vào thị trường trading này lâu chưa? Kết quả đợt này của bạn vẫn ổn cả chứ?`;

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

  // 3. Trò chuyện 1-1 tự nhiên giữa 2 bạn trader bằng Gemini AI
  bot.sendChatAction(chatId, 'typing');

  const aiReply = await askGeminiAI(text, session);
  if (aiReply) {
    await bot.sendMessage(chatId, aiReply).catch(async () => {
      await bot.sendMessage(chatId, aiReply);
    });

    // Báo cáo tóm tắt bế tắc của khách về Telegram cá nhân cho ĐẠI KA
    if (adminChatId && session.history.length === 2) {
      const alertMsg = 
`📥 **GIAO LƯU MỚI TỪ KHÁCH HÀNG!**

👤 **Khách hàng:** ${msg.from.first_name || ''} ${msg.from.last_name || ''} (@${msg.from.username || 'Không username'})
💬 **Nội dung:** "${text}"

👉 *ĐẠI KA có thể nhắn trực tiếp cho khách qua @${msg.from.username || ''}!*`;

      bot.sendMessage(adminChatId, alertMsg, { parse_mode: 'Markdown' }).catch(err => console.error('Lỗi báo admin:', err.message));
    }
  } else {
    await bot.sendMessage(chatId, 
`Giao dịch trên thị trường này quả thực có rất nhiều thăng trầm.

Nếu bạn đang vướng mắc hoặc muốn làm bài test tâm lý Mark Douglas, bạn gõ lệnh /menu nhé.`
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
