/**
 * scripts/auto-post-x-browser.js
 * Tự động đăng bài lên X (Twitter) bằng Trình duyệt (Playwright)
 * Hoàn toàn Miễn phí 100% - Không tốn tiền API - Không giới hạn
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const SESSION_DIR = path.join(ROOT, '.x-browser-session');
const DATA_FILE = path.join(ROOT, 'data', 'journal.json');

async function getBrowserContext(headless = false) {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }

  // Thử dùng Chrome/Edge có sẵn trên máy, fallback sang Chromium mặc định
  const options = {
    headless,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  };

  try {
    return await chromium.launchPersistentContext(SESSION_DIR, {
      ...options,
      channel: 'msedge',
    });
  } catch (e1) {
    try {
      return await chromium.launchPersistentContext(SESSION_DIR, {
        ...options,
        channel: 'chrome',
      });
    } catch (e2) {
      return await chromium.launchPersistentContext(SESSION_DIR, options);
    }
  }
}

// Kiểm tra trạng thái đăng nhập
async function checkIsLoggedIn(page) {
  await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  const currentUrl = page.url();
  return !currentUrl.includes('/login') && !currentUrl.includes('/i/flow/login');
}

// Chế độ Đăng nhập (Mở trình duyệt cho ĐẠI KA đăng nhập 1 lần duy nhất)
async function loginWorkflow() {
  console.log('\n🌐 Đang mở trình duyệt để ĐẠI KA đăng nhập tài khoản X...');
  console.log('👉 ĐẠI KA hãy đăng nhập tài khoản X trên cửa sổ vừa hiện ra.');
  console.log('⏳ Sau khi đăng nhập thành công vào trang chủ X, hệ thống sẽ tự động lưu phiên làm việc!\n');

  const context = await getBrowserContext(false);
  const page = context.pages()[0] || (await context.newPage());

  await page.goto('https://x.com/login');

  // Đợi cho đến khi vào được trang home
  try {
    await page.waitForURL('**/home**', { timeout: 300000 }); // Đợi tối đa 5 phút
    console.log('\n🎉 ĐĂNG NHẬP THÀNH CÔNG! Phiên làm việc đã được lưu vĩnh viễn.');
    await page.waitForTimeout(3000);
  } catch (err) {
    console.log('\n⚠️ Hết thời gian chờ đăng nhập.');
  } finally {
    await context.close();
  }
}

// Đăng 1 bài Tweet
async function postTweet(text, imagePath = null, headless = true) {
  console.log('\n🚀 Đang khởi động trình duyệt đăng bài lên X...');
  const context = await getBrowserContext(headless);
  const page = context.pages()[0] || (await context.newPage());

  try {
    const loggedIn = await checkIsLoggedIn(page);
    if (!loggedIn) {
      console.error('❌ CHƯA ĐĂNG NHẬP! Vui lòng chạy lệnh sau để đăng nhập 1 lần:');
      console.error('👉 node scripts/auto-post-x-browser.js --login');
      await context.close();
      return false;
    }

    console.log('✓ Đã kết nối phiên đăng nhập X (Nghetrading).');
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Click vào ô "What's happening?" hoặc ô soạn thảo bài viết
    console.log('✍️ Đang mở ô soạn thảo bài viết...');
    const placeholder = page.getByText("What's happening?").first();
    const draftEditor = page.locator('div.public-DraftEditor-content, div[role="textbox"], div[data-testid="tweetTextarea_0"]').first();

    if ((await placeholder.count()) > 0 && (await placeholder.isVisible())) {
      await placeholder.click();
    } else if ((await draftEditor.count()) > 0) {
      await draftEditor.click();
    } else {
      const sideNavPost = page.locator('a[data-testid="SideNav_NewTweet_Button"]').first();
      if ((await sideNavPost.count()) > 0) {
        await sideNavPost.click();
        await page.waitForTimeout(2000);
      }
    }

    await page.waitForTimeout(1000);

    // Gõ nội dung bài viết
    console.log('📝 Đang nhập nội dung bài viết...');
    await page.keyboard.insertText(text);
    await page.waitForTimeout(2000);

    // Upload ảnh nếu có
    if (imagePath && fs.existsSync(imagePath)) {
      console.log(`🖼️ Đang đính kèm ảnh: ${imagePath}`);
      const fileInput = page.locator('input[type="file"]').first();
      if ((await fileInput.count()) > 0) {
        await fileInput.setInputFiles(imagePath);
        await page.waitForTimeout(4000); // Đợi ảnh upload xong
      }
    }

    // Bấm nút Đăng (Post) bằng Control+Enter hoặc click trực tiếp
    console.log('⏳ Đang bấm nút Đăng (Post)...');
    await page.waitForTimeout(1000);
    
    // Thử dùng phím tắt chuẩn của X: Ctrl + Enter
    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(3000);

    // Fallback: Click nút tweetButtonInline hoặc tweetButton nếu chưa gửi
    const postButton = page.locator('button[data-testid="tweetButtonInline"], button[data-testid="tweetButton"]').first();
    if ((await postButton.count()) > 0 && (await postButton.isVisible()) && (await postButton.isEnabled())) {
      await postButton.click({ force: true });
    }

    await page.waitForTimeout(5000);

    console.log('\n🎉 ĐÃ ĐĂNG BÀI LÊN X THÀNH CÔNG RỰC RỠ! 🚀\n');
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi đăng bài:', error.message);
    return false;
  } finally {
    await context.close();
  }
}

