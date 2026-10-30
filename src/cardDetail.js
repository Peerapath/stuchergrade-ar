// Full-screen view of one card image; tap anywhere to close.

export class CardDetail {
  constructor(element) {
    this.element = element;
    this.image = document.createElement('img');
    this.image.alt = '';
    this.caption = document.createElement('p');
    this.caption.textContent = 'แตะเพื่อปิด';
    element.replaceChildren(this.image, this.caption);
    // Close only on a tap that started on this view. On phones the tap that opens the view is
    // followed by a compatibility click that can land on it straight away and would close it.
    this.armed = false;
    element.addEventListener('pointerdown', () => { this.armed = true; });
    element.addEventListener('click', () => {
      if (this.armed) this.hide();
    });
  }

  get isOpen() {
    return !this.element.hidden;
  }

  show(url) {
    this.armed = false;
    this.image.src = url;
    this.element.hidden = false;
  }

  hide() {
    this.element.hidden = true;
    this.image.removeAttribute('src');
  }
}
