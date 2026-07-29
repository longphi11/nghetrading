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

const bot = new TelegramBot(token, { polling: true });

// Lưu trữ trạng thái phiên làm việc của người dùng (in-memory)
// Struct: { step: 'AWAITING_OBSTACLE' | 'QUIZ' | 'BOOKING', obstacle: '', questions: [], currentIdx: 0, score: 0, traits: [], bookingData: {} }
const userSessions = new Map();

console.log('🤖 Telegram Bot Nghề Trading đã sẵn sàng hoạt động!');

/**
 * Menu chính của Bot
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
        ],
        [
          { text: '💬 Trò Chuyện Trực Tiếp Với ĐẠI KA', callback_data: 'TALK_DIRECT' }
        ]
      ]
    }
  };
}

/**
 * Lệnh /start
 */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'Bạn';

  // Khởi tạo session mới
  userSessions.set(chatId, {
    step: 'AWAITING_OBSTACLE',
    obstacle: '',
    questions: [],
    currentIdx: 0,
    score: 0,
    traits: [],
    bookingData: {}
  });

  const welcomeMsg = 
`👋 **Chào ${firstName}, mừng bạn đến với Nghề Trading!**

Tôi hiểu rằng khi bạn bấm vào đây, có thể bạn đang cảm thấy mệt mỏi, bế tắc hoặc cay đắng sau những lệnh thua trên thị trường. 

Trading không phải là cờ bạc, và bạn **không hề cô đơn** trong hành trình này.

---
Để tôi giúp bạn chẩn đoán đúng **"nút thắt tâm lý"** theo trường phái *Trading in the Zone (Mark Douglas)*, hãy cho tôi biết:

👉 **Điều gì đang khiến bạn vướng mắc hoặc mệt mỏi nhất hiện tại?**
*(Ví dụ: Hay gồng lỗ, gỡ gạc sau thua, chốt lời quá sớm, sợ không dám bấm nút, hay chưa có phương pháp chuẩn...)*

*Vui lòng gõ tin nhắn câu trả lời của bạn bên dưới:*`;

  bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
});

