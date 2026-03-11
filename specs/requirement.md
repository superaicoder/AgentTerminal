# AgentTerminal - Internal AI Chatbot Platform

## Product Vision

Xây dựng một nền tảng AI chatbot nội bộ cho công ty, cho phép nhiều nhân viên sử dụng chung một tài khoản Claude Max subscription thông qua giao diện chat duy nhất có phân quyền. AI engine sử dụng Claude Code (headless mode) chạy trên server.

---

## Đối tượng sử dụng

| Role | Mô tả | Quyền |
|------|--------|-------|
| **Admin** | Quản trị hệ thống | Toàn quyền: quản lý user, xem tất cả usage, config hệ thống, quản lý Claude Code trên server |
| **Manager** | Trưởng nhóm/team | Xem usage của team, config system prompt cho team, chat |
| **User** | Nhân viên thông thường | Chat với AI, xem lịch sử chat của mình |

---

## F1: Đăng nhập & Phân quyền

### Mô tả
Hệ thống xác thực người dùng nội bộ công ty và phân quyền theo role.

### Yêu cầu chi tiết
- [ ] Đăng nhập bằng email công ty + mật khẩu
- [ ] Admin tạo tài khoản cho nhân viên mới (invite qua email)
- [ ] Phân quyền 3 role: Admin, Manager, User
- [ ] User không thể truy cập trang admin hoặc xem chat của người khác
- [ ] Session tự hết hạn sau 8 giờ không hoạt động
- [ ] Đổi mật khẩu, quên mật khẩu qua email

---

## F2: Giao diện Chat

### Mô tả
Giao diện chat giống Claude.ai - đơn giản, dễ dùng, hỗ trợ streaming.

### Yêu cầu chi tiết

**Tạo & quản lý conversation:**
- [ ] Nút "New Chat" tạo conversation mới
- [ ] Sidebar hiển thị danh sách conversation cũ (sắp xếp theo thời gian)
- [ ] Đặt tên conversation (auto-generate từ tin nhắn đầu tiên hoặc tự đặt)
- [ ] Xóa conversation
- [ ] Tìm kiếm trong lịch sử conversation

**Gửi tin nhắn:**
- [ ] Input box hỗ trợ nhiều dòng (Shift+Enter xuống dòng, Enter gửi)
- [ ] Gửi tin nhắn text
- [ ] Upload file đính kèm (PDF, image, text, code) để hỏi AI
- [ ] Chọn model cho conversation (Haiku / Sonnet / Opus) - nếu role cho phép

**Hiển thị response:**
- [ ] Streaming response real-time (hiện từng chữ, không đợi full)
- [ ] Render Markdown (heading, bold, italic, list, table, link)
- [ ] Code block với syntax highlighting + nút Copy
- [ ] Hiển thị "đang suy nghĩ..." khi AI đang xử lý
- [ ] Hiển thị thông báo khi đang xếp hàng chờ (queue position)

**UX:**
- [ ] Responsive: hoạt động tốt trên desktop và mobile
- [ ] Dark mode / Light mode
- [ ] Scroll tự động xuống tin nhắn mới
- [ ] Nút "Stop" để dừng response giữa chừng

---

## F3: Hệ thống hàng đợi & Công bằng sử dụng

### Mô tả
Vì dùng chung 1 subscription, cần đảm bảo mọi user đều được phục vụ công bằng, không ai chiếm hết resource.

### Yêu cầu chi tiết

**Rate limiting:**
- [ ] Giới hạn số request/phút per user (VD: 5 request/phút)
- [ ] Giới hạn số request/ngày per user (VD: 100 request/ngày)
- [ ] Quota khác nhau theo role (Admin > Manager > User)
- [ ] Hiển thị cho user biết còn bao nhiêu quota trong ngày

**Hàng đợi:**
- [ ] Khi nhiều user gửi cùng lúc → xếp hàng FIFO
- [ ] Hiển thị vị trí trong hàng đợi cho user đang chờ
- [ ] Priority queue: Admin/Manager được ưu tiên trước User
- [ ] Giới hạn max request đang chờ trong queue (VD: 50)
- [ ] Timeout: request chờ quá lâu → thông báo user thử lại sau

**Khi hết quota:**
- [ ] Thông báo rõ ràng: "Bạn đã hết quota hôm nay, quota reset lúc 00:00"
- [ ] Admin có thể tăng quota tạm thời cho user cụ thể

---

## F4: Quản lý Conversation & Lịch sử

### Mô tả
Lưu trữ và quản lý toàn bộ lịch sử chat.

### Yêu cầu chi tiết
- [ ] Mỗi conversation lưu đầy đủ: user messages + AI responses + timestamp
- [ ] Tiếp tục conversation cũ (AI nhớ context trước đó)
- [ ] Tìm kiếm nội dung trong tất cả conversation của mình
- [ ] Export conversation ra file (Markdown / PDF)
- [ ] Admin có thể xem conversation của bất kỳ user nào (audit)
- [ ] Auto-delete conversation cũ hơn X ngày (configurable bởi Admin)

---

## F5: System Prompt & Tùy chỉnh AI

### Mô tả
Cho phép tùy chỉnh hành vi AI theo team/mục đích sử dụng.

### Yêu cầu chi tiết
- [ ] Admin/Manager đặt system prompt mặc định cho team
  - VD: Team CS → "Bạn là trợ lý hỗ trợ khách hàng, trả lời bằng tiếng Việt..."
  - VD: Team Dev → "Bạn là senior developer, hỗ trợ code review..."
