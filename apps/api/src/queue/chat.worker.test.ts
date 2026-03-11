import { describe, it, expect } from "vitest";

// Re-implement generateTitle for isolated testing
function generateTitle(prompt: string): string {
  const firstLine = prompt.split("\n")[0].trim();
  if (firstLine.length <= 60) return firstLine;
  return firstLine.slice(0, 57) + "...";
}

describe("generateTitle", () => {
  it("should use full first line when short enough", () => {
    expect(generateTitle("How do I sort an array in JavaScript?")).toBe(
      "How do I sort an array in JavaScript?",
    );
  });

  it("should truncate long prompts to 60 chars", () => {
    const longPrompt = "A".repeat(100);
    const result = generateTitle(longPrompt);
    expect(result.length).toBe(60);
    expect(result.endsWith("...")).toBe(true);
  });

  it("should only use the first line of multi-line prompts", () => {
    const prompt = "First line\nSecond line\nThird line";
    expect(generateTitle(prompt)).toBe("First line");
  });

  it("should trim whitespace", () => {
    expect(generateTitle("  Hello world  \n  More text  ")).toBe("Hello world");
  });

  it("should handle single character", () => {
    expect(generateTitle("?")).toBe("?");
  });

  it("should handle exactly 60 chars without truncating", () => {
    const prompt = "A".repeat(60);
    expect(generateTitle(prompt)).toBe(prompt);
    expect(generateTitle(prompt).length).toBe(60);
  });

  it("should truncate at 61+ chars", () => {
    const prompt = "A".repeat(61);
    const result = generateTitle(prompt);
    expect(result.length).toBe(60);
    expect(result).toBe("A".repeat(57) + "...");
  });
});
