// Full-screen view of one card image; tap anywhere to close.

export class CardDetail {
  constructor(element) {
    this.element = element;
    this.image = document.createElement('img');
    this.image.alt = '';
    this.caption = document.createElement('p');
    this.caption.textContent = 'แตะเพื่อปิด';
    element.replaceChildren(this.image, this.caption);
    element.addEventListener('click', () => this.hide());
  }

  get isOpen() {
    return !this.element.hidden;
  }

  show(url) {
    this.image.src = url;
    this.element.hidden = false;
  }

  hide() {
    this.element.hidden = true;
    this.image.removeAttribute('src');
  }
}
