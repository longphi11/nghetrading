/**
 * Bộ câu hỏi Trắc nghiệm Tâm lý & Tư duy Trading
 * Dựa trên nguyên lý tâm lý trong cuốn sách "Trading in the Zone" (Mark Douglas)
 */

const questionsPool = [
  {
    id: 1,
    category: "Chấp nhận Rủi ro",
    question: "1. Trước khi bấm nút vào lệnh, bạn có xác định trước số tiền chính xác mình sẵn sàng ĐÁNH MẤT không?",
    options: [
      { text: "A. Có, tôi xác định Stop Loss rõ ràng và chấp nhận mất số tiền đó.", score: 2, trait: "Kỷ luật chuẩn" },
      { text: "B. Tôi có đặt SL nhưng nếu dính tôi thường thấy rất cay cú/tiếc nuối.", score: 1, trait: "Chưa thực sự chấp nhận rủi ro" },
      { text: "C. Tôi hiếm khi đặt SL, vì tôi tin giá sẽ quay đầu.", score: 0, trait: "Né tránh rủi ro / Gồng lỗ" }
    ]
  },
  {
    id: 2,
    category: "Tư duy Xác suất",
    question: "2. Sau khi dính 3 lệnh thua liên tiếp (Stop Loss), bạn thường làm gì tiếp theo?",
    options: [
      { text: "A. Nghỉ ngơi, vì hiểu rằng chuỗi thua là một phần tự nhiên của xác suất.", score: 2, trait: "Tư duy xác suất" },
      { text: "B. Tăng khối lượng để gỡ lại số tiền đã mất (Revenge Trade).", score: 0, trait: "Trả thù thị trường" },
      { text: "C. Hoang mang, nghi ngờ phương pháp và bắt đầu đi tìm hệ thống mới.", score: 1, trait: "Thiếu niềm tin hệ thống" }
    ]
  },
  {
    id: 3,
    category: "Quản lý Lợi nhuận",
    question: "3. Khi một lệnh đang có lời xanh tốt, bạn thường hành xử như thế nào?",
    options: [
      { text: "A. Chốt lời sớm vì sợ thị trường cướp mất khoản lời đang có.", score: 1, trait: "Sợ mất lợi nhuận" },
      { text: "B. Giữ đúng đến TP kế hoạch hoặc dời SL bảo toàn vốn theo quy tắc.", score: 2, trait: "Tâm lý vững vàng" },
      { text: "C. Tham vọng gồng thêm dù đã vượt xa kế hoạch ban đầu.", score: 0, trait: "Lòng tham kiểm soát" }
    ]
  },
  {
    id: 4,
    category: "Nỗi sợ Vào lệnh",
    question: "4. Khi hệ thống của bạn xuất hiện tín hiệu vào lệnh chuẩn, bạn thấy thế nào?",
    options: [
      { text: "A. Vào lệnh ngay lập tức không do dự.", score: 2, trait: "Hành động không sợ hãi" },
      { text: "B. Chần chừ, phân tích thêm khung nhỏ/tin tức rồi bỏ lỡ điểm vào.", score: 1, trait: "Nỗi sợ sai / Do dự" },
      { text: "C. Đợi giá chạy xa rồi mới đuổi theo vì sợ bỏ lỡ (FOMO).", score: 0, trait: "Tâm lý FOMO" }
    ]
  },
  {
    id: 5,
    category: "Đúng Sai trong Trading",
    question: "5. Cảm giác của bạn thế nào nếu một lệnh trading bị dính Stop Loss?",
    options: [
      { text: "A. Bình thường, đó chỉ là chi phí kinh doanh.", score: 2, trait: "Coi thua lỗ là chi phí" },
      { text: "B. Bị tổn thương cái ego, cảm thấy bản thân phán đoán kém cỏi.", score: 1, trait: "Nhu cầu muốn luôn ĐÚNG" },
      { text: "C. Tức giận với thị trường/thầy dạy/sàn giao dịch.", score: 0, trait: "Đổ lỗi ngoại cảnh" }
    ]
  },
  {
    id: 6,
    category: "Kỷ luật Quy tắc",
    question: "6. Bạn có ghi chép nhật ký giao dịch và xem lại định kỳ không?",
    options: [
      { text: "A. Có ghi chép chi tiết cả lý do vào lệnh & cảm xúc.", score: 2, trait: "Trader chuyên nghiệp" },
      { text: "B. Thỉnh thoảng mới ghi khi nhớ ra.", score: 1, trait: "Kỷ luật chưa nhất quán" },
      { text: "C. Không ghi chép bao giờ, đánh theo cảm giác.", score: 0, trait: "Giao dịch cảm tính" }
    ]
  },
  {
    id: 7,
    category: "Kỳ vọng Thị trường",
    question: "7. Bạn kỳ vọng điều gì ở lệnh giao dịch TIẾP THEO của mình?",
    options: [
      { text: "A. Chắc chắn phải THẮNG.", score: 0, trait: "Kỳ vọng sai lệch" },
      { text: "B. Không đoán trước, vì bất cứ điều gì cũng có thể xảy ra.", score: 2, trait: "Chấp nhận tính ngẫu nhiên" },
      { text: "C. Mong hòa vốn là may lắm rồi.", score: 1, trait: "Tâm lý tự tin thấp" }
    ]
  },
  {
    id: 8,
    category: "Kiểm soát Cảm xúc",
    question: "8. Yếu tố nào chi phối quyết định cắt lệnh của bạn nhiều nhất?",
    options: [
      { text: "A. Cảm xúc sợ hãi hoặc tham lam tại thời điểm đó.", score: 0, trait: "Bị cảm xúc chi phối" },
      { text: "B. Quy tắc cắt lỗ/chốt lời đã định sẵn từ trước.", score: 2, trait: "Tuân thủ quy tắc" },
      { text: "C. Nhìn theo phân tích của người khác trên mạng.", score: 1, trait: "Bị ảnh hưởng đám đông" }
    ]
  },
  {
    id: 9,
    category: "Gồng Lỗ",
    question: "9. Khi giá đi ngược dự đoán và vượt qua điểm cắt lỗ dự kiến, bạn làm gì?",
    options: [
      { text: "A. Cắt ngay không thương tiếc.", score: 2, trait: "Bảo vệ vốn nghiêm ngặt" },
      { text: "B. Dời Stop Loss xa hơn để cho giá 'thêm cơ hội'.", score: 0, trait: "Dời SL né tránh nỗi đau" },
      { text: "C. Nồi thêm lệnh (DCA) để bình quân giá xuống.", score: 0, trait: "Gồng lỗ nguy hiểm" }
    ]
  },
  {
    id: 10,
    category: "Mục tiêu Trading",
    question: "10. Mục tiêu lớn nhất của bạn trong 1 tháng trading là gì?",
    options: [
      { text: "A. Tuân thủ 100% kỷ luật và quy tắc đã đề ra.", score: 2, trait: "Tập trung vào quy trình" },
      { text: "B. X2 X3 tài khoản thật nhanh.", score: 0, trait: "Tư duy cờ bạc" },
      { text: "C. Không bị cháy tài khoản.", score: 1, trait: "Tâm lý phòng thủ" }
    ]
  }
];

