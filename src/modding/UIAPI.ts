// src/modding/UIAPI.ts
// API для создания UI элементов модами

import type { UIAPIInterface, HUDElementOptions } from './types';

/**
 * API для создания HUD элементов и уведомлений
 */
export class UIAPI implements UIAPIInterface {
  private modId: string;
  private elements: Map<string, HTMLElement> = new Map();

  constructor(modId: string) {
    this.modId = modId;
  }

  /**
   * Добавить HUD элемент
   */
  addHUDElement(id: string, options: HUDElementOptions): string {
    const elementId = `mod_${this.modId}_${id}`;

    // Удалить существующий элемент
    this.removeHUDElement(id);

    const element = document.createElement('div');
    element.id = elementId;
    element.className = `mod-hud-element mod-hud-${options.position}`;

    // Безопасная установка контента
    if (options.text) {
      element.textContent = options.text;
    } else if (options.html) {
      element.innerHTML = this.sanitizeHTML(options.html);
    }

    // Применить стили
    if (options.style) {
      Object.assign(element.style, options.style);
    }

    document.body.appendChild(element);
    this.elements.set(id, element);

    return elementId;
  }

  /**
   * Обновить содержимое HUD элемента
   */
  updateHUDElement(id: string, content: { html?: string; text?: string }): void {
    const element = this.elements.get(id);
    if (!element) return;

    if (content.text !== undefined) {
      element.textContent = content.text;
    } else if (content.html !== undefined) {
      element.innerHTML = this.sanitizeHTML(content.html);
    }
  }

  /**
   * Удалить HUD элемент
   */
  removeHUDElement(id: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.remove();
      this.elements.delete(id);
    }
  }

  /**
   * Показать уведомление
   */
  showNotification(message: string, duration: number = 3000): void {
    const notification = document.createElement('div');
    notification.className = 'mod-notification';
    notification.textContent = message; // Безопасно, textContent

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }

  /**
   * Санитизация HTML для защиты от XSS
   */
  private sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;

    // Удалить опасные теги (Expanded list)
    const dangerousTags = [
      'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta',
      'form', 'svg', 'math', 'details', 'base', 'applet',
    ];
    dangerousTags.forEach((tag) => {
      div.querySelectorAll(tag).forEach((el) => el.remove());
    });

    // Dangerous attributes to strip explicitly
    const dangerousAttrs = ['action', 'formaction', 'data'];

    // Удалить on* атрибуты и опасные протоколы
    const allElements = div.querySelectorAll('*');
    allElements.forEach((el) => {
      const attrs = [...el.attributes];
      attrs.forEach((attr) => {
        const name = attr.name.toLowerCase();
        // Remove whitespace for protocol checks (prevents "java script:")
        const val = attr.value.toLowerCase().replace(/[\s\x00-\x1f]/g, '');

        if (
          name.startsWith('on') ||
          dangerousAttrs.includes(name) ||
          ((name === 'href' || name === 'src') &&
            (val.startsWith('javascript:') ||
              val.startsWith('vbscript:') ||
              val.startsWith('data:') ||
              val.startsWith('file:')))
        ) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return div.innerHTML;
  }

  /**
   * Очистка всех элементов мода
   */
  _cleanup(): void {
    for (const element of this.elements.values()) {
      element.remove();
    }
    this.elements.clear();
  }
}
