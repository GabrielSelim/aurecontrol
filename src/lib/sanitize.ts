import DOMPurify from "dompurify";

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe styling attributes for rich-text content (contracts, templates).
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr", "span", "div",
      "strong", "b", "em", "i", "u", "s", "sub", "sup",
      "ul", "ol", "li",
      "table", "thead", "tbody", "tr", "th", "td",
      "a", "img",
      "blockquote", "pre", "code",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "width", "height",
      "style", "class", "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
  });
}
