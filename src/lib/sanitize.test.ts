import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("should allow basic HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("should allow headings", () => {
    const input = "<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("should allow lists", () => {
    const input = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("should allow tables", () => {
    const input = "<table><thead><tr><th>Col</th></tr></thead><tbody><tr><td>Val</td></tr></tbody></table>";
    expect(sanitizeHtml(input)).toBe(input);
  });

  it("should allow style attributes", () => {
    const input = '<div style="color: red;">Text</div>';
    expect(sanitizeHtml(input)).toContain('style="color: red;"');
  });

  it("should allow links with href", () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain('href="https://example.com"');
  });

  it("should strip script tags", () => {
    const input = '<p>Safe</p><script>alert("xss")</script>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
    expect(result).toContain("<p>Safe</p>");
  });

  it("should strip event handlers", () => {
    const input = '<p onclick="alert(1)">Click me</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("<p>Click me</p>");
  });

  it("should strip iframe tags", () => {
    const input = '<iframe src="https://evil.com"></iframe><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<iframe>");
    expect(result).toContain("<p>Safe</p>");
  });

  it("should strip javascript: URLs", () => {
    const input = '<a href="javascript:alert(1)">Click</a>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("javascript:");
  });

  it("should strip data attributes", () => {
    const input = '<div data-evil="payload">Content</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("data-evil");
    expect(result).toContain("Content");
  });

  it("should handle empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("should handle plain text without tags", () => {
    expect(sanitizeHtml("Hello world")).toBe("Hello world");
  });
});
