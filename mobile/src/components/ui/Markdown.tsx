/**
 * Themed markdown renderer for AI replies (so `**bold**`, lists, and headings render properly
 * instead of showing raw markdown). Wraps react-native-markdown-display with theme-driven styles.
 */
import React, { useMemo } from 'react';
import RNMarkdown from 'react-native-markdown-display';

import { useTheme } from '../../theme';

export function Markdown({ children, color }: { children: string; color?: string }) {
  const theme = useTheme();
  const textColor = color ?? theme.colors.text;

  const styles = useMemo(
    () => ({
      body: { color: textColor, ...theme.typography.body },
      heading1: { color: textColor, ...theme.typography.heading, marginTop: theme.spacing.sm },
      heading2: { color: textColor, ...theme.typography.title, marginTop: theme.spacing.sm },
      heading3: { color: textColor, ...theme.typography.title },
      strong: { fontFamily: theme.fonts.bold, color: textColor },
      em: { fontFamily: theme.fonts.body, fontStyle: 'italic' as const },
      bullet_list: { marginVertical: theme.spacing.xs },
      ordered_list: { marginVertical: theme.spacing.xs },
      list_item: { color: textColor, marginVertical: 2 },
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
    [theme, textColor],
  );

  return <RNMarkdown style={styles}>{children}</RNMarkdown>;
}
