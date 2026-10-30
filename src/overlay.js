// Status message bubble shown over the camera view.

const MESSAGES = {
  loading: { text: 'กำลังโหลด…' },
  scan: { text: 'ส่องกล้องไปที่ QR' },
  denied: {
    text: 'ไม่ได้รับอนุญาตให้ใช้กล้อง\nChrome: แตะไอคอนหน้าแถบที่อยู่ → การอนุญาต → กล้อง\nSafari: แตะ "aA" → การตั้งค่าเว็บไซต์ → กล้อง',
    button: 'ลองอีกครั้ง',
    action: 'reload',
  },
  unsupported: { text: 'เบราว์เซอร์นี้เปิดกล้องไม่ได้\nกรุณาเปิดใน Chrome หรือ Safari', button: 'คัดลอกลิงก์', action: 'copy' },
  error: { text: 'โหลดไม่สำเร็จ', button: 'โหลดใหม่', action: 'reload' },
};

export class Overlay {
  constructor(element) {
    this.element = element;
  }

  show(state) {
    if (state === 'hidden') {
      this.element.hidden = true;
      return;
    }
    const message = MESSAGES[state];
    this.element.hidden = false;
    this.element.replaceChildren();
    const text = document.createElement('p');
    text.textContent = message.text;
    this.element.append(text);
    if (!message.button) return;
    const button = document.createElement('button');
    button.textContent = message.button;
    button.addEventListener('click', () => {
      if (message.action === 'reload') location.reload();
      else navigator.clipboard?.writeText(location.href).then(() => { button.textContent = 'คัดลอกแล้ว'; });
    });
    this.element.append(button);
  }
}
