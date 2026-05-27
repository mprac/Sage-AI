/**
 * Themed markdown renderer for AI replies (so `**bold**`, lists, and headings render properly
 * instead of showing raw markdown). Wraps react-native-markdown-display with theme-driven styles.
 */
import React, { useMemo } from 'react';
import RNMarkdown from 'react-native-markdown-display';

import { useTheme } from '../../theme';

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

  return <RNMarkdown style={styles}>{children}</RNMarkdown>;
}