/**
 * Xử lý tin nhắn văn bản nhập từ người dùng
 */
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Bỏ qua nếu là các lệnh hệ thống
  if (!text || text.startsWith('/')) return;

  const session = userSessions.get(chatId);
  if (!session) return;

  // Bước 1: Khách vừa nhập lý do bế tắc
  if (session.step === 'AWAITING_OBSTACLE') {
    session.obstacle = text;
    session.step = 'QUIZ';
    session.questions = getRandomQuestions(8);
    session.currentIdx = 0;
    session.score = 0;
    session.traits = [];

    await bot.sendMessage(chatId, 
`Cảm ơn bạn đã trải lòng. Tôi đã ghi nhận vấn đề của bạn:
*"${text}"*

Bây giờ, chúng ta sẽ bắt đầu **8 câu hỏi trắc nghiệm ngắn** từ bộ tư duy Mark Douglas để bóc tách chính xác tính cách & tâm lý giao dịch của bạn!`, 
      { parse_mode: 'Markdown' }
    );

    // Gửi câu hỏi đầu tiên
    sendQuestion(chatId, session);
  }
  
  // Bước Đặt lịch Coaching: Nhập thông tin liên hệ
  else if (session.step === 'AWAITING_BOOKING_INFO') {
    session.bookingData.contact = text;
    session.step = 'COMPLETED';

    await bot.sendMessage(chatId,
`✅ **Đã ghi nhận yêu cầu đặt lịch của bạn!**

ĐẠI KA sẽ xem qua hồ sơ tâm lý trading của bạn và liên hệ trực tiếp qua Telegram/Điện thoại để chốt thời gian & địa điểm cafe tư vấn 1-1.

Chúc bạn giữ vững tâm lý và giao dịch kỷ luật!`,
      getMainMenuKeyboard()
    );

    // Báo về Telegram của ĐẠI KA
    if (adminChatId) {
      const adminMsg =
`🚨 **YÊU CẦU ĐẶT LỊCH CAFE / COACHING 1-1 MỚI!**

👤 **Khách hàng:** ${msg.from.first_name || ''} ${msg.from.last_name || ''} (@${msg.from.username || 'N/A'})
📞 **Thông tin liên hệ/Thời gian hẹn:** ${text}
💬 **Bế tắc ban đầu:** ${session.obstacle || 'Chưa nhập'}
🧠 **Kết quả trắc nghiệm:** Score ${session.score}/16
🏷️ **Tính cách:** ${session.traits.join(', ')}

👉 *ĐẠI KA hãy bấm vào username @${msg.from.username || ''} hoặc chat trực tiếp để phản hồi khách!*`;

      bot.sendMessage(adminChatId, adminMsg, { parse_mode: 'Markdown' }).catch(err => console.error('Lỗi gửi tin admin:', err.message));
    }
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
 * Xử lý sự kiện Callback Query từ nút bấm Inline
 */
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const session = userSessions.get(chatId) || { step: 'IDLE' };

  // Xóa hiệu ứng loading của button
  bot.answerCallbackQuery(query.id);

  // 1. Nút bấm khởi động Quiz
  if (data === 'START_QUIZ') {
    userSessions.set(chatId, {
      step: 'AWAITING_OBSTACLE',
      obstacle: '',
      questions: [],
      currentIdx: 0,
      score: 0,
      traits: [],
      bookingData: {}
    });
    return bot.sendMessage(chatId, `👉 **Hãy chia sẻ ngắn gọn bế tắc lớn nhất khiến bạn mệt mỏi trong trading hiện tại:**`);
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

  // 3. Nút Trò chuyện trực tiếp
  if (data === 'TALK_DIRECT') {
    if (adminChatId) {
      bot.sendMessage(adminChatId, `🔔 Khách hàng ${query.from.first_name} (@${query.from.username || 'N/A'}) muốn trò chuyện trực tiếp với ĐẠI KA!`);
    }
    return bot.sendMessage(chatId, 
`💬 Bạn có thể nhắn tin trực tiếp với ĐẠI KA qua Telegram cá nhân hoặc chờ ĐẠI KA chủ động nhắn lại nhé!
👉 Link trao đổi: [Nhắn với ĐẠI KA](https://t.me/)`,
      { parse_mode: 'Markdown', ...getMainMenuKeyboard() }
    );
  }

  // 4. Trả lời câu hỏi trắc nghiệm
  if (data.startsWith('ANS_')) {
    const parts = data.split('_');
    const qNum = parseInt(parts[1], 10);
    const optIdx = parseInt(parts[2], 10);

    // Kiểm tra câu trả lời đúng lượt
    if (session.step !== 'QUIZ' || session.currentIdx !== qNum - 1) return;

    const currentQ = session.questions[session.currentIdx];
    const selectedOpt = currentQ.options[optIdx];

    session.score += selectedOpt.score;
    session.traits.push(selectedOpt.trait);
    session.currentIdx++;

    // Nếu còn câu hỏi tiếp theo
    if (session.currentIdx < session.questions.length) {
      sendQuestion(chatId, session);
    } else {
      // Đã hoàn thành 8 câu hỏi -> Xuất báo cáo
      session.step = 'FINISHED_QUIZ';
      const evalResult = evaluateResult(session.score, 16);

      const reportMsg = 
`🎯 **BÁO CÁO CHẨN ĐOÁN TÂM LÝ TRADING CỦA BẠN**
---
📊 **Tổng điểm tâm lý:** ${session.score}/16
🏷️ **Phân loại:** *${evalResult.level}*
👤 **Tính cách đặc trưng:** ${session.traits.slice(0, 4).join(' • ')}

🔍 **Đánh giá cốt lõi:**
${evalResult.summary}

💡 **Lời khuyên cho bạn:**
${evalResult.advice}
---
*1-2 câu chẩn đoán tự động chưa thể giúp bạn sửa ngay thói quen. Hãy đặt lịch cafe 1-1 với ĐẠI KA để bóc tách triệt để.*`;

      await bot.sendMessage(chatId, reportMsg, {
        parse_mode: 'Markdown',
        ...getMainMenuKeyboard()
      });

      // 🚨 BÁO CÁO CHI TIẾT VỀ TELEGRAM CỦA ĐẠI KA (Chiến lược chốt sale)
      if (adminChatId) {
        const adminAlert = 
`📥 **BÁO CÁO HỒ SƠ TÂM LÝ KHÁCH HÀNG MỚI!**

👤 **Khách hàng:** ${query.from.first_name || ''} ${query.from.last_name || ''} (@${query.from.username || 'Không có username'})
🆔 **Telegram ID:** \`${chatId}\`

🔴 **1. Bế tắc tự thổ lộ:**
*"${session.obstacle}"*

🧠 **2. Điểm trắc nghiệm Mark Douglas:** ${session.score}/16
🏷️ **3. Đánh giá tính cách:** ${session.traits.join(', ')}

🎯 **4. Hướng tiếp cận chốt sale đề xuất cho ĐẠI KA:**
- Khách thuộc nhóm: **${evalResult.title}**
- Điểm yếu nhất: ${session.traits.filter(t => t.includes('Gồng') || t.includes('Sợ') || t.includes('Trả thù') || t.includes('Cờ bạc')).join(', ') || 'Thiếu kỷ luật nhất quán'}
- **Hành động:** Nhắn tin trực tiếp cho khách qua @${query.from.username || 'N/A'} hoặc mời cafe 1-1.`;

        bot.sendMessage(adminChatId, adminAlert, { parse_mode: 'Markdown' }).catch(err => console.error('Lỗi gửi tin admin:', err.message));
      }
    }
  }
});
