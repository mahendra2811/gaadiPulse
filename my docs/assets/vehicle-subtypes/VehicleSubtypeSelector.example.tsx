import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { VEHICLE_SUBTYPES, type VehicleSubtypeId } from './index';

type Category = 'two_wheeler' | 'four_wheeler' | 'commercial' | 'agriculture_heavy';

type Props = {
  category: Category;
  selectedId?: string | null;
  onSelect: (id: VehicleSubtypeId) => void;
};

const FEATURED: Record<Category, string[]> = {
  two_wheeler: ['motorcycle', 'scooter', 'electric_scooter', 'moped'],
  four_wheeler: ['hatchback', 'sedan', 'compact_suv', 'suv', 'muv', 'jeep'],
  commercial: ['auto', 'taxi', 'van', 'pickup', 'truck', 'tipper', 'bus'],
  agriculture_heavy: ['tractor', 'excavator', 'backhoe_loader', 'loader', 'crane', 'generator', 'other'],
};

/** Copy/move this component to src/features/vehicles/components in the actual app. */
export function VehicleSubtypeSelector({ category, selectedId, onSelect }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const byCategory = VEHICLE_SUBTYPES.filter(item => item.category === category);
    const list = showAll ? byCategory : byCategory.filter(item => FEATURED[category].includes(item.id));
    return list.filter(item => `${item.label} ${item.id}`.toLowerCase().includes(search.toLowerCase().trim()));
  }, [category, search, showAll]);

  return (
    <View style={styles.root}>
      <Text style={styles.heading}>Choose vehicle subtype</Text>
      <Text style={styles.hint}>You can change this later. Brand and model are optional.</Text>
      <TextInput
        accessibilityLabel="Search vehicle subtype"
        placeholder="Search types"
        placeholderTextColor="#82938c"
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />
      <FlatList
        key={category}
        data={items}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const selected = selectedId === item.id;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${item.label}, ${selected ? 'selected' : 'not selected'}`}
              onPress={() => onSelect(item.id)}
              style={[styles.card, selected && styles.selected]}
            >
              <Image source={item.image} style={styles.picture} resizeMode="contain" />
              <Text style={styles.label} numberOfLines={2}>{item.label}</Text>
              <View style={[styles.dot, selected && styles.dotSelected]} />
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No matching vehicle type</Text>}
        contentContainerStyle={styles.list}
        scrollEnabled={false} // Let the surrounding onboarding ScrollView handle scrolling.
      />
      <Pressable onPress={() => setShowAll(a => !a)} accessibilityRole="button" style={styles.more}>
        <Text style={styles.moreText}>{showAll ? 'Show common types' : 'See all vehicle types'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  heading: { fontSize: 19, fontWeight: '700', color: '#122a25' },
  hint: { fontSize: 13, lineHeight: 19, color: '#70827a' },
  input: { borderRadius: 14, backgroundColor: '#f2f7f5', borderWidth: 1, borderColor: '#e0ece7', minHeight: 48, paddingHorizontal: 14, color: '#142d29' },
  list: { paddingTop: 2 },
  row: { gap: 12, marginBottom: 12 },
  card: { width: '47%' , borderWidth: 1, borderColor: '#e3ece8', borderRadius: 20, backgroundColor: '#ffffff', padding: 9, alignItems: 'center', minHeight: 177 },
  selected: { borderWidth: 2, borderColor: '#118464', backgroundColor: '#f1fbf7' },
  picture: { width: '100%', height: 119 }, // contain avoids distortion or cutting off wheels.
  label: { fontSize: 13, fontWeight: '600', lineHeight: 18, textAlign: 'center', color: '#192f2b' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e6edea', marginTop: 6 },
  dotSelected: { backgroundColor: '#118464' },
  more: { alignItems: 'center', padding: 12, minHeight: 44 },
  moreText: { color: '#118464', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', marginVertical: 24, color: '#6a8178' },
});