/**
 * Lấy ngẫu nhiên N câu hỏi từ ngân hàng câu hỏi
 */
function getRandomQuestions(count = 8) {
  const shuffled = [...questionsPool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Đánh giá kết quả dựa trên tổng số điểm
 */
function evaluateResult(totalScore, maxScore = 16) {
  const percentage = (totalScore / maxScore) * 100;
  
  if (percentage >= 80) {
    return {
      level: "Tâm Lý Vững Vàng (Gần chuẩn Mark Douglas)",
      title: "Trader Kỷ Luật",
      summary: "Bạn có tư duy xác suất tốt và chấp nhận rủi ro. Nút thắt lớn nhất của bạn có thể là tinh chỉnh chiến lược hoặc kiên nhẫn chờ điểm vào lệnh đẹp trên thị trường Vàng (XAU/USD).",
      advice: "Bạn cần một người đồng hành để duy trì phong độ và tối ưu hệ thống chuyên sâu."
    };
  } else if (percentage >= 50) {
    return {
      level: "Mệt Mỏi & Vướng Mắc Nút Thắt Tâm Lý",
      title: "Trader Đang Bế Tắc",
      summary: "Bạn đã có kiến thức nhưng vẫn bị chi phối bởi cảm xúc (sợ hãi khi vào lệnh hoặc chốt lời quá sớm). Bạn hiểu lý thuyết nhưng chưa thể 'nhất quán' giữa biết và làm.",
      advice: "Buổi tư vấn 1-1 với ĐẠI KA sẽ giúp bạn mổ xẻ chính xác nút thắt tâm lý này."
    };
  } else {
    return {
      level: "Coi Trading Như Cờ Bạc / Gồng Lỗ Nguy Hiểm",
      title: "Bẫy Tâm Lý Nặng Nề",
      summary: "Bạn đang giao dịch dựa trên hy vọng, cay cú trả thù thị trường hoặc gồng lỗ không đặt SL. Đây là lý do chính khiến bạn mệt mỏi và chưa thể tạo ra lợi nhuận bền vững.",
      advice: "Bạn cần định hình lại toàn bộ Tư Duy Gốc và trao đổi trực tiếp 1-1 với ĐẠI KA càng sớm càng tốt để cứu tài khoản."
    };
  }
}

module.exports = {
  questionsPool,
  getRandomQuestions,
  evaluateResult
};