- [ ] User có thể chọn "persona" từ danh sách có sẵn khi tạo chat mới
- [ ] Admin tạo/sửa/xóa persona templates
- [ ] Chọn model mặc định per team (VD: Team CS dùng Haiku, Team Dev dùng Sonnet)
- [ ] Giới hạn model per role (VD: User chỉ được Haiku+Sonnet, Admin được Opus)

---

## F6: Upload & Xử lý File

### Mô tả
User có thể gửi file để AI phân tích, trả lời câu hỏi về nội dung file.

### Yêu cầu chi tiết
- [ ] Upload file qua drag & drop hoặc nút attach
- [ ] Hỗ trợ: PDF, PNG/JPG (image), TXT, CSV, JSON, code files
- [ ] Giới hạn kích thước file (VD: max 10MB per file)
- [ ] Giới hạn số file per message (VD: max 5 files)
- [ ] Preview file trước khi gửi
- [ ] AI đọc và trả lời câu hỏi về nội dung file
- [ ] File tạm được xóa sau khi xử lý xong (không lưu vĩnh viễn trên server)

---

## F7: Admin Dashboard

### Mô tả
Trang quản trị cho Admin theo dõi và quản lý hệ thống.

### Yêu cầu chi tiết

**Quản lý User:**
- [ ] Danh sách user: tên, email, role, ngày tạo, lần hoạt động cuối
- [ ] Tạo/sửa/xóa/vô hiệu hóa user
- [ ] Thay đổi role
- [ ] Reset mật khẩu cho user

**Theo dõi Usage:**
- [ ] Biểu đồ tổng số request theo ngày/tuần/tháng
- [ ] Bảng usage per user: số request, số conversation, model dùng nhiều nhất
- [ ] Top users tiêu thụ nhiều nhất
- [ ] Lịch sử request real-time (live feed)

**Cấu hình hệ thống:**
- [ ] Cấu hình quota mặc định per role
- [ ] Cấu hình model cho phép per role
- [ ] Cấu hình system prompt templates / personas
- [ ] Cấu hình max concurrent requests
- [ ] Cấu hình auto-delete conversation policy

**Health monitoring:**
- [ ] Trạng thái Claude Code service (online/offline)
- [ ] Số request đang trong queue
- [ ] Số request đang được xử lý
- [ ] Alert khi service gặp lỗi (subscription expired, rate limited...)

---

## F8: Tích hợp MCP (Phase 2)

### Mô tả
Mở rộng khả năng AI bằng cách kết nối với các công cụ nội bộ qua MCP (Model Context Protocol).

### Yêu cầu chi tiết
- [ ] AI có thể truy vấn database nội bộ công ty (đọc, không ghi)
- [ ] AI có thể tìm kiếm tài liệu trên Google Drive / Notion
- [ ] AI có thể tra cứu thông tin từ các hệ thống nội bộ (CRM, ERP...)
- [ ] Admin config MCP server nào được bật cho team nào
- [ ] User không cần biết MCP tồn tại - chỉ cần hỏi, AI tự dùng tool phù hợp

---

## F9: Thông báo & Alert

### Mô tả
Thông báo cho user và admin về các sự kiện quan trọng.

### Yêu cầu chi tiết
- [ ] User: thông báo khi sắp hết quota (còn 10%)
- [ ] User: thông báo khi quota reset
- [ ] Admin: alert khi Claude Code service down
- [ ] Admin: alert khi subscription bị rate limit liên tục
- [ ] Admin: weekly summary email: tổng usage, top users, issues

---

## Subscription & Chi phí

| Plan | Giá/tháng | Phù hợp |
|------|----------|---------|
| Claude Max 5x | $100/tháng | Team nhỏ (< 10 người), dùng vừa phải |
| Claude Max 20x | $200/tháng | Team lớn (10-30 người), dùng nhiều |

**So sánh**: 20 nhân viên × Claude Pro $20 = **$400/tháng** → 1 Max 20x = **$200/tháng** → **tiết kiệm 50%**

---

## Các ràng buộc

- Dùng Claude Code headless mode (`claude -p`) làm AI engine
- Subscription auth (không dùng API key per-token)
- Backend: Node.js
- Self-hosted (VPS) để giữ credentials an toàn
- Concurrent request bị giới hạn bởi subscription rate limit → bắt buộc có queue

---

## Implementation Phases

### Phase 1: MVP
- F1: Đăng nhập (email/password) + phân quyền cơ bản
- F2: Giao diện chat + streaming
- F3: Rate limiting + queue cơ bản
- F4: Lịch sử conversation

### Phase 2: Admin & Customization
- F5: System prompt / persona templates
- F6: Upload file
- F7: Admin dashboard

### Phase 3: MCP & Integration
- F8: MCP integration
- F9: Thông báo & alert
- Slack/Teams webhook integration

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Anthropic thay đổi cách dùng headless mode | Critical | `claude -p` là feature chính thức, rủi ro thấp |
| Subscription rate limit khi nhiều user | High | Queue + quota per user |
| Claude Code session/login expired trên server | Medium | Health check + alert admin để re-login |
| User lạm dụng (spam request) | Medium | Rate limit + daily quota |

---

## Success Metrics

- **Chi phí**: $100-200/tháng thay vì $400+ (mua riêng từng người)
- **Adoption**: >= 80% nhân viên dùng trong tháng đầu
- **Uptime**: >= 99%
- **Response**: < 5s cho first token (P95)
- **Công bằng**: Không user nào bị starve khi người khác dùng nhiều
