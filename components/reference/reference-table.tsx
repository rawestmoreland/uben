import { AppColors, Layout, Spacing, Typography } from '@/constants/design';
import { StyleSheet, Text, View } from 'react-native';

export interface ReferenceTableColumn {
  key: string;
  header: string;
  /** Header background; defaults to white. */
  color?: string;
}

export interface ReferenceTableRow {
  key: string;
  header: string;
  cells: readonly string[];
}

interface ReferenceTableProps {
  columns: readonly ReferenceTableColumn[];
  rows: readonly ReferenceTableRow[];
  /** Header of the first column (the row-label column). Empty by default. */
  cornerLabel?: string;
  /** Renders German text in the user's ß / ss preference (`useGermanText`). */
  german: (text: string) => string;
}

/**
 * Small bordered grid: a header row, then one row per case or pronoun. All
 * text is German and follows the user's ß / ss preference.
 */
export function ReferenceTable({
  columns,
  rows,
  cornerLabel = '',
  german,
}: ReferenceTableProps) {
  return (
    <View style={styles.table}>
      <View style={styles.row}>
        <View style={[styles.cell, styles.rowHeaderCell, styles.cornerCell]}>
          <Text style={styles.headerText}>{german(cornerLabel)}</Text>
        </View>
        {columns.map((column) => (
          <View
            key={column.key}
            style={[
              styles.cell,
              { backgroundColor: column.color ?? AppColors.white },
            ]}
          >
            <Text style={styles.headerText}>{german(column.header)}</Text>
          </View>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={[styles.cell, styles.rowHeaderCell]}>
            <Text style={styles.rowHeaderText}>{german(row.header)}</Text>
          </View>
          {row.cells.map((cell, index) => (
            <View key={columns[index].key} style={styles.cell}>
              <Text style={styles.cellText}>{german(cell)}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    borderTopWidth: Layout.borderWidthThin,
    borderLeftWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.white,
    borderRightWidth: Layout.borderWidthThin,
    borderBottomWidth: Layout.borderWidthThin,
    borderColor: AppColors.black,
  },
  rowHeaderCell: {
    flex: 0,
    flexBasis: 56,
    backgroundColor: AppColors.lightGray,
  },
  cornerCell: {
    backgroundColor: AppColors.white,
  },
  headerText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: 'center',
  },
  rowHeaderText: {
    fontSize: Typography.tiny,
    fontWeight: Typography.bold,
    color: AppColors.black,
  },
  cellText: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.black,
    textAlign: 'center',
  },
});