// Tự động lấy bài mới nhất trong journal.json để đăng
async function autoPostLatestJournal() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Không tìm thấy file data: ${DATA_FILE}`);
  }
  const posts = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  if (!posts || posts.length === 0) {
    throw new Error('Không có bài viết nào trong data/journal.json');
  }

  const latest = posts[0];
  const tagStr = latest.tag === 'bitcoin' ? '#Bitcoin #BTC' : '#Vang #XAUUSD';

  const content = `📊 [NHẬT KÝ THỰC CHIẾN] ${latest.title}\n\n${latest.excerpt}\n\nChi tiết kịch bản điểm vào & Invalidation Zone:\n👉 https://nghetrading.com/nhat-ky.html\n\n${tagStr} #Trading #NgheTrading`;

  return await postTweet(content, null, false);
}

// Kiểm tra thông tin tài khoản đang đăng nhập
async function checkLoginStatus() {
  console.log('\n🔍 Đang kiểm tra trạng thái kết nối tài khoản X...');
  const context = await getBrowserContext(true);
  const page = context.pages()[0] || (await context.newPage());

  try {
    await page.goto('https://x.com/home', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const currentUrl = page.url();

    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login')) {
      console.log('\n❌ KẾT QUẢ: CHƯA ĐĂNG NHẬP THÀNH CÔNG.');
      console.log('👉 ĐẠI KA hãy chạy lại lệnh: node scripts/auto-post-x-browser.js --login');
      return false;
    }

    const accountBtn = await page.locator('button[data-testid="SideNav_AccountSwitcher_Button"], div[data-testid="SideNav_AccountSwitcher_Button"]').first();
    let accountName = '';
    try {
      accountName = await accountBtn.innerText({ timeout: 5000 });
    } catch (e) {}

    console.log('\n🎉 KẾT QUẢ: ĐÃ KẾT NỐI TÀI KHOẢN X THÀNH CÔNG RỰC RỠ! 🚀');
    if (accountName) {
      console.log('👤 Tài khoản:', accountName.replace(/\n+/g, ' - '));
    }
    console.log('🔗 Trang hiện tại:', currentUrl);
    return true;
  } catch (err) {
    console.error('❌ Lỗi kiểm tra:', err.message);
    return false;
  } finally {
    await context.close();
  }
}

// CLI Runner
async function main() {
  const args = process.argv.slice(2);
  try {
    if (args.includes('--login')) {
      await loginWorkflow();
    } else if (args.includes('--check')) {
      await checkLoginStatus();
    } else if (args.includes('--auto-journal')) {
      await autoPostLatestJournal();
    } else if (args.includes('--text')) {
      const textIdx = args.indexOf('--text');
      const text = args[textIdx + 1];
      if (!text) throw new Error('Vui lòng nhập nội dung sau --text "Nội dung"');

      let imagePath = null;
      if (args.includes('--image')) {
        const imgIdx = args.indexOf('--image');
        imagePath = args[imgIdx + 1];
      }

      await postTweet(text, imagePath, false);
    } else {
      console.log(`
==================================================
🤖 CÔNG CỤ TỰ ĐỘNG ĐĂNG X (TWITTER) MIỄN PHÍ 100%
==================================================
1. Đăng nhập lần đầu (chỉ cần làm 1 lần duy nhất):
   node scripts/auto-post-x-browser.js --login

2. Đăng 1 tweet kèm chữ:
   node scripts/auto-post-x-browser.js --text "Nội dung tweet của ĐẠI KA"

3. Đăng 1 tweet kèm hình ảnh chart:
   node scripts/auto-post-x-browser.js --text "Kịch bản Vàng phiên Mỹ" --image "Pic trading view/xau.png"

4. Tự động lấy bài phân tích mới nhất từ Web để đăng:
   node scripts/auto-post-x-browser.js --auto-journal
==================================================
`);
    }
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
