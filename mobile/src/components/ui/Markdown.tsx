/**
 * Themed markdown renderer for AI replies (so `**bold**`, lists, and headings render properly
 * instead of showing raw markdown). Wraps react-native-markdown-display with theme-driven styles.
 *
 * Stream-safe: any trailing UNCLOSED inline markers ("**", "`", "```") are stripped before the
 * parser sees them, so users never glimpse raw `**` while the model is mid-emit of a bold span.
 * The trim is idempotent on complete text (an even count of markers means nothing is stripped),
 * so callers don't need to opt in or know whether content is streaming.
 */
import React, { useMemo } from 'react';
import RNMarkdown from 'react-native-markdown-display';

import { useTheme } from '../../theme';

/** Strip trailing unclosed inline markdown markers so streaming reveals never show raw `**`/`` ` ``.
 *
 *  Algorithm: for each marker token (``` first to peel block fences before falling into inline),
 *  count occurrences in the current text. Odd count → the rightmost one is unmatched → truncate
 *  the string at that position. Repeat for the next token against the truncated result.
 *
 *  Italic `*` / `_` are intentionally NOT handled: single asterisks/underscores appear naturally
 *  in prose (e.g. file names like `my_file.txt`), so stripping them produces more visible jitter
 *  than the rare flash of a half-rendered italic. Bold + inline-code cover ~95% of the issue. */
export function trimIncompleteMarkdown(text: string): string {
  let result = text;

  // Fenced code block (```) — handle first so its inner backticks don't leak into the
  // inline-code count below.
  const fenceCount = (result.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) {
    result = result.slice(0, result.lastIndexOf('```'));
  }

  // Bold (**)
  const boldCount = (result.match(/\*\*/g) ?? []).length;
  if (boldCount % 2 === 1) {
    result = result.slice(0, result.lastIndexOf('**'));
  }

  // Inline code (`) — any remaining single backticks
  const codeCount = (result.match(/`/g) ?? []).length;
  if (codeCount % 2 === 1) {
    result = result.slice(0, result.lastIndexOf('`'));
  }

  return result;
}

export function Markdown({
  children,
  color,
  spacious,
}: {
  children: string;
  color?: string;
  /** Looser line-height + paragraph gaps for comfortable reading inside chat bubbles. */
  spacious?: boolean;
}) {
  const theme = useTheme();
  const textColor = color ?? theme.colors.text;

  const styles = useMemo(
    () => ({
      body: {
        color: textColor,
        ...theme.typography.body,
        ...(spacious ? { lineHeight: 26 } : null),
      },
      paragraph: spacious
        ? { marginTop: 0, marginBottom: theme.spacing.sm }
        : undefined,
      heading1: { color: textColor, ...theme.typography.heading, marginTop: theme.spacing.sm },
      heading2: { color: textColor, ...theme.typography.title, marginTop: theme.spacing.sm },
      heading3: { color: textColor, ...theme.typography.title },
      strong: { fontFamily: theme.fonts.bold, color: textColor },
      em: { fontFamily: theme.fonts.body, fontStyle: 'italic' as const },
      bullet_list: { marginVertical: theme.spacing.xs },
      ordered_list: { marginVertical: theme.spacing.xs },
      list_item: { color: textColor, marginVertical: spacious ? 4 : 2 },
      code_inline: {
        color: theme.colors.primary,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.sm,
        paddingHorizontal: 4,
      },
      fence: {
        color: textColor,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        borderWidth: 0,
      },
      link: { color: theme.colors.primary },
      hr: { backgroundColor: theme.colors.border },
    }),
    [theme, textColor, spacious],
  );

  return <RNMarkdown style={styles}>{trimIncompleteMarkdown(children)}</RNMarkdown>;
}
